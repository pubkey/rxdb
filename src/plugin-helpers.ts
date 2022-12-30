import { mergeMap } from 'rxjs/operators';
import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
import { WrappedRxStorageInstance } from './rx-storage-helper';
import type {
    BulkWriteRow,
    EventBulk,
    RxChangeEvent,
    RxDocumentData,
    RxDocumentDataById,
    RxDocumentWriteData,
    RxJsonSchema,
    RxStorage,
    RxStorageWriteError,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxValidationError,
    RxStorageWriteErrorConflict
} from './types';
import {
    fastUnsecureHash,
    flatClone,
    getFromMapOrThrow,
    requestIdleCallbackIfAvailable
} from './plugins/utils';


type WrappedStorageFunction = <Internals, InstanceCreationOptions>(
    args: {
        storage: RxStorage<Internals, InstanceCreationOptions>;
    }
) => RxStorage<Internals, InstanceCreationOptions>;

/**
 * Returns the validation errors.
 * If document is fully valid, returns an empty array.
 */
type ValidatorFunction = (docData: RxDocumentData<any>) => RxValidationError[];

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
                    const primaryPath = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);

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
                        const errors: RxStorageWriteError<RxDocType>[] = [];
                        const continueWrites: typeof documentWrites = [];
                        documentWrites.forEach(row => {
                            const documentId: string = row.document[primaryPath] as any;
                            const validationErrors = validatorCached(row.document);
                            if (validationErrors.length > 0) {
                                errors.push({
                                    status: 422,
                                    isError: true,
                                    documentId,
                                    writeRow: row,
                                    validationErrors
                                });
                            } else {
                                continueWrites.push(row);
                            }
                        });
                        const writePromise: Promise<RxStorageBulkWriteResponse<RxDocType>> = continueWrites.length > 0 ? oldBulkWrite(continueWrites, context) : Promise.resolve({ error: {}, success: {} });
                        return writePromise.then(writeResult => {
                            errors.forEach(validationError => {
                                writeResult.error[validationError.documentId] = validationError;
                            });
                            return writeResult;
                        });
                    };

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
    modifyToStorage: (docData: RxDocumentWriteData<RxDocType>) => Promise<RxDocumentData<any>> | RxDocumentData<any>,
    modifyFromStorage: (docData: RxDocumentData<any>) => Promise<RxDocumentData<RxDocType>> | RxDocumentData<RxDocType>,
    modifyAttachmentFromStorage: (attachmentData: string) => Promise<string> | string = (v) => v
): WrappedRxStorageInstance<RxDocType, any, any> {
    async function toStorage(docData: RxDocumentWriteData<RxDocType>): Promise<RxDocumentData<any>> {
        if (!docData) {
            return docData;
        }
        return await modifyToStorage(docData);
    }
    async function fromStorage(docData: RxDocumentData<any> | null): Promise<RxDocumentData<RxDocType>> {
        if (!docData) {
            return docData;
        }
        return await modifyFromStorage(docData);
    }
    async function errorFromStorage(
        error: RxStorageWriteError<any>
    ): Promise<RxStorageWriteError<RxDocType>> {
        const ret = flatClone(error);
        ret.writeRow = flatClone(ret.writeRow);
        if ((ret as RxStorageWriteErrorConflict<any>).documentInDb) {
            (ret as RxStorageWriteErrorConflict<any>).documentInDb = await fromStorage((ret as RxStorageWriteErrorConflict<any>).documentInDb);
        }
        if (ret.writeRow.previous) {
            ret.writeRow.previous = await fromStorage(ret.writeRow.previous);
        }
        ret.writeRow.document = await fromStorage(ret.writeRow.document);
        return ret;
    }


    const wrappedInstance: WrappedRxStorageInstance<RxDocType, any, any> = {
        databaseName: instance.databaseName,
        internals: instance.internals,
        cleanup: instance.cleanup.bind(instance),
        options: instance.options,
        close: instance.close.bind(instance),
        schema: instance.schema,
        collectionName: instance.collectionName,
        count: instance.count.bind(instance),
        remove: instance.remove.bind(instance),
        originalStorageInstance: instance,
        bulkWrite: async (
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

            const writeResult = await instance.bulkWrite(useRows, context);
            const ret: RxStorageBulkWriteResponse<RxDocType> = {
                success: {},
                error: {}
            };
            const promises: Promise<any>[] = [];
            Object.entries(writeResult.success).forEach(([k, v]) => {
                promises.push(
                    fromStorage(v).then(v2 => ret.success[k] = v2)
                );
            });
            Object.entries(writeResult.error).forEach(([k, error]) => {
                promises.push(
                    errorFromStorage(error).then(err => ret.error[k] = err)
                );
            });
            await Promise.all(promises);
            return ret;
        },
        query: (preparedQuery) => {
            return instance.query(preparedQuery)
                .then(queryResult => {
                    return Promise.all(queryResult.documents.map(doc => fromStorage(doc)));
                })
                .then(documents => ({ documents: documents as any }));
        },
        getAttachmentData: async (
            documentId: string,
            attachmentId: string
        ) => {
            let data = await instance.getAttachmentData(documentId, attachmentId);
            data = await modifyAttachmentFromStorage(data);
            return data;
        },
        findDocumentsById: (ids, deleted) => {
            return instance.findDocumentsById(ids, deleted)
                .then(async (findResult) => {
                    const ret: RxDocumentDataById<RxDocType> = {};
                    await Promise.all(
                        Object.entries(findResult)
                            .map(async ([key, doc]) => {
                                ret[key] = await fromStorage(doc);
                            })
                    );
                    return ret;
                });
        },
        getChangedDocumentsSince: (limit, checkpoint) => {
            return instance.getChangedDocumentsSince(limit, checkpoint)
                .then(async (result) => {
                    return {
                        checkpoint: result.checkpoint,
                        documents: await Promise.all(
                            result.documents.map(d => fromStorage(d))
                        )
                    };
                });
        },
        changeStream: () => {
            return instance.changeStream().pipe(
                mergeMap(async (eventBulk) => {
                    const useEvents = await Promise.all(
                        eventBulk.events.map(async (event) => {
                            const [
                                documentData,
                                previousDocumentData
                            ] = await Promise.all([
                                fromStorage(event.documentData),
                                fromStorage(event.previousDocumentData)
                            ]);
                            const ev: RxChangeEvent<RxDocType> = {
                                operation: event.operation,
                                eventId: event.eventId,
                                documentId: event.documentId,
                                endTime: event.endTime,
                                startTime: event.startTime,
                                documentData: documentData as any,
                                previousDocumentData: previousDocumentData as any,
                                isLocal: false
                            };
                            return ev;
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
            );
        },
        conflictResultionTasks: () => {
            return instance.conflictResultionTasks().pipe(
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
        },
        resolveConflictResultionTask: (taskSolution) => {
            if (taskSolution.output.isEqual) {
                return instance.resolveConflictResultionTask(taskSolution);
            }
            const useSolution = {
                id: taskSolution.id,
                output: {
                    isEqual: false,
                    documentData: taskSolution.output.documentData
                }
            };
            return instance.resolveConflictResultionTask(useSolution);
        }
    };

    return wrappedInstance;
}
