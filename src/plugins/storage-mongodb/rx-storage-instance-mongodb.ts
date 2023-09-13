import {
    Observable,
    Subject
} from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import type {
    BulkWriteRow,
    ById,
    EventBulk,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxDocumentData,
    RxDocumentDataById,
    RxJsonSchema,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageCountResult,
    RxStorageDefaultCheckpoint,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult,
    StringKeys
} from '../../types';
import {
    getFromMapOrThrow,
    lastOfArray,
    now,
    RX_META_LWT_MINIMUM
} from '../../plugins/utils';
import {
    MongoDBPreparedQuery,
    MongoDBStorageInternals,
    MongoQuerySelector,
    RxStorageMongoDBInstanceCreationOptions,
    RxStorageMongoDBSettings
} from './mongodb-types';
import { RxStorageMongoDB } from './rx-storage-mongodb';
import {
    Db as MongoDatabase,
    Collection as MongoCollection,
    MongoClient,
    ObjectId,
    ClientSession
} from 'mongodb';
import { categorizeBulkWriteRows } from '../../rx-storage-helper';
import { swapMongoToRxDoc, swapRxDocToMongo } from './mongodb-helper';

export class RxStorageInstanceMongoDB<RxDocType> implements RxStorageInstance<
    RxDocType,
    MongoDBStorageInternals,
    RxStorageMongoDBInstanceCreationOptions,
    RxStorageDefaultCheckpoint
