import type {
    DeterministicSortComparator
} from 'event-reduce-js';
import mingo from 'mingo';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import type {
    MangoQuery,
    RxJsonSchema
} from '../../types';
import { Dexie } from 'dexie';
import { DexieSettings } from '../../types';
import { flatClone } from '../../util';

export const CHANGES_COLLECTION_SUFFIX = '-rxdb-changes';
const DEXIE_DB_BY_NAME: Map<string, Dexie> = new Map();
export function getDexieDbByName(dbName: string, settings: DexieSettings): Dexie {
    let db = DEXIE_DB_BY_NAME.get(dbName);
    if (!db) {
        console.log('create db');
        console.dir(settings);

        db = new Dexie(dbName, settings);
        DEXIE_DB_BY_NAME.set(dbName, db);
    }
    return db;
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
