import {
    filterInMemoryFields,
    massageSelector
} from 'pouchdb-selector-core';
import { binaryMd5 } from 'pouchdb-md5';

import type {
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
    MangoQuerySortDirection,
    RxStorageBulkWriteResponse,
    RxJsonSchema,
    RxLocalDocumentData,
    RxStorageBulkWriteError,
    PouchWriteError,
    PouchBulkDocResultRow,
    RxStorageQueryResult,
    RxStorageInstanceCreationParams,
    ChangeStreamEvent,
    ChangeStreamOnceOptions,
    ChangeStreamOptions,
    PouchChangeRow,
    RxLocalStorageBulkWriteResponse,
    RxDocumentData,
    WithAttachments,
    RxDocumentWriteData,
    RxAttachmentWriteData,
    RxAttachmentData,
    BlobBuffer
} from './types';

import type {
    CompareFunction
} from 'array-push-at-sort-position';
import {
    flatClone,
    adapterObject,
    getFromMapOrThrow,
    getHeightOfRevision,
    promiseWait
} from './util';
import type {
    SortComparator,
    QueryMatcher
} from 'event-reduce-js';
import { runPluginHooks } from './hooks';
import {
    PouchDB
} from './pouch-db';
import { newRxError } from './rx-error';
import {
    getPrimary,
    getSchemaByObjectPath
} from './rx-schema';

import {
    fromEvent,
    Observable
} from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * prefix of local pouchdb documents
 */
export const POUCHDB_LOCAL_PREFIX: '_local/' = '_local/';
/**
 * Pouchdb stores indexes as design documents,
 * we have to filter them out and not return the
 * design documents to the outside.
 */
