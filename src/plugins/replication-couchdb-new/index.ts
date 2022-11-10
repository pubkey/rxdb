/**
 * this plugin adds the RxCollection.syncCouchDBNew()-function to rxdb
 * you can use it to sync collections with a remote CouchDB endpoint.
 */
import {
    ensureNotFalsy,
    fastUnsecureHash,
    flatClone
} from '../../util';

import { RxDBLeaderElectionPlugin } from '../leader-election';
import type {
    RxCollection,
    RxPlugin,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxReplicationWriteToMasterRow,
    RxReplicationPullStreamItem,
    PouchdbChangesResult,
    PouchBulkDocResultRow,
    PouchAllDocsResponse
} from '../../types';
import {
    RxReplicationState, startReplicationOnLeaderShip
} from '../replication';
import {
    addRxPlugin,
    newRxError,
    WithDeleted
} from '../../index';

import { Subject } from 'rxjs';
import type {
    CouchDBCheckpointType,
    FetchMethodType,
    SyncOptionsCouchDBNew
} from './couchdb-types';
import {
    couchDBDocToRxDocData,
    COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX,
    mergeUrlQueryParams
} from './couchdb-helper';
import { pouchSwapPrimaryToId } from '../pouchdb';

export * from './couchdb-helper';
export * from './couchdb-types';

export class RxCouchDBNewReplicationState<RxDocType> extends RxReplicationState<RxDocType, CouchDBCheckpointType> {
    constructor(
        public readonly url: string,
        public fetch: FetchMethodType,
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType, CouchDBCheckpointType>,
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

export function syncCouchDBNew<RxDocType>(
    this: RxCollection<RxDocType>,
    options: SyncOptionsCouchDBNew<RxDocType>
) {
    options = flatClone(options);
    if (!options.url.endsWith('/')) {
        options.url = options.url + '/';
    }
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;

    const collection = this;
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
                const jsonResponse: PouchdbChangesResult = await response.json();
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
            stream$: pullStream$.asObservable()
        }
    }

    let replicationPrimitivesPush: ReplicationPushOptions<RxDocType> | undefined;
    if (options.push) {
        replicationPrimitivesPush = {
            async handler(
                rows: RxReplicationWriteToMasterRow<RxDocType>[]
            ) {
                /**
                 * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/bulk-api.html#db-bulk-docs
                 */
                const url = options.url + '_bulk_docs?' + mergeUrlQueryParams({});
                const body = {
                    docs: rows.map(row => {
                        const sendDoc = flatClone(row.newDocumentState);
                        if (row.assumedMasterState) {
                            (sendDoc as any)._rev = ensureNotFalsy((row.assumedMasterState as any)._rev);
                        }
                        return pouchSwapPrimaryToId(collection.schema.primaryPath, sendDoc);
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
                const responseJson: PouchBulkDocResultRow[] = await response.json();

                const conflicts = responseJson.filter(row => {
                    const isConflict = row.error === 'conflict';
                    if (!row.ok && !isConflict) {
                        throw newRxError('SNH', { args: { row } });
                    }
                    return isConflict;
                });

                if (conflicts.length === 0) {
                    return [];
                }

                const getConflictDocsUrl = options.url + '_all_docs?' + mergeUrlQueryParams({
                    include_docs: true,
                    keys: JSON.stringify(conflicts.map(c => c.id))
                });
                const conflictResponse = await replicationState.fetch(getConflictDocsUrl);
                const conflictResponseJson: PouchAllDocsResponse = await conflictResponse.json();
                const conflictDocsMasterState: WithDeleted<RxDocType>[] = conflictResponseJson.rows
                    .map(r => couchDBDocToRxDocData(collection.schema.primaryPath, r.doc));

                return conflictDocsMasterState;
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier
        };
    }

    const replicationState = new RxCouchDBNewReplicationState<RxDocType>(
        options.url,
        options.fetch ? options.fetch : fetch,
        COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX + fastUnsecureHash(options.url),
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

                    let jsonResponse: PouchdbChangesResult;
                    try {
                        jsonResponse = await (await replicationState.fetch(url)).json();
                    } catch (err) {
                        pullStream$.error(err);
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


export const RxDBReplicationCouchDBNewPlugin: RxPlugin = {
    name: 'replication-couchdb-new',
    init() {
        addRxPlugin(RxDBLeaderElectionPlugin);
    },
    rxdb: true,
    prototypes: {
        RxCollection: (proto: any) => {
            proto.syncCouchDBNew = syncCouchDBNew;
        }
    }
};
