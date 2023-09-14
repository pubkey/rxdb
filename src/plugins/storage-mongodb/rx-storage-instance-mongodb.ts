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
    isMaybeReadonlyArray,
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
import {
    getMongoDBIndexName,
    swapMongoToRxDoc} from './mongodb-helper';

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
    public readonly mongoCollectionPromise: Promise<MongoCollection<RxDocumentData<RxDocType> | any>>;


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

        const indexes = (this.schema.indexes ? this.schema.indexes.slice() : []).map(index => {
            const arIndex = isMaybeReadonlyArray(index) ? index.slice(0) : [index];
            return arIndex;
        });
        indexes.push([this.primaryPath]);

        this.mongoCollectionPromise = this.mongoDatabase.createCollection(collectionName)
            .then(async (mongoCollection) => {
                await mongoCollection.createIndexes(
                    indexes.map(index => {
                        const mongoIndex: any = {};
                        index.forEach(field => mongoIndex[field] = 1);
                        return { name: getMongoDBIndexName(index), key: mongoIndex };
                    })
                );
                return mongoCollection;
            });

        // this.mongoCollection.watch().on('change', change => {
        //     change.
        // });

    }

    /**
     * Bulk writes on the mongodb storage.
     * Notice that MongoDB does not support cross-document transactions
     * so we have to do a update-if-previous-is-correct like operations.
     * (Similar to what RxDB does with the revision system)
     */
    async bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        const mongoCollection = await this.mongoCollectionPromise;
        const primaryPath = this.primaryPath;
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };

        const docIds = documentWrites.map(d => (d.document as any)[primaryPath]);
        const documentStates = await this.findDocumentsById(
            docIds,
            true
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
            /**
             * Inserts
             * @link https://sparkbyexamples.com/mongodb/mongodb-insert-if-not-exists/
             */
            Promise.all(
                categorized.bulkInsertDocs.map(async (writeRow) => {
                    const docId = writeRow.document[primaryPath];
                    const writeResult = await mongoCollection.updateOne(
                        {
                            [primaryPath]: docId
                        },
                        {
                            $setOnInsert: writeRow.document
                        },
                        {
                            upsert: true
                        }
                    );
                    ret.success[docId as any] = writeRow.document;

                    console.log('insert write result:');
                    console.dir(writeResult);
                })
            ),
            /**
             * Updates
             */
            Promise.all(
                categorized.bulkUpdateDocs.map(async (writeRow) => {
                    const docId = writeRow.document[primaryPath];
                    const writeResult = await mongoCollection.findOneAndReplace(
                        {
                            [primaryPath]: docId,
                            _rev: ensureNotFalsy(writeRow.previous)._rev
                        },
                        writeRow.document
                    );

                    console.log('update write result:');
                    console.dir(writeResult);
                    ret.success[docId as any] = writeRow.document;
                })
            )
        ]);





        // console.log('MONGO TX START');
        // const session = this.mongoClient.startSession({
        // });
        // try {

        //     await session.withTransaction(async () => {
        //         console.log('MONGO TX INNER START');

        //         await mongoCollection.insertOne({
        //             [primaryPath]: '_________',
        //             _deleted: true
        //         });
        //         console.log('MONGO TX INNER PING WRITE DONE');



        //         console.log('MONGO TX WRITES START');
        //         await Promise.all([
        //             // inserts
        //             categorized.bulkInsertDocs.length > 0 ? mongoCollection.insertMany(
        //                 categorized.bulkInsertDocs.map(writeRow => {
        //                     const docId = writeRow.document[primaryPath];
        //                     ret.success[docId as any] = writeRow.document;
        //                     const objectId = new ObjectId();
        //                     return swapRxDocToMongo(objectId, writeRow.document) as any;
        //                 }),
        //                 {
        //                     session
        //                 }
        //             ) : undefined,
        //             // updates
        //             categorized.bulkUpdateDocs.length > 0 ? mongoCollection.bulkWrite(
        //                 categorized.bulkUpdateDocs.map(writeRow => {
        //                     const docId = writeRow.document[primaryPath];
        //                     ret.success[docId as any] = writeRow.document;
        //                     const objectId = getFromMapOrThrow(this.mongoObjectIdCache, writeRow.previous);
        //                     return {
        //                         updateOne: {
        //                             filter: { _id: objectId },
        //                             update: {
        //                                 $set: writeRow.document
        //                             }
        //                         }
        //                     } as any;
        //                 }),
        //                 {
        //                     session
        //                 }
        //             ) : undefined
        //         ]);
        //     }, {
        //         readPreference: 'primary',
        //         readConcern: { level: 'majority' },
        //         writeConcern: { w: 'majority' }
        //     });
        //     console.log('MONGO TX COMMIT DONE');
        // } catch (error) {
        //     console.error('mongodb bulk write error -> abort transaction:');
        //     console.dir(error);
        //     console.log('MONGO TX ABORT');
        //     await session.abortTransaction();
        //     throw error;
        // } finally {
        //     console.log('MONGO TX END');
        //     await session.endSession();
        // }

        // console.log('ret:');
        // console.dir(ret);

        return ret;
    }

    async findDocumentsById(
        docIds: string[],
        withDeleted: boolean,
        session?: ClientSession
    ): Promise<RxDocumentDataById<RxDocType>> {

        console.log('findDocumentsById(' + docIds.join(', ') + ') START');

        const mongoCollection = await this.mongoCollectionPromise;
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
        const queryResult = await mongoCollection.find(
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
        console.log('findDocumentsById(' + docIds.join(', ') + ') DONE');
        console.dir(result);
        return result;
    }

    async query(
        preparedQuery: MongoDBPreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>> {
        const mongoCollection = await this.mongoCollectionPromise;
        let query = mongoCollection.find(preparedQuery.mongoSelector);
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
        const mongoCollection = await this.mongoCollectionPromise;
        const count = await mongoCollection.countDocuments(preparedQuery.mongoSelector);
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
        const mongoCollection = await this.mongoCollectionPromise;
        const sinceLwt = checkpoint ? checkpoint.lwt : RX_META_LWT_MINIMUM;
        const query = mongoCollection.find({
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
        const mongoCollection = await this.mongoCollectionPromise;
        const maxDeletionTime = now() - minimumDeletedTime;
        await mongoCollection.deleteMany({
            _deleted: true,
            '_meta.lwt': {
                $lt: maxDeletionTime
            }
        });
        return true;
    }

    async getAttachmentData(
        _documentId: string,
        _attachmentId: string,
        _digest: string
    ): Promise<string> {
        await this.mongoCollectionPromise;
        throw new Error('attachments not implemented, make a PR');
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> {
        return {} as any;
    }

    async remove(): Promise<void> {
        const mongoCollection = await this.mongoCollectionPromise;
        await mongoCollection.drop();
    }

    async close(): Promise<void> {
        await this.mongoCollectionPromise;
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