export const POUCHDB_DESIGN_PREFIX: '_design/' = '_design/';

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
        public readonly collectionName: string,
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

    public async bulkWrite<D>(
        overwrite: boolean,
        documents: RxLocalDocumentData<D>[]
    ): Promise<RxLocalStorageBulkWriteResponse<RxLocalDocumentData<D>>> {
        const insertDataById: Map<string, RxLocalDocumentData<D>> = new Map();

        const insertDocs: RxLocalDocumentData<D>[] = documents.map(docData => {
            insertDataById.set(docData._id, docData);
            const storeDocumentData = flatClone(docData);

            // TODO remove this check, this must be ensured via typings
            if (!storeDocumentData._id) {
                console.dir(docData);
                throw new Error('_id missing');
            }

            /**
             * add local prefix
             * Local documents always have _id as primary
             */
            storeDocumentData._id = POUCHDB_LOCAL_PREFIX + storeDocumentData._id;

            return storeDocumentData;
        });

        const pouchWriteOptions = {
            new_edits: !overwrite
        };
        const pouchResult = await this.internals.pouch.bulkDocs(insertDocs, pouchWriteOptions);

        const ret: RxLocalStorageBulkWriteResponse<RxLocalDocumentData<D>> = {
            success: new Map(),
            error: new Map()
        };

        pouchResult.forEach(resultRow => {
            resultRow.id = pouchStripLocalFlagFromPrimary(resultRow.id);
            if ((resultRow as PouchWriteError).error) {
                const writeData = getFromMapOrThrow(insertDataById, resultRow.id);
                const err: RxStorageBulkWriteError<RxLocalDocumentData<D>> = {
                    isError: true,
                    status: 409,
                    documentId: resultRow.id,
                    document: writeData as any
                };
                ret.error.set(resultRow.id, err);
            } else {
                const pushObj: RxLocalDocumentData<D> = flatClone(insertDataById.get(resultRow.id)) as any;
                pushObj._rev = (resultRow as PouchBulkDocResultRow).rev;
                // local document cannot have attachments
                pushObj._attachments = {};
                ret.success.set(resultRow.id, pushObj as any);
            }
        });

        return ret;
    }

    async findLocalDocumentsById<D>(ids: string[]): Promise<Map<string, RxLocalDocumentData<D>>> {
        const ret = new Map();

        /**
         * Pouchdb is not able to bulk-request local documents
         * with the pouch.allDocs() method.
         * so we need to get each by a single call.
         * TODO create an issue at the pouchdb repo
         */
        await Promise.all(
            ids.map(async (id) => {
                const prefixedId = POUCHDB_LOCAL_PREFIX + id;
                try {
                    const docData = await this.internals.pouch.get(prefixedId);
                    docData._id = id;
                    ret.set(id, docData);
                } catch (err) {
                    // do not add to result list on error
                }
            })
        );
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
            const ret = rowsMatched && rowsMatched.length === 1;
            return ret;
        };
        return fun;
    }


    /**
     * pouchdb has many bugs and strange behaviors
     * this functions takes a normal mango query
     * and transforms it to one that fits for pouchdb
     */
    prepareQuery(
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
                    const schemaObj = getSchemaByObjectPath(this.schema, key);
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
                query: mutateableQuery
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

        query.selector = primarySwapPouchDbQuerySelector(query.selector, primaryKey);

        return query;
    }

    public async bulkWrite(
        overwrite: boolean,
        documents: RxDocumentWriteData<RxDocType>[]
    ): Promise<
        RxStorageBulkWriteResponse<RxDocType>
    > {
        const primaryKey = getPrimary<any>(this.schema);
        const insertDataById: Map<string, RxDocumentWriteData<RxDocType>> = new Map();

        const insertDocs: (RxDocType & { _id: string; _rev: string })[] = documents.map(doc => {
            const primary: string = (doc as any)[primaryKey];

            // TODO remove this check when primary key was made required
            if (!primary) {
                console.dir(doc);
                throw new Error('primary missing ' + primaryKey);
            }
            insertDataById.set(primary, doc);

            const storeDocumentData = rxDocumentDataToPouchDocumentData(
                primaryKey,
                doc as any
            );

            return storeDocumentData;
        });

        const pouchWriteOptions = {
            new_edits: !overwrite
        };
        const pouchResult = await this.internals.pouch.bulkDocs(insertDocs, pouchWriteOptions);
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: new Map(),
            error: new Map()
        };

        await Promise.all(
            pouchResult.map(async (resultRow) => {
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
                    const insertDoc = getFromMapOrThrow(insertDataById, resultRow.id);
                    let pushObj: RxDocumentData<RxDocType> = flatClone(insertDoc) as any;
                    pushObj = pouchSwapIdToPrimary(primaryKey, pushObj);
                    pushObj._rev = (resultRow as PouchBulkDocResultRow).rev;
                    const newRevHeight = getHeightOfRevision(pushObj._rev);

                    // replace the inserted attachments with their diggest
                    pushObj._attachments = {};
                    if (!insertDoc._attachments) {
                        insertDoc._attachments = {};
                    }
                    await Promise.all(
                        Object.entries(insertDoc._attachments).map(async ([key, obj]) => {
                            if ((obj as RxAttachmentWriteData).data) {
                                const asWrite = (obj as RxAttachmentWriteData);

                                const hash = await pouchHash(asWrite.data);
                                const length = Buffer.from(asWrite.data as any).length;
                                pushObj._attachments[key] = {
                                    digest: hash,
                                    length,
                                    type: asWrite.type
                                };
                            } else {
                                pushObj._attachments[key] = obj as RxAttachmentData;
                            }
                        })
                    );

                    ret.success.set(resultRow.id, pushObj);
                }
            })
        );

        /**
         * We have to always await two ticks
         * to ensure pouchdb fires the write to the event stream
         * and does not miss out when multiple writes happen to the same document.
         */
        await promiseWait(0).then(() => promiseWait(0));

        return ret;
    }

    public async query(
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>> {
        const primaryKey = getPrimary<any>(this.schema);

        const findResult = await this.internals.pouch.find<RxDocType>(preparedQuery);
        const ret: RxStorageQueryResult<RxDocType> = {
            documents: findResult.docs.map(pouchDoc => {
                const useDoc = pouchDocumentDataToRxDocumentData(
                    primaryKey,
                    pouchDoc
                );
                return useDoc;
            })
        };
        return ret;
    }

    async getAttachmentData(
        documentId: string,
        attachmentId: string
    ): Promise<BlobBuffer> {
        const attachmentData = await this.internals.pouch.getAttachment(
            documentId,
            attachmentId
        );
        return attachmentData;
    }

    async findDocumentsById(ids: string[]): Promise<Map<string, RxDocumentData<RxDocType>>> {
        const primaryKey = getPrimary<any>(this.schema);
        const pouchResult = await this.internals.pouch.allDocs({
            include_docs: true,
            keys: ids
        });

        const ret = new Map();
        pouchResult.rows
            .filter(row => !!row.doc)
            .forEach(row => {
                let docData = row.doc;
                docData = pouchDocumentDataToRxDocumentData(
                    primaryKey,
                    docData
                );
                ret.set(row.id, docData);
            });
        return ret;
    }

    changeStream(
        options: ChangeStreamOptions
    ): Observable<ChangeStreamEvent<RxDocType>> {
        const primaryKey = getPrimary<any>(this.schema);
        const obs = fromEvent(
            this.internals.pouch
                .changes({
                    since: options.startSequence,
                    limit: options.limit,
                    live: true,
                    include_docs: true
                }),
            'change'
        ).pipe(
            map((ar: any) => ar[0]), // rxjs6.x fires an array for whatever reason
            map((pouchRow: PouchChangeRow) => {
                return pouchChangeRowToChangeStreamEvent<RxDocType>(
                    primaryKey,
                    pouchRow
                );
            })
        );

        return obs;
    }

    async getChanges(
        options: ChangeStreamOnceOptions
    ): Promise<{
        changes: ChangeStreamEvent<RxDocType>[];
        lastSequence: number;
    }> {
        const primaryKey = getPrimary<any>(this.schema);

        const pouchResults = await this.internals.pouch.changes({
            live: false,
            limit: options.limit,
            include_docs: true,
            descending: options.order === 'asc' ? false : true,
            since: options.startSequence
        });
        const lastSequence = pouchResults.last_seq;

        const changes: ChangeStreamEvent<RxDocType>[] = pouchResults.results
            .filter(pouchRow => !pouchRow.id.startsWith(POUCHDB_DESIGN_PREFIX))
            .map(pouchRow => {
                return pouchChangeRowToChangeStreamEvent(
                    primaryKey,
                    pouchRow
                );
            });

        return {
            changes,
            lastSequence
        };
    }
}

