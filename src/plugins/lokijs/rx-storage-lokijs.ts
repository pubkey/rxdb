import {
    BlobBuffer,
    BulkWriteLocalRow,
    BulkWriteRow,
    ChangeStreamOnceOptions,
    LokiDatabaseSettings,
    LokiSettings,
    MangoQuery,
    RxDocumentData,
    RxJsonSchema,
    RxLocalDocumentData,
    RxLocalStorageBulkWriteResponse,
    RxStorage,
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
import { hash } from '../../util';
import { SortComparator, QueryMatcher } from 'event-reduce-js';
import { Observable } from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';

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
    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocType>>,
        public readonly internals: Readonly<LokiStorageInternals>,
        public readonly options: Readonly<LokiSettings>
    ) {
        OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
    }

    prepareQuery(mutateableQuery: MangoQuery<RxDocType>) {
        throw new Error('Method not implemented.');
    }
    getSortComparator(query: MangoQuery<RxDocType>): SortComparator<RxDocType> {
        throw new Error('Method not implemented.');
    }
    getQueryMatcher(query: MangoQuery<RxDocType>): QueryMatcher<RxDocType> {
        throw new Error('Method not implemented.');
    }
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        throw new Error('Method not implemented.');
    }
    bulkAddRevisions(documents: RxDocumentData<RxDocType>[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    findDocumentsById(ids: string[], deleted: boolean): Promise<Map<string, RxDocumentData<RxDocType>>> {
        throw new Error('Method not implemented.');
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
    close(): Promise<void> {
        throw new Error('Method not implemented.');
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

export function getRxStoragePouch(
    databaseSettings: LokiDatabaseSettings
): RxStorageLoki {
    const storage = new RxStorageLoki(databaseSettings);
    return storage;
}
