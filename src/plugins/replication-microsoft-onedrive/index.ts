import {
    RxDBLeaderElectionPlugin
} from '../leader-election/index.ts';
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
    addRxPlugin
} from '../../index.ts';

import type {
    OneDriveCheckpointType,
    OneDriveState,
    SyncOptionsOneDrive
} from './microsoft-onedrive-types.ts';
import { Subject } from 'rxjs';
import { DriveStructure, initDriveStructure } from './init.ts';
import { handleUpstreamBatch } from './upstream.ts';
import { fetchChanges } from './downstream.ts';
import { commitTransaction, runInTransaction, startTransaction } from './transaction.ts';
import {
    ensureProcessNextTickIsSet
} from '../replication-webrtc/connection-handler-simple-peer.ts';
import { SignalingOptions, SignalingState } from './signaling.ts';

export * from './microsoft-onedrive-types.ts';
export * from './microsoft-onedrive-helper.ts';
export * from './transaction.ts';
export * from './init.ts';
export * from './document-handling.ts';
export * from './downstream.ts';
export * from './upstream.ts';
export * from './signaling.ts';

export const DEFAULT_TRANSACTION_TIMEOUT = 60 * 1000;

export class RxOneDriveReplicationState<RxDocType> extends RxReplicationState<RxDocType, OneDriveCheckpointType> {

    /**
     * Only exists on live replication
     */
    public signalingState?: SignalingState;

    constructor(
        public readonly oneDrive: OneDriveState,
        public readonly driveStructure: DriveStructure,
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType, any>,
        public readonly pull?: ReplicationPullOptions<RxDocType, OneDriveCheckpointType>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly signalingOptions?: SignalingOptions,
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


    /**
     * Notify other peers that something
     * has or might have changed so that
     * they can pull from their checkpoints.
     */
    async notifyPeers() {
        if (this.signalingState) {
            await this.signalingState.pingPeers('RESYNC');
        }
    }

}



export async function replicateMicrosoftOneDrive<RxDocType>(
    options: SyncOptionsOneDrive<RxDocType>
): Promise<RxOneDriveReplicationState<RxDocType>> {
    const collection: RxCollection<RxDocType, any, any> = options.collection;
    addRxPlugin(RxDBLeaderElectionPlugin);

    const oneDriveState: OneDriveState = Object.assign(
        {
            apiEndpoint: 'https://graph.microsoft.com/v1.0',
            driveId: 'me/drive',
            transactionTimeout: DEFAULT_TRANSACTION_TIMEOUT
        },
        options.oneDrive
    );
    const driveStructure = await initDriveStructure(oneDriveState);


    let replicationState: RxOneDriveReplicationState<RxDocType>;

    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, OneDriveCheckpointType>> = new Subject();
    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, OneDriveCheckpointType> | undefined;

    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;

    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: OneDriveCheckpointType | undefined,
                batchSize: number
            ) {
                return runInTransaction(
                    oneDriveState,
                    driveStructure,
                    collection.schema.primaryPath,
                    async () => {
                        const changes = await fetchChanges<RxDocType>(
                            oneDriveState,
                            driveStructure,
                            lastPulledCheckpoint,
                            batchSize
                        );
                        return changes as any;
                    }
                );
            },
            batchSize: options.pull.batchSize,
            modifier: options.pull.modifier,
            stream$: pullStream$.asObservable(),
            initialCheckpoint: options.pull.initialCheckpoint
        };
    }

    let replicationPrimitivesPush: ReplicationPushOptions<RxDocType> | undefined;
    if (options.push) {
        replicationPrimitivesPush = {
            async handler(
                rows: RxReplicationWriteToMasterRow<RxDocType>[]
            ) {
                return runInTransaction(
                    oneDriveState,
                    driveStructure,
                    collection.schema.primaryPath,
                    async () => {
                        const conflicts = await handleUpstreamBatch(
                            oneDriveState,
                            driveStructure,
                            options.collection.schema.primaryPath as any,
                            rows
                        );
                        return conflicts;
                    },
                    () => replicationState.notifyPeers().catch(() => { })
                );
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier
        };
    }



    replicationState = new RxOneDriveReplicationState<RxDocType>(
        oneDriveState,
        driveStructure,
        options.replicationIdentifier,
        collection,
        replicationPrimitivesPull,
        replicationPrimitivesPush,
        options.signalingOptions,
        options.live,
        options.retryTime,
        options.autoStart
    );

    /**
     * OneDrive has no websocket or server-send-events
     * to observe file changes reliably enough for real-time web. 
     * Therefore we use WebRTC to connect clients which then can ping each other on changes.
     * Instead of a signaling server, we use OneDrive itself
     * to exchange signaling data.
     */
    if (options.live && options.pull) {
        ensureProcessNextTickIsSet();
        const startBefore = replicationState.start.bind(replicationState);
        const cancelBefore = replicationState.cancel.bind(replicationState);
        replicationState.start = () => {
            replicationState.signalingState = new SignalingState(
                replicationState.oneDrive,
                replicationState.driveStructure,
                options.signalingOptions ? options.signalingOptions : {}
            );

            const sub = replicationState.signalingState.resync$.subscribe(() => {
                replicationState.reSync();
            });

            replicationState.cancel = () => {
                sub.unsubscribe();
                replicationState.signalingState?.close();
                return cancelBefore();
            };
            return startBefore();
        };
    }

    startReplicationOnLeaderShip(options.waitForLeadership, replicationState);
    return replicationState;
}
