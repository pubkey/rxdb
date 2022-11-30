/**
 * this plugin adds the RxCollection.syncCouchDBNew()-function to rxdb
 * you can use it to sync collections with a remote CouchDB endpoint.
 */
import {
    ensureNotFalsy,
    fastUnsecureHash,
    lastOfArray
} from '../../util';

import {
    doc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
    runTransaction,
    writeBatch
} from 'firebase/firestore';

import { RxDBLeaderElectionPlugin } from '../leader-election';
import type {
    RxCollection,
    RxPlugin,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxReplicationWriteToMasterRow,
    RxReplicationPullStreamItem
} from '../../types';
import {
    RxReplicationState, startReplicationOnLeaderShip
} from '../replication';
import {
    addRxPlugin,
    ById,
    newRxError,
    WithDeleted
} from '../../index';

import type {
    FirestoreCheckpointType,
    FirestoreOptions,
    SyncOptionsFirestore
} from './firestore-types';
import { Subject } from 'rxjs';
import { FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX } from './firestore-helper';

export * from './firestore-helper';
export * from './firestore-types';

export class RxFirestoreReplicationState<RxDocType> extends RxReplicationState<RxDocType, FirestoreCheckpointType> {
    constructor(
        public readonly firestore: FirestoreOptions<RxDocType>,
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType, FirestoreCheckpointType>,
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


export function syncFirestore<RxDocType>(
    this: RxCollection<RxDocType>,
    options: SyncOptionsFirestore<RxDocType>
): RxFirestoreReplicationState<RxDocType> {
    const collection = this;
    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, FirestoreCheckpointType>> = new Subject();
    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, FirestoreCheckpointType> | undefined;
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;

    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: FirestoreCheckpointType | undefined,
                batchSize: number
            ) {

                const lastUpdateSortValue = lastPulledCheckpoint ? lastPulledCheckpoint.updateSortValue : '';
                const changesQuery = query(options.firestore.collection,
                    where(options.updateSortField, '>', lastUpdateSortValue),
                    orderBy(options.updateSortField, 'asc'),
                    limit(batchSize)
                );
                const queryResult = await getDocs(changesQuery);
                if (queryResult.size === 0) {
                    return {
                        checkpoint: lastPulledCheckpoint,
                        documents: []
                    };
                }
                const lastDoc = ensureNotFalsy(lastOfArray(queryResult.docs));
                const documents: WithDeleted<RxDocType>[] = queryResult.docs.map(row => row.data()) as any;

                const ret = {
                    documents: documents,
                    checkpoint: {
                        updateSortValue: (lastDoc as any)[options.updateSortField] as any
                    }
                } as any; // TODO why any?
                return ret;
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
                const primaryPath = collection.schema.primaryPath;
                const writeRowsById: ById<RxReplicationWriteToMasterRow<RxDocType>> = {};
                const docIds: string[] = rows.map(row => {
                    const docId = (row.newDocumentState as any)[primaryPath];
                    writeRowsById[docId] = row;
                    return docId;
                });
                let conflicts: WithDeleted<RxDocType>[] = [];

                /**
                 * Everything must run INSIDE of the transaction
                 * because on tx-errors, firebase will re-run the transaction on some cases.
                 * @link https://firebase.google.com/docs/firestore/manage-data/transactions#transaction_failure
                 * @link https://firebase.google.com/docs/firestore/manage-data/transactions
                 */
                await runTransaction(options.firestore.database, async (_tx) => {
                    conflicts = []; // reset in case the tx has re-run.
                    /**
                     * @link https://stackoverflow.com/a/48423626/3443137
                     */
                    const docsInDbResult = await getDocs(
                        query(
                            options.firestore.collection,
                            where(primaryPath, 'in', docIds)
                        )
                    );
                    const docsInDbById: ById<RxDocType> = {};
                    docsInDbResult.docs.forEach(row => {
                        const docDataInDb = row.data();
                        const docId = (docDataInDb as any)[primaryPath];
                        docsInDbById[docId] = docDataInDb;
                    });

                    /**
                     * @link https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes
                     */
                    const batch = writeBatch(options.firestore.database);
                    let hasWrite = false;
                    Object.entries(writeRowsById).forEach(([docId, writeRow]) => {
                        const docInDb: RxDocType | undefined = docsInDbById[docId];

                        if (
                            (!writeRow.assumedMasterState && docInDb) ||
                            (
                                writeRow.assumedMasterState &&
                                writeRow.assumedMasterState[options.updateSortField] !== docInDb[options.updateSortField]
                            )
                        ) {
                            // conflict
                            conflicts.push(docInDb as any);
                        } else {
                            // no conflict
                            hasWrite = true;
                            const docRef = doc(options.firestore.collection, docId);
                            if (!docInDb) {
                                // insert
                                batch.set(docRef, writeRow.newDocumentState);
                            } else {
                                // update
                                batch.update(docRef, writeRow.newDocumentState as any);
                            }
                        }
                    });

                    if (hasWrite) {
                        await batch.commit();
                    }
                });
                return conflicts;
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier
        };
    }


    const replicationState = new RxFirestoreReplicationState<RxDocType>(
        options.firestore,
        FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX + fastUnsecureHash(options.firestore.projectId),
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
        replicationState.start = () => {
            const lastChangeQuery = query(
                options.firestore.collection,
                orderBy(options.updateSortField, 'desc'),
                limit(1)
            );
            const unsubscribe = onSnapshot(
                lastChangeQuery,
                (querySnapshot) => {
                    console.log('FIRESTORE: GOT CHANGE');
                    console.dir(querySnapshot);
                    /**
                     * There is no way to observe the event stream in firestore.
                     * So instead we listen to any write to the collection
                     * and then emit a 'RESYNC' flag.
                     */
                    replicationState.reSync();
                },
                (error) => {
                    replicationState.subjects.error.next(
                        newRxError('RC_STREAM', { error })
                    );
                }
            );
            replicationState.cancel = () => {
                unsubscribe();
                return cancelBefore();
            };
            return startBefore();
        };
    }

    startReplicationOnLeaderShip(options.waitForLeadership, replicationState);

    return replicationState;
}

export const RxDBReplicationFirestorePlugin: RxPlugin = {
    name: 'replication-firestore',
    init() {
        addRxPlugin(RxDBLeaderElectionPlugin);
    },
    rxdb: true,
    prototypes: {
        RxCollection: (proto: any) => {
            proto.syncFirestore = syncFirestore;
        }
    }
};
