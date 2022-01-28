import {
    Dexie,
    DexieOptions,
    Table as DexieTable
} from 'dexie';

export type DexieSettings = DexieOptions;

export type DexieStorageInternals = {
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
};
