import type {
    DeterministicSortComparator
} from 'event-reduce-js';
import mingo from 'mingo';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import type {
    DexieStorageInternals,
    MangoQuery,
    RxDocumentData,
    RxJsonSchema
} from '../../types';
import { Dexie } from 'dexie';
import { DexieSettings } from '../../types';
import { flatClone } from '../../util';

export const DEXIE_DOCS_TABLE_NAME = 'docs';
export const DEXIE_DELETED_DOCS_TABLE_NAME = 'deleted-docs';
export const DEXIE_CHANGES_TABLE_NAME = 'changes';


const DEXIE_DB_BY_NAME: Map<string, Dexie> = new Map();
const REF_COUNT_PER_DEXIE_DB: Map<Dexie, number> = new Map();
export function getDexieDbWithTables(
    databaseName: string,
    collectionName: string,
    settings: DexieSettings,
    schema: RxJsonSchema<any>
): DexieStorageInternals {
    const primaryPath: string = getPrimaryFieldOfPrimaryKey(schema.primaryKey) as any;
    const dexieDbName = databaseName + '----' + collectionName;
    let db = DEXIE_DB_BY_NAME.get(dexieDbName);
    if (!db) {
        /**
         * IndexedDB was not designed for dynamically adding tables on the fly,
         * so we create one dexie database per RxDB storage instance.
         * @link https://github.com/dexie/Dexie.js/issues/684#issuecomment-373224696
         */
        db = new Dexie(dexieDbName, settings);
        db.version(1).stores({
            [DEXIE_DOCS_TABLE_NAME]: getDexieStoreSchema(schema),
            [DEXIE_CHANGES_TABLE_NAME]: '++sequence, id',
            /**
             * Instead of adding {deleted: false} to every query we run over the document store,
             * we move deleted documents into a separate store where they can only be queried
             * by primary key.
             * This increases performance because it is way easier for the query planner to select
             * a good index and we also do not have to add the _deleted field to every index.
             */
            [DEXIE_DELETED_DOCS_TABLE_NAME]: primaryPath + ',$lastWriteAt'
        });
        DEXIE_DB_BY_NAME.set(dexieDbName, db);
        REF_COUNT_PER_DEXIE_DB.set(db, 0);
    }

    return {
        dexieDb: db,
        dexieTable: (db as any)[DEXIE_DOCS_TABLE_NAME],
        dexieDeletedTable: (db as any)[DEXIE_DELETED_DOCS_TABLE_NAME],
        dexieChangesTable: (db as any)[DEXIE_CHANGES_TABLE_NAME]
    }
}

export function closeDexieDb(db: Dexie) {
    const prevCount = REF_COUNT_PER_DEXIE_DB.get(db);
    const newCount = (prevCount as any) - 1;
    if (newCount === 0) {
        db.close();
        REF_COUNT_PER_DEXIE_DB.delete(db);
    } else {
        REF_COUNT_PER_DEXIE_DB.set(db, newCount);
    }
}


function sortDirectionToMingo(direction: 'asc' | 'desc'): 1 | -1 {
    if (direction === 'asc') {
        return 1;
    } else {
        return -1;
    }
}

/**
 * This function is at dexie-helper
 * because we need it in multiple places.
 */
export function getDexieSortComparator<RxDocType>(
    schema: RxJsonSchema<RxDocType>,
    query: MangoQuery<RxDocType>
): DeterministicSortComparator<RxDocType> {
    const primaryKey: string = getPrimaryFieldOfPrimaryKey(schema.primaryKey) as string;

    const mingoSortObject: {
        [fieldName: string]: 1 | -1;
    } = {};
    let wasPrimaryInSort = false;
    if (query.sort) {
        query.sort.forEach(sortBlock => {
            const key = Object.keys(sortBlock)[0];
            if (key === primaryKey) {
                wasPrimaryInSort = true;
            }
            const direction = Object.values(sortBlock)[0];
            mingoSortObject[key] = sortDirectionToMingo(direction);
        });
    }
    // TODO ensuring that the primaryKey is in the sorting, should be done by RxDB, not by the storage.
    if (!wasPrimaryInSort) {
        mingoSortObject[primaryKey] = 1;
    }


    const fun: DeterministicSortComparator<RxDocType> = (a: RxDocType, b: RxDocType) => {
        const sorted = mingo.find([a, b], {}).sort(mingoSortObject);
        const first = sorted.next();
        if (first === a) {
            return -1;
        } else {
            return 1;
        }
    }

    return fun;
}


/**
 * Creates a string that can be used to create the dexie store.
 * @link https://dexie.org/docs/API-Reference#quick-reference
 */
export function getDexieStoreSchema(
    rxJsonSchema: RxJsonSchema<any>
): string {
    const parts: string[] = [];

    /**
     * First part must be the primary key
     * @link https://github.com/dexie/Dexie.js/issues/1307#issuecomment-846590912
     */
    const primaryKey: string = getPrimaryFieldOfPrimaryKey(rxJsonSchema.primaryKey) as string;
    parts.push(primaryKey);

    // TODO add other indexes

    return parts.join(',');
}

export function getDexieEventKey(
    isLocal: boolean,
    primary: string,
    revision: string
): string {
    const prefix = isLocal ? 'local' : 'non-local';
    const eventKey = prefix + '|' + primary + '|' + revision;
    return eventKey;
}


/**
 * Removes all internal fields from the document data
 */
export function stripDexieKey<T>(docData: T & { $lastWriteAt?: number; }): T {
    const cloned = flatClone(docData);
    delete cloned.$lastWriteAt;
    return cloned;
}


/**
 * Returns all documents in the database.
 * Non-deleted plus deleted ones.
 */
export async function getDocsInDb<RxDocType>(
    internals: DexieStorageInternals,
    docIds: string[]
): Promise<RxDocumentData<RxDocType>[]> {
    const [
        nonDeletedDocsInDb,
        deletedDocsInDb
    ] = await Promise.all([
        internals.dexieTable.bulkGet(docIds),
        internals.dexieDeletedTable.bulkGet(docIds)
    ]);
    const docsInDb = deletedDocsInDb.slice(0);
    nonDeletedDocsInDb.forEach((doc, idx) => {
        if (doc) {
            docsInDb[idx] = doc;
        }
    });
    return docsInDb;
}
