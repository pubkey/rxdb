import type {
    FilledMangoQuery,
    MangoQuerySelector,
    MangoQuerySortPart,
    RxDocumentData,
    RxJsonSchema
} from '../../types/index.d.ts';
import {
    Sort as MongoSort,
    MongoClient
} from 'mongodb';
import { RXDB_VERSION, flatClone } from '../utils/index.ts';
import { MongoDBPreparedQuery, MongoQuerySelector } from './mongodb-types.ts';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper.ts';
export const RX_STORAGE_NAME_MONGODB = 'mongodb';

export const MONGO_OPTIONS_DRIVER_INFO = {
    driverInfo: {
        name: 'RxDB',
        version: RXDB_VERSION
    }
};

/**
 * MongoDB uses the _id field by itself (max 12 bytes)
 * so we have to substitute the _id field if
 * it is used in the RxDocType.
 */
export const MONGO_ID_SUBSTITUTE_FIELDNAME = '__id';

export function primarySwapMongoDBQuerySelector<RxDocType>(
    primaryKey: keyof RxDocType,
    selector: MangoQuerySelector<RxDocType>
): MongoQuerySelector<RxDocType> {
    selector = flatClone(selector);

    if (primaryKey !== '_id') {
        return selector as any;
    }
    if (Array.isArray(selector)) {
        return selector.map(item => primarySwapMongoDBQuerySelector(primaryKey, item)) as any;
    } else if (typeof selector === 'object') {
        const ret: any = {};
        Object.entries(selector).forEach(([k, v]) => {
            if (k === primaryKey) {
                ret._id = v;
            } else {
                if (k.startsWith('$')) {
                    ret[k] = primarySwapMongoDBQuerySelector(primaryKey, v as any);
                } else {
                    ret[k] = v;
                }
            }
        });
        return ret;
    } else {
        return selector;
    }
}


export function prepareMongoDBQuery<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    mutateableQuery: FilledMangoQuery<RxDocType>
) {
    const primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey) as any;
    const preparedQuery: MongoDBPreparedQuery<RxDocType> = {
        query: mutateableQuery,
        mongoSelector: primarySwapMongoDBQuerySelector(
            primaryKey,
            mutateableQuery.selector
        ),
        mongoSort: swapToMongoSort(mutateableQuery.sort)
    };
    return preparedQuery;
};


export function swapMongoToRxDoc<RxDocType>(
    docData: any
): RxDocumentData<RxDocType> {
    docData = flatClone(docData);
    if ((docData as any)[MONGO_ID_SUBSTITUTE_FIELDNAME]) {
        const value = (docData as any)[MONGO_ID_SUBSTITUTE_FIELDNAME];
        delete (docData as any)[MONGO_ID_SUBSTITUTE_FIELDNAME];
        (docData as any)._id = value;
    } else {
        delete (docData as any)._id;
    }
    return docData;
}

export function swapRxDocToMongo<RxDocType>(
    docData: RxDocumentData<RxDocType>
): any {
    docData = flatClone(docData);
    if ((docData as any)._id) {
        const value = (docData as any)._id;
        delete (docData as any)._id;
        (docData as any)[MONGO_ID_SUBSTITUTE_FIELDNAME] = value;
    }
    return docData;
}

export function swapToMongoSort<RxDocType>(
    sort: MangoQuerySortPart<RxDocType>[]
): MongoSort {
    const ret: any = {};
    sort.forEach(sortPart => {
        const [key, direction] = Object.entries(sortPart)[0];
        const mongoKey = key === '_id' ? MONGO_ID_SUBSTITUTE_FIELDNAME : key;
        const mongoDirection = direction === 'asc' ? 1 : -1;
        ret[mongoKey] = mongoDirection;
    });
    return ret;
}

export function getMongoDBIndexName(index: string[]): string {
    return index.join('|');
}

export const MONGO_CLIENT_CACHE = new Map<string, { client: MongoClient, refCount: number, promise: Promise<MongoClient>, closeTimeout?: ReturnType<typeof setTimeout> }>();

export async function getMongoDBClient(connection: string): Promise<MongoClient> {
    let cached = MONGO_CLIENT_CACHE.get(connection);
    if (!cached) {
        const client = new MongoClient(connection, MONGO_OPTIONS_DRIVER_INFO);
        cached = {
            client,
            refCount: 1,
            promise: client.connect().then(() => client)
        };
        MONGO_CLIENT_CACHE.set(connection, cached);
        return cached.promise;
    }
    cached.refCount++;
    if (cached.closeTimeout) {
        clearTimeout(cached.closeTimeout);
        cached.closeTimeout = undefined;
    }
    return cached.promise;
}

export async function closeMongoDBClient(connection: string): Promise<void> {
    const cached = MONGO_CLIENT_CACHE.get(connection);
    if (cached) {
        cached.refCount--;
        if (cached.refCount === 0) {
            if (cached.closeTimeout) {
                clearTimeout(cached.closeTimeout);
            }
            cached.closeTimeout = setTimeout(() => {
                const innerCached = MONGO_CLIENT_CACHE.get(connection);
                if (innerCached && innerCached.refCount === 0) {
                    MONGO_CLIENT_CACHE.delete(connection);
                    innerCached.client.close().catch(() => { });
                }
            }, 2000); // 2 second delay to allow reuse
        }
    }
}
