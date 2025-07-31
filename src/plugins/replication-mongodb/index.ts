import {
    RXDB_VERSION,
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

export * from './mongodb-helper.ts';
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
    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.deletedField = options.deletedField ? options.deletedField : '_deleted';
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;


}
