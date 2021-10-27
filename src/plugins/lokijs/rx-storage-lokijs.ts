import {
    BlobBuffer,
    BulkWriteLocalRow,
    BulkWriteRow,
    ChangeStreamOnceOptions,
    LokiDatabaseSettings,
    LokiSettings,
    MangoQuery,
    MangoQuerySortDirection,
    MangoQuerySortPart,
    RxDocumentData,
    RxJsonSchema,
    RxLocalDocumentData,
    RxLocalStorageBulkWriteResponse,
    RxStorage,
    RxStorageBulkWriteError,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageKeyObjectInstance,
    RxStorageQueryResult
} from '../../types';
import lokijs, {
    LokiMemoryAdapter,
    Collection
} from 'lokijs';
import type {
    CompareFunction
} from 'array-push-at-sort-position';
import { createRevision, getHeightOfRevision, hash, parseRevision, promiseWait } from '../../util';
import { SortComparator, QueryMatcher } from 'event-reduce-js';
import { Observable } from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { newRxError } from '../../rx-error';

// TODO import instead of require
// const LokiIndexedAdapter = require('lokijs/src/loki-indexed-adapter');

/**
 * Used to check in tests if all instances have been cleaned up.
 */
export const OPEN_LOKIJS_STORAGE_INSTANCES: Set<RxStorageKeyObjectInstanceLoki | RxStorageInstanceLoki<any>> = new Set();

export type LokiStorageInternals = {
    loki: Loki;
    collection: Collection
};



const LOKI_DATABASE_BY_NAME: Map<string, Loki> = new Map();
function getLokiDatabase(databaseName: string, settings: Partial<LokiConstructorOptions>): Loki {
    let db = LOKI_DATABASE_BY_NAME.get(databaseName);

    // TODO call loadDatabase() to ensure everything is loaded from persistence adapters.

    if (!db) {
        const useSettings = Object.assign(
            // defaults
            {
                autosave: true,
                autosaveInterval: 500,
                verbose: true
            },
            settings
        );
        db = new lokijs(
            databaseName + '.db',
            useSettings
        );
        LOKI_DATABASE_BY_NAME.set(databaseName, db);
    }
    return db;
}

export class RxStorageLoki implements RxStorage<LokiStorageInternals, LokiSettings> {
    public name = 'lokijs';

    constructor(
        public databseSettings: LokiDatabaseSettings = {}
    ) { }

    hash(data: Buffer | Blob | string): Promise<string> {
        return Promise.resolve(hash(data));
    }

    async createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>
    ): Promise<RxStorageInstanceLoki<RxDocType>> {
        const db = getLokiDatabase(params.databaseName, params.options.database);

        /**
         * Construct loki indexes from RxJsonSchema indexes.
         * TODO what about compound indexes? Are they possible in lokijs?
         */
        const indices: string[] = [];
        if (params.schema.indexes) {
            params.schema.indexes.forEach(idx => {
                if (!Array.isArray(idx)) {
                    indices.push(idx);
                }
            });
        }
        /**
         * LokiJS has no concept of custom primary key, they use a number-id that is generated.
         * To be able to query fast by primary key, we always add an index to the primary.
         */
        const primaryKey = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);
        indices.push(primaryKey as string);

        /**
         * TODO disable stuff we do not need from CollectionOptions
         */
        const collectionOptions: Partial<CollectionOptions<RxDocumentData<RxDocType>>> = Object.assign(
            {},
            params.options.collection,
            {
                indices: indices as string[],
                unique: [primaryKey]
            } as any
        );

        const collection: Collection = db.addCollection(
            params.collectionName,
            collectionOptions as any
        );

        const instance = new RxStorageInstanceLoki(
            params.databaseName,
            params.collectionName,
            params.schema,
            {
                loki: db,
                collection
            },
            params.options
        );

        return instance;
    }

    public async createKeyObjectStorageInstance(
        databaseName: string,
        collectionName: string,
        options: LokiSettings
    ): Promise<RxStorageKeyObjectInstanceLoki> {
        const db = getLokiDatabase(databaseName, options.database);
        const lokiCollectionName = collectionName + '-rxdb-local';

        // TODO disable stuff we do not need from CollectionOptions
        const collectionOptions: Partial<CollectionOptions<RxLocalDocumentData>> = Object.assign(
            {},
            options.collection,
            {
                indices: [],
                unique: ['_id']
            } as any
        );

        const collection: Collection = db.addCollection(
            lokiCollectionName,
            collectionOptions
        );

        return new RxStorageKeyObjectInstanceLoki(
            databaseName,
            collectionName,
            {
                loki: db,
                collection
            },
            options
        );
    }
}

