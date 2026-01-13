import { filter, mergeMap, tap } from 'rxjs/operators';
import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper.ts';
import { WrappedRxStorageInstance } from './rx-storage-helper.ts';
import type {
    BulkWriteRow,
    EventBulk,
    RxChangeEvent,
    RxDocumentData,
    RxDocumentWriteData,
    RxJsonSchema,
    RxStorage,
    RxStorageWriteError,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxValidationError,
    RxStorageWriteErrorConflict,
    MaybePromise
} from './types/index.d.ts';
import {
    flatClone,
    getFromMapOrCreate,
    requestIdleCallbackIfAvailable
} from './plugins/utils/index.ts';
import { BehaviorSubject, firstValueFrom } from 'rxjs';


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
 * cache the validators by the schema string
 * so we can reuse them when multiple collections have the same schema
 *
 * Notice: to make it easier and not dependent on a hash function,
 * we use the plain json string.
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
    const VALIDATOR_CACHE = getFromMapOrCreate(
        VALIDATOR_CACHE_BY_VALIDATOR_KEY,
        validatorKey,
        () => new Map()
    );

    function initValidator(
        schema: RxJsonSchema<any>
    ): ValidatorFunction {
        return getFromMapOrCreate(
            VALIDATOR_CACHE,
            JSON.stringify(schema),
            () => getValidator(schema)
        );
    }

    return (args) => {
        return Object.assign(
            {},
            args.storage,
            {
                name: 'validate-' + validatorKey + '-' + args.storage.name,
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
                                    validationErrors,
                                    schema: instance.schema,
                                    writeRow: row,
                                    context
                                });
                            } else {
                                continueWrites.push(row);
                            }
                        });
                        const writePromise: Promise<RxStorageBulkWriteResponse<RxDocType>> = continueWrites.length > 0 ?
                            oldBulkWrite(continueWrites, context) :
                            Promise.resolve({ error: [], success: [] });
                        return writePromise.then(writeResult => {
                            errors.forEach(validationError => {
                                writeResult.error.push(validationError);
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
    originalSchema: RxJsonSchema<RxDocumentData<RxDocType>>,
    instance: RxStorageInstance<RxDocType, any, any>,
    modifyToStorage: (docData: RxDocumentWriteData<RxDocType>) => MaybePromise<RxDocumentData<any>>,
    modifyFromStorage: (docData: RxDocumentData<any>) => MaybePromise<RxDocumentData<RxDocType>>,
    modifyAttachmentFromStorage: (attachmentData: string) => MaybePromise<string> = (v) => v
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


    const processingChangesCount$ = new BehaviorSubject(0);

    const wrappedInstance: WrappedRxStorageInstance<RxDocType, any, any> = {
        databaseName: instance.databaseName,
        internals: instance.internals,
        cleanup: instance.cleanup.bind(instance),
        options: instance.options,
        close: instance.close.bind(instance),
        schema: originalSchema,
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
                error: []
            };
            const promises: Promise<any>[] = [];
            writeResult.error.forEach(error => {
                promises.push(
                    errorFromStorage(error).then(err => ret.error.push(err))
                );
            });
            await Promise.all(promises);

            /**
             * By definition, all change events must be emitted
             * BEFORE the write call resolves.
             * To ensure that even when the modifiers are async,
             * we wait here until the processing queue is empty.
             */
            await firstValueFrom(
                processingChangesCount$.pipe(
                    filter(v => v === 0)
                )
            );
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
            attachmentId: string,
            digest: string
        ) => {
            let data = await instance.getAttachmentData(documentId, attachmentId, digest);
            data = await modifyAttachmentFromStorage(data);
            return data;
        },
        findDocumentsById: (ids, deleted) => {
            return instance.findDocumentsById(ids, deleted)
                .then(async (findResult) => {
                    const ret: RxDocumentData<RxDocType>[] = [];
                    await Promise.all(
                        findResult
                            .map(async (doc) => {
                                ret.push(await fromStorage(doc));
                            })
                    );
                    return ret;
                });
        },
        getChangedDocumentsSince: !instance.getChangedDocumentsSince ? undefined : (limit, checkpoint) => {
            return ((instance as any).getChangedDocumentsSince)(limit, checkpoint)
                .then(async (result: any) => {
                    return {
                        checkpoint: result.checkpoint,
                        documents: await Promise.all(
                            result.documents.map((d: any) => fromStorage(d))
                        )
                    };
                });
        },
        changeStream: () => {
            return instance.changeStream().pipe(
                tap(() => processingChangesCount$.next(processingChangesCount$.getValue() + 1)),
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
                                documentId: event.documentId,
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
                }),
                tap(() => processingChangesCount$.next(processingChangesCount$.getValue() - 1))
            );
        },
    };

    return wrappedInstance;
}
