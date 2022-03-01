/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */
import { CompressionTable } from 'jsonschema-key-compression';
import type { RxPlugin, RxJsonSchema } from '../types';
declare type CompressionState = {
    table: CompressionTable;
    schema: RxJsonSchema<any>;
};
export declare function createCompressionState(schema: RxJsonSchema<any>): CompressionState;
export declare function getCompressionStateByRxJsonSchema(schema: RxJsonSchema<any>): CompressionState;
export declare const RxDBKeyCompressionPlugin: RxPlugin;
export {};
