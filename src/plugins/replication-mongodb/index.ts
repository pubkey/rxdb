import {
    RXDB_VERSION,
    deepEqual,
    ensureNotFalsy,
    errorToPlainJson,
    toArray
} from '../../plugins/utils/index.ts';

import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import type {
    RxCollection,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxReplicationWriteToMasterRow,
    RxReplicationPullStreamItem,
    RxDocumentData
} from '../../types/index.d.ts';
import {
    RxReplicationState,
    startReplicationOnLeaderShip
} from '../replication/index.ts';
import {
    addRxPlugin,
    newRxError,
    WithDeleted
} from '../../index.ts';

import { Subject } from 'rxjs';
import { awaitRetry } from '../replication/replication-helper.ts';
import type {
    MongoDBChangeStreamResumeToken,
    MongoDbCheckpointType,
    SyncOptionsMongoDB
} from './mongodb-types.ts';

import {
    Db as MongoDatabase,
    Collection as MongoCollection,
    MongoClient,
    ObjectId,
    ClientSession,
    ChangeStreamDocument
} from 'mongodb';
import { MONGO_OPTIONS_DRIVER_INFO } from '../storage-mongodb/mongodb-helper.ts';
import { iterateCheckpoint } from './mongodb-checkpoint.ts';
import { mongodbDocToRxDB, startChangeStream } from './mongodb-helper.ts';

export * from './mongodb-helper.ts';
export * from './mongodb-checkpoint.ts';
export type * from './mongodb-types.ts';


export class RxMongoDBReplicationState<RxDocType> extends RxReplicationState<RxDocType, MongoDbCheckpointType> {
    public readonly mongoClient: MongoClient;
    public readonly mongoDatabase: MongoDatabase;
    public readonly mongoCollection: MongoCollection<RxDocumentData<RxDocType> | any>;

    constructor(
        public readonly options: SyncOptionsMongoDB<RxDocType>,
        public readonly replicationIdentifier: string,
        public readonly collection: RxCollection<RxDocType, any, any>,
        public readonly pull?: ReplicationPullOptions<RxDocType, MongoDbCheckpointType>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly live: boolean = true,
        public retryTime: number = 1000 * 5,
        public autoStart: boolean = true
    ) {

        super(
            replicationIdentifier,
            collection,
            options.deletedField,
            pull,
            push,
            live,
            retryTime,
            autoStart
        );

        this.mongoClient = new MongoClient(options.config.connection, MONGO_OPTIONS_DRIVER_INFO);
        this.mongoDatabase = this.mongoClient.db(options.config.databaseName);
        this.mongoCollection = this.mongoDatabase.collection(options.config.collectionName);
    }
}


