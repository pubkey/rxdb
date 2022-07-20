/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */

import type { DeterministicSortComparator, QueryMatcher } from 'event-reduce-js';
import {
    createCompressionTable,
    CompressionTable,
    JsonSchema as KeyCompressionJsonSchema,
    compressObject,
    decompressObject,
    compressedPath,
    DEFAULT_COMPRESSION_FLAG,
    createCompressedJsonSchema,
    compressQuery
} from 'jsonschema-key-compression';
import { map } from 'rxjs';
import {
    overwritable
} from '../overwritable';
import { getPrimaryFieldOfPrimaryKey } from '../rx-schema-helper';
import { flatCloneDocWithMeta } from '../rx-storage-helper';

import type {
    RxJsonSchema,
    CompositePrimaryKey,
    RxStorage,
    RxStorageInstanceCreationParams,
    RxDocumentData,
    BulkWriteRow,
    RxStorageBulkWriteResponse,
    RxStorageBulkWriteError,
    RxDocumentDataById,
    EventBulk,
    RxStorageChangeEvent,
    RxStorageStatics,
    FilledMangoQuery,
    PreparedQuery
} from '../types';
import { flatClone, isMaybeReadonlyArray } from '../util';

declare type CompressionState = {
    table: CompressionTable;
    schema: RxJsonSchema<any>;
    compressedSchema: RxJsonSchema<any>;
};


/**
 * Cache the compression table and the compressed schema
 * by the storage instance for better performance.
 */
const COMPRESSION_STATE_BY_SCHEMA: WeakMap<
    RxJsonSchema<any>,
    CompressionState
> = new WeakMap();


export function getCompressionStateByRxJsonSchema(
    schema: RxJsonSchema<any>
): CompressionState {
    /**
     * Because we cache the state by the JsonSchema,
     * it must be ausured that the given schema object
     * is never mutated.
     */
    overwritable.deepFreezeWhenDevMode(schema);

    let compressionState = COMPRESSION_STATE_BY_SCHEMA.get(schema);
    if (!compressionState) {
        const compressionSchema: KeyCompressionJsonSchema = flatClone(schema) as any;
        delete (compressionSchema as any).primaryKey;

        const table = createCompressionTable(
            compressionSchema,
            DEFAULT_COMPRESSION_FLAG,
            [
                /**
                 * Do not compress the primary field
                 * for easier debugging.
                 */
                getPrimaryFieldOfPrimaryKey(schema.primaryKey),
                '_rev',
                '_attachments',
                '_deleted',
                '_meta'
            ]
        );

        delete (compressionSchema as any).primaryKey;
        const compressedSchema: RxJsonSchema<any> = createCompressedJsonSchema(
            table,
            compressionSchema
        ) as RxJsonSchema<any>;

        // also compress primary key
        if (typeof schema.primaryKey !== 'string') {
            const composedPrimary: CompositePrimaryKey<any> = schema.primaryKey;
            const newComposedPrimary: CompositePrimaryKey<any> = {
                key: compressedPath(table, composedPrimary.key as string),
                fields: composedPrimary.fields.map(field => compressedPath(table, field as string)),
                separator: composedPrimary.separator
            };
            compressedSchema.primaryKey = newComposedPrimary;
        } else {
            compressedSchema.primaryKey = compressedPath(table, schema.primaryKey);
        }

        /**
         * the key compression module does not know about indexes
         * in the schema, so we have to also compress them here.
         */
        if (schema.indexes) {
            const newIndexes = schema.indexes.map(idx => {
                if (isMaybeReadonlyArray(idx)) {
                    return idx.map(subIdx => compressedPath(table, subIdx));
                } else {
                    return compressedPath(table, idx);
                }
            });
            compressedSchema.indexes = newIndexes;
        }

        compressionState = {
            table,
            schema,
            compressedSchema
        };
        COMPRESSION_STATE_BY_SCHEMA.set(schema, compressionState);
    }
    return compressionState;
}



