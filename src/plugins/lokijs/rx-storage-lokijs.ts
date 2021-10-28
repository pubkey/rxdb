import {
    BlobBuffer,
    BulkWriteLocalRow,
    BulkWriteRow,
    ChangeStreamOnceOptions,
    LokiDatabaseSettings,
    LokiSettings,
    LokiStorageInternals,
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
import { createRevision, flatClone, getHeightOfRevision, hash, now, parseRevision, promiseWait } from '../../util';
import type { SortComparator, QueryMatcher, ChangeEvent } from 'event-reduce-js';
import { Observable, Subject } from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { newRxError } from '../../rx-error';
import { getLokiEventKey, OPEN_LOKIJS_STORAGE_INSTANCES } from './lokijs-helper';
import { RxStorageInstanceLoki } from './rx-storage-instance-loki';

// TODO import instead of require
// const LokiIndexedAdapter = require('lokijs/src/loki-indexed-adapter');

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
                unique: [primaryKey],
                disableChangesApi: true,
                disableMeta: true
            } as any
        );

        const collection: Collection = db.addCollection(
            params.collectionName,
            collectionOptions as any
        );

        const changesCollection: Collection = db.addCollection(
            params.collectionName + '-changes',
            {
                unique: ['eventId'],
                indices: ['sequence'],
                disableMeta: true
            }
        );

        const instance = new RxStorageInstanceLoki(
            params.databaseName,
            params.collectionName,
            params.schema,
            {
                loki: db,
                collection,
                changesCollection
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
                unique: ['_id'],
                disableChangesApi: true,
                disableMeta: true
            } as any
        );

        const collection: Collection = db.addCollection(
            lokiCollectionName,
            collectionOptions
        );
        const changesCollection: Collection = db.addCollection(
            lokiCollectionName + '-changes',
            {
                unique: ['eventId'],
                indices: ['sequence'],
                disableMeta: true
            }
        );

        return new RxStorageKeyObjectInstanceLoki(
            databaseName,
            collectionName,
            {
                loki: db,
                collection,
                changesCollection
            },
            options
        );
    }
}

export class RxStorageKeyObjectInstanceLoki implements RxStorageKeyObjectInstance<LokiStorageInternals, LokiSettings> {

    private changes$: Subject<RxStorageChangeEvent<RxLocalDocumentData>> = new Subject();

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly internals: Readonly<LokiStorageInternals>,
        public readonly options: Readonly<LokiSettings>
    ) {
        OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
    }

    async bulkWrite<D = any>(documentWrites: BulkWriteLocalRow<D>[]): Promise<RxLocalStorageBulkWriteResponse<D>> {
        if (documentWrites.length === 0) {
            throw newRxError('P2', {
                args: {
                    documentWrites
                }
            });
        }

        const collection = this.internals.collection;
        const startTime = now();
        await promiseWait(0);

        const ret: RxLocalStorageBulkWriteResponse<D> = {
            success: new Map(),
            error: new Map()
        };
        const writeRowById: Map<string, BulkWriteLocalRow<D>> = new Map();
        documentWrites.forEach(writeRow => {
            const id = writeRow.document._id;
            writeRowById.set(id, writeRow);
            const writeDoc = flatClone(writeRow.document);
            const docInDb = collection.by('_id', id);
            const previous = writeRow.previous ? writeRow.previous : collection.by('_id', id);
            const newRevHeight = previous ? parseRevision(previous._rev).height + 1 : 1;
            const newRevision = newRevHeight + '-' + createRevision(writeRow.document, true);
            writeDoc._rev = newRevision;
            collection.insert(writeDoc);

            ret.success.set(id, writeDoc);

            const endTime = now();

            let event: ChangeEvent<RxLocalDocumentData<D>>;
            if (!writeRow.previous) {
                // was insert
                event = {
                    operation: 'INSERT',
                    doc: writeDoc,
                    id: id,
                    previous: null
                };
            } else if (writeRow.document._deleted) {
                // was delete

                // we need to add the new revision to the previous doc
                // so that the eventkey is calculated correctly.
                // Is this a hack? idk.
                const previousDoc = flatClone(writeRow.previous);
                previousDoc._rev = newRevision;

                event = {
                    operation: 'DELETE',
                    doc: null,
                    id,
                    previous: previousDoc
                };
            } else {
                // was update
                event = {
                    operation: 'UPDATE',
                    doc: writeDoc,
                    id: id,
                    previous: writeRow.previous
                };
            }

            if (
                writeRow.document._deleted &&
                (
                    !writeRow.previous ||
                    writeRow.previous._deleted
                )
            ) {
                /**
                 * A deleted document was newly added to the storage engine,
                 * do not emit an event.
                 */
            } else {

                const doc: RxLocalDocumentData<D> = event.operation === 'DELETE' ? event.previous as any : event.doc as any;
                const eventId = getLokiEventKey(true, doc._id, doc._rev ? doc._rev : '');

                const storageChangeEvent: RxStorageChangeEvent<RxLocalDocumentData<D>> = {
                    eventId,
                    documentId: id,
                    change: event,
                    startTime,
                    endTime
                };
                this.changes$.next(storageChangeEvent);
            }

        });


        return ret;
    }
    findLocalDocumentsById<D = any>(ids: string[]): Promise<Map<string, RxLocalDocumentData<D>>> {
        throw new Error('Method not implemented.');
    }
    changeStream(): Observable<RxStorageChangeEvent<RxLocalDocumentData<{ [key: string]: any; }>>> {
        return this.changes$.asObservable();
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
