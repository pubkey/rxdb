/**
 * This plugin can be used to sync collections with a remote CouchDB endpoint.
 */
import {
    ensureNotFalsy,
    errorToPlainJson,
    flatClone,
    getFromMapOrThrow,
    now,
    promiseWait
} from '../../plugins/utils/index.ts';

import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import type {
    RxCollection,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxReplicationWriteToMasterRow,
    RxReplicationPullStreamItem,
    CouchdbChangesResult,
    CouchBulkDocResultRow,
    CouchAllDocsResponse,
    RxConflictHandler
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
    CouchDBCheckpointType,
    FetchMethodType,
    SyncOptionsCouchDB
} from './couchdb-types.ts';
import {
    couchDBDocToRxDocData,
    mergeUrlQueryParams,
    couchSwapPrimaryToId,
    getDefaultFetch
} from './couchdb-helper.ts';
import { awaitRetry } from '../replication/replication-helper.ts';

export * from './couchdb-helper.ts';
export * from './couchdb-types.ts';

export class RxCouchDBReplicationState<RxDocType> extends RxReplicationState<RxDocType, CouchDBCheckpointType> {
    constructor(
        public readonly url: string,
        public fetch: FetchMethodType,
        public readonly replicationIdentifier: string,
        public readonly collection: RxCollection<RxDocType, any, any, any>,
        public readonly pull?: ReplicationPullOptions<RxDocType, CouchDBCheckpointType>,
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

export function replicateCouchDB<RxDocType>(
    options: SyncOptionsCouchDB<RxDocType>
) {
    const collection = options.collection;
    const conflictHandler: RxConflictHandler<any> = collection.conflictHandler;
    addRxPlugin(RxDBLeaderElectionPlugin);
    const primaryPath = options.collection.schema.primaryPath;

    if (!options.url.endsWith('/')) {
        throw newRxError('RC_COUCHDB_1', {
            args: {
                collection: options.collection.name,
                url: options.url
            }
        });
    }

    options = flatClone(options);
    if (!options.url.endsWith('/')) {
        options.url = options.url + '/';
    }
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, CouchDBCheckpointType>> = new Subject();
    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, CouchDBCheckpointType> | undefined;
    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: CouchDBCheckpointType | undefined,
                batchSize: number
            ) {
                /**
                 * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/changes.html
                 */
                const url = options.url + '_changes?' + mergeUrlQueryParams({
                    style: 'all_docs',
                    feed: 'normal',
                    include_docs: true,
                    since: lastPulledCheckpoint ? lastPulledCheckpoint.sequence : 0,
                    heartbeat: options.pull && options.pull.heartbeat ? options.pull.heartbeat : 60000,
                    limit: batchSize,
                    seq_interval: batchSize
                });

                const response = await replicationState.fetch(url);
                const jsonResponse: CouchdbChangesResult = await response.json();
                if (!jsonResponse.results) {
                    throw newRxError('RC_COUCHDB_2', {
                        args: { jsonResponse }
                    });
                }
                const documents: WithDeleted<RxDocType>[] = jsonResponse.results
                    .map(row => couchDBDocToRxDocData(collection.schema.primaryPath, ensureNotFalsy(row.doc)));
                return {
                    documents,
                    checkpoint: {
                        sequence: jsonResponse.last_seq
                    }
                };
            },
            batchSize: ensureNotFalsy(options.pull).batchSize,
            modifier: ensureNotFalsy(options.pull).modifier,
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
                const conflicts: WithDeleted<RxDocType>[] = [];
                const pushRowsById = new Map<string, RxReplicationWriteToMasterRow<RxDocType>>();
                rows.forEach(row => {
                    const id = (row.newDocumentState as any)[primaryPath];
                    pushRowsById.set(id, row);
                });

                /**
                 * First get the current master state from the remote
                 * to check for conflicts
                 */
                const docsByIdResponse = await replicationState.fetch(
                    options.url + '_all_docs?' + mergeUrlQueryParams({}),
                    {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json'
                        },
                        body: JSON.stringify({
                            keys: rows.map(row => (row.newDocumentState as any)[primaryPath]),
                            include_docs: true,
                            deleted: 'ok'
                        })
                    }
                );
                const docsByIdRows: CouchAllDocsResponse = await docsByIdResponse.json();
                const nonConflictRows: typeof rows = [];
                const remoteRevById = new Map<string, string>();
                await Promise.all(
                    docsByIdRows.rows.map(async (row) => {
                        if (!row.doc) {
                            nonConflictRows.push(getFromMapOrThrow(pushRowsById, row.key));
                            return;
                        }
                        const realMasterState: WithDeleted<RxDocType> = couchDBDocToRxDocData(primaryPath, row.doc);
                        const pushRow = getFromMapOrThrow(pushRowsById, row.id);

                        if (
                            pushRow.assumedMasterState &&
                            conflictHandler.isEqual(realMasterState, pushRow.assumedMasterState, 'couchdb-push-1')
                        ) {
                            remoteRevById.set(row.id, row.doc._rev);
                            nonConflictRows.push(pushRow);
                        } else {
                            conflicts.push(realMasterState);
                        }
                    })
                );

