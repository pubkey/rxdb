import type {
    DeterministicSortComparator,
    QueryMatcher
} from 'event-reduce-js';
import type {
    MangoQuery,
    RxDocumentWriteData,
    RxJsonSchema,
    RxKeyObjectStorageInstanceCreationParams,
    RxStorage,
    RxStorageInstanceCreationParams,
    RxStorageStatics
} from '../../types';
import {
    Query as MingoQuery
} from 'mingo';
import { binaryMd5 } from 'pouchdb-md5';
import { getDexieSortComparator } from './dexie-helper';
import { firstPropertyNameOfObject, flatClone } from '../../util';
import { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie';
import { createDexieStorageInstance, RxStorageInstanceDexie } from './rx-storage-instance-dexie';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { createDexieKeyObjectStorageInstance, RxStorageKeyObjectInstanceDexie } from './rx-storage-key-object-instance-dexie';

export const RxStorageDexieStatics: RxStorageStatics = {
    hash(data: Buffer | Blob | string): Promise<string> {
        return new Promise(res => {
            binaryMd5(data, (digest: string) => {
                res(digest);
            });
        });
    },
    hashKey: 'md5',

    prepareQuery<RxDocType>(
        schema: RxJsonSchema<RxDocType>,
        mutateableQuery: MangoQuery<RxDocType>
    ) {
        const primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
        if (Object.keys(mutateableQuery.selector).length > 0) {
            mutateableQuery.selector = {
                $and: [
                    {
                        _deleted: {
                            $ne: true
                        }
                    },
                    mutateableQuery.selector
                ]
            };
        } else {
            mutateableQuery.selector = {
                _deleted: {
                    $ne: true
                }
            };
        }

        /**
         * To ensure a deterministic sorting,
         * we have to ensure the primary key is always part
         * of the sort query.
         * TODO this should be done by RxDB instead so we
         * can ensure it in all storage implementations.
         */
        if (!mutateableQuery.sort) {
            mutateableQuery.sort = [{ [primaryKey]: 'asc' }] as any;
        } else {
            const isPrimaryInSort = mutateableQuery.sort
                .find(p => firstPropertyNameOfObject(p) === primaryKey);
            if (!isPrimaryInSort) {
                mutateableQuery.sort.push({ [primaryKey]: 'asc' } as any);
            }
        }

        return mutateableQuery;
    },

    getSortComparator<RxDocType>(
        schema: RxJsonSchema<RxDocType>,
        query: MangoQuery<RxDocType>
    ): DeterministicSortComparator<RxDocType> {
        return getDexieSortComparator(schema, query);
    },

    getQueryMatcher<RxDocType>(
        _schema: RxJsonSchema<RxDocType>,
        query: MangoQuery<RxDocType>
    ): QueryMatcher<RxDocumentWriteData<RxDocType>> {
        const mingoQuery = new MingoQuery(query.selector);
        const fun: QueryMatcher<RxDocumentWriteData<RxDocType>> = (doc: RxDocumentWriteData<RxDocType>) => {
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

    public createKeyObjectStorageInstance(
        params: RxKeyObjectStorageInstanceCreationParams<DexieSettings>
    ): Promise<RxStorageKeyObjectInstanceDexie> {
        // ensure we never mix up key-object data with normal storage documents.
        const useParams = flatClone(params);
        useParams.collectionName = params.collectionName + '-key-object';

        return createDexieKeyObjectStorageInstance(
            this,
            params,
            this.settings
        );
    }
}


export function getRxStorageDexie(
    settings: DexieSettings = {}
): RxStorageDexie {
    const storage = new RxStorageDexie(settings);
    return storage;
}
