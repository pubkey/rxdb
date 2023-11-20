import type {
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
     * We need this because with dexie it is not possible to use a boolean field as index
     * which could be used to filter out deleted docs in queries.
     */
    dexieDeletedTable: DexieTable;
}>;
