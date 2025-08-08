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

export * from './nats-types.ts';
export * from './nats-helper.ts';


export class RxNatsReplicationState<RxDocType> extends RxReplicationState<RxDocType, NatsCheckpointType> {
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



export function replicateNats<RxDocType>(
    options: NatsSyncOptions<RxDocType>
): RxNatsReplicationState<RxDocType> {
    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;

    const collection: RxCollection<RxDocType, any, any> = options.collection;
    const primaryPath = collection.schema.primaryPath;
    addRxPlugin(RxDBLeaderElectionPlugin);

    const jc = JSONCodec();


    const connectionStatePromise = (async () => {
        const nc = await connect(options.connection);
        const jetstreamClient = nc.jetstream();
        const jsm = await nc.jetstreamManager();
        await jsm.streams.add({
            name: options.streamName, subjects: [
                options.subjectPrefix + '.*'
            ]
        });
        const natsStream = await jetstreamClient.streams.get(options.streamName);
        return {
            nc,
            jetstreamClient,
            jsm,
            natsStream
        };
    })();
    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, NatsCheckpointType>> = new Subject();

    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, NatsCheckpointType> | undefined;
    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: NatsCheckpointType | undefined,
                batchSize: number
            ) {
                const cn = await connectionStatePromise;
                const newCheckpoint: NatsCheckpointType = {
                    sequence: lastPulledCheckpoint ? lastPulledCheckpoint.sequence : 0
                };
                const consumer = await cn.natsStream.getConsumer({
                    opt_start_seq: lastPulledCheckpoint ? lastPulledCheckpoint.sequence : 0,
                    deliver_policy: DeliverPolicy.LastPerSubject,
                    replay_policy: ReplayPolicy.Instant
                });

                const fetchedMessages = await consumer.fetch({
                    max_messages: batchSize
                });
                await (fetchedMessages as any).signal;
                await fetchedMessages.close();

                const useMessages: WithDeleted<RxDocType>[] = [];
                for await (const m of fetchedMessages) {
                    useMessages.push(m.json());
                    newCheckpoint.sequence = m.seq;
                    m.ack();
                }
                return {
                    documents: useMessages,
                    checkpoint: newCheckpoint
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
                const cn = await connectionStatePromise;
                const conflicts: WithDeleted<RxDocType>[] = [];
                await Promise.all(
                    rows.map(async (writeRow) => {
                        const docId = (writeRow.newDocumentState as any)[primaryPath];

                        /**
                         * first get the current state of the documents from the server
                         * so that we have the sequence number for conflict detection.
                         */
                        let remoteDocState;
                        try {
                            remoteDocState = await getNatsServerDocumentState(
                                cn.natsStream,
                                options.subjectPrefix,
                                docId
                            );
                        } catch (err: Error | any) {
                            if (!err.message.includes('no message found')) {
                                throw err;
                            }
                        }

                        if (
                            remoteDocState &&
                            (
                                !writeRow.assumedMasterState ||
                                collection.conflictHandler.isEqual(remoteDocState.json(), writeRow.assumedMasterState, 'replication-nats-push') === false
                            )
                        ) {
                            // conflict
                            conflicts.push(remoteDocState.json());
                        } else {
                            // no conflict (yet)
                            let pushDone = false;
                            while (!pushDone) {
                                try {
                                    await cn.jetstreamClient.publish(
                                        options.subjectPrefix + '.' + docId,
                                        jc.encode(writeRow.newDocumentState),
                                        {
                                            expect: remoteDocState ? {
                                                streamName: options.streamName,
                                                lastSubjectSequence: remoteDocState.seq
                                            } : undefined
                                        }
                                    );
                                    pushDone = true;
                                } catch (err: Error | any) {
                                    if (err.message.includes('wrong last sequence')) {
                                        // A write happened while we are doing our write -> handle conflict
                                        const newServerState = await getNatsServerDocumentState(
                                            cn.natsStream,
                                            options.subjectPrefix,
                                            docId
                                        );
                                        conflicts.push(ensureNotFalsy(newServerState).json());
                                        pushDone = true;
                                    } else {
                                        replicationState.subjects.error.next(
                                            newRxError('RC_STREAM', {
                                                document: writeRow.newDocumentState,
                                                error: errorToPlainJson(err)
                                            })
                                        );

                                        // -> retry after wait
                                        await awaitRetry(
                                            collection,
                                            replicationState.retryTime
                                        );
                                    }
                                }
                            }
                        }
                    })
                );
                return conflicts;
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier
        };
    }


    const replicationState = new RxNatsReplicationState<RxDocType>(
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
            const cn = await connectionStatePromise;

            /**
             * First get the last sequence so that we can
             * laster only fetch 'newer' messages.
             */
            let lastSeq = 0;
            try {
                const lastDocState = await cn.natsStream.getMessage({
                    last_by_subj: options.subjectPrefix + '.*'
                });
                lastSeq = lastDocState.seq;
            } catch (err: any | Error) {
                if (!err.message.includes('no message found')) {
                    throw err;
                }
            }

            const consumer = await cn.natsStream.getConsumer({
                opt_start_seq: lastSeq
            });
            const newMessages = await consumer.consume();
            (async () => {
                for await (const m of newMessages) {
                    const docData: WithDeleted<RxDocType> = m.json();
                    pullStream$.next({
                        documents: [docData],
                        checkpoint: {
                            sequence: m.seq
                        }
                    });
                    m.ack();
                }
            })();
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
