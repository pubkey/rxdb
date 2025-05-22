import {
    ensureNotFalsy,
    errorToPlainJson
} from '../../plugins/utils/index.ts';
import { MongoClient, ObjectId } from 'mongodb';

import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import type {
    RxCollection,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxReplicationWriteToMasterRow,
    RxReplicationPullStreamItem
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
import type {
    NatsCheckpointType,
    NatsSyncOptions
} from './nats-types.ts';
import { connect, DeliverPolicy, JSONCodec, ReplayPolicy } from 'nats';
import { getNatsServerDocumentState } from './nats-helper.ts';
import { awaitRetry } from '../replication/replication-helper.ts';


export class RxMongoDBReplicationState<RxDocType> extends RxReplicationState<RxDocType, NatsCheckpointType> {
    constructor(
        public readonly replicationIdentifier: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType, NatsCheckpointType>,
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
