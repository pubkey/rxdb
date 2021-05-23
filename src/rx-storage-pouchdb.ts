import {
    filterInMemoryFields,
    massageSelector
} from 'pouchdb-selector-core';

import {
    RxStorage,
    PreparedQuery,
    RxStorageInstance,
    RxStorageKeyObjectInstance
} from './rx-storage.interface';
import type {
    MangoQuery,
    MangoQuerySortPart,
    PouchDBInstance,
    PouchSettings,
    RxQuery,
    MangoQuerySortDirection,
    RxStorageBulkWriteResponse,
    RxJsonSchema,
    RxLocalDocumentData,
    WithWriteRevision,
    WithRevision,
    RxStorageBulkWriteError,
    PouchWriteError,
    PouchBulkDocResultRow,
    RxStorageQueryResult
} from './types';
import { CompareFunction } from 'array-push-at-sort-position';
import { flatClone, adapterObject, ensureNotFalsy, getFromMapOrThrow, generateId } from './util';
import { SortComparator, QueryMatcher } from 'event-reduce-js';
import { runPluginHooks } from './hooks';
import {
    PouchDB
} from './pouch-db';
import { newRxError } from './rx-error';
import { getPrimary, getPseudoSchemaForVersion } from './rx-schema';


/**
 * prefix of local pouchdb documents
 */
export const POUCHDB_LOCAL_PREFIX: '_local/' = '_local/';

export type PouchStorageInternals = {
    pouch: PouchDBInstance;
};

/**
 * Used to check in tests if all instances have been cleaned up.
 */
export const OPEN_POUCHDB_STORAGE_INSTANCES: Set<RxStorageKeyObjectInstancePouch | RxStorageInstancePouch<any>> = new Set();

export class RxStorageKeyObjectInstancePouch implements RxStorageKeyObjectInstance<PouchStorageInternals, PouchSettings> {
    constructor(
        public readonly databaseName: string,
        public readonly internals: Readonly<PouchStorageInternals>,
        public readonly options: Readonly<PouchSettings>
    ) {
        OPEN_POUCHDB_STORAGE_INSTANCES.add(this);
    }

    close(): Promise<void> {
        OPEN_POUCHDB_STORAGE_INSTANCES.delete(this);
        // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
        // await this.internals.pouch.close();
        return Promise.resolve();
    }

    async remove() {
        await this.internals.pouch.destroy();
    }

    public async bulkWrite(
        overwrite: boolean,
        documents: WithWriteRevision<RxLocalDocumentData>[]
    ): Promise<RxStorageBulkWriteResponse<RxLocalDocumentData>> {

        const insertDataById: Map<string, WithWriteRevision<RxLocalDocumentData>> = new Map();

        const insertDocs: RxLocalDocumentData[] = documents.map(docData => {
            insertDataById.set(docData._id, docData);
            const storeDocumentData = flatClone(docData);

            /**
             * add local prefix
             * Local documents always have _id as primary
             */
            storeDocumentData._id = POUCHDB_LOCAL_PREFIX + storeDocumentData._id;

            // swap out _revision with pouchdbs _rev key
            const revision = storeDocumentData._revision;
            delete storeDocumentData._revision;
            storeDocumentData._rev = revision;

            return storeDocumentData;
        });

        const pouchResult = await this.internals.pouch.bulkDocs(insertDocs);
        const ret: RxStorageBulkWriteResponse<RxLocalDocumentData> = {
            success: new Map(),
            error: new Map()
        };

        pouchResult.forEach(resultRow => {
            resultRow.id = pouchStripLocalFlagFromPrimary(resultRow.id);
            if ((resultRow as PouchWriteError).error) {
                const writeData = getFromMapOrThrow(insertDataById, resultRow.id);
                const err: RxStorageBulkWriteError<RxLocalDocumentData> = {
                    isError: true,
                    status: 409,
                    documentId: resultRow.id,
                    document: writeData
                };
                ret.error.set(resultRow.id, err);
            } else {
                const pushObj: WithRevision<RxLocalDocumentData> = flatClone(insertDataById.get(resultRow.id)) as any;
                pushObj._rev = (resultRow as PouchBulkDocResultRow).rev;
                ret.success.set(resultRow.id, pushObj);
            }
        });

        return ret;
    }
}

export class RxStorageInstancePouch<RxDocType> implements RxStorageInstance<
    RxDocType,
    PouchStorageInternals,
    PouchSettings
