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

export * from './google-drive-types.ts';
export * from './google-drive-helper.ts';
export * from './pull-handler.ts';
export * from './transaction.ts';
export * from './init.ts';
export * from './document-handling.ts';
export * from './multipart.ts';
export * from './downstream.ts';
export * from './upstream.ts';

export const DEFAULT_TRANSACTION_TIMEOUT = 60 * 1000;

export class RxGoogleDriveReplicationState<RxDocType> extends RxReplicationState<RxDocType, GoogleDriveCheckpointType> {
    constructor(
        public readonly googleDrive: GoogleDriveOptionsWithDefaults,
        public readonly driveStructure: DriveStructure,
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType, GoogleDriveCheckpointType>,
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
                // TODO: implement pull handler
                return {
                    documents: [],
                    checkpoint: lastPulledCheckpoint ?? {
                        id: '',
                        modifiedTime: ''
                    }
                };
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
                const conflicts = await handleUpstreamBatch(
                    googleDriveOptionsWithDefaults,
                    driveStructure,
                    options.collection.schema.primaryPath as any,
                    rows
                );
                return conflicts;
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier
        };
    }


    const replicationState = new RxGoogleDriveReplicationState<RxDocType>(
        googleDriveOptionsWithDefaults,
        driveStructure,
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