> {

    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    public closed = false;
    public readonly mongoClient: MongoClient;
    public readonly mongoDatabase: MongoDatabase;
    public readonly mongoCollection: MongoCollection<RxDocumentData<RxDocType> | any>;


    /**
     * We use this to be able to still fetch
     * the objectId after transforming the document from mongo-style (with _id)
     * to RxDB
     */
    public readonly mongoObjectIdCache = new WeakMap<RxDocumentData<RxDocType>, ObjectId>();

    constructor(
        public readonly storage: RxStorageMongoDB,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: MongoDBStorageInternals,
        public readonly options: Readonly<RxStorageMongoDBInstanceCreationOptions>,
        public readonly settings: RxStorageMongoDBSettings
    ) {
        if (this.schema.attachments) {
            throw new Error('attachments not supported in mongodb storage, make a PR if you need that');
        }
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
        if (this.primaryPath === '_id') {
            throw new Error('When using the MongoDB RxStorage, you cannot use the primaryKey _id, use a different fieldname');
        }

        this.mongoClient = new MongoClient(storage.databaseSettings.connection);
        this.mongoDatabase = this.mongoClient.db(databaseName);
        this.mongoCollection = this.mongoDatabase.collection(collectionName);

        // this.mongoCollection.watch().on('change', change => {
        //     change.
        // });

    }

    async bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        const primaryPath = this.primaryPath;
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };

        const session = this.mongoClient.startSession();
        try {
            session.startTransaction({});

            const docIds = documentWrites.map(d => (d.document as any)[primaryPath]);

            const documentStates = await this.findDocumentsById(
                docIds,
                true,
                session
            );

            const categorized = categorizeBulkWriteRows<RxDocType>(
                this,
                primaryPath as any,
                documentStates,
                documentWrites,
                context
            );
            ret.error = categorized.errors;

            await Promise.all([
                // inserts
                categorized.bulkInsertDocs.length === 0 ? undefined : this.mongoCollection.insertMany(
                    categorized.bulkInsertDocs.map(writeRow => {
                        const docId = writeRow.document[primaryPath];
                        ret.success[docId as any] = writeRow.document;
                        const objectId = new ObjectId();
                        return swapRxDocToMongo(objectId, writeRow.document) as any;
                    }),
                    {
                        session
                    }
                ),
                // updates
                categorized.bulkUpdateDocs.length === 0 ? undefined : this.mongoCollection.bulkWrite(
                    categorized.bulkUpdateDocs.map(writeRow => {
                        const docId = writeRow.document[primaryPath];
                        ret.success[docId as any] = writeRow.document;
                        const objectId = getFromMapOrThrow(this.mongoObjectIdCache, writeRow.previous);
                        return {
                            updateOne: {
                                filter: { _id: objectId },
                                update: {
                                    $set: writeRow.document
                                }
                            }
                        } as any;
                    }),
                    {
                        session
                    }
                )
            ]);
        } catch (error) {
            console.error('mongodb bulk write error -> abort transaction:');
            console.dir(error);
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }

        console.log('ret:');
        console.dir(ret);

        return ret;
    }

    async findDocumentsById(
        docIds: string[],
        withDeleted: boolean,
        session?: ClientSession
    ): Promise<RxDocumentDataById<RxDocType>> {
        const primaryPath = this.primaryPath;
        const plainQuery: MongoQuerySelector<any> = {
            [primaryPath]: {
                $in: docIds
            }
        };
        if (!withDeleted) {
            plainQuery._deleted = false;
        }
        const result: ById<RxDocumentData<RxDocType>> = {};
        const queryResult = await this.mongoCollection.find(
            plainQuery,
            {
                session
            }
        ).toArray();
        queryResult.forEach(row => {
            result[(row as any)[primaryPath]] = swapMongoToRxDoc(
                this.mongoObjectIdCache,
                row as any
            );
        });

        console.log(':: findDocumentsById():');
        console.dir(docIds);
        console.dir(result);

        return result;
    }

    async query(
        preparedQuery: MongoDBPreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>> {
        let query = this.mongoCollection.find(preparedQuery.mongoSelector);
        if (preparedQuery.query.skip) {
            query = query.skip(preparedQuery.query.skip);
        }
        if (preparedQuery.query.limit) {
            query = query.limit(preparedQuery.query.limit);
        }
        if (preparedQuery.query.sort) {
            query = query.sort(preparedQuery.mongoSort);
        }
        const result = await query.toArray();
        return result as any;
    }

    async count(
        preparedQuery: MongoDBPreparedQuery<RxDocType>
    ): Promise<RxStorageCountResult> {
        const count = await this.mongoCollection.countDocuments(preparedQuery.mongoSelector);
        return {
            count,
            mode: 'fast'
        };
    }

    async getChangedDocumentsSince(
        limit: number,
        checkpoint?: RxStorageDefaultCheckpoint
    ): Promise<{
        documents: RxDocumentData<RxDocType>[];
        checkpoint: RxStorageDefaultCheckpoint;
    }> {
        const sinceLwt = checkpoint ? checkpoint.lwt : RX_META_LWT_MINIMUM;
        const query = this.mongoCollection.find({
            '_meta.lwt': {
                $gte: sinceLwt
            }
        }).limit(limit);
        const documents = await query.toArray();
        const lastDoc = lastOfArray(documents);
        return {
            documents: documents as any,
            checkpoint: lastDoc ? {
                id: lastDoc[this.primaryPath],
                lwt: lastDoc._meta.lwt
            } : checkpoint ? checkpoint : {
                id: '',
                lwt: 0
            }
        };
    }

    async cleanup(minimumDeletedTime: number): Promise<boolean> {
        const maxDeletionTime = now() - minimumDeletedTime;
        await this.mongoCollection.deleteMany({
            _deleted: true,
            '_meta.lwt': {
                $lt: maxDeletionTime
            }
        });
        return true;
    }

    getAttachmentData(
        _documentId: string,
        _attachmentId: string,
        _digest: string
    ): Promise<string> {
        throw new Error('attachments not implemented, make a PR');
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> {
        return {} as any;
    }

    async remove(): Promise<void> {
        await this.mongoCollection.drop();
    }

    async close(): Promise<void> {
        await this.mongoClient.close();
    }

    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>> {
        return new Subject();
    }
    async resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void> { }
}

export function createMongoDBStorageInstance<RxDocType>(
    storage: RxStorageMongoDB,
    params: RxStorageInstanceCreationParams<RxDocType, RxStorageMongoDBInstanceCreationOptions>,
    settings: RxStorageMongoDBSettings
): Promise<RxStorageInstanceMongoDB<RxDocType>> {
    const instance = new RxStorageInstanceMongoDB(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        {
            changes$: new Subject()
        },
        params.options,
        settings
    );
    return Promise.resolve(instance);
}
