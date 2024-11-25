import { BehaviorSubject, Observable } from 'rxjs';
import type { BulkWriteRow, EventBulk, PreparedQuery, RxDocumentData, RxJsonSchema, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageCountResult, RxStorageDefaultCheckpoint, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageQueryResult, StringKeys } from '../../types/index.d.ts';
import { MongoDBStorageInternals, RxStorageMongoDBInstanceCreationOptions, RxStorageMongoDBSettings } from './mongodb-types.ts';
import { RxStorageMongoDB } from './rx-storage-mongodb.ts';
import { Db as MongoDatabase, Collection as MongoCollection, MongoClient, ObjectId, ClientSession } from 'mongodb';
export declare class RxStorageInstanceMongoDB<RxDocType> implements RxStorageInstance<RxDocType, MongoDBStorageInternals, RxStorageMongoDBInstanceCreationOptions, RxStorageDefaultCheckpoint> {
    readonly storage: RxStorageMongoDB;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: MongoDBStorageInternals;
    readonly options: Readonly<RxStorageMongoDBInstanceCreationOptions>;
    readonly settings: RxStorageMongoDBSettings;
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    readonly inMongoPrimaryPath: string;
    closed?: Promise<void>;
    private readonly changes$;
    readonly mongoClient: MongoClient;
    readonly mongoDatabase: MongoDatabase;
    readonly mongoCollectionPromise: Promise<MongoCollection<RxDocumentData<RxDocType> | any>>;
    /**
     * Closing the connection must not happen when
     * an operation is running, otherwise we get an error.
     * So we store all running operations here so that
     * they can be awaited.
     */
    readonly runningOperations: BehaviorSubject<number>;
    writeQueue: Promise<any>;
    /**
     * We use this to be able to still fetch
     * the objectId after transforming the document from mongo-style (with _id)
     * to RxDB
     */
    readonly mongoObjectIdCache: WeakMap<RxDocumentData<RxDocType>, ObjectId>;
    constructor(storage: RxStorageMongoDB, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: MongoDBStorageInternals, options: Readonly<RxStorageMongoDBInstanceCreationOptions>, settings: RxStorageMongoDBSettings);
    /**
     * Bulk writes on the mongodb storage.
     * Notice that MongoDB does not support cross-document transactions
     * so we have to do a update-if-previous-is-correct like operations.
     * (Similar to what RxDB does with the revision system)
     */
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(docIds: string[], withDeleted: boolean, session?: ClientSession): Promise<RxDocumentData<RxDocType>[]>;
    query(originalPreparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    count(originalPreparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageCountResult>;
    cleanup(minimumDeletedTime: number): Promise<boolean>;
    getAttachmentData(_documentId: string, _attachmentId: string, _digest: string): Promise<string>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>>;
    remove(): Promise<void>;
    close(): Promise<void>;
}
export declare function createMongoDBStorageInstance<RxDocType>(storage: RxStorageMongoDB, params: RxStorageInstanceCreationParams<RxDocType, RxStorageMongoDBInstanceCreationOptions>, settings: RxStorageMongoDBSettings): Promise<RxStorageInstanceMongoDB<RxDocType>>;