export class RxStoragePouch implements RxStorage<PouchStorageInternals, PouchSettings> {
    public name: string = 'pouchdb';

    constructor(
        public adapter: any,
        public pouchSettings: PouchSettings = {}
    ) { }

    /**
     * create the same diggest as an attachment with that data
     * would have created by pouchdb internally.
     */
    public hash(data: Buffer | Blob | string): Promise<string> {
        return pouchHash(data);
    }

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
        params: RxStorageInstanceCreationParams<RxDocType, PouchSettings>
    ): Promise<RxStorageInstancePouch<RxDocType>> {
        const pouchLocation = getPouchLocation(
            params.databaseName,
            params.collectionName,
            params.schema.version
        );
        const pouch = await this.createPouch(
            pouchLocation,
            params.options
        );

        await createIndexesOnPouch(pouch, params.schema);

        return new RxStorageInstancePouch(
            params.databaseName,
            params.collectionName,
            params.schema,
            {
                pouch
            },
            params.options
        );
    }

    public async createKeyObjectStorageInstance(
        databaseName: string,
        collectionName: string,
        options: PouchSettings
    ): Promise<RxStorageKeyObjectInstancePouch> {
        const useOptions = flatClone(options);
        // no compaction because this only stores local documents
        useOptions.auto_compaction = false;
        useOptions.revs_limit = 1;

        const pouchLocation = getPouchLocation(
            databaseName,
            collectionName,
            0
        );
        const pouch = await this.createPouch(
            pouchLocation,
            options
        );

        return new RxStorageKeyObjectInstancePouch(
            databaseName,
            collectionName,
            {
                pouch
            },
            options
        );
    }
}

