import {
    BehaviorSubject,
    Observable,
    Subject,
    filter,
    firstValueFrom
} from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper.ts';
import type {
    BulkWriteRow,
    EventBulk,
    PreparedQuery,
    RxDocumentData,
    RxJsonSchema,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageCountResult,
    RxStorageDefaultCheckpoint,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult,
    RxStorageWriteErrorConflict,
    StringKeys
} from '../../types/index.d.ts';
import {
    ensureNotFalsy,
    getFromMapOrThrow,
    isMaybeReadonlyArray,
    now,
    PROMISE_RESOLVE_VOID,
    requestIdlePromise
} from '../../plugins/utils/index.ts';
import {
    MongoDBStorageInternals,
    MongoQuerySelector,
    RxStorageMongoDBInstanceCreationOptions,
    RxStorageMongoDBSettings
} from './mongodb-types.ts';
import { RxStorageMongoDB } from './rx-storage-mongodb.ts';
import {
    Db as MongoDatabase,
    Collection as MongoCollection,
    MongoClient,
    ObjectId,
    ClientSession
} from 'mongodb';
import { categorizeBulkWriteRows } from '../../rx-storage-helper.ts';
import {
    MONGO_ID_SUBSTITUTE_FIELDNAME,
    MONGO_OPTIONS_DRIVER_INFO,
    getMongoDBIndexName,
    prepareMongoDBQuery,
    swapMongoToRxDoc,
    swapRxDocToMongo
} from './mongodb-helper.ts';
import { RXDB_VERSION } from '../utils/utils-rxdb-version.ts';

export class RxStorageInstanceMongoDB<RxDocType> implements RxStorageInstance<
    RxDocType,
    MongoDBStorageInternals,
    RxStorageMongoDBInstanceCreationOptions,
    RxStorageDefaultCheckpoint
