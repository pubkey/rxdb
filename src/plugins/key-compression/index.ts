/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */

import type {
    DeterministicSortComparator,
    QueryMatcher
} from 'event-reduce-js';
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
import {
    overwritable
} from '../../overwritable';
import { wrapRxStorageInstance } from '../../plugin-helpers';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { flatCloneDocWithMeta } from '../../rx-storage-helper';

import type {
    RxJsonSchema,
    CompositePrimaryKey,
    RxStorage,
    RxStorageInstanceCreationParams,
    RxDocumentData,
    RxStorageStatics,
    FilledMangoQuery,
    PreparedQuery,
    RxDocumentWriteData
} from '../../types';
import {
    flatClone,
    isMaybeReadonlyArray
} from '../../plugins/utils';

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
        storage: RxStorage<Internals, InstanceCreationOptions>;
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
                if (schema.keyCompression) {
                    const compressionState = getCompressionStateByRxJsonSchema(schema);
                    mutateableQuery = compressQuery(
                        compressionState.table,
                        mutateableQuery as any
                    ) as any;
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
                    const comparator = args.storage.statics.getSortComparator(compressionState.schema, preparedQuery);
                    return (a, b) => {
                        const compressedDocDataA = compressObject(
                            compressionState.table,
                            a as any
                        );
                        const compressedDocDataB = compressObject(
                            compressionState.table,
                            b as any
                        );
                        const res = comparator(compressedDocDataA, compressedDocDataB);
                        return res;
                    };
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
                    const matcher = args.storage.statics.getQueryMatcher(compressionState.schema, preparedQuery);
                    return (docData) => {
                        const compressedDocData = compressObject(
                            compressionState.table,
                            docData
                        );
                        const ret = matcher(compressedDocData);
                        return ret;
                    };
                }
            }
        }
    );

    return Object.assign(
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
                function modifyToStorage(docData: RxDocumentWriteData<RxDocType>) {
                    return compressDocumentData(compressionState, docData);
                }
                function modifyFromStorage(docData: RxDocumentData<any>): Promise<RxDocumentData<RxDocType>> {
                    return decompressDocumentData(compressionState, docData);
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

                return wrapRxStorageInstance(
                    instance,
                    modifyToStorage,
                    modifyFromStorage
                );
            }
        }
    );
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
