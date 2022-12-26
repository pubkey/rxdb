/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */
import { CompressionTable } from 'jsonschema-key-compression';
import type { RxJsonSchema, RxStorage, RxDocumentData } from '../../types';
declare type CompressionState = {
    table: CompressionTable;
    schema: RxJsonSchema<any>;
    compressedSchema: RxJsonSchema<any>;
};
export declare function getCompressionStateByRxJsonSchema(schema: RxJsonSchema<any>): CompressionState;
export declare function wrappedKeyCompressionStorage<Internals, InstanceCreationOptions>(args: {
    storage: RxStorage<Internals, InstanceCreationOptions>;
}): RxStorage<Internals, InstanceCreationOptions>;
export declare function compressDocumentData(compressionState: CompressionState, docData: RxDocumentData<any>): RxDocumentData<any>;
export declare function decompressDocumentData(compressionState: CompressionState, docData: RxDocumentData<any>): RxDocumentData<any>;
export {};
