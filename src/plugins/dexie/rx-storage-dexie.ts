import type {
    DeterministicSortComparator,
    QueryMatcher
} from 'event-reduce-js';
import type {
    RxDocumentData,
    RxJsonSchema,
    RxStorage,
    RxStorageInstanceCreationParams,
    RxStorageStatics,
    DexiePreparedQuery,
    FilledMangoQuery
} from '../../types';
import {
    Query as MingoQuery
} from 'mingo';
import { binaryMd5 } from 'pouchdb-md5';
import { getDexieSortComparator } from './dexie-helper';
import type {
    DexieSettings,
    DexieStorageInternals
} from '../../types/plugins/dexie';
import {
    createDexieStorageInstance,
    RxStorageInstanceDexie
} from './rx-storage-instance-dexie';
import { newRxError } from '../../rx-error';
import { getQueryPlan } from '../../query-planner';


export const RxStorageDexieStatics: RxStorageStatics = {
    hash(data: Buffer | Blob | string): Promise<string> {
        return new Promise(res => {
            binaryMd5(data, (digest: string) => {
                res(digest);
            });
        });
    },
    hashKey: 'md5',
    doesBroadcastChangestream() {
        return false;
    },
    prepareQuery<RxDocType>(
        schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        mutateableQuery: FilledMangoQuery<RxDocType>
    ): DexiePreparedQuery<RxDocType> {

        if (!mutateableQuery.sort) {
            throw newRxError('SNH', {
                query: mutateableQuery
            });
        }

        /**
         * Store the query plan together with the
         * prepared query to save performance.
         */
        const queryPlan = getQueryPlan(
            schema,
            mutateableQuery
        );

        return {
            query: mutateableQuery,
            queryPlan
        };
    },

    getSortComparator<RxDocType>(
        schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        preparedQuery: DexiePreparedQuery<RxDocType>
    ): DeterministicSortComparator<RxDocType> {
        return getDexieSortComparator(schema, preparedQuery.query);
    },

    getQueryMatcher<RxDocType>(
        _schema: RxJsonSchema<RxDocType>,
        preparedQuery: DexiePreparedQuery<RxDocType>
    ): QueryMatcher<RxDocumentData<RxDocType>> {
        const query = preparedQuery.query;
        const mingoQuery = new MingoQuery(query.selector);
        const fun: QueryMatcher<RxDocumentData<RxDocType>> = (doc: RxDocumentData<RxDocType>) => {
            if (doc._deleted) {
                return false;
            }
            const cursor = mingoQuery.find([doc]);
            const next = cursor.next();
            if (next) {
                return true;
            } else {
                return false;
            }
        }
        return fun;
    }

}


export class RxStorageDexie implements RxStorage<DexieStorageInternals, DexieSettings> {
    public name = 'dexie';
    public statics = RxStorageDexieStatics;

    constructor(
        public settings: DexieSettings
    ) { }

    public createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>
    ): Promise<RxStorageInstanceDexie<RxDocType>> {
        return createDexieStorageInstance(this, params, this.settings);
    }
}


export function getRxStorageDexie(
    settings: DexieSettings = {}
): RxStorageDexie {
    const storage = new RxStorageDexie(settings);
    return storage;
}