> {
    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<any>>,
        public readonly internals: Readonly<PouchStorageInternals>,
        public readonly options: Readonly<PouchSettings>
    ) {
        OPEN_POUCHDB_STORAGE_INSTANCES.add(this);
    }

    close() {
        OPEN_POUCHDB_STORAGE_INSTANCES.delete(this);

        // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
        // await this.internals.pouch.close();
        return Promise.resolve();
    }

    async remove() {
        await this.internals.pouch.destroy();
    }

    getSortComparator(
        query: MangoQuery<RxDocType>
    ): SortComparator<RxDocType> {
        const primaryKey = getPrimary<any>(this.schema);
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
    getQueryMatcher(
        query: MangoQuery<RxDocType>
    ): QueryMatcher<RxDocType> {
        const primaryKey = getPrimary<any>(this.schema);
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


    /**
     * pouchdb has many bugs and strange behaviors
     * this functions takes a normal mango query
     * and transforms it to one that fits for pouchdb
     */
    prepareQuery(
        rxQuery: RxQuery<RxDocType>,
        mutateableQuery: MangoQuery<RxDocType>
    ): PreparedQuery<RxDocType> {
        const primaryKey = getPrimary<any>(this.schema);
        const query = mutateableQuery;

        /**
         * because sort wont work on unused keys we have to workaround
         * so we add the key to the selector if necessary
         * @link https://github.com/nolanlawson/pouchdb-find/issues/204
         */
        if (query.sort) {
            query.sort.forEach(sortPart => {
                const key = Object.keys(sortPart)[0];
                const comparisonOperators = ['$gt', '$gte', '$lt', '$lte'];
                const keyUsed = query.selector[key] && Object.keys(query.selector[key]).some(op => comparisonOperators.includes(op)) || false;
                if (!keyUsed) {
                    const schemaObj = rxQuery.collection.schema.getSchemaByObjectPath(key);
                    if (!schemaObj) {
                        throw newRxError('QU5', {
                            key
                        });
                    }
                    if (!query.selector[key]) {
                        query.selector[key] = {};
                    }
                    switch (schemaObj.type) {
                        case 'number':
                        case 'integer':
                            // TODO change back to -Infinity when issue resolved
                            // @link https://github.com/pouchdb/pouchdb/issues/6454
                            // -Infinity does not work since pouchdb 6.2.0
                            query.selector[key].$gt = -9999999999999999999999999999;
                            break;
                        case 'string':
                            /**
                             * strings need an empty string, see
                             * @link https://github.com/pubkey/rxdb/issues/585
                             */
                            if (typeof query.selector[key] !== 'string') {
                                query.selector[key].$gt = '';
                            }
                            break;
                        default:
                            query.selector[key].$gt = null;
                            break;
                    }
                }
            });
        }

        // regex does not work over the primary key
        // TODO move this to dev mode
        if (query.selector[primaryKey] && query.selector[primaryKey].$regex) {
            throw newRxError('QU4', {
                path: primaryKey,
                query: rxQuery.mangoQuery
            });
        }

        // primary-swap sorting
        if (query.sort) {
            const sortArray: MangoQuerySortPart<RxDocType>[] = query.sort.map(part => {
                const key = Object.keys(part)[0];
                const direction: MangoQuerySortDirection = Object.values(part)[0];
                const useKey = key === primaryKey ? '_id' : key;
                const newPart = { [useKey]: direction };
                return newPart as any;
            });
            query.sort = sortArray;
        }

        // strip empty selectors
        Object.entries(query.selector).forEach(([k, v]) => {
            if (
                typeof v === 'object' &&
                v !== null &&
                !Array.isArray(v) &&
                Object.keys((v as any)).length === 0
            ) {
                delete query.selector[k];
            }
        });


        if (primaryKey !== '_id') {
            query.selector = primarySwapPouchDbQuerySelector(query.selector, primaryKey);
        }

        return query;
    }

    public async bulkWrite(
        overwrite: boolean,
        documents: WithWriteRevision<RxDocType>[]
    ): Promise<
        RxStorageBulkWriteResponse<RxDocType>
    > {
        const primaryKey = getPrimary<any>(this.schema);
        const insertDataById: Map<string, WithWriteRevision<RxDocType>> = new Map();

        const insertDocs: (RxDocType & { _id: string; _rev: string })[] = documents.map(doc => {
            const primary: string = (doc as any)[primaryKey];

            // TODO remove this check when primary key was made required
            if (!primary) {
                console.dir(doc);
                throw new Error('primary missing ' + primaryKey);
            }
            insertDataById.set(primary, doc);

            let storeDocumentData: any = flatClone(doc);
            storeDocumentData = pouchSwapPrimaryToId(primaryKey, storeDocumentData);

            return storeDocumentData;
        });

        const pouchResult = await this.internals.pouch.bulkDocs(insertDocs);

        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: new Map(),
            error: new Map()
        };

        pouchResult.forEach(resultRow => {
            if ((resultRow as PouchWriteError).error) {
                const writeData = getFromMapOrThrow(insertDataById, resultRow.id);
                const err: RxStorageBulkWriteError<RxDocType> = {
                    isError: true,
                    status: 409,
                    documentId: resultRow.id,
                    document: writeData
                };
                ret.error.set(resultRow.id, err);
            } else {
                let pushObj: WithRevision<RxDocType> = flatClone(insertDataById.get(resultRow.id)) as any;
                pushObj = pouchSwapIdToPrimary(primaryKey, pushObj);
                pushObj._rev = (resultRow as PouchBulkDocResultRow).rev;
                ret.success.set(resultRow.id, pushObj);
            }
        });

        return ret;
    }

    public async query(
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>> {
        const primaryKey = getPrimary<any>(this.schema);
        const findResult = await this.internals.pouch.find<RxDocType>(preparedQuery);

        const ret: RxStorageQueryResult<RxDocType> = {
            documents: findResult.docs.map(doc => {
                doc = pouchSwapIdToPrimary(primaryKey, doc);
                return doc;
            })
        };
        return ret;
    }
}

export class RxStoragePouch implements RxStorage<PouchStorageInternals, PouchSettings> {
    public name: string = 'pouchdb';

    constructor(
        public adapter: any,
        public pouchSettings: PouchSettings = {}
    ) { }

    private async createPouch(
        location: string,
        options: PouchSettings
    ): Promise<PouchDBInstance> {
        const pouchDbParameters = {
            location: location,
            adapter: adapterObject(this.adapter),
            settings: options
        };
        const pouchDBOptions = Object.assign(
            {},
            pouchDbParameters.adapter,
            this.pouchSettings,
            pouchDbParameters.settings
        );
        runPluginHooks('preCreatePouchDb', pouchDbParameters);
        const pouch = new PouchDB(
            pouchDbParameters.location,
            pouchDBOptions
        ) as PouchDBInstance;

        // TODO only run this if the pouchdb instance was not created before
        await pouch.info();

        return pouch;
    }

    public async createStorageInstance<RxDocType>(
        databaseName: string,
        collectionName: string,
        schema: RxJsonSchema,
        options: PouchSettings
    ): Promise<RxStorageInstancePouch<RxDocType>> {
        const pouchLocation = getPouchLocation(
            databaseName,
            collectionName,
            schema.version
        );
        const pouch = await this.createPouch(
            pouchLocation,
            options
        );

        // TODO create indexes here

        return new RxStorageInstancePouch(
            databaseName,
            collectionName,
            schema,
            {
                pouch
            },
            options
        );
    }

    public async createKeyObjectStorageInstance(
        databaseName: string,
        options: PouchSettings
    ): Promise<RxStorageKeyObjectInstancePouch> {
        const useOptions = flatClone(options);
        // no compaction because this only stores local documents
        useOptions.auto_compaction = false;
        useOptions.revs_limit = 1;

        const pouch = await this.createPouch(
            databaseName,
            options
        );

        return new RxStorageKeyObjectInstancePouch(
            databaseName,
            {
                pouch
            },
            options
        );
    }
}

export function pouchSwapIdToPrimary(
    primaryKey: string,
    docData: any
): any {

    if (primaryKey === '_id' || docData[primaryKey]) {
        return docData;
    }
    docData = flatClone(docData);
    docData[primaryKey] = docData._id;
    delete docData._id;

    return docData;
}

export function pouchSwapPrimaryToId(
    primaryKey: string,
    docData: any
): any {
    if (primaryKey === '_id') {
        return docData;
    }
    const ret: any = {};
    Object
        .entries(docData)
        .forEach(entry => {
            const newKey = entry[0] === primaryKey ? '_id' : entry[0];
            ret[newKey] = entry[1];
        });
    return ret;
}

/**
 * in:  '_local/foobar'
 * out: 'foobar'
 */
export function pouchStripLocalFlagFromPrimary(str: string): string {
    return str.substring(POUCHDB_LOCAL_PREFIX.length);
}


/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */
export function primarySwapPouchDbQuerySelector(selector: any, primaryKey: string): any {
    if (Array.isArray(selector)) {
        return selector.map(item => primarySwapPouchDbQuerySelector(item, primaryKey));
    } else if (typeof selector === 'object') {
        const ret: any = {};
        Object.entries(selector).forEach(([k, v]) => {
            if (k === primaryKey) {
                ret._id = v;
            } else {
                if (k.startsWith('$')) {
                    ret[k] = primarySwapPouchDbQuerySelector(v, primaryKey);
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

export function getRxStoragePouch(
    adapter: any,
    pouchSettings?: PouchSettings
): RxStoragePouch {
    if (!adapter) {
        throw new Error('adapter missing');
    }
    const storage = new RxStoragePouch(adapter, pouchSettings);
    return storage;
}