export function pouchHash(data: Buffer | Blob | string): Promise<string> {
    return new Promise(res => {
        binaryMd5(data, (digest: string) => {
            res('md5-' + digest);
        });
    });
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

export function pouchDocumentDataToRxDocumentData<T>(
    primaryKey: string,
    pouchDoc: WithAttachments<T>
): RxDocumentData<T> {
    let useDoc: RxDocumentData<T> = pouchSwapIdToPrimary(primaryKey, pouchDoc);

    // always flat clone becaues we mutate the _attachments property.
    useDoc = flatClone(useDoc);

    useDoc._attachments = {};
    if (pouchDoc._attachments) {
        Object.entries(pouchDoc._attachments).forEach(([key, value]) => {
            useDoc._attachments[key] = {
                digest: value.digest,
                type: value.content_type,
                length: value.length
            };
        });
    }

    return useDoc;
}

export function rxDocumentDataToPouchDocumentData<T>(
    primaryKey: string,
    doc: RxDocumentData<T>
): WithAttachments<T> {
    let pouchDoc: WithAttachments<T> = pouchSwapPrimaryToId(primaryKey, doc);

    // always flat clone becaues we mutate the _attachments property.
    pouchDoc = flatClone(pouchDoc);

    pouchDoc._attachments = {};
    if (doc._attachments) {
        Object.entries(doc._attachments).forEach(([key, value]) => {
            const useValue: RxAttachmentWriteData & RxAttachmentData = value as any;
            if (useValue.data) {
                (pouchDoc as any)._attachments[key] = {
                    data: useValue.data,
                    content_type: useValue.type
                };
            } else {
                (pouchDoc as any)._attachments[key] = {
                    digest: useValue.digest,
                    content_type: useValue.type,
                    length: useValue.length,
                    stub: true
                };
            }
        });
    }

    return pouchDoc;
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
    // TODO remove this check once the migration is done
    if (!str.startsWith(POUCHDB_LOCAL_PREFIX)) {
        throw new Error('does not start with local prefix');
    }
    return str.substring(POUCHDB_LOCAL_PREFIX.length);
}


export function pouchChangeRowToChangeStreamEvent<DocumentData>(
    primaryKey: string,
    pouchRow: PouchChangeRow
): ChangeStreamEvent<DocumentData> {
    const doc = pouchRow.doc;
    if (!doc) {
        console.dir(pouchRow);
        throw new Error('this should never happen');
    }
    const revHeight = getHeightOfRevision(doc._rev);

    if (pouchRow.deleted) {
        const previousDoc = flatClone(
            pouchDocumentDataToRxDocumentData(
                primaryKey,
                pouchRow.doc as any
            )
        );
        delete previousDoc._deleted;
        const ev: ChangeStreamEvent<DocumentData> = {
            sequence: pouchRow.seq,
            id: pouchRow.id,
            operation: 'DELETE',
            doc: null,
            previous: previousDoc
        };
        return ev;
    } else if (revHeight === 1) {
        const ev: ChangeStreamEvent<DocumentData> = {
            sequence: pouchRow.seq,
            id: pouchRow.id,
            operation: 'INSERT',
            doc: pouchDocumentDataToRxDocumentData(
                primaryKey,
                pouchRow.doc as any
            ),
            previous: null
        };
        return ev;
    } else {
        const ev: ChangeStreamEvent<DocumentData> = {
            sequence: pouchRow.seq,
            id: pouchRow.id,
            operation: 'UPDATE',
            doc: pouchDocumentDataToRxDocumentData(
                primaryKey,
                pouchRow.doc as any
            ),
            previous: 'UNKNOWN'
        };
        return ev;
    }
}


/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */
export function primarySwapPouchDbQuerySelector(selector: any, primaryKey: string): any {
    if (primaryKey === '_id') {
        return selector;
    }
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
 * Creates the indexes of the schema inside of the pouchdb instance.
 * Will skip indexes that already exist.
 */
export async function createIndexesOnPouch(
    pouch: PouchDBInstance,
    schema: RxJsonSchema
): Promise<void> {
    if (!schema.indexes) {
        return;
    }

    const primaryKey = getPrimary<any>(schema);

    const before = await pouch.getIndexes();
    const existingIndexes: Set<string> = new Set(
        before.indexes.map(idx => idx.name)
    );

    await Promise.all(
        schema.indexes.map(async (indexMaybeArray) => {
            let indexArray: string[] = Array.isArray(indexMaybeArray) ? indexMaybeArray : [indexMaybeArray];

            /**
             * replace primary key with _id
             * because that is the enforced primary key on pouchdb.
             */
            indexArray = indexArray.map(key => {
                if (key === primaryKey) {
                    return '_id';
                } else {
                    return key;
                }
            });

            const indexName = 'idx-rxdb-index-' + indexArray.join(',');
            if (existingIndexes.has(indexName)) {
                // index already exists
                return;
            }
            /**
             * TODO we might have even better performance by doing a bulkDocs
             * on index creation
             */
            return pouch.createIndex({
                name: indexName,
                ddoc: indexName,
                index: {
                    fields: indexArray
                }
            });
        })
    );
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
