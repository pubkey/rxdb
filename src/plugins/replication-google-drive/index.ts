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
    GoogleDriveCheckpointType,
    GoogleDriveOptions,
    GoogleDriveOptionsWithDefaults,
    SyncOptionsGoogleDrive
} from './google-drive-types.ts';
import { Subject } from 'rxjs';
import { DriveStructure, initDriveStructure } from './init.ts';
import { handleUpstreamBatch } from './upstream.ts';
import { fetchChanges } from './downstream.ts';
import { commitTransaction, runInTransaction, startTransaction } from './transaction.ts';
import {
    ensureProcessNextTickIsSet
} from '../replication-webrtc/connection-handler-simple-peer.ts';
import { SignalingOptions, SignalingState } from './signaling.ts';
import {
    deserializeDocAttachments,
    serializeDocAttachments
} from './document-handling.ts';

export * from './google-drive-types.ts';
export * from './google-drive-helper.ts';
export * from './transaction.ts';
export * from './init.ts';
export * from './document-handling.ts';
export * from './multipart.ts';
export * from './downstream.ts';
export * from './upstream.ts';
export * from './signaling.ts';

export const DEFAULT_TRANSACTION_TIMEOUT = 60 * 1000;

export class RxGoogleDriveReplicationState<RxDocType> extends RxReplicationState<RxDocType, GoogleDriveCheckpointType> {

    /**
     * Only exists on live replication
     */
    public signalingState?: SignalingState;

    constructor(
        public readonly googleDrive: GoogleDriveOptionsWithDefaults,
        public readonly driveStructure: DriveStructure,
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType, any>,
        public readonly pull?: ReplicationPullOptions<RxDocType, GoogleDriveCheckpointType>,
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



export async function replicateGoogleDrive<RxDocType>(
    options: SyncOptionsGoogleDrive<RxDocType>
): Promise<RxGoogleDriveReplicationState<RxDocType>> {
    const collection: RxCollection<RxDocType, any, any> = options.collection;
    addRxPlugin(RxDBLeaderElectionPlugin);

    const googleDriveOptionsWithDefaults: GoogleDriveOptionsWithDefaults = Object.assign(
        {
            apiEndpoint: 'https://www.googleapis.com',
            transactionTimeout: DEFAULT_TRANSACTION_TIMEOUT
        },
        options.googleDrive
    );
    const driveStructure = await initDriveStructure(googleDriveOptionsWithDefaults);

    /**
     * When true, attachment binary data is serialised as base64 inside the
     * document JSON file stored on Google Drive.  Defaults to true only when
     * the collection schema has `attachments: {}` defined.  Can be disabled
     * explicitly by passing `attachments: false` in the options.
     */
    const replicateAttachments = options.attachments !== false && !!collection.schema.jsonSchema.attachments;


    let replicationState: RxGoogleDriveReplicationState<RxDocType>;

    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, GoogleDriveCheckpointType>> = new Subject();
    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, GoogleDriveCheckpointType> | undefined;

    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;

    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: GoogleDriveCheckpointType | undefined,
                batchSize: number
            ) {
                return runInTransaction(
                    googleDriveOptionsWithDefaults,
                    driveStructure,
                    collection.schema.primaryPath,
                    async () => {
                        const changes = await fetchChanges<RxDocType>(
                            googleDriveOptionsWithDefaults,
                            driveStructure,
                            lastPulledCheckpoint,
                            batchSize
                        );
                        /**
                         * Convert base64 attachment data that was stored in the
                         * Google Drive JSON file back to Blobs so that the
                         * downstream replication protocol can write them to the
                         * fork storage instance correctly.
                         */
                        if (replicateAttachments) {
                            await Promise.all(
                                changes.documents.map(doc => deserializeDocAttachments(doc as any))
                            );
                        }
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
                /**
                 * Convert Blob attachment data to base64 strings before the
                 * rows are written to the WAL file or stored as document JSON
                 * in Google Drive.  We create new row objects so the originals
                 * (which the replication protocol still uses for meta updates)
                 * are not mutated.
                 * When attachments are disabled we still run the conversion so
                 * that Blob values are stripped rather than serialised as `{}`
                 * by JSON.stringify.
                 */
                const rowsForDrive: RxReplicationWriteToMasterRow<RxDocType>[] =
                    await Promise.all(
                        rows.map(async row => {
                            const newState = await serializeDocAttachments(
                                row.newDocumentState,
                                replicateAttachments
                            );
                            return { ...row, newDocumentState: newState };
                        })
                    );

                return runInTransaction(
                    googleDriveOptionsWithDefaults,
                    driveStructure,
                    collection.schema.primaryPath,
                    async () => {
                        const conflicts = await handleUpstreamBatch(
                            googleDriveOptionsWithDefaults,
                            driveStructure,
                            options.collection.schema.primaryPath as any,
                            rowsForDrive
                        );
                        /**
                         * When attachment replication is enabled, deserialise the
                         * base64 attachment data that Google Drive stored in the
                         * `_attachments_data` field back into Blobs on each conflict
                         * document before returning them to the replication protocol.
                         *
                         * The protocol passes these as `realMasterState` to
                         * `resolveConflictError`, which (with the fix in
                         * `conflicts.ts`) then writes the resolved state — including
                         * the correct attachment Blob — to the fork instance.
                         * Without this deserialisation the fork would receive stubs
                         * with no binary data and the attachment would be lost.
                         */
                        if (replicateAttachments && conflicts.length > 0) {
                            await Promise.all(
                                conflicts.map(c => deserializeDocAttachments(c as any))
                            );
                        }
                        return conflicts;
                    },
                    () => replicationState.notifyPeers().catch(() => { })
                );
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier
        };
    }



    replicationState = new RxGoogleDriveReplicationState<RxDocType>(
        googleDriveOptionsWithDefaults,
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
     * Google drive has no websocket or server-send-events
     * to observe file changes. Therefore we use WebRTC to
     * connect clients which then can ping each other on changes.
     * Instead of a signaling server, we use the google-drive itself
     * to exchange signaling data.
     */
    if (options.live && options.pull) {
        ensureProcessNextTickIsSet();
        const startBefore = replicationState.start.bind(replicationState);
        const cancelBefore = replicationState.cancel.bind(replicationState);
        replicationState.start = () => {
            replicationState.signalingState = new SignalingState(
                replicationState.googleDrive,
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
