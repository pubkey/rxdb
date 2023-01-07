import type { DexieStorageInternals, RxDocumentData, RxJsonSchema } from '../../types';
import { DexieSettings } from '../../types';
export declare const DEXIE_DOCS_TABLE_NAME = "docs";
export declare const DEXIE_DELETED_DOCS_TABLE_NAME = "deleted-docs";
export declare const DEXIE_CHANGES_TABLE_NAME = "changes";
export declare const RX_STORAGE_NAME_DEXIE = "dexie";
export declare const RxStorageDexieStatics: Readonly<{
    prepareQuery<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, mutateableQuery: import("../../types").FilledMangoQuery<RxDocType>): any;
    getSortComparator<RxDocType_1>(schema: RxJsonSchema<RxDocumentData<RxDocType_1>>, preparedQuery: any): import("event-reduce-js").DeterministicSortComparator<RxDocType_1>;
    getQueryMatcher<RxDocType_2>(schema: RxJsonSchema<RxDocumentData<RxDocType_2>>, preparedQuery: any): import("event-reduce-js").QueryMatcher<RxDocumentData<RxDocType_2>>;
    checkpointSchema: import("../../types").DeepReadonlyObject<import("../../types").JsonSchema<any>>;
}>;
export declare function getDexieDbWithTables(databaseName: string, collectionName: string, settings: DexieSettings, schema: RxJsonSchema<any>): DexieStorageInternals;
export declare function closeDexieDb(statePromise: DexieStorageInternals): Promise<void>;
export declare function ensureNoBooleanIndex(schema: RxJsonSchema<any>): void;
/**
 * It is not possible to set non-javascript-variable-syntax
 * keys as IndexedDB indexes. So we have to substitute the pipe-char
 * which comes from the key-compression plugin.
 */
export declare const DEXIE_PIPE_SUBSTITUTE = "__";
export declare function dexieReplaceIfStartsWithPipe(str: string): string;
export declare function dexieReplaceIfStartsWithPipeRevert(str: string): string;
/**
 * @recursive
 */
export declare function fromStorageToDexie(documentData: RxDocumentData<any>): any;
export declare function fromDexieToStorage(documentData: any): RxDocumentData<any>;
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
