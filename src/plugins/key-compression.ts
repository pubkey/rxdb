/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */

import {
    createCompressionTable,
    CompressionTable,
    JsonSchema as KeyCompressionJsonSchema,
    compressObject,
    PlainJsonObject,
    decompressObject,
    compressedPath,
    compressQuery,
    DEFAULT_COMPRESSION_FLAG
} from 'jsonschema-key-compression';

import {
    RxSchema,
    getPrimary
} from '../rx-schema';
import type {
    RxPlugin,
    MangoQuery,
    RxQuery,
    RxJsonSchema,
    RxCollection
} from '../types';
import {
    overwriteGetterForCaching,
    flatClone
} from '../util';

/**
 * Cache the compression table by the storage instance
 * for better performance.
 */
const COMPRESSION_TABLE_BY_COLLECTION: WeakMap<
    RxCollection,
    CompressionTable
> = new WeakMap();

export function getCompressionTableByStorageInstance(
    collection: RxCollection
): CompressionTable {
    let table = COMPRESSION_TABLE_BY_COLLECTION.get(collection);
    if (!table) {
        table = createCompressionTable(
            collection.schema.jsonSchema as KeyCompressionJsonSchema,
            DEFAULT_COMPRESSION_FLAG,
            [
                collection.schema.primaryPath,
                '_rev',
                '_attachments'
            ]
        );
        COMPRESSION_TABLE_BY_COLLECTION.set(collection, table);
    }
    return table;
}

export class KeyCompressor {

    constructor(
        public schema: RxSchema
    ) { }

    /**
     * @overwrites itself on the first call
     */
    get table(): CompressionTable {
        const jsonSchema = this.schema.normalized;
        const table = createCompressionTable(
            jsonSchema as KeyCompressionJsonSchema,
            DEFAULT_COMPRESSION_FLAG,
            [
                this.schema.primaryPath,
                '_rev',
                '_attachments'
            ]
        );
        return overwriteGetterForCaching(
            this,
            'table',
            table
        );
    }

    /**
     * compress the keys of an object via the compression-table
     */
    compress(obj: any): PlainJsonObject {
        if (!this.schema.doKeyCompression()) {
            return obj;
        } else {
            return compressObject(
                this.table,
                obj
            );

        }
    }

    decompress(compressedObject: any): any {
        if (!this.schema.doKeyCompression()) {
            return compressedObject;
        } else {
            return decompressObject(
                this.table,
                compressedObject
            );
        }
    }
}

export function create(schema: RxSchema) {
    return new KeyCompressor(schema);
}


export const rxdb = true;
export const prototypes = {};
export const overwritable = {
    createKeyCompressor: create
};

export const RxDBKeyCompressionPlugin: RxPlugin = {
    name: 'key-compression',
    rxdb,
    prototypes,
    overwritable,
    hooks: {
        /**
         * replace the keys of a query-obj with the compressed keys
         * because the storage instance only know the compressed schema
         * @return compressed queryJSON
         */
        prePrepareQuery(
            input
        ) {
            const rxQuery = input.rxQuery;
            const mangoQuery = input.mangoQuery;
            if (!rxQuery.collection.schema.jsonSchema.keyCompression) {
                return;
            }
            const compressionTable = getCompressionTableByStorageInstance(
                rxQuery.collection
            );
            const compressedQuery = compressQuery(
                compressionTable,
                mangoQuery as any
            );
            input.mangoQuery = compressedQuery as any;
        },
        preCreateRxStorageInstance(params) {
            /**
             * We have to run key compression on the indexes
             * otherwise the storage instance would create non-compressed
             * index field.
             */
            if (params.schema.indexes && params.schema.keyCompression) {
                const newSchema = flatClone(params.schema);
                const primaryPath = getPrimary(newSchema);
                const table = createCompressionTable(
                    newSchema as KeyCompressionJsonSchema,
                    DEFAULT_COMPRESSION_FLAG,
                    [
                        primaryPath,
                        '_rev',
                        '_attachments'
                    ]
                );
                newSchema.indexes = params.schema.indexes.map(idx => {
                    if (Array.isArray(idx)) {
                        return idx.map(subIdx => compressedPath(table, subIdx));
                    } else {
                        return compressedPath(table, idx);
                    }
                });
                params.schema = newSchema;
            }
            console.log(JSON.stringify(params.schema, null, 4));
        }
    }
};