                /**
                 * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/bulk-api.html#db-bulk-docs
                 */
                const url = options.url + '_bulk_docs?' + mergeUrlQueryParams({});
                const body = {
                    docs: nonConflictRows.map(row => {
                        const docId = (row.newDocumentState as any)[primaryPath];
                        const sendDoc = flatClone(row.newDocumentState);
                        if (remoteRevById.has(docId)) {
                            (sendDoc as any)._rev = getFromMapOrThrow(remoteRevById, docId);
                        }
                        return couchSwapPrimaryToId(collection.schema.primaryPath, sendDoc);
                    })
                };

                const response = await replicationState.fetch(
                    url,
                    {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json'
                        },
                        body: JSON.stringify(body)
                    }
                );
                const responseJson: CouchBulkDocResultRow[] = await response.json();

                // get conflicting writes
                const conflictAgainIds: string[] = [];
                responseJson.forEach(writeResultRow => {
                    const isConflict = writeResultRow.error === 'conflict';
                    if (!writeResultRow.ok && !isConflict) {
                        throw newRxError('SNH', { args: { writeResultRow } });
                    }
                    if (isConflict) {
                        conflictAgainIds.push(writeResultRow.id);
                    }
                });

                if (conflictAgainIds.length === 0) {
                    return conflicts;
                }

                const getConflictDocsUrl = options.url + '_all_docs?' + mergeUrlQueryParams({
                    include_docs: true,
                    keys: JSON.stringify(conflictAgainIds)
                });
                const conflictResponse = await replicationState.fetch(getConflictDocsUrl);
                const conflictResponseJson: CouchAllDocsResponse = await conflictResponse.json();
                conflictResponseJson.rows.forEach(conflictAgainRow => {
                    conflicts.push(couchDBDocToRxDocData(collection.schema.primaryPath, conflictAgainRow.doc));
                });

                return conflicts;
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier,
            initialCheckpoint: options.push.initialCheckpoint
        };
    }

    const replicationState = new RxCouchDBReplicationState<RxDocType>(
        options.url,
        options.fetch ? options.fetch : getDefaultFetch(),
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
        replicationState.start = () => {
            let since: string | number = 'now';
            const batchSize = options.pull && options.pull.batchSize ? options.pull.batchSize : 20;

            (async () => {
                let lastRequestStartTime = now();
                while (!replicationState.isStopped()) {
                    const url = options.url + '_changes?' + mergeUrlQueryParams({
                        style: 'all_docs',
                        feed: 'longpoll',
                        since,
                        include_docs: true,
                        heartbeat: options.pull && options.pull.heartbeat ? options.pull.heartbeat : 60000,
                        limit: batchSize,
                        seq_interval: batchSize
                    });

                    let jsonResponse: CouchdbChangesResult;
                    try {
                        lastRequestStartTime = now();
                        jsonResponse = await (await replicationState.fetch(url)).json();
                    } catch (err: any) {
                        replicationState.subjects.error.next(
                            newRxError('RC_STREAM', {
                                args: { url },
                                error: errorToPlainJson(err)
                            })
                        );

                        if (lastRequestStartTime < (now() - replicationState.retryTime)) {
                            /**
                             * Last request start was long ago,
                             * so we directly retry.
                             * This mostly happens on timeouts
                             * which are normal behavior for long polling requests.
                             */
                            await promiseWait(0);
                        } else {
                            // await next tick here otherwise we could go in to a 100% CPU blocking cycle.
                            await awaitRetry(
                                collection,
                                replicationState.retryTime
                            );
                        }
                        continue;
                    }
                    const documents: WithDeleted<RxDocType>[] = jsonResponse.results
                        .map(row => couchDBDocToRxDocData(collection.schema.primaryPath, ensureNotFalsy(row.doc)));
                    since = jsonResponse.last_seq;

                    pullStream$.next({
                        documents,
                        checkpoint: {
                            sequence: jsonResponse.last_seq
                        }
                    });
                }
            })();
            return startBefore();
        };
    }

    startReplicationOnLeaderShip(options.waitForLeadership, replicationState);

    return replicationState;
}
