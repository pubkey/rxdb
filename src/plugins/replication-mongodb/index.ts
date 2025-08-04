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
import { mongodbDocToRxDB } from './mongodb-helper.ts';

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
        public readonly collection: RxCollection<RxDocType>,
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
                const result = await iterateCheckpoint(mongoCollection, batchSize, lastPulledCheckpoint);
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
                    currentDocsMap.set(doc._id.toString(), doc);
                });
                let promises: Promise<any>[] = [];
                rows.forEach(row => {
                    const doc = row.newDocumentState;
                    const docId = (doc as any)[primaryPath];
                    const current = currentDocsMap.get(docId);
                    let hasConflict: any = false;
                    if (!current && !row.assumedMasterState) {
                    } else if (
                        current &&
                        row.assumedMasterState &&
                        options.collection.conflictHandler.isEqual(
                            row.assumedMasterState,
                            mongodbDocToRxDB(primaryPath, current),
                            'mongodb-pull-equal-check'
                        )
                    ) {
                        hasConflict = current;
                    }
                    if (!hasConflict) {
                        promises.push(
                            mongoCollection.updateOne(
                                { [primaryPath]: docId },
                                { $set: doc },
                                { upsert: true, session }
                            )
                        );
                    } else {
                        conflicts.push(hasConflict);
                    }
                });
                await Promise.all(promises);
                return conflicts;
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier
        };
    }
}
