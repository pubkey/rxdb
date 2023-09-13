import type {
    FilledMangoQuery,
    RxDocumentData,
    RxJsonSchema,
    RxStorage,
    RxStorageInstanceCreationParams,
    RxStorageStatics
} from '../../types';

import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
import { DEFAULT_CHECKPOINT_SCHEMA, getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { RX_STORAGE_NAME_MONGODB, primarySwapMongoDBQuerySelector, swapToMongoSort } from './mongodb-helper';
import type { MongoDBDatabaseSettings, MongoDBPreparedQuery, MongoDBSettings, MongoDBStorageInternals } from './mongodb-types';
import { RxStorageInstanceMongoDB, createMongoDBStorageInstance } from './rx-storage-instance-mongodb';

export const RxStorageMongoDBStatics: RxStorageStatics = {
    prepareQuery<RxDocType>(
        schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        mutateableQuery: FilledMangoQuery<RxDocType>
    ) {
        const primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey) as any;
        const preparedQuery: MongoDBPreparedQuery<RxDocType> = {
            query: mutateableQuery,
            mongoSelector: primarySwapMongoDBQuerySelector(
                primaryKey,
                mutateableQuery.selector
            ),
            mongoSort: swapToMongoSort(
                primaryKey,
                mutateableQuery.sort
            )
        };
        return preparedQuery;
    },
    checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA
};

export class RxStorageMongoDB implements RxStorage<MongoDBStorageInternals, MongoDBSettings> {
    public name = RX_STORAGE_NAME_MONGODB;
    public statics = RxStorageMongoDBStatics;

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
