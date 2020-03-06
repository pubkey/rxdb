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
    RxSchema
} from '../rx-schema';
import { RxPlugin } from '../types';

export class KeyCompressor {

    public _table?: CompressionTable;
    constructor(
        public schema: RxSchema
    ) { }

    get table() {
        if (!this._table) {
            const jsonSchema = this.schema.normalized;
            this._table = createCompressionTable(
                jsonSchema as KeyCompressionJsonSchema,
                DEFAULT_COMPRESSION_FLAG,
                [
                    '_id',
                    '_rev',
                    '_attachments'
                ]
            );
        }
        return this._table;
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

    /**
     * get the full compressed-key-path of a object-path
     */
    transformKey(
        objectPath: string
    ): string {
        return compressedPath(
            this.table,
            objectPath
        ); // > '|a.|b'
    }


    /**
     * replace the keys of a query-obj with the compressed keys
     * @return compressed queryJSON
     */
    compressQuery(queryJSON: any): any {
        if (!this.schema.doKeyCompression()) {
            return queryJSON;
        } else {
            return compressQuery(
                this.table,
                queryJSON
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
    rxdb,
    prototypes,
    overwritable
};
