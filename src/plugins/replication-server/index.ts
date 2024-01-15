import {
    ensureNotFalsy,
    errorToPlainJson
} from '../../plugins/utils/index.ts';


import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import type {
    RxCollection,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxReplicationWriteToMasterRow,
    RxReplicationPullStreamItem,
    RxStorageDefaultCheckpoint
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
import { ServerSyncOptions } from './types.ts';

export * from './types.ts';
export * from './helper.ts';


export class RxServerReplicationState<RxDocType> extends RxReplicationState<RxDocType, RxStorageDefaultCheckpoint> {
    constructor(
        public readonly replicationIdentifier: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType, RxStorageDefaultCheckpoint>,
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



export function replicateServer<RxDocType>(
    options: ServerSyncOptions<RxDocType>
): RxServerReplicationState<RxDocType> {
    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;

    const collection = options.collection;
    const primaryPath = collection.schema.primaryPath;
    addRxPlugin(RxDBLeaderElectionPlugin);

    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, RxStorageDefaultCheckpoint>> = new Subject();

    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, RxStorageDefaultCheckpoint> | undefined;
    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(checkpointOrNull, batchSize) {
                const lwt = checkpointOrNull ? checkpointOrNull.lwt : 0;
                const id = checkpointOrNull ? checkpointOrNull.id : '';
                const response = await fetch(options.url + `pull?lwt=${lwt}&id=${id}&limit=${batchSize}`);
                const data = await response.json();
                return {
                    documents: data.documents,
                    checkpoint: data.checkpoint
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
            async handler(changeRows) {
                const rawResponse = await fetch(options.url + 'push', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ changeRows })
                });
                const conflictsArray = await rawResponse.json();
                return conflictsArray;
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier
        };
    }


    const replicationState = new RxServerReplicationState<RxDocType>(
        options.replicationIdentifier,
        collection,
        replicationPrimitivesPull,
        replicationPrimitivesPush,
        options.live,
        options.retryTime,
        options.autoStart
    );

    /**
     * Use long polling to get live changes for the pull.stream$
     */
    if (options.live && options.pull) {
        const startBefore = replicationState.start.bind(replicationState);
        const cancelBefore = replicationState.cancel.bind(replicationState);
        replicationState.start = async () => {
            const eventSource = new EventSource(options.url + 'pullStream', { withCredentials: true });
            evtSource.onmessage = event => {
                const eventData = JSON.parse(event.data);
                pullStream$.next({
                    documents: eventData.documents,
                    checkpoint: eventData.checkpoint
                });
            };

            replicationState.cancel = () => {
                newMessages.close();
                return cancelBefore();
            };
            return startBefore();
        };
    }

    startReplicationOnLeaderShip(options.waitForLeadership, replicationState);

    return replicationState;
}
