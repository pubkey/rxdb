/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */
import { CompressionTable, PlainJsonObject } from 'jsonschema-key-compression';
import { RxSchema } from '../rx-schema';
import type { RxPlugin } from '../types';
export declare class KeyCompressor {
    schema: RxSchema;
    constructor(schema: RxSchema);
    /**
     * @overwrites itself on the first call
     */
    get table(): CompressionTable;
    /**
     * compress the keys of an object via the compression-table
     */
    compress(obj: any): PlainJsonObject;
    decompress(compressedObject: any): any;
    /**
     * get the full compressed-key-path of a object-path
     */
    transformKey(objectPath: string): string;
    /**
     * replace the keys of a query-obj with the compressed keys
     * @return compressed queryJSON
     */
    compressQuery(queryJSON: any): any;
}
export declare function create(schema: RxSchema): KeyCompressor;
export declare const rxdb = true;
export declare const prototypes: {};
export declare const overwritable: {
    createKeyCompressor: typeof create;
};
export declare const RxDBKeyCompressionPlugin: RxPlugin;
