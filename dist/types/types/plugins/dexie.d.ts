import type {
    Dexie,
    DexieOptions,
    Table as DexieTable
} from 'dexie';
import type { MaybePromise } from '../util';

export type DexieSettings = DexieOptions & {
    onCreate?: (db: Dexie, dbName: string) => MaybePromise<void>;
};

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
    // contains the attachments data
    dexieAttachmentsTable: DexieTable;

    // these must be transformed because indexeddb does not allow boolean indexing
    booleanIndexes: string[];
}>;
