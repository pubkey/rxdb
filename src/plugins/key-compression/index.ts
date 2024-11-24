/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you don't use this, ensure that you set disableKeyCompression to false in your schema
 */

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
} from '../../overwritable.ts';
import { wrapRxStorageInstance } from '../../plugin-helpers.ts';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper.ts';
import { flatCloneDocWithMeta } from '../../rx-storage-helper.ts';

import type {
    RxJsonSchema,
    CompositePrimaryKey,
    RxStorage,
    RxStorageInstanceCreationParams,
    RxDocumentData,
    FilledMangoQuery,
    PreparedQuery,
    RxDocumentWriteData
} from '../../types/index.d.ts';
import {
    clone,
    flatClone,
    getFromMapOrCreate,
    isMaybeReadonlyArray
} from '../../plugins/utils/index.ts';
import { prepareQuery } from '../../rx-query-helper.ts';

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
     * it must be assured that the given schema object
     * is never mutated.
     */
    overwritable.deepFreezeWhenDevMode(schema);

    return getFromMapOrCreate(
        COMPRESSION_STATE_BY_SCHEMA,
        schema,
        () => {
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

            const compressionState = {
                table,
                schema,
                compressedSchema
            };
            return compressionState;
        }
    );
}

export function wrappedKeyCompressionStorage<Internals, InstanceCreationOptions>(
    args: {
        storage: RxStorage<Internals, InstanceCreationOptions>;
    }
): RxStorage<Internals, InstanceCreationOptions> {
    return Object.assign(
        {},
        args.storage,
        {
            async createStorageInstance<RxDocType>(
                params: RxStorageInstanceCreationParams<RxDocType, any>
            ) {
                if (!params.schema.keyCompression) {
                    return args.storage.createStorageInstance(params);
                }

                const compressionState = getCompressionStateByRxJsonSchema(params.schema);
                function modifyToStorage(docData: RxDocumentWriteData<RxDocType>) {
                    const ret = compressDocumentData(compressionState, docData);
                    return ret;
                }
                function modifyFromStorage(docData: RxDocumentData<any>): Promise<RxDocumentData<RxDocType>> {
                    return decompressDocumentData(compressionState, docData);
                }

                /**
                 * Because this wrapper resolves the key-compression,
                 * we can set the flag to false
                 * which allows underlying storages to detect wrong configurations
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

                const wrappedInstance = wrapRxStorageInstance(
                    params.schema,
                    instance,
                    modifyToStorage,
                    modifyFromStorage
                );


                const overwriteMethods = ['query', 'count'] as const;
                overwriteMethods.forEach(methodName => {
                    const methodBefore = wrappedInstance[methodName].bind(wrappedInstance);
                    (wrappedInstance as any)[methodName] = async (preparedQuery: PreparedQuery<RxDocType>) => {
                        const compressedQuery: FilledMangoQuery<RxDocType> = compressQuery(
                            compressionState.table,
                            preparedQuery.query as any
                        ) as any;

                        const compressedPreparedQuery = prepareQuery(
                            compressionState.compressedSchema,
                            compressedQuery
                        );
                        return methodBefore(compressedPreparedQuery);
                    }
                });

                return wrappedInstance;
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
