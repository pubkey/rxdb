import {
    filterInMemoryFields,
    massageSelector
} from 'pouchdb-selector-core';

import { RxStorage } from './rx-storate.interface';
import {
    MangoQuery,
    MangoQuerySortPart,
    PouchDBInstance,
    RxDatabase,
    PouchSettings
} from './types';
import { CompareFunction } from 'array-push-at-sort-position';
import { flatClone, adapterObject } from './util';
import { SortComparator, QueryMatcher } from 'event-reduce-js';
import { runPluginHooks } from './hooks';
import {
    PouchDB
} from './pouch-db';

export class RxStoragePouchDbClass implements RxStorage<PouchDBInstance> {

    constructor(
        public adapter: any, // TODO are there types for pouchdb adapters?
        public pouchSettings: PouchSettings = {}
    ) { }

    getSortComparator<RxDocType>(
        primaryKey: string,
        query: MangoQuery<RxDocType>
    ): SortComparator<RxDocType> {
        const sortOptions: MangoQuerySortPart[] = query.sort ? query.sort : [{
            [primaryKey]: 'asc'
        }];
        const massagedSelector = massageSelector(query.selector);
        const inMemoryFields = Object.keys(query.selector);
        const fun: CompareFunction<RxDocType> = (a: RxDocType, b: RxDocType) => {
            // TODO use createFieldSorter
            // TODO make a performance test
            const rows = [a, b].map(doc => {
                // swap primary to _id
                const cloned: any = flatClone(doc);
                const primaryValue = cloned[primaryKey];
                delete cloned[primaryKey];
                cloned._id = primaryValue;
                return {
                    doc: cloned
                };
            });
            const sortedRows: { doc: any }[] = filterInMemoryFields(
                rows,
                {
                    selector: massagedSelector,
                    sort: sortOptions
                },
                inMemoryFields
            );
            if (sortedRows[0].doc._id === rows[0].doc._id) {
                return -1;
            } else {
                return 1;
            }
        };
        return fun;
    }

    /**
     * @link https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-selector-core/src/matches-selector.js
     */
    getQueryMatcher<RxDocType>(
        primaryKey: string,
        query: MangoQuery<RxDocType>
    ): QueryMatcher<RxDocType> {
        const massagedSelector = massageSelector(query.selector);
        const fun: QueryMatcher<RxDocType> = (doc: RxDocType) => {
            // swap primary to _id
            const cloned: any = flatClone(doc);
            const primaryValue = cloned[primaryKey];
            delete cloned[primaryKey];
            cloned._id = primaryValue;
            const row = {
                doc: cloned
            };
            const rowsMatched = filterInMemoryFields(
                [row],
                { selector: massagedSelector },
                Object.keys(query.selector)
            );
            return rowsMatched && rowsMatched.length === 1;
        };
        return fun;
    }

    createStorageInstance(
        databaseName: string,
        collectionName: string,
        schemaVersion: number,
        options: any = {}
    ): PouchDBInstance {
        if (!options.pouchSettings) {
            options.pouchSettings = {};
        }

        const pouchLocation = getPouchLocation(
            databaseName,
            collectionName,
            schemaVersion
        );
        const pouchDbParameters = {
            location: pouchLocation,
            adapter: adapterObject(this.adapter),
            settings: options.pouchSettings
        };
        const pouchDBOptions = Object.assign(
            {},
            pouchDbParameters.adapter,
            this.pouchSettings,
            pouchDbParameters.settings
        );
        runPluginHooks('preCreatePouchDb', pouchDbParameters);
        return new PouchDB(
            pouchDbParameters.location,
            pouchDBOptions
        ) as any;
    }
}

/**
 * returns the pouchdb-database-name
 */
export function getPouchLocation(
    dbName: string,
    collectionName: string,
    schemaVersion: number
): string {
    const prefix = dbName + '-rxdb-' + schemaVersion + '-';
    if (!collectionName.includes('/')) {
        return prefix + collectionName;
    } else {
        // if collectionName is a path, we have to prefix the last part only
        const split = collectionName.split('/');
        const last = split.pop();

        let ret = split.join('/');
        ret += '/' + prefix + last;
        return ret;
    }
}

export function getRxStoragePouchDb(
    adapter: any,
    pouchSettings?: PouchSettings
): RxStorage<PouchDBInstance> {
    return new RxStoragePouchDbClass(adapter, pouchSettings);
}
