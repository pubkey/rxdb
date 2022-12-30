import type {
    DeterministicSortComparator,
    QueryMatcher
} from 'event-reduce-js';
import lokijs from 'lokijs';
import type {
    FilledMangoQuery,
    LokiDatabaseSettings,
    LokiSettings,
    LokiStorageInternals,
    MangoQuery,
    RxDocumentData,
    RxDocumentWriteData,
    RxJsonSchema,
    RxStorage,
    RxStorageInstanceCreationParams,
    RxStorageStatics
} from '../../types';
import {
    ensureNotFalsy,
    flatClone
} from '../utils';
import {
    createLokiStorageInstance,
    RxStorageInstanceLoki
} from './rx-storage-instance-loki';
import { getLokiSortComparator, RX_STORAGE_NAME_LOKIJS } from './lokijs-helper';
import type { LeaderElector } from 'broadcast-channel';

import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import { DEFAULT_CHECKPOINT_SCHEMA } from '../../rx-schema-helper';

export const RxStorageLokiStatics: RxStorageStatics = {
    prepareQuery<RxDocType>(
        _schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        mutateableQuery: FilledMangoQuery<RxDocType>
    ) {
        mutateableQuery = flatClone(mutateableQuery);
        if (Object.keys(ensureNotFalsy(mutateableQuery.selector)).length > 0) {
            mutateableQuery.selector = {
                $and: [
                    {
                        _deleted: false
                    },
                    mutateableQuery.selector
                ]
            } as any;
        } else {
            mutateableQuery.selector = {
                _deleted: false
            } as any;
        }

        return mutateableQuery;
    },


    getSortComparator<RxDocType>(
        schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        query: MangoQuery<RxDocType>
    ): DeterministicSortComparator<RxDocType> {
        return getLokiSortComparator(schema, query);
    },

    /**
     * Returns a function that determines if a document matches a query selector.
     * It is important to have the exact same logix as lokijs uses, to be sure
     * that the event-reduce algorithm works correct.
     * But LokisJS does not export such a function, the query logic is deep inside of
     * the Resultset prototype.
     * Because I am lazy, I do not copy paste and maintain that code.
     * Instead we create a fake Resultset and apply the prototype method Resultset.prototype.find(),
     * same with Collection.
     */
    getQueryMatcher<RxDocType>(
        _schema: RxJsonSchema<RxDocType>,
        query: MangoQuery<RxDocType>
    ): QueryMatcher<RxDocumentWriteData<RxDocType>> {
        const fun: QueryMatcher<RxDocumentWriteData<RxDocType>> = (doc: RxDocumentWriteData<RxDocType>) => {
            if (doc._deleted) {
                return false;
            }
            const docWithResetDeleted = flatClone(doc);
            docWithResetDeleted._deleted = !!docWithResetDeleted._deleted;

            const fakeCollection = {
                data: [docWithResetDeleted],
                binaryIndices: {}
            };
            Object.setPrototypeOf(fakeCollection, (lokijs as any).Collection.prototype);
            const fakeResultSet: any = {
                collection: fakeCollection
            };
            Object.setPrototypeOf(fakeResultSet, (lokijs as any).Resultset.prototype);
            fakeResultSet.find(query.selector, true);

            const ret = fakeResultSet.filteredrows.length > 0;
            return ret;
        };
        return fun;
    },

    checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA
};

export class RxStorageLoki implements RxStorage<LokiStorageInternals, LokiSettings> {
    public name = RX_STORAGE_NAME_LOKIJS;
    public statics = RxStorageLokiStatics;

    /**
     * Create one leader elector by db name.
     * This is done inside of the storage, not globally
     * to make it easier to test multi-tab behavior.
     */
    public leaderElectorByLokiDbName: Map<string, {
        leaderElector: LeaderElector;
        /**
         * Count the instances that currently use the elector.
         * If is goes to zero again, the elector can be closed.
         */
        intancesCount: number;
    }> = new Map();

    constructor(
        public databaseSettings: LokiDatabaseSettings
    ) { }

    public createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>
    ): Promise<RxStorageInstanceLoki<RxDocType>> {
        ensureRxStorageInstanceParamsAreCorrect(params);
        return createLokiStorageInstance(this, params, this.databaseSettings);
    }
}

export function getRxStorageLoki(
    databaseSettings: LokiDatabaseSettings = {}
): RxStorageLoki {
    const storage = new RxStorageLoki(databaseSettings);
    return storage;
}
