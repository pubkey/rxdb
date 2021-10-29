import {
    LokiDatabaseSettings,
    LokiSettings,
    LokiStorageInternals,
    RxDocumentData,
    RxLocalDocumentData,
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../types';
import lokijs, {
    Collection
} from 'lokijs';
import { hash } from '../../util';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { CHANGES_COLLECTION_SUFFIX, CHANGES_LOCAL_SUFFIX, getLokiDatabase } from './lokijs-helper';
import { RxStorageInstanceLoki } from './rx-storage-instance-loki';
import { RxStorageKeyObjectInstanceLoki } from './rx-storage-key-object-instance-loki';

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
        const databaseState = await getLokiDatabase(params.databaseName, params.options.database);

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

        const collection: Collection = databaseState.database.addCollection(
            params.collectionName,
            collectionOptions as any
        );
        databaseState.openCollections[params.collectionName] = collection;

        const changesCollectionName = params.collectionName + CHANGES_COLLECTION_SUFFIX;
        const changesCollection: Collection = databaseState.database.addCollection(
            changesCollectionName,
            {
                unique: ['eventId'],
                indices: ['sequence'],
                disableMeta: true
            }
        );
        databaseState.openCollections[changesCollectionName] = changesCollection;

        const instance = new RxStorageInstanceLoki(
            params.databaseName,
            params.collectionName,
            params.schema,
            {
                loki: databaseState.database,
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
        const databaseState = await getLokiDatabase(databaseName, options.database);

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

        const localCollectionName = collectionName + CHANGES_LOCAL_SUFFIX;
        const collection: Collection = databaseState.database.addCollection(
            localCollectionName,
            collectionOptions
        );
        databaseState.openCollections[localCollectionName] = collection;

        const changesCollectionName = collectionName + CHANGES_LOCAL_SUFFIX + CHANGES_COLLECTION_SUFFIX;
        const changesCollection: Collection = databaseState.database.addCollection(
            changesCollectionName,
            {
                unique: ['eventId'],
                indices: ['sequence'],
                disableMeta: true
            }
        );
        databaseState.openCollections[changesCollectionName] = changesCollection;

        return new RxStorageKeyObjectInstanceLoki(
            databaseName,
            collectionName,
            {
                loki: databaseState.database,
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
