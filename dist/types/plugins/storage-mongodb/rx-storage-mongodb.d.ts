import type { FilledMangoQuery, RxDocumentData, RxJsonSchema, RxStorage, RxStorageInstanceCreationParams, RxStorageStatics } from '../../types/index.d.ts';
import type { MongoDBDatabaseSettings, MongoDBSettings, MongoDBStorageInternals } from './mongodb-types.ts';
import { RxStorageInstanceMongoDB } from './rx-storage-instance-mongodb.ts';
export declare const RxStorageMongoDBStatics: RxStorageStatics;
export declare class RxStorageMongoDB implements RxStorage<MongoDBStorageInternals, MongoDBSettings> {
    databaseSettings: MongoDBDatabaseSettings;
    name: string;
    statics: Readonly<{
        prepareQuery<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, mutateableQuery: FilledMangoQuery<RxDocType>): any;
        checkpointSchema: import("../../types/util").DeepReadonlyObject<import("../../types/rx-schema").JsonSchema>;
    }>;
    constructor(databaseSettings: MongoDBDatabaseSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, MongoDBSettings>): Promise<RxStorageInstanceMongoDB<RxDocType>>;
}
export declare function getRxStorageMongoDB(databaseSettings: MongoDBDatabaseSettings): RxStorageMongoDB;
