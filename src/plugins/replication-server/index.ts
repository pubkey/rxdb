import {
    ensureNotFalsy
} from '../../plugins/utils/index.ts';


import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import type {
    RxCollection,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxReplicationPullStreamItem,
    RxStorageDefaultCheckpoint,
    ById
} from '../../types/index.d.ts';
import {
    RxReplicationState,
    startReplicationOnLeaderShip
} from '../replication/index.ts';
import {
    addRxPlugin, newRxError
} from '../../index.ts';

import { Subject } from 'rxjs';
import { ServerSyncOptions } from './types.ts';
import { parseResponse } from './helpers.ts';

export * from './types.ts';


export class RxServerReplicationState<RxDocType> extends RxReplicationState<RxDocType, RxStorageDefaultCheckpoint> {

    public readonly outdatedClient$ = new Subject<void>();

    constructor(
        public readonly replicationIdentifier: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType, RxStorageDefaultCheckpoint>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly live: boolean = true,
        public retryTime: number = 1000 * 5,
        public autoStart: boolean = true,
        public headers: ById<string> = {}
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

        this.onCancel.push(() => this.outdatedClient$.complete());
    }
}



export function replicateServer<RxDocType>(
    options: ServerSyncOptions<RxDocType>
): RxServerReplicationState<RxDocType> {

    if (!options.pull && !options.push) {
        throw newRxError('UT3', {
            collection: options.collection.name,
            args: {
                replicationIdentifier: options.replicationIdentifier
            }
        });
    }

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
                const url = options.url + `/pull?lwt=${lwt}&id=${id}&limit=${batchSize}`;
                console.log('pull url ' + url);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: Object.assign({
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }, replicationState.headers),
                });
                const data = await await parseResponse(replicationState, response);
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
                const response = await fetch(options.url + '/push', {
                    method: 'POST',
                    headers: Object.assign({
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }, replicationState.headers),
                    body: JSON.stringify(changeRows)
                });
                const conflictsArray = await parseResponse(replicationState, response);
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
        options.autoStart,
        options.headers
    );

    /**
     * Use long polling to get live changes for the pull.stream$
     */
    if (options.live && options.pull) {
        const startBefore = replicationState.start.bind(replicationState);
        replicationState.start = async () => {
            // TODO add headers
            const useEventSource: typeof EventSource = options.eventSource ? options.eventSource : EventSource;
            const eventSource = new useEventSource(options.url + '/pullStream', { withCredentials: true });
            // TODO check for 426 errors and handle them
            eventSource.onerror = (err) => {
                console.log('eventsource error:');
                console.dir(err);
                pullStream$.next('RESYNC');
            };
            eventSource.onopen = (x) => {
                console.log('eventsource open!');
                console.dir(x);
            }
            eventSource.onmessage = event => {
                console.log('event source message:');
                console.dir(event.data);
                const eventData = JSON.parse(event.data);
                pullStream$.next({
                    documents: eventData.documents,
                    checkpoint: eventData.checkpoint
                });
            };

            replicationState.onCancel.push(() => eventSource.close());
            return startBefore();
        };
    }

    startReplicationOnLeaderShip(options.waitForLeadership, replicationState);

    return replicationState;
}