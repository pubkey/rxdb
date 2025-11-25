import {
    ensureNotFalsy,
    flatClone
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
    WithDeleted
} from '../../index.ts';

import { Subject } from 'rxjs';
import type {
    MongoDbCheckpointType,
    SyncOptionsMongoDB
} from './mongodb-types.ts';

import {
    Db as MongoDatabase,
    Collection as MongoCollection,
    MongoClient,
    ClientSession
} from 'mongodb';
import { MONGO_OPTIONS_DRIVER_INFO } from '../storage-mongodb/mongodb-helper.ts';
import { iterateCheckpoint } from './mongodb-checkpoint.ts';
import { mongodbDocToRxDB, rxdbDocToMongo, startChangeStream } from './mongodb-helper.ts';

export * from './mongodb-helper.ts';
export * from './mongodb-checkpoint.ts';
export type * from './mongodb-types.ts';

export class RxMongoDBReplicationState<RxDocType> extends RxReplicationState<RxDocType, MongoDbCheckpointType> {

    constructor(
        public readonly mongoClient: MongoClient,
        public readonly mongoDatabase: MongoDatabase,
        public readonly mongoCollection: MongoCollection<RxDocumentData<RxDocType> | any>,
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
            '_deleted',
            pull,
            push,
            live,
            retryTime,
            autoStart
        );
    }
}

export function replicateMongoDB<RxDocType>(options: SyncOptionsMongoDB<RxDocType>) {
    addRxPlugin(RxDBLeaderElectionPlugin);
    const primaryPath = options.collection.schema.primaryPath;
    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, MongoDbCheckpointType>> = new Subject();

    const mongoClient = new MongoClient(options.mongodb.connection, MONGO_OPTIONS_DRIVER_INFO);
    const mongoDatabase = mongoClient.db(options.mongodb.databaseName);
    const mongoCollection = mongoDatabase.collection(options.mongodb.collectionName);

    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, MongoDbCheckpointType> | undefined;
    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: MongoDbCheckpointType | undefined,
                batchSize: number
            ) {
                const result = await iterateCheckpoint<RxDocType>(primaryPath, mongoCollection, batchSize, lastPulledCheckpoint);
                return {
                    documents: result.docs,
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
                const conflicts: WithDeleted<RxDocType>[] = [];
                const session: ClientSession = mongoClient.startSession();
                session.startTransaction(options.mongodb.pushTransactionOptions);
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
                rows.forEach(row => {
                    const toMongoDoc = rxdbDocToMongo(row.newDocumentState as any);
                    const docId = (row.newDocumentState as any)[primaryPath];
                    const current = currentDocsMap.get(docId);
                    const remoteDocState = current ? mongodbDocToRxDB(primaryPath, current) : undefined;

                    /**
                     * We do not want to require a deleted-flag or any RxDB specific stuff on the RxDB side.
                     * So for deletes we have to hack around this.
                     */
                    let assumedMaster = row.assumedMasterState;
                    if (row.newDocumentState._deleted) {
                        if (remoteDocState) {
                            if (!assumedMaster) {
                                // remote exists but not assumed -> conflict
                                conflicts.push(remoteDocState);
                            } else if (assumedMaster._deleted) {
                                // remote exists but assumed as deleted -> conflict
                                conflicts.push(remoteDocState);
                            } else {
                                // remote exists and assumed to exist -> check for normal conflict or do the deletion-write
                                if (options.collection.conflictHandler.isEqual(remoteDocState, assumedMaster, 'mongodb-pull-equal-check-deleted') === false) {
                                    // conflict
                                    conflicts.push(remoteDocState);
                                } else {
                                    promises.push(
                                        mongoCollection.deleteOne(
                                            {
                                                [primaryPath]: docId
                                            },
                                            {
                                                session
                                            }
                                        )
                                    );
                                }

                            }
                        } else {
                            if (!assumedMaster) {
                                // no remote and no assumed master -> insertion of deleted -> do nothing
                            } else if (assumedMaster._deleted) {
                                // no remote and assumed master also deleted -> insertion of deleted -> do nothing
                            }
                        }
                    } else {
                        /**
                         * Non-deleted are handled normally like in every other
                         * of the replication plugins.
                         */
                        if (
                            remoteDocState &&
                            (
                                !row.assumedMasterState ||
                                options.collection.conflictHandler.isEqual(remoteDocState, row.assumedMasterState, 'mongodb-pull-equal-check') === false
                            )
                        ) {
                            // conflict
                            conflicts.push(remoteDocState);
                        } else {
                            if (current) {
                                if (row.newDocumentState._deleted) {
                                    promises.push(
                                        mongoCollection.deleteOne(
                                            {
                                                [primaryPath]: docId
                                            },
                                            {
                                                session
                                            }
                                        )
                                    );
                                } else {
                                    promises.push(
                                        mongoCollection.updateOne(
                                            { [primaryPath]: docId },
                                            { $set: toMongoDoc },
                                            {
                                                upsert: true,
                                                session
                                            }
                                        )
                                    );
                                }
                            } else {
                                /**
                                 * No current but has assumed.
                                 * This means the server state was deleted
                                 * and we have a conflict.
                                 */
                                if (row.assumedMasterState) {
                                    const conflicting = flatClone(row.assumedMasterState);
                                    conflicting._deleted = true;
                                    conflicts.push(conflicting);
                                } else {
                                    if (row.newDocumentState._deleted) {
                                        // inserting deleted -> do nothing
                                    } else {
                                        promises.push(
                                            mongoCollection.insertOne(toMongoDoc, { session })
                                        );
                                    }
                                }
                            }
                        }
                    }
                });
                await Promise.all(promises);
                await session.commitTransaction();
                return conflicts;
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier
        };
    }


    const replicationState = new RxMongoDBReplicationState<RxDocType>(
        mongoClient,
        mongoDatabase,
        mongoCollection,
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
