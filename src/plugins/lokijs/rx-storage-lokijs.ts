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
import { CHANGES_COLLECTION_SUFFIX, CHANGES_LOCAL_SUFFIX, getLokiEventKey, OPEN_LOKIJS_STORAGE_INSTANCES } from './lokijs-helper';
import { RxStorageInstanceLoki } from './rx-storage-instance-loki';
import { RxStorageKeyObjectInstanceLoki } from './rx-storage-key-object-instance-loki';

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
            params.collectionName + CHANGES_COLLECTION_SUFFIX,
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
            collectionName + CHANGES_LOCAL_SUFFIX,
            collectionOptions
        );
        const changesCollection: Collection = db.addCollection(
            collectionName + CHANGES_LOCAL_SUFFIX + CHANGES_COLLECTION_SUFFIX,
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

export function getRxStorageLoki(
    databaseSettings?: LokiDatabaseSettings
): RxStorageLoki {
    const storage = new RxStorageLoki(databaseSettings);
    return storage;
}
