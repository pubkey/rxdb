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
    ensureNotFalsy,
    lastOfArray,
    now,
    PROMISE_RESOLVE_VOID,
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
import { swapPrimaryToMongo } from './mongodb-helper';

export class RxStorageInstanceMongoDB<RxDocType> implements RxStorageInstance<
    RxDocType,
    MongoDBStorageInternals<RxDocType>,
    RxStorageMongoDBInstanceCreationOptions,
    RxStorageDefaultCheckpoint
> {

    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    public closed = false;
    public readonly mongoClient: MongoClient;
    public readonly mongoDatabase: MongoDatabase;
    public readonly mongoCollection: MongoCollection;

    constructor(
        public readonly storage: RxStorageMongoDB,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: MongoDBStorageInternals<RxDocType>,
        public readonly options: Readonly<RxStorageMongoDBInstanceCreationOptions>,
        public readonly settings: RxStorageMongoDBSettings
    ) {
        this.mongoClient = new MongoClient(storage.databaseSettings.connection);
        this.mongoDatabase = this.mongoClient.db(databaseName);
        this.mongoCollection = this.mongoDatabase.collection(collectionName);

        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);

        if (this.schema.attachments) {
            throw new Error('attachments not supported in mongodb storage, make a PR');
        }
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
                this.mongoCollection.insertMany(
                    categorized.bulkInsertDocs.map(writeRow => {
                        const docId = writeRow.document[primaryPath];
                        ret.success[docId as any] = writeRow.document;
                        return swapPrimaryToMongo(primaryPath, writeRow.document);
                    }),
                    {
                        session
                    }
                ),
                // updates
                this.mongoCollection.bulkWrite(
                    categorized.bulkUpdateDocs.map(writeRow => {
                        const docId = writeRow.document[primaryPath];
                        ret.success[docId as any] = writeRow.document;
                        const mongoDoc = swapPrimaryToMongo(primaryPath, writeRow.document);
                        return {
                            updateOne: {
                                filter: { _id: mongoDoc._id },
                                update: {
                                    $set: mongoDoc
                                }
                            }
                        };
                    }),
                    {
                        session
                    }
                )
            ]);

            if (categorized.eventBulk.events.length > 0) {
                const lastState = ensureNotFalsy(categorized.newestRow).document;
                categorized.eventBulk.checkpoint = {
                    id: lastState[primaryPath],
                    lwt: lastState._meta.lwt
                };
                this.internals.changes$.next(categorized.eventBulk);
            }

        } catch (error) {
            console.error('mongodb bulk write error -> abort transaction:');
            console.dir(error);
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }

        return ret;
    }

    async findDocumentsById(
        docIds: string[],
        withDeleted: boolean,
        session?: ClientSession
    ): Promise<RxDocumentDataById<RxDocType>> {
        const plainQuery: MongoQuerySelector<any> = {
            _id: {
                $in: docIds.map(id => new ObjectId(id))
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
            result[row._id.toHexString()] = row as any;
        });
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
        return this.internals.conflictResultionTasks$.asObservable();
    }
    resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void> {
        return PROMISE_RESOLVE_VOID;
    }
}

export function createMongoDBStorageInstance<RxDocType>(
    storage: RxStorageMongoDB,
    params: RxStorageInstanceCreationParams<RxDocType, RxStorageMongoDBInstanceCreationOptions>,
    settings: RxStorageMongoDBSettings
): Promise<RxStorageInstanceMongoDB<RxDocType>> {

    let internals = storage.collectionStates.get(collectionKey);
    if (!internals) {
        internals = {
            removed: false,
            refCount: 1,
            documents: new Map(),
            attachments: params.schema.attachments ? new Map() : undefined as any,
            byIndex: {},
            conflictResultionTasks$: new Subject(),
            changes$: new Subject()
        };
        addIndexesToInternalsState(internals, params.schema);
        storage.collectionStates.set(collectionKey, internals);
    } else {
        internals.refCount = internals.refCount + 1;
    }

    const instance = new RxStorageInstanceMongoDB(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        internals,
        params.options,
        settings
    );
    return Promise.resolve(instance);
}
