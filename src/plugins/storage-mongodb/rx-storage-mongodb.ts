import type {
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../types/index.d.ts';

import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper.ts';
import { RX_STORAGE_NAME_MONGODB } from './mongodb-helper.ts';
import type { MongoDBDatabaseSettings, MongoDBSettings, MongoDBStorageInternals } from './mongodb-types.ts';
import { RxStorageInstanceMongoDB, createMongoDBStorageInstance } from './rx-storage-instance-mongodb.ts';

export class RxStorageMongoDB implements RxStorage<MongoDBStorageInternals, MongoDBSettings> {
    public name = RX_STORAGE_NAME_MONGODB;

    constructor(
        public databaseSettings: MongoDBDatabaseSettings
    ) { }

    public createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, MongoDBSettings>
    ): Promise<RxStorageInstanceMongoDB<RxDocType>> {
        ensureRxStorageInstanceParamsAreCorrect(params);
        return createMongoDBStorageInstance(this, params, this.databaseSettings);
    }
}

export function getRxStorageMongoDB(
    databaseSettings: MongoDBDatabaseSettings
): RxStorageMongoDB {
    const storage = new RxStorageMongoDB(databaseSettings);
    return storage;
}
