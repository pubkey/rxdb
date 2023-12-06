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
     * Contains all normal documents. Deleted ones and non-deleted ones.
     */
    dexieTable: DexieTable;
}>;
