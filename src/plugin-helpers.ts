import { mergeMap } from 'rxjs/operators';
import type {
    BulkWriteRow,
    EventBulk,
    RxDocumentData,
    RxDocumentDataById,
    RxJsonSchema,
    RxStorage,
    RxStorageBulkWriteError,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from './types';
import {
    fastUnsecureHash,
    flatClone,
    getFromMapOrThrow,
    requestIdleCallbackIfAvailable
} from './util';


type WrappedStorageFunction = <Internals, InstanceCreationOptions>(
    args: {
        storage: RxStorage<Internals, InstanceCreationOptions>
    }
) => RxStorage<Internals, InstanceCreationOptions>;

type ValidatorFunction = (docData: RxDocumentData<any>) => void;

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
const VALIDATOR_CACHE_BY_VALIDATOR_KEY: Map<string, Map<string, ValidatorFunction>> = new Map();

/**
 * This factory is used in the validation plugins
 * so that we can reuse the basic storage wrapping code.
 */
export function wrappedValidateStorageFactory(
    /**
     * Returns a method that can be used to validate
     * documents and throws when the document is not valid.
     */
    getValidator: (schema: RxJsonSchema<any>) => ValidatorFunction,
    /**
     * A string to identify the validation library.
     */
    validatorKey: string
): WrappedStorageFunction {
    if (!VALIDATOR_CACHE_BY_VALIDATOR_KEY.has(validatorKey)) {
        VALIDATOR_CACHE_BY_VALIDATOR_KEY.set(validatorKey, new Map());
    }
    const VALIDATOR_CACHE = getFromMapOrThrow(VALIDATOR_CACHE_BY_VALIDATOR_KEY, validatorKey);

    function initValidator(
        schema: RxJsonSchema<any>
    ): ValidatorFunction {
        const hash = fastUnsecureHash(JSON.stringify(schema));
        if (!VALIDATOR_CACHE.has(hash)) {
            const validator = getValidator(schema);
            VALIDATOR_CACHE.set(hash, validator);
            return validator;
        }
        return getFromMapOrThrow(VALIDATOR_CACHE, hash);
    }

    return (args) => {
        return Object.assign(
            {},
            args.storage,
            {
                async createStorageInstance<RxDocType>(
                    params: RxStorageInstanceCreationParams<RxDocType, any>
                ) {
                    const instance = await args.storage.createStorageInstance(params);
                    /**
                     * Lazy initialize the validator
                     * to save initial page load performance.
                     * Some libraries take really long to initialize the validator
                     * from the schema.
                     */
                    let validatorCached: ValidatorFunction;
                    requestIdleCallbackIfAvailable(() => validatorCached = initValidator(params.schema));

                    const oldBulkWrite = instance.bulkWrite.bind(instance);
                    instance.bulkWrite = (
                        documentWrites: BulkWriteRow<RxDocType>[],
                        context: string
                    ) => {
                        if (!validatorCached) {
                            validatorCached = initValidator(params.schema);
                        }
                        documentWrites.forEach(row => {
                            validatorCached(row.document);
                        });
                        return oldBulkWrite(documentWrites, context);
                    }

                    return instance;
                }
            }
        );
    };

}



/**
 * Used in plugins to easily modify all in- and outgoing
 * data of that storage instance.
 */
export function wrapRxStorageInstance<RxDocType>(
    instance: RxStorageInstance<RxDocType, any, any>,
    modifyToStorage: (docData: RxDocumentData<RxDocType>) => Promise<RxDocumentData<any>> | RxDocumentData<any>,
    modifyFromStorage: (docData: RxDocumentData<any>) => Promise<RxDocumentData<RxDocType>> | RxDocumentData<RxDocType>,
    modifyAttachmentFromStorage: (attachmentData: string) => Promise<string> | string = (v) => v
) {
    async function toStorage(docData: RxDocumentData<RxDocType>): Promise<RxDocumentData<any>> {
        if (!docData) {
            return docData;
        }
        return await modifyToStorage(docData);
    }
    async function fromStorage(docData: RxDocumentData<any>): Promise<RxDocumentData<RxDocType>> {
        if (!docData) {
            return docData;
        }
        return await modifyFromStorage(docData);
    }
    async function errorFromStorage<RxDocType>(
        error: RxStorageBulkWriteError<any>
    ): Promise<RxStorageBulkWriteError<RxDocType>> {
        const ret = flatClone(error);
        ret.writeRow = flatClone(ret.writeRow);
        if (ret.documentInDb) {
            ret.documentInDb = await fromStorage(ret.documentInDb);
        }
        if (ret.writeRow.previous) {
            ret.writeRow.previous = await fromStorage(ret.writeRow.previous);
        }
        ret.writeRow.document = await fromStorage(ret.writeRow.document);
        return ret;
    }

    const oldBulkWrite = instance.bulkWrite.bind(instance);
    instance.bulkWrite = async (
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ) => {
        const useRows: BulkWriteRow<any>[] = [];
        await Promise.all(
            documentWrites.map(async (row) => {
                const [previous, document] = await Promise.all([
                    row.previous ? toStorage(row.previous) : undefined,
                    toStorage(row.document)
                ]);
                useRows.push({ previous, document });
            })
        );

        const writeResult = await oldBulkWrite(useRows, context);
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };
        const promises: Promise<any>[] = [];
        Object.entries(writeResult.success).forEach(([k, v]) => {
            promises.push(
                fromStorage(v).then(v => ret.success[k] = v)
            );
        });
        Object.entries(writeResult.error).forEach(([k, error]) => {
            promises.push(
                errorFromStorage<RxDocType>(error).then(err => ret.error[k] = err)
            );
        });
        await Promise.all(promises);
        return ret;
    }

    const oldQuery = instance.query.bind(instance);
    instance.query = (preparedQuery) => {
        return oldQuery(preparedQuery)
            .then(queryResult => {
                return Promise.all(queryResult.documents.map(doc => fromStorage(doc)));
            })
            .then(documents => ({ documents: documents as any }));
    }

    const oldGetAttachmentData = instance.getAttachmentData.bind(instance);
    instance.getAttachmentData = async (
        documentId: string,
        attachmentId: string
    ) => {
        let data = await oldGetAttachmentData(documentId, attachmentId);
        data = await modifyAttachmentFromStorage(data);
        return data;
    }

    const oldFindDocumentsById = instance.findDocumentsById.bind(instance);
    instance.findDocumentsById = (ids, deleted) => {
        return oldFindDocumentsById(ids, deleted).then(async (findResult) => {
            const ret: RxDocumentDataById<RxDocType> = {};
            await Promise.all(
                Object.entries(findResult)
                    .map(async ([key, doc]) => {
                        ret[key] = await fromStorage(doc);
                    })
            );
            return ret;
        });
    };

    const oldGetChangedDocumentsSince = instance.getChangedDocumentsSince.bind(instance);
    instance.getChangedDocumentsSince = (limit, checkpoint) => {
        return oldGetChangedDocumentsSince(limit, checkpoint)
            .then(async (result) => {
                return {
                    checkpoint: result.checkpoint,
                    documents: await Promise.all(
                        result.documents.map(d => fromStorage(d))
                    )
                };
            });
    };

    const oldChangeStream = instance.changeStream.bind(instance);
    instance.changeStream = () => {
        return oldChangeStream().pipe(
            mergeMap(async (eventBulk) => {
                const useEvents = await Promise.all(
                    eventBulk.events.map(async (event) => {
                        return {
                            eventId: event.eventId,
                            documentId: event.documentId,
                            endTime: event.endTime,
                            startTime: event.startTime,
                            change: {
                                id: event.change.id,
                                operation: event.change.operation,
                                doc: await fromStorage(event.change.doc) as any,
                                previous: await fromStorage(event.change.previous) as any
                            }
                        }
                    })
                );
                const ret: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any> = {
                    id: eventBulk.id,
                    events: useEvents,
                    checkpoint: eventBulk.checkpoint,
                    context: eventBulk.context
                };
                return ret;
            })
        )
    };

    const oldConflictResultionTasks = instance.conflictResultionTasks.bind(instance);
    instance.conflictResultionTasks = () => {
        return oldConflictResultionTasks().pipe(
            mergeMap(async (task) => {
                const assumedMasterState = await fromStorage(task.input.assumedMasterState);
                const newDocumentState = await fromStorage(task.input.newDocumentState);
                const realMasterState = await fromStorage(task.input.realMasterState);
                return {
                    id: task.id,
                    context: task.context,
                    input: {
                        assumedMasterState,
                        realMasterState,
                        newDocumentState
                    }
                };
            })
        );
    }

    const oldResolveConflictResultionTask = instance.resolveConflictResultionTask.bind(instance);
    instance.resolveConflictResultionTask = (taskSolution) => {
        if (taskSolution.output.isEqual) {
            return oldResolveConflictResultionTask(taskSolution);
        }
        const useSolution = {
            id: taskSolution.id,
            output: {
                isEqual: false,
                documentData: taskSolution.output.documentData
            }
        };
        return oldResolveConflictResultionTask(useSolution);
    }

    return instance;
}
