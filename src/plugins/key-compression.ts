/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */

import {
    createCompressionTable,
    CompressionTable,
    JsonSchema as KeyCompressionJsonSchema,
    compressObject,
    decompressObject,
    compressedPath,
    compressQuery,
    DEFAULT_COMPRESSION_FLAG,
    createCompressedJsonSchema
} from 'jsonschema-key-compression';
import { getPrimaryFieldOfPrimaryKey } from '../rx-schema';
import {
    overwritable
} from '../overwritable';

import type {
    RxPlugin,
    RxJsonSchema,
    RxCollection,
    CompositePrimaryKey
} from '../types';
import { flatClone, isMaybeReadonlyArray } from '../util';

declare type CompressionState = {
    table: CompressionTable;
    // the compressed schema
    schema: RxJsonSchema<any>;
};

/**
 * Cache the compression table and the compressed schema
 * by the storage instance for better performance.
 */
const COMPRESSION_STATE_BY_SCHEMA: WeakMap<
    RxJsonSchema<any>,
    CompressionState
> = new WeakMap();

export function createCompressionState(
    schema: RxJsonSchema<any>
): CompressionState {
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
            getPrimaryFieldOfPrimaryKey(schema.primaryKey) as string,
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
        const composedPrimary: CompositePrimaryKey<any> = schema.primaryKey as any;
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

    return {
        table,
        schema: compressedSchema
    };
}

export function getCompressionStateByStorageInstance(
    schema: RxJsonSchema<any>
): CompressionState {
    let state = COMPRESSION_STATE_BY_SCHEMA.get(schema);
    if (!state) {

        /**
         * Because we cache the state by the JsonSchema,
         * it must be ausured that the given schema object never changes.
         */
        overwritable.deepFreezeWhenDevMode(schema);

        state = createCompressionState(schema);
        COMPRESSION_STATE_BY_SCHEMA.set(schema, state);
    }
    return state;
}

export const RxDBKeyCompressionPlugin: RxPlugin = {
    name: 'key-compression',
    rxdb: true,
    prototypes: {},
    overwritable: {},
    hooks: {
        /**
         * replace the keys of a query-obj with the compressed keys
         * because the storage instance only knows the compressed schema
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
            const compressionState = getCompressionStateByStorageInstance(
                rxQuery.collection.schema.jsonSchema
            );

            const compressedQuery = compressQuery(
                compressionState.table,
                mangoQuery as any
            );
            input.mangoQuery = compressedQuery as any;
        },
        preCreateRxStorageInstance(params) {
            /**
             * When key compression is used,
             * the storage instance only knows about the compressed schema
             */
            if (params.schema.keyCompression) {
                const compressionState = createCompressionState(params.schema);
                params.schema = compressionState.schema;
            }
        },
        preQueryMatcher(params) {
            if (!params.rxQuery.collection.schema.jsonSchema.keyCompression) {
                return;
            }
            const state = getCompressionStateByStorageInstance(params.rxQuery.collection.schema.jsonSchema);
            params.doc = compressObject(
                state.table,
                params.doc
            );
        },
        preSortComparator(params) {
            if (!params.rxQuery.collection.schema.jsonSchema.keyCompression) {
                return;
            }
            const state = getCompressionStateByStorageInstance(params.rxQuery.collection.schema.jsonSchema);
            params.docA = compressObject(
                state.table,
                params.docA
            );
            params.docB = compressObject(
                state.table,
                params.docB
            );
        },
        preWriteToStorageInstance(params: {
            collection: RxCollection<any, {}, {}, {}>;
            doc: any;
        }) {
            if (!params.collection.schema.jsonSchema.keyCompression) {
                return;
            }
            const state = getCompressionStateByStorageInstance(params.collection.schema.jsonSchema);

            /**
             * Do not send attachments to compressObject()
             * because it will deep clone which does not work on Blob or Buffer.
             */
            params.doc = flatClone(params.doc);
            const attachments = params.doc._attachments;
            delete params.doc._attachments;

            params.doc = compressObject(
                state.table,
                params.doc
            );
            params.doc._attachments = attachments;
        },
        postReadFromInstance(params) {
            if (!params.collection.schema.jsonSchema.keyCompression) {
                return;
            }
            const state = getCompressionStateByStorageInstance(params.collection.schema.jsonSchema);
            params.doc = decompressObject(
                state.table,
                params.doc
            );
        }
    }
};
