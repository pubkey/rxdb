import {
    Dexie,
    DexieOptions,
    Table as DexieTable
} from 'dexie';

export type DexieSettings = DexieOptions;


/**
 * The internals is a Promise that resolves
 * when the database has fully opened
 * and Dexie.on.ready was called
 * @link https://dexie.org/docs/Dexie/Dexie.on.ready
 * 
 */
export type DexieStorageInternals = Promise<{
    dexieDb: Dexie;
    /**
     * Contains all normal non-deleted documents
     */
    dexieTable: DexieTable;
    /**
     * Contains all docs with _deleted: true
     */
    dexieDeletedTable: DexieTable;
    /**
     * Contains the changes flags
     * to enable RxDB to get all changes since X.
     */
    dexieChangesTable: DexieTable;
}>;
