import {
    ensureNotFalsy,
    errorToPlainJson,
    flatClone,
    promiseWait
} from '../../plugins/utils/index.ts';

import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import type {
    RxCollection,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxReplicationPullStreamItem,
    WithDeleted
} from '../../types/index.d.ts';
import {
    RxReplicationState,
    startReplicationOnLeaderShip
} from '../replication/index.ts';
import {
    addRxPlugin,
    newRxError
} from '../../index.ts';

import type {
    ElectricSQLCheckpointType,
    SyncOptionsElectricSQL
} from './electric-sql-types.ts';
import { Subject } from 'rxjs';
import {
    buildElectricUrl,
    electricMessageToRxDBDocData,
    hasMustRefetch,
    type ElectricSQLMessage
} from './electric-sql-helper.ts';

export * from './electric-sql-helper.ts';
export * from './electric-sql-types.ts';

export class RxElectricSQLReplicationState<RxDocType> extends RxReplicationState<RxDocType, ElectricSQLCheckpointType> {
    constructor(
        public readonly replicationIdentifier: string,
        public readonly collection: RxCollection<RxDocType, any, any, any>,
        public readonly pull?: ReplicationPullOptions<RxDocType, ElectricSQLCheckpointType>,
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

export function replicateElectricSQL<RxDocType>(
    options: SyncOptionsElectricSQL<RxDocType>
): RxElectricSQLReplicationState<RxDocType> {
    options = flatClone(options);
    const collection = options.collection;
    const primaryPath = collection.schema.primaryPath;
    addRxPlugin(RxDBLeaderElectionPlugin);

    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;

    const useFetch = options.fetch || fetch;
    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, ElectricSQLCheckpointType>> = new Subject();

    /**
     * Shared state so that the live-polling loop knows the offset
     * the pull handler has reached.
     */
    let liveOffset = '';
    let liveHandle = '';

    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, ElectricSQLCheckpointType> | undefined;

    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: ElectricSQLCheckpointType | undefined,
                batchSize: number
            ) {
                let offset = lastPulledCheckpoint?.offset ?? '-1';
                let handle = lastPulledCheckpoint?.handle ?? '';

                const url = buildElectricUrl(
                    options.url,
                    options.params,
                    offset,
                    handle || undefined
                );

                const response = await useFetch(url, {
                    headers: options.headers || {}
                });

                if (!response.ok) {
                    throw newRxError('RC_PULL', {
                        args: { url, status: response.status }
                    });
                }

                let messages: ElectricSQLMessage<RxDocType>[] = await response.json();

                let electricOffset = response.headers.get('electric-offset') || offset;
                let electricHandle = response.headers.get('electric-handle') || handle;

                /**
                 * When Electric sends a must-refetch control message,
                 * the shape has changed and we must start over from
                 * offset -1.  We reset and immediately re-fetch inside
                 * the handler so the replication framework never sees
                 * a confusing empty-but-not-done response.
                 */
                if (hasMustRefetch(messages)) {
                    offset = '-1';
                    handle = '';
                    liveOffset = '';
                    liveHandle = '';

                    const retryUrl = buildElectricUrl(
                        options.url,
                        options.params,
                        offset,
                        undefined
                    );
                    const retryResponse = await useFetch(retryUrl, {
                        headers: options.headers || {}
                    });
                    if (!retryResponse.ok) {
                        throw newRxError('RC_PULL', {
                            args: { url: retryUrl, status: retryResponse.status }
                        });
                    }
                    messages = await retryResponse.json();
                    electricOffset = retryResponse.headers.get('electric-offset') || offset;
                    electricHandle = retryResponse.headers.get('electric-handle') || handle;
                }

                liveOffset = electricOffset;
                liveHandle = electricHandle;

                const documents: WithDeleted<RxDocType>[] = [];
                for (const message of messages) {
                    const doc = electricMessageToRxDBDocData<RxDocType>(message, primaryPath);
                    if (doc) {
                        documents.push(doc);
                    }
                }

                const newCheckpoint: ElectricSQLCheckpointType = {
                    offset: electricOffset,
                    handle: electricHandle
                };

                return {
                    documents,
                    checkpoint: newCheckpoint
                };
            },
            batchSize: ensureNotFalsy(options.pull).batchSize,
            modifier: ensureNotFalsy(options.pull).modifier,
            stream$: pullStream$.asObservable(),
            initialCheckpoint: options.pull.initialCheckpoint
        };
    }

    const replicationPrimitivesPush: ReplicationPushOptions<RxDocType> | undefined = options.push ? {
        handler: options.push.handler,
        batchSize: options.push.batchSize,
        modifier: options.push.modifier,
        initialCheckpoint: options.push.initialCheckpoint
    } : undefined;


    const replicationState = new RxElectricSQLReplicationState<RxDocType>(
        options.replicationIdentifier,
        collection,
        replicationPrimitivesPull,
        replicationPrimitivesPush,
        options.live,
        options.retryTime,
        options.autoStart
    );

    /**
     * Use Electric's live mode for real-time change detection.
     * After the initial sync completes (liveHandle is set), we long-poll
     * the Electric endpoint with live=true. When changes are detected,
     * we deliver documents through the pullStream$.
     */
    if (options.live && options.pull) {
        const startBefore = replicationState.start.bind(replicationState);
        const cancelBefore = replicationState.cancel.bind(replicationState);

        replicationState.start = () => {
            let isCanceled = false;
            let abortController: AbortController | null = null;

            const poll = async () => {
                while (!isCanceled && !liveHandle) {
                    await promiseWait(100);
                }

                while (!isCanceled) {
                    try {
                        abortController = new AbortController();
                        const url = buildElectricUrl(
                            options.url,
                            options.params,
                            liveOffset,
                            liveHandle,
                            true
                        );

                        const response = await useFetch(url, {
                            headers: options.headers || {},
                            signal: abortController.signal
                        });

                        if (!response.ok) {
                            throw newRxError('RC_STREAM', {
                                error: errorToPlainJson(new Error('Live polling failed: ' + response.status))
                            });
                        }

                        const messages: ElectricSQLMessage<RxDocType>[] = await response.json();

                        const newOffset = response.headers.get('electric-offset');
                        if (newOffset) liveOffset = newOffset;
                        const newHandle = response.headers.get('electric-handle');
                        if (newHandle) liveHandle = newHandle;

                        if (hasMustRefetch(messages)) {
                            pullStream$.next('RESYNC');
                            liveOffset = '';
                            liveHandle = '';
                            continue;
                        }

                        const documents: WithDeleted<RxDocType>[] = [];
                        for (const message of messages) {
                            const doc = electricMessageToRxDBDocData<RxDocType>(message, primaryPath);
                            if (doc) {
                                documents.push(doc);
                            }
                        }

                        if (documents.length > 0) {
                            pullStream$.next({
                                documents,
                                checkpoint: {
                                    offset: liveOffset,
                                    handle: liveHandle
                                }
                            });
                        }
                    } catch (err: any) {
                        if (isCanceled) break;
                        replicationState.subjects.error.next(
                            newRxError('RC_STREAM', {
                                error: errorToPlainJson(err)
                            })
                        );
                        await promiseWait(replicationState.retryTime);
                    }
                }
            };

            poll();

            replicationState.cancel = () => {
                isCanceled = true;
                if (abortController) abortController.abort();
                return cancelBefore();
            };

            return startBefore();
        };
    }

    startReplicationOnLeaderShip(options.waitForLeadership, replicationState);

    return replicationState;
}
