import type { DeterministicSortComparator } from 'event-reduce-js';
import type { DexieStorageInternals, MangoQuery, RxDocumentData, RxJsonSchema } from '../../types';
import { DexieSettings } from '../../types';
export declare const DEXIE_DOCS_TABLE_NAME = "docs";
export declare const DEXIE_DELETED_DOCS_TABLE_NAME = "deleted-docs";
export declare const DEXIE_CHANGES_TABLE_NAME = "changes";
export declare const RX_STORAGE_NAME_DEXIE = "dexie";
export declare function getDexieDbWithTables(databaseName: string, collectionName: string, settings: DexieSettings, schema: RxJsonSchema<any>): DexieStorageInternals;
export declare function closeDexieDb(statePromise: DexieStorageInternals): Promise<void>;
/**
 * This function is at dexie-helper
 * because we need it in multiple places.
 */
export declare function getDexieSortComparator<RxDocType>(_schema: RxJsonSchema<RxDocumentData<RxDocType>>, query: MangoQuery<RxDocType>): DeterministicSortComparator<RxDocType>;
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
