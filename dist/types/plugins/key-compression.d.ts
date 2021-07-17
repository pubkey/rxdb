/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */
import { CompressionTable } from 'jsonschema-key-compression';
import type { RxPlugin, RxJsonSchema, RxCollection } from '../types';
declare type CompressionState = {
    table: CompressionTable;
    schema: RxJsonSchema<any>;
};
export declare function createCompressionState(schema: RxJsonSchema<any>): CompressionState;
export declare function getCompressionStateByStorageInstance(collection: RxCollection): CompressionState;
export declare const rxdb = true;
export declare const prototypes: {};
export declare const overwritable: {};
export declare const RxDBKeyCompressionPlugin: RxPlugin;
export {};