export class RxStorageInstanceLoki<RxDocType> implements RxStorageInstance<
    RxDocType,
    LokiStorageInternals,
    LokiSettings
> {

    public readonly primaryPath: keyof RxDocType;

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocType>>,
        public readonly internals: Readonly<LokiStorageInternals>,
        public readonly options: Readonly<LokiSettings>
    ) {
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
        OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
    }

    prepareQuery(mutateableQuery: MangoQuery<RxDocType>) {
        throw new Error('Method not implemented.');
    }
    getSortComparator(query: MangoQuery<RxDocType>): SortComparator<RxDocType> {
        if (!query.sort) {
            throw new Error('sort missing, we should at least sort by primaryKey');
        }

        const sort: MangoQuerySortPart<RxDocType>[] = query.sort;

        const fun: CompareFunction<RxDocType> = (a: RxDocType, b: RxDocType) => {
            let compareResult: number = 0; // 1 | -1
            sort.find(sortPart => {
                const fieldName: string = Object.keys(sortPart)[0];
                const direction: MangoQuerySortDirection = Object.values(sortPart)[0];
                const directionMultiplier = direction === 'asc' ? 1 : -1;
                const valueA: any = (a as any)[fieldName];
                const valueB: any = (b as any)[fieldName];
                if (valueA === valueB) {
                    return false;
                } else {
                    if (valueA > valueB) {
                        compareResult = 1 * directionMultiplier;
                        return true;
                    } else {
                        compareResult = -1 * directionMultiplier;
                        return true;
                    }
                }
            });
            if (!compareResult) {
                throw new Error('no compareResult');
            }
            return compareResult as any;
        }
        return fun;
    }

    /**
     * Returns a function that determines if a document matches a query selector.
     * It is important to have the exact same logix as lokijs uses, to be sure
     * that the event-reduce algorithm works correct.
     * But LokisJS does not export such a function, the query logic is deep inside of
     * the Resultset prototype.
     * Because I am lazy, I do not copy paste and maintain that code.
     * Instead we create a fake Resultset and apply the prototype method Resultset.prototype.find()
     */
    getQueryMatcher(query: MangoQuery<RxDocType>): QueryMatcher<RxDocType> {
        const fun: QueryMatcher<RxDocType> = (doc: RxDocType) => {
            const fakeResultSet: any = {
                collection: {
                    data: [doc],
                    binaryIndices: {}
                }
            };
            Object.setPrototypeOf(fakeResultSet, (lokijs as any).Resultset.prototype);
            fakeResultSet.find(query.selector, true);
            const ret = fakeResultSet.filteredrows.length > 0;
            return ret;
        }
        return fun;


        throw new Error('Method not implemented.');
    }
    async bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        if (documentWrites.length === 0) {
            throw newRxError('P2', {
                args: {
                    documentWrites
                }
            });
        }

        /**
         * lokijs is in memory and non-async, so we emulate async behavior
         * to ensure all RxStorage implementations behave equal.
         */
        await promiseWait(0);

        const collection = this.internals.collection;


        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: new Map(),
            error: new Map()
        };

        documentWrites.forEach(writeRow => {
            const id: string = writeRow.document[this.primaryPath] as any;
            const documentInDb = collection.by(this.primaryPath, id);

            if (!documentInDb) {
                // insert new document
                const writeDoc = Object.assign(
                    {
                        _rev: '1-' + createRevision(writeRow.document, true),
                        _deleted: false
                    },
                    writeRow.document,
                    {
                        // TODO attachments are currently not working with lokijs
                        _attachments: {}
                    }
                );
                collection.insert(writeDoc);
                ret.success.set(id, writeDoc as any);
            } else {
                // update existing document
                const revInDb: string = documentInDb._rev;
                if (
                    !writeRow.previous ||
                    revInDb !== writeRow.previous._rev
                ) {
                    // conflict error
                    const err: RxStorageBulkWriteError<RxDocType> = {
                        isError: true,
                        status: 409,
                        documentId: id,
                        writeRow: writeRow
                    };
                    ret.error.set(id, err);
                } else {
                    const newRevHeight = getHeightOfRevision(revInDb) + 1;
                    const writeDoc = Object.assign(
                        {},
                        documentInDb,
                        writeRow.document,
                        {
                            _rev: newRevHeight + '-' + createRevision(writeRow.document, true),
                            // TODO attachments are currently not working with lokijs
                            _attachments: {}
                        }
                    );
                    collection.insert(writeDoc);
                    ret.success.set(id, writeDoc as any);
                }
            }

        });

        return ret;
    }
    async bulkAddRevisions(documents: RxDocumentData<RxDocType>[]): Promise<void> {
        if (documents.length === 0) {
            throw newRxError('P3', {
                args: {
                    documents
                }
            });
        }

        /**
         * lokijs is in memory and non-async, so we emulate async behavior
         * to ensure all RxStorage implementations behave equal.
         */
        await promiseWait(0);
        const collection = this.internals.collection;


        documents.forEach(docData => {
            const id: string = docData[this.primaryPath] as any;
            const documentInDb = collection.by(this.primaryPath, id);
            if (!documentInDb) {
                // document not here, so we can directly insert
                collection.insert(docData);
            } else {
                const newWriteRevision = parseRevision(docData._rev);
                const oldRevision = parseRevision(documentInDb._rev);

                let mustUpdate: boolean = false;
                if (newWriteRevision.height !== oldRevision.height) {
                    // height not equal, compare base on height
                    if (newWriteRevision.height > oldRevision.height) {
                        mustUpdate = true;
                    }
                } else if (newWriteRevision.hash > oldRevision.hash) {
                    // equal height but new write has the 'winning' hash
                    mustUpdate = true;
                }
                if (mustUpdate) {
                    collection.insert(docData);
                }
            }
        });
    }
    async findDocumentsById(ids: string[], deleted: boolean): Promise<Map<string, RxDocumentData<RxDocType>>> {
        await promiseWait(0);
        const collection = this.internals.collection;

        const ret: Map<string, RxDocumentData<RxDocType>> = new Map();
        ids.forEach(id => {
            const documentInDb = collection.by(this.primaryPath, id);
            if (
                documentInDb &&
                (!documentInDb._deleted || deleted)
            ) {
                ret.set(id, documentInDb);
            }
        });
        return ret;
    }
    query(preparedQuery: any): Promise<RxStorageQueryResult<RxDocType>> {
        throw new Error('Method not implemented.');
    }
    getAttachmentData(documentId: string, attachmentId: string): Promise<BlobBuffer> {
        throw new Error('Method not implemented.');
    }
    getChangedDocuments(options: ChangeStreamOnceOptions): Promise<{ changedDocuments: { id: string; sequence: number; }[]; lastSequence: number; }> {
        throw new Error('Method not implemented.');
    }
    changeStream(): Observable<RxStorageChangeEvent<RxDocumentData<RxDocType>>> {
        throw new Error('Method not implemented.');
    }
    async close(): Promise<void> {
        // TODO close loki database if all collections are removed already
    }
    remove(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}

export class RxStorageKeyObjectInstanceLoki implements RxStorageKeyObjectInstance<LokiStorageInternals, LokiSettings> {

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly internals: Readonly<LokiStorageInternals>,
        public readonly options: Readonly<LokiSettings>
    ) {
        OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
    }

    bulkWrite<D = any>(documentWrites: BulkWriteLocalRow<D>[]): Promise<RxLocalStorageBulkWriteResponse<D>> {
        throw new Error('Method not implemented.');
    }
    findLocalDocumentsById<D = any>(ids: string[]): Promise<Map<string, RxLocalDocumentData<D>>> {
        throw new Error('Method not implemented.');
    }
    changeStream(): Observable<RxStorageChangeEvent<RxLocalDocumentData<{ [key: string]: any; }>>> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    remove(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}

export function getRxStorageLoki(
    databaseSettings?: LokiDatabaseSettings
): RxStorageLoki {
    const storage = new RxStorageLoki(databaseSettings);
    return storage;
}