> {

    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    public readonly inMongoPrimaryPath: string;
    public closed?: Promise<void>;
    private readonly changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> = new Subject();
    public readonly mongoClient: MongoClient;
    public readonly mongoDatabase: MongoDatabase;
    public readonly mongoCollectionPromise: Promise<MongoCollection<RxDocumentData<RxDocType> | any>>;
    // public mongoChangeStream?: MongoChangeStream<any, ChangeStreamDocument<any>>;


    /**
     * Closing the connection must not happen when
     * an operation is running, otherwise we get an error.
     * So we store all running operations here so that
     * they can be awaited.
     */
    public readonly runningOperations = new BehaviorSubject(0);
    public writeQueue: Promise<any> = PROMISE_RESOLVE_VOID;

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
        this.inMongoPrimaryPath = this.primaryPath === '_id' ? MONGO_ID_SUBSTITUTE_FIELDNAME : this.primaryPath;

        this.mongoClient = new MongoClient(storage.databaseSettings.connection, MONGO_OPTIONS_DRIVER_INFO);
        this.mongoDatabase = this.mongoClient.db(databaseName + '-v' + this.schema.version);

        const indexes = (this.schema.indexes ? this.schema.indexes.slice() : []).map(index => {
            const arIndex = isMaybeReadonlyArray(index) ? index.slice(0) : [index];
            return arIndex;
        });
        indexes.push([this.inMongoPrimaryPath]);

        this.mongoCollectionPromise = this.mongoDatabase.createCollection(collectionName)
            .then(async (mongoCollection) => {
                await mongoCollection.createIndexes(
                    indexes.map(index => {
                        const mongoIndex: any = {};
                        index.forEach(field => mongoIndex[field] = 1);
                        return { name: getMongoDBIndexName(index), key: mongoIndex };
                    })
                );

                /**
                 * TODO in a setup where multiple servers run node.js
                 * processes that use the mongodb storage, we should propagate
                 * events by listening to the mongodb changestream.
                 * This maybe should be a premium feature.
                 */
                // this.mongoChangeStream = mongoCollection.watch(
                //     undefined, {
                //     batchSize: 100
                // }
                // ).on('change', change => {


                //     const eventBulkId = randomToken(10);
                //     const newDocData: RxDocumentData<RxDocType> = (change as any).fullDocument;
                //     const documentId = newDocData[this.primaryPath] as any;

                //     const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint> = {
                //         checkpoint: {
                //             id: newDocData[this.primaryPath] as any,
                //             lwt: newDocData._meta.lwt
                //         },
                //         context: 'mongodb-write',
                //         id: eventBulkId,
                //         events: [{
                //             documentData: newDocData,
                //             documentId,
                //             operation: 'INSERT',
                //             previousDocumentData: undefined,
                //         }],
                //     };

                //     this.changes$.next(eventBulk);
                // });


                return mongoCollection;
            });


    }

    /**
     * Bulk writes on the mongodb storage.
     * Notice that MongoDB does not support cross-document transactions
     * so we have to do a update-if-previous-is-correct like operations.
     * (Similar to what RxDB does with the revision system)
     */
    bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>> {

        this.writeQueue = this.writeQueue.then(async () => {
            this.runningOperations.next(this.runningOperations.getValue() + 1);

            const mongoCollection = await this.mongoCollectionPromise;
            if (this.closed) {
                return Promise.reject(new Error('already closed'));
            }
            const primaryPath = this.primaryPath;
            const ret: RxStorageBulkWriteResponse<RxDocType> = {
                error: []
            };


            const docIds = documentWrites.map(d => (d.document as any)[primaryPath]);
            const documentStates = await this.findDocumentsById(
                docIds,
                true
            );
            const documentStatesMap = new Map();
            documentStates.forEach(doc => {
                const docId = doc[primaryPath];
                documentStatesMap.set(docId, doc);
            });
            const categorized = categorizeBulkWriteRows<RxDocType>(
                this,
                primaryPath as any,
                documentStatesMap,
                documentWrites,
                context
            );

            const changeByDocId = new Map<string, RxStorageChangeEvent<RxDocumentData<RxDocType>>>();
            categorized.eventBulk.events.forEach(change => {
                changeByDocId.set(change.documentId, change);
            });


            ret.error = categorized.errors;

            /**
             * Reset the event bulk because
             * conflicts can still appear after the categorization
             */
            const eventBulk = categorized.eventBulk;
            eventBulk.events = [];

            await Promise.all([
                /**
                 * Inserts
                 * @link https://sparkbyexamples.com/mongodb/mongodb-insert-if-not-exists/
                 */
                Promise.all(
                    categorized.bulkInsertDocs.map(async (writeRow) => {
                        const docId: string = writeRow.document[primaryPath] as any;
                        const writeResult = await mongoCollection.findOneAndUpdate(
                            {
                                [this.inMongoPrimaryPath]: docId
                            },
                            {
                                $setOnInsert: swapRxDocToMongo(writeRow.document)
                            },
                            {
                                upsert: true,
                                includeResultMetadata: true
                            }
                        );
                        if (writeResult.value) {
                            // had insert conflict
                            const conflictError: RxStorageWriteErrorConflict<RxDocType> = {
                                status: 409,
                                documentId: docId,
                                writeRow,
                                documentInDb: swapMongoToRxDoc(ensureNotFalsy(writeResult.value)),
                                isError: true
                            };
                            ret.error.push(conflictError);
                        } else {
                            const event = changeByDocId.get(docId);
                            if (event) {
                                eventBulk.events.push(event);
                            }
                        }
                    })
                ),
                /**
                 * Updates
                 */
                Promise.all(
                    categorized.bulkUpdateDocs.map(async (writeRow) => {
                        const docId = writeRow.document[primaryPath] as string;
                        const writeResult = await mongoCollection.findOneAndReplace(
                            {
                                [this.inMongoPrimaryPath]: docId,
                                _rev: ensureNotFalsy(writeRow.previous)._rev
                            },
                            swapRxDocToMongo(writeRow.document),
                            {
                                includeResultMetadata: true,
                                upsert: false,
                                returnDocument: 'before'
                            }
                        );
                        if (!writeResult.ok) {
                            const currentDocState = await this.findDocumentsById([docId], true);
                            const currentDoc = currentDocState[0];
                            // had insert conflict
                            const conflictError: RxStorageWriteErrorConflict<RxDocType> = {
                                status: 409,
                                documentId: docId,
                                writeRow,
                                documentInDb: ensureNotFalsy(currentDoc),
                                isError: true
                            };
                            ret.error.push(conflictError);
                        } else {
                            const event = getFromMapOrThrow(changeByDocId, docId);
                            eventBulk.events.push(event);
                        }

                    })
                )
            ]);

            if (categorized.eventBulk.events.length > 0) {
                const lastState = ensureNotFalsy(categorized.newestRow).document;
                categorized.eventBulk.checkpoint = {
                    id: lastState[primaryPath],
                    lwt: lastState._meta.lwt
                };
                this.changes$.next(categorized.eventBulk);
            }

            this.runningOperations.next(this.runningOperations.getValue() - 1);
            return ret;
        });
        return this.writeQueue;

    }

    async findDocumentsById(
        docIds: string[],
        withDeleted: boolean,
        session?: ClientSession
    ): Promise<RxDocumentData<RxDocType>[]> {
        this.runningOperations.next(this.runningOperations.getValue() + 1);
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
        const result: RxDocumentData<RxDocType>[] = [];
        const queryResult = await mongoCollection.find(
            plainQuery,
            {
                session
            }
        ).toArray();
        queryResult.forEach(row => {
            result.push(
                swapMongoToRxDoc(
                    row as any
                )
            );
        });
        this.runningOperations.next(this.runningOperations.getValue() - 1);
        return result;
    }

    async query(
        originalPreparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>> {
        const preparedQuery = prepareMongoDBQuery(this.schema, originalPreparedQuery.query);

        this.runningOperations.next(this.runningOperations.getValue() + 1);
        await this.writeQueue;
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
        const resultDocs = await query.toArray();
        this.runningOperations.next(this.runningOperations.getValue() - 1);
        return {
            documents: resultDocs.map(d => swapMongoToRxDoc(d))
        };
    }

    async count(
        originalPreparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageCountResult> {
        const preparedQuery = prepareMongoDBQuery(this.schema, originalPreparedQuery.query);
        this.runningOperations.next(this.runningOperations.getValue() + 1);
        await this.writeQueue;
        const mongoCollection = await this.mongoCollectionPromise;
        const count = await mongoCollection.countDocuments(preparedQuery.mongoSelector);
        this.runningOperations.next(this.runningOperations.getValue() - 1);
        return {
            count,
            mode: 'fast'
        };
    }

    async cleanup(minimumDeletedTime: number): Promise<boolean> {
        this.runningOperations.next(this.runningOperations.getValue() + 1);
        const mongoCollection = await this.mongoCollectionPromise;
        const maxDeletionTime = now() - minimumDeletedTime;
        await mongoCollection.deleteMany({
            _deleted: true,
            '_meta.lwt': {
                $lt: maxDeletionTime
            }
        });
        this.runningOperations.next(this.runningOperations.getValue() - 1);
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
        return this.changes$;
    }

    async remove(): Promise<void> {
        if (this.closed) {
            throw new Error('already closed');
        }
        this.runningOperations.next(this.runningOperations.getValue() + 1);
        const mongoCollection = await this.mongoCollectionPromise;
        await mongoCollection.drop();
        this.runningOperations.next(this.runningOperations.getValue() - 1);
        await this.close();
    }

    async close(): Promise<void> {
        // TODO without this next-tick we have random fails in the tests
        await requestIdlePromise(200);

        if (this.closed) {
            return this.closed;
        }
        this.closed = (async () => {
            await this.mongoCollectionPromise;
            await firstValueFrom(this.runningOperations.pipe(filter(c => c === 0)));
            // await ensureNotFalsy(this.mongoChangeStream).close();
            await this.mongoClient.close();
        })();
        return this.closed;
    }
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
        {},
        params.options,
        settings
    );
    return Promise.resolve(instance);
}
