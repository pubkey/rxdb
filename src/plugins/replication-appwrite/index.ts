import type {
    SyncOptionsAppwrite,
    AppwriteCheckpointType
} from './appwrite-types';
import {
    RxReplicationState,
    startReplicationOnLeaderShip
} from '../replication/index.ts';
import type {
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxCollection
} from '../../types';
import { addRxPlugin } from '../../plugin.ts';
import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import { Databases } from 'appwrite';

export class RxAppwriteReplicationState<RxDocType> extends RxReplicationState<RxDocType, AppwriteCheckpointType> {
    constructor(
        public readonly firestore: FirestoreOptions<RxDocType>,
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType, AppwriteCheckpointType>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly live: boolean = true,
        public retryTime: number = 1000 * 5,
        public autoStart: boolean = true
    ) {
        super(
            replicationIdentifierHash,
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

export function replicateAppwrite<RxDocType>(
    options: SyncOptionsAppwrite<RxDocType>
): RxAppwriteReplicationState<RxDocType> {
    const collection: RxCollection<RxDocType> = options.collection;
    addRxPlugin(RxDBLeaderElectionPlugin);
    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;

    const databases = new Databases(client);


    const replicationState = new RxAppwriteReplicationState<RxDocType>(
        options.firestore,
        options.replicationIdentifier,
        collection,
        replicationPrimitivesPull,
        replicationPrimitivesPush,
        options.live,
        options.retryTime,
        options.autoStart
    );

    startReplicationOnLeaderShip(options.waitForLeadership, replicationState);
    return replicationState;
}