export function wrappedKeyCompressionStorage<Internals, InstanceCreationOptions>(
    args: {
        storage: RxStorage<Internals, InstanceCreationOptions>
    }
): RxStorage<Internals, InstanceCreationOptions> {


    const statics: RxStorageStatics = Object.assign(
        {},
        args.storage.statics,
        {
            prepareQuery<RxDocType>(
                schema: RxJsonSchema<RxDocumentData<RxDocType>>,
                mutateableQuery: FilledMangoQuery<RxDocType>
            ): PreparedQuery<RxDocType> {
                console.log('prepareQuery() inner!!');

                if (schema.keyCompression) {
                    console.log('11111111111111');
                    const compressionState = getCompressionStateByRxJsonSchema(schema);
                    mutateableQuery = compressQuery(
                        compressionState.table,
                        mutateableQuery as any
                    ) as any;

                    console.log('AAAAAAAAAAAAA');
                    console.log(JSON.stringify(mutateableQuery, null, 4));
                    return args.storage.statics.prepareQuery(
                        compressionState.compressedSchema,
                        mutateableQuery
                    );
                }
                return args.storage.statics.prepareQuery(
                    schema,
                    mutateableQuery
                );
            },
            getSortComparator<RxDocType>(
                schema: RxJsonSchema<RxDocumentData<RxDocType>>,
                preparedQuery: PreparedQuery<RxDocType>
            ): DeterministicSortComparator<RxDocType> {
                if (!schema.keyCompression) {
                    return args.storage.statics.getSortComparator(schema, preparedQuery);
                } else {
                    const compressionState = getCompressionStateByRxJsonSchema(schema);
                    return args.storage.statics.getSortComparator(compressionState.schema, preparedQuery);
                }
            },
            getQueryMatcher<RxDocType>(
                schema: RxJsonSchema<RxDocumentData<RxDocType>>,
                preparedQuery: PreparedQuery<RxDocType>
            ): QueryMatcher<RxDocumentData<RxDocType>> {
                if (!schema.keyCompression) {
                    return args.storage.statics.getQueryMatcher(schema, preparedQuery);
                } else {
                    const compressionState = getCompressionStateByRxJsonSchema(schema);
                    return args.storage.statics.getQueryMatcher(compressionState.schema, preparedQuery);
                }
            }
        }
    );

    const returnStorage: RxStorage<Internals, InstanceCreationOptions> = Object.assign(
        {},
        args.storage,
        {
            statics,
            async createStorageInstance<RxDocType>(
                params: RxStorageInstanceCreationParams<RxDocType, any>
            ) {
                if (!params.schema.keyCompression) {
                    return args.storage.createStorageInstance(params);
                }

                const compressionState = getCompressionStateByRxJsonSchema(params.schema);
                function toStorage(docData?: RxDocumentData<RxDocType>) {
                    if (!docData) {
                        return docData;
                    }
                    return compressDocumentData(compressionState, docData);
                }
                function fromStorage(docData?: RxDocumentData<any>): RxDocumentData<RxDocType> {
                    if (!docData) {
                        return docData;
                    }
                    return decompressDocumentData(compressionState, docData);
                }
                function errorFromStorage<RxDocType>(
                    error: RxStorageBulkWriteError<any>
                ): RxStorageBulkWriteError<RxDocType> {
                    const ret = flatClone(error);
                    ret.writeRow = flatClone(ret.writeRow);
                    ret.documentInDb = fromStorage(ret.documentInDb);
                    ret.writeRow.document = fromStorage(ret.writeRow.document);
                    ret.writeRow.previous = fromStorage(ret.writeRow.previous);
                    return ret;
                }

                /**
                 * Because this wrapper resolves the key-compression,
                 * we can set the flag to false
                 * which allows underlying storages to detect wrong conficturations
                 * like when keyCompression is set to false but no key-compression module is used.
                 */
                const childSchema = flatClone(compressionState.compressedSchema);
                childSchema.keyCompression = false;

                const instance = await args.storage.createStorageInstance(
                    Object.assign(
                        {},
                        params,
                        {
                            schema: childSchema
                        }
                    )
                );
                const oldBulkWrite = instance.bulkWrite.bind(instance);
                instance.bulkWrite = async (
                    documentWrites: BulkWriteRow<RxDocType>[],
                    context: string
                ) => {
                    const useRows: BulkWriteRow<any>[] = documentWrites
                        .map(row => ({
                            previous: toStorage(row.previous),
                            document: toStorage(row.document)
                        }));

                    const writeResult = await oldBulkWrite(useRows, context);

                    const ret: RxStorageBulkWriteResponse<RxDocType> = {
                        success: {},
                        error: {}
                    };
                    Object.entries(writeResult.success).forEach(([k, v]) => {
                        ret.success[k] = fromStorage(v);
                    });
                    Object.entries(writeResult.error).forEach(([k, error]) => {
                        ret.error[k] = errorFromStorage(error);
                    });
                    return ret;
                }

                const oldQuery = instance.query.bind(instance);
                instance.query = (preparedQuery) => {
                    return oldQuery(preparedQuery).then(queryResult => {
                        return {
                            documents: queryResult.documents.map(doc => fromStorage(doc))
                        };
                    })
                }

                const oldFindDocumentsById = instance.findDocumentsById.bind(instance);
                instance.findDocumentsById = (ids, deleted) => {
                    return oldFindDocumentsById(ids, deleted).then(findResult => {
                        const ret: RxDocumentDataById<RxDocType> = {};
                        Object.entries(findResult).forEach(([key, doc]) => {
                            ret[key] = fromStorage(doc);
                        });
                        return ret;
                    });
                };

                const oldGetChangedDocumentsSince = instance.getChangedDocumentsSince.bind(instance);
                instance.getChangedDocumentsSince = (limit, checkpoint) => {
                    return oldGetChangedDocumentsSince(limit, checkpoint).then(result => {
                        return {
                            checkpoint: result.checkpoint,
                            documents: result.documents
                                .map(d => fromStorage(d))
                        };
                    });
                };

                const oldChangeStream = instance.changeStream.bind(instance);
                instance.changeStream = () => {
                    return oldChangeStream().pipe(
                        map(eventBulk => {
                            const ret: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any> = {
                                id: eventBulk.id,
                                events: eventBulk.events.map(event => {
                                    return {
                                        eventId: event.eventId,
                                        documentId: event.documentId,
                                        endTime: event.endTime,
                                        startTime: event.startTime,
                                        change: {
                                            id: event.change.id,
                                            operation: event.change.operation,
                                            doc: fromStorage(event.change.doc) as any,
                                            previous: fromStorage(event.change.previous) as any
                                        }
                                    }
                                }),
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
                        map(task => {
                            const assumedMasterState = fromStorage(task.input.assumedMasterState);
                            const newDocumentState = fromStorage(task.input.newDocumentState);
                            const realMasterState = fromStorage(task.input.realMasterState);
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
                            documentData: fromStorage(taskSolution.output.documentData)
                        }
                    };
                    return oldResolveConflictResultionTask(useSolution);
                }

                return instance;
            }
        }
    );

    return returnStorage;
}




export function compressDocumentData(
    compressionState: CompressionState,
    docData: RxDocumentData<any>
): RxDocumentData<any> {
    /**
     * Do not send attachments to compressObject()
     * because it will deep clone which does not work on Blob or Buffer.
     */
    docData = flatCloneDocWithMeta(docData);
    const attachments = docData._attachments;
    delete docData._attachments;

    docData = compressObject(
        compressionState.table,
        docData
    );
    docData._attachments = attachments;
    return docData;
}


export function decompressDocumentData(
    compressionState: CompressionState,
    docData: RxDocumentData<any>
): RxDocumentData<any> {
    return decompressObject(
        compressionState.table,
        docData
    );
}
