import type { FilledMangoQuery, RxDocumentData, RxJsonSchema, RxStorage, RxStorageInstanceCreationParams, RxStorageStatics } from '../../types';
import type { MongoDBDatabaseSettings, MongoDBSettings, MongoDBStorageInternals } from './mongodb-types';
import { RxStorageInstanceMongoDB } from './rx-storage-instance-mongodb';
export declare const RxStorageMongoDBStatics: RxStorageStatics;
export declare class RxStorageMongoDB implements RxStorage<MongoDBStorageInternals, MongoDBSettings> {
    databaseSettings: MongoDBDatabaseSettings;
    name: string;
    statics: Readonly<{
        prepareQuery<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, mutateableQuery: FilledMangoQuery<RxDocType>): any;
        checkpointSchema: import("../../types").DeepReadonlyObject<import("../../types").JsonSchema>;
    }>;
    constructor(databaseSettings: MongoDBDatabaseSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, MongoDBSettings>): Promise<RxStorageInstanceMongoDB<RxDocType>>;
}
export declare function getRxStorageMongoDB(databaseSettings: MongoDBDatabaseSettings): RxStorageMongoDB;