export function replicateMongoDB<RxDocType>(options: SyncOptionsMongoDB<RxDocType>) {
    addRxPlugin(RxDBLeaderElectionPlugin);
    const primaryPath = options.collection.schema.primaryPath;
    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.deletedField = options.deletedField ? options.deletedField : '_deleted';
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, MongoDbCheckpointType>> = new Subject();

    const mongoClient = new MongoClient(options.config.connection, MONGO_OPTIONS_DRIVER_INFO);
    const mongoDatabase = mongoClient.db(options.config.databaseName);
    const mongoCollection = mongoDatabase.collection(options.config.collectionName);


    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, MongoDbCheckpointType> | undefined;
    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: MongoDbCheckpointType | undefined,
                batchSize: number
            ) {
                console.log('PULL 0:');
                console.dir(lastPulledCheckpoint);
                const result = await iterateCheckpoint(primaryPath, mongoCollection, batchSize, lastPulledCheckpoint);
                console.log('PULL 1 ' + result.docs.length);
                console.dir(result);
                return {
                    documents: result.docs.map(d => mongodbDocToRxDB(primaryPath, d)),
                    checkpoint: result.checkpoint
                };
            },
            batchSize: ensureNotFalsy(options.pull).batchSize,
            modifier: ensureNotFalsy(options.pull).modifier,
            stream$: pullStream$.asObservable()
        };
    }

    let replicationPrimitivesPush: ReplicationPushOptions<RxDocType> | undefined;
    if (options.push) {
        replicationPrimitivesPush = {
            async handler(
                rows: RxReplicationWriteToMasterRow<RxDocType>[]
            ) {
                console.log('push START');
                const conflicts: WithDeleted<RxDocType>[] = [];
                const session: ClientSession = mongoClient.startSession();
                session.startTransaction();
                const ids = rows.map(row => (row.newDocumentState as any)[primaryPath]);
                const currentDocsArray = await mongoCollection.find(
                    { [primaryPath]: { $in: ids } },
                    { session }
                ).toArray();
                const currentDocsMap = new Map<any, any>();
                currentDocsArray.forEach(doc => {
                    currentDocsMap.set(doc[primaryPath], doc);
                });
                let promises: Promise<any>[] = [];
                console.log('push rows: ' + rows.length);
                rows.forEach(row => {
                    const doc = row.newDocumentState;
                    const docId = (doc as any)[primaryPath];
                    const current = currentDocsMap.get(docId);
                    const remoteDocState = current ? mongodbDocToRxDB(primaryPath, current) : undefined;

                    if (
                        remoteDocState &&
                        (
                            !row.assumedMasterState ||
                            options.collection.conflictHandler.isEqual(remoteDocState, row.assumedMasterState, 'mongodb-pull-equal-check') === false
                        )
                    ) {
                        // conflict
                        console.log('has conflict!:');
                        console.dir({
                            assumed: row.assumedMasterState,
                            current,
                            currentmongotorxdb: remoteDocState
                        });
                        conflicts.push(remoteDocState);
                    } else {
                        console.log('update one:');
                        console.dir({
                            docId,
                            doc,
                            primaryPath,
                            current: current ? current : 'none'
                        });
                        if (current) {
                            promises.push(
                                mongoCollection.updateOne(
                                    { [primaryPath]: docId },
                                    { $set: doc },
                                    {
                                        upsert: true,
                                        session
                                    }
                                ).catch(er => {
                                    console.log('update err:');
                                    console.dir(er);
                                }).then((xxx) => {
                                    console.log('update one done');
                                    console.dir({ xxx });
                                })
                            );
                        } else {
                            promises.push(
                                mongoCollection.insertOne(doc)
                            );
                        }
                    }



                    // if (!current && !row.assumedMasterState) {
                    // } else if (
                    //     current &&
                    //     row.assumedMasterState &&
                    //     options.collection.conflictHandler.isEqual(
                    //         row.assumedMasterState,
                    //         currentNonMongo,
                    //         'mongodb-pull-equal-check'
                    //     )
                    // ) {
                    //     console.log('has conflict!:');
                    //     console.dir({
                    //         assumed: row.assumedMasterState,
                    //         current,
                    //         currentmongotorxdb: currentNonMongo
                    //     });
                    //     hasConflict = currentNonMongo;
                    // }
                    // if (!hasConflict) {
                    //     console.log('update one:');
                    //     console.dir({
                    //         docId,
                    //         doc,
                    //         current: current ? current : 'none'
                    //     });
                    //     if (current) {

                    //         promises.push(
                    //             mongoCollection.updateOne(
                    //                 { [primaryPath]: docId },
                    //                 { $set: doc },
                    //                 {
                    //                     upsert: true,
                    //                     session
                    //                 }
                    //             ).catch(er => {
                    //                 console.log('update err:');
                    //                 console.dir(er);
                    //             }).then(() => {
                    //                 console.log('update one done');
                    //             })
                    //         );
                    //     } else {
                    //         promises.push(
                    //             mongoCollection.insertOne(doc)
                    //         );
                    //     }
                    // } else {
                    //     conflicts.push(hasConflict);
                    // }
                });
                await Promise.all(promises);
                await session.commitTransaction();
                console.log('push DONE');
                return conflicts;
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier
        };
    }


    const replicationState = new RxMongoDBReplicationState<RxDocType>(
        options,
        options.replicationIdentifier,
        options.collection,
        replicationPrimitivesPull,
        replicationPrimitivesPush,
        options.live,
        options.retryTime,
        options.autoStart
    );

    /**
     * Subscribe to changes for the pull.stream$
     */
    if (options.live && options.pull) {
        const startBefore = replicationState.start.bind(replicationState);
        const cancelBefore = replicationState.cancel.bind(replicationState);
        replicationState.start = async () => {
            const changestream = await startChangeStream(mongoCollection, undefined, replicationState.subjects.error);
            changestream.on('change', () => {
                console.log('CHANGESTERAM EMITTED!!');
                // TODO use the documents data of the change instead of emitting the RESYNC flag
                pullStream$.next('RESYNC');
            });
            replicationState.cancel = async () => {
                await changestream.close();
                return cancelBefore();
            };
            return startBefore();
        };
    }

    startReplicationOnLeaderShip(options.waitForLeadership, replicationState);
    return replicationState;
}
