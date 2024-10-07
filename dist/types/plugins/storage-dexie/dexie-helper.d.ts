import type { DexieStorageInternals, RxDocumentData, RxJsonSchema } from '../../types/index.d.ts';
import type { DexieSettings } from '../../types/index.d.ts';
export declare const DEXIE_DOCS_TABLE_NAME = "docs";
export declare const DEXIE_CHANGES_TABLE_NAME = "changes";
export declare const DEXIE_ATTACHMENTS_TABLE_NAME = "attachments";
export declare const RX_STORAGE_NAME_DEXIE = "dexie";
export declare function getDexieDbWithTables(databaseName: string, collectionName: string, settings: DexieSettings, schema: RxJsonSchema<any>): DexieStorageInternals;
export declare function closeDexieDb(statePromise: DexieStorageInternals): Promise<void>;
/**
 * It is not possible to set non-javascript-variable-syntax
 * keys as IndexedDB indexes. So we have to substitute the pipe-char
 * which comes from the key-compression plugin.
 */
export declare const DEXIE_PIPE_SUBSTITUTE = "__";
export declare function dexieReplaceIfStartsWithPipe(str: string): string;
export declare function dexieReplaceIfStartsWithPipeRevert(str: string): string;
/**
 * IndexedDB does not support boolean indexing.
 * So we have to replace true/false with '1'/'0'
 * @param d
 */
export declare function fromStorageToDexie<RxDocType>(booleanIndexes: string[], inputDoc: RxDocumentData<RxDocType>): any;
export declare function fromDexieToStorage<RxDocType>(booleanIndexes: string[], d: any): RxDocumentData<RxDocType>;
/**
 * @recursive
 */
export declare function fromStorageToDexieField(documentData: RxDocumentData<any>): any;
export declare function fromDexieToStorageField(documentData: any): RxDocumentData<any>;
/**
 * Creates a string that can be used to create the dexie store.
 * @link https://dexie.org/docs/API-Reference#quick-reference
 */
export declare function getDexieStoreSchema(rxJsonSchema: RxJsonSchema<any>): string;
/**
 * Returns all documents in the database.
 * Non-deleted plus deleted ones.
 */
export declare function getDocsInDb<RxDocType>(internals: DexieStorageInternals, docIds: string[]): Promise<RxDocumentData<RxDocType>[]>;
export declare function attachmentObjectId(documentId: string, attachmentId: string): string;
export declare function getBooleanIndexes(schema: RxJsonSchema<any>): string[];
