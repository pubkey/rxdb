import {
    appendToArray,
    asyncFilter,
    ensureNotFalsy,
    errorToPlainJson,
    flatClone,
    lastOfArray,
    toArray
} from '../../plugins/utils/index.ts';

import {
    doc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getDoc,
    onSnapshot,
    runTransaction,
    writeBatch,
    serverTimestamp,
    QueryDocumentSnapshot,
    waitForPendingWrites,
    documentId,
    FirestoreError
} from 'firebase/firestore';

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
    ById,
    getSchemaByObjectPath,
    newRxError,
    WithDeleted
} from '../../index.ts';

import type {
    FirestoreCheckpointType,
    FirestoreOptions,
    SyncOptionsFirestore
} from './firestore-types.ts';
import { Subject } from 'rxjs';
import {
    firestoreRowToDocData,
    getContentByIds,
    isoStringToServerTimestamp,
    serverTimestampToIsoString,
    stripPrimaryKey,
    stripServerTimestampField
} from './firestore-helper.ts';
import {DocumentData} from "@firebase/firestore";

export * from './firestore-helper.ts';
export * from './firestore-types.ts';

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

export function replicateFirestore<RxDocType>(
    options: SyncOptionsFirestore<RxDocType>
): RxFirestoreReplicationState<RxDocType> {
    const collection: RxCollection<RxDocType, any, any> = options.collection;
    addRxPlugin(RxDBLeaderElectionPlugin);
    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, FirestoreCheckpointType>> = new Subject();
    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, FirestoreCheckpointType> | undefined;
    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
    const serverTimestampField = typeof options.serverTimestampField === 'undefined' ? 'serverTimestamp' : options.serverTimestampField;
    options.serverTimestampField = serverTimestampField;
    const primaryPath = collection.schema.primaryPath;

    // This variable will be updated by the pull handler to ensure the live-stream
    // starts from the correct point in time.
    let lastCheckpointFromPull: FirestoreCheckpointType | null;

    /**
     * The serverTimestampField MUST NOT be part of the collections RxJsonSchema.
     */
    const schemaPart = getSchemaByObjectPath(collection.schema.jsonSchema, serverTimestampField);
    if (
        schemaPart ||
        // also must not be nested.
        serverTimestampField.includes('.')
    ) {
        throw newRxError('RC6', {
            field: serverTimestampField,
            schema: collection.schema.jsonSchema
        });
    }

    const pullFilters = options.pull?.filter !== undefined
        ? toArray(options.pull.filter)
        : [];

    const pullQuery = query(options.firestore.collection, ...pullFilters);

    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: FirestoreCheckpointType | undefined,
                batchSize: number
            ) {
                let newerQuery: ReturnType<typeof query>;
                let sameTimeQuery: ReturnType<typeof query> | undefined;

                if (lastPulledCheckpoint) {
                    const lastServerTimestamp = isoStringToServerTimestamp(lastPulledCheckpoint.serverTimestamp);
                    newerQuery = query(pullQuery,
                        where(serverTimestampField, '>', lastServerTimestamp),
                        orderBy(serverTimestampField, 'asc'),
                        limit(batchSize)
                    );
                    sameTimeQuery = query(pullQuery,
                        where(serverTimestampField, '==', lastServerTimestamp),
                        where(documentId(), '>', lastPulledCheckpoint.id),
                        orderBy(documentId(), 'asc'),
                        limit(batchSize)
                    );
                } else {
                    newerQuery = query(pullQuery,
                        orderBy(serverTimestampField, 'asc'),
                        limit(batchSize)
                    );
                }

                let mustsReRun = true;
                let useDocs: QueryDocumentSnapshot<RxDocType>[] = [];
                while (mustsReRun) {
                    /**
                     * Local writes that have not been persisted to the server
                     * are in pending state and do not have a correct serverTimestamp set.
                     * We have to ensure we only use document states that are in sync with the server.
                     * @link https://medium.com/firebase-developers/the-secrets-of-firestore-fieldvalue-servertimestamp-revealed-29dd7a38a82b
                     */
                    await waitForPendingWrites(options.firestore.database);
                    await runTransaction(options.firestore.database, async (_tx) => {
                        useDocs = [];
                        const [
                            newerQueryResult,
                            sameTimeQueryResult
                        ] = await Promise.all([
                            getDocs(newerQuery),
                            sameTimeQuery ? getDocs(sameTimeQuery) : undefined
                        ]);

                        if (
                            newerQueryResult.metadata.hasPendingWrites ||
                            (sameTimeQuery && ensureNotFalsy(sameTimeQueryResult).metadata.hasPendingWrites)
                        ) {
                            return;
                        } else {
                            mustsReRun = false;

                            if (sameTimeQuery) {
                                useDocs = ensureNotFalsy(sameTimeQueryResult).docs as any;
                            }
                            const missingAmount = batchSize - useDocs.length;
                            if (missingAmount > 0) {
                                const additionalDocs = newerQueryResult.docs.slice(0, missingAmount).filter(x => !!x);
                                appendToArray(useDocs, additionalDocs);
                            }
                        }
                    });
                }

                if (useDocs.length === 0) {
                    lastCheckpointFromPull = lastPulledCheckpoint ?? null;
                    return {
                        checkpoint: lastPulledCheckpoint ?? undefined,
                        documents: []
                    };
                }
                const lastDoc = ensureNotFalsy(lastOfArray(useDocs));
                const documents: WithDeleted<RxDocType>[] = useDocs
                    .map(row => firestoreRowToDocData(
                        serverTimestampField,
                        primaryPath,
                        row
                    ));
                const newCheckpoint: FirestoreCheckpointType = {
                    id: lastDoc.id,
                    serverTimestamp: serverTimestampToIsoString(serverTimestampField, lastDoc.data())
                };
                lastCheckpointFromPull = newCheckpoint;
                const ret = {
                    documents: documents,
                    checkpoint: newCheckpoint
                };
                return ret;
            },
            batchSize: ensureNotFalsy(options.pull).batchSize,
            modifier: ensureNotFalsy(options.pull).modifier,
            stream$: pullStream$.asObservable(),
            initialCheckpoint: options.pull.initialCheckpoint
        };
    }

    let replicationPrimitivesPush: ReplicationPushOptions<RxDocType> | undefined;
    if (options.push) {
        const pushFilter = options.push?.filter;
        replicationPrimitivesPush = {
            async handler(
                rows: RxReplicationWriteToMasterRow<RxDocType>[]
            ) {
                if (pushFilter !== undefined) {
                    rows = await asyncFilter(rows, (row) => pushFilter(row.newDocumentState));
                }

                const writeRowsById: ById<RxReplicationWriteToMasterRow<RxDocType>> = {};
                const docIds: string[] = rows.map(row => {
                    const docId = (row.newDocumentState as any)[primaryPath];
                    writeRowsById[docId] = row;
                    return docId;
                });
                await waitForPendingWrites(options.firestore.database);
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

                    const getQuery = (ids: string[]) => {
                        return getDocs(
                            query(
                                options.firestore.collection,
                                where(documentId(), 'in', ids)
                            )
                        )
                            .then(result => result.docs)
                            .catch(error => {
                                if (error?.code && (error as FirestoreError).code === 'permission-denied') {
                                    // Query may fail due to rules using 'resource' with non existing ids
                                    // So try to get the docs one by one
                                    return Promise.all(
                                        ids.map(
                                            id => getDoc(doc(options.firestore.collection, id))
                                        )
                                    )
                                        .then(docs => docs.filter(doc => doc.exists()));
                                }
                                throw error;
                            });
                    };

                    const docsInDbResult = await getContentByIds<RxDocType>(docIds, getQuery);

                    const docsInDbById: ById<RxDocType> = {};
                    docsInDbResult.forEach(row => {
                        const docDataInDb = stripServerTimestampField(serverTimestampField, row.data());
                        const docId = row.id;
                        (docDataInDb as any)[primaryPath] = docId;
                        docsInDbById[docId] = docDataInDb;
                    });

                    /**
                     * @link https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes
                     */
                    const batch = writeBatch(options.firestore.database);
                    let hasWrite = false;
                    await Promise.all(
                        Object.entries(writeRowsById).map(async ([docId, writeRow]) => {
                            const docInDb: RxDocType | undefined = docsInDbById[docId];

                            if (
                                docInDb &&
                                (
                                    !writeRow.assumedMasterState ||
                                    collection.conflictHandler.isEqual(docInDb as any, writeRow.assumedMasterState, 'replication-firestore-push') === false
                                )
                            ) {
                                // conflict
                                conflicts.push(docInDb as any);
                            } else {
                                // no conflict
                                hasWrite = true;
                                const docRef = doc(options.firestore.collection, docId);
                                const writeDocData = flatClone(writeRow.newDocumentState);
                                (writeDocData as any)[serverTimestampField] = serverTimestamp();
                                if (!docInDb) {
                                    // insert
                                    batch.set(docRef, stripPrimaryKey(primaryPath, writeDocData));
                                } else {
                                    // update
                                    batch.update(docRef, stripPrimaryKey(primaryPath, writeDocData));
                                }
                            }
                        })
                    );

                    if (hasWrite) {
                        await batch.commit();
                    }
                });
                await waitForPendingWrites(options.firestore.database);
                return conflicts;
            },
            batchSize: options.push.batchSize,
            modifier: options.push.modifier
        };
    }


    const replicationState = new RxFirestoreReplicationState<RxDocType>(
        options.firestore,
        options.replicationIdentifier,
        collection,
        replicationPrimitivesPull,
        replicationPrimitivesPush,
        options.live,
        options.retryTime,
        options.autoStart
    );

    /**
     * Use a snapshot listener to get live changes for the pull.stream$
     */
    if (options.live && options.pull) {
        const startBefore = replicationState.start.bind(replicationState);
        const cancelBefore = replicationState.cancel.bind(replicationState);
        let snapshotUnsubscribe: (() => void) | null = null;

        replicationState.start = async () => {
            const startPromise = startBefore();

            // Wait for the initial replication to complete before starting the listener.
            //await replicationState.awaitInitialSync();

            // Do not set up the listener if it already exists or replication was cancelled.
            if (replicationState.isStopped() || snapshotUnsubscribe) {
                return startPromise;
            }

            const checkpoint = lastCheckpointFromPull;

            let liveQuery: ReturnType<typeof query>;
            if (checkpoint) {
                const lastServerTimestamp = isoStringToServerTimestamp(checkpoint.serverTimestamp);
                liveQuery = query(
                    pullQuery,
                    where(serverTimestampField, '>', lastServerTimestamp),
                    orderBy(serverTimestampField, 'asc')
                );
            } else {
                // No checkpoint yet, listen from the beginning of time.
                liveQuery = query(
                    pullQuery,
                    orderBy(serverTimestampField, 'asc')
                );
            }

            snapshotUnsubscribe = onSnapshot(
                liveQuery,
                (snapshot) => {
                    if (snapshot.metadata.hasPendingWrites || snapshot.empty) {
                        return;
                    }
                    const changes = snapshot.docChanges();
                    const documents = changes.map(change => {
                        const docId = change.doc.id;
                        if (change.type === 'removed') {
                            const data = firestoreRowToDocData(
                                serverTimestampField,
                                primaryPath,
                                change.doc as QueryDocumentSnapshot<RxDocType>
                            );
                            data._deleted = true;
                            return data;
                        } else { // 'added' or 'modified'
                            return firestoreRowToDocData(
                                serverTimestampField,
                                primaryPath,
                                change.doc as QueryDocumentSnapshot<RxDocType>
                            );
                        }
                    });

                    const lastDoc = ensureNotFalsy(lastOfArray(snapshot.docs));
                    const newCheckpoint: FirestoreCheckpointType = {
                        id: lastDoc.id,
                        serverTimestamp: serverTimestampToIsoString(serverTimestampField, lastDoc.data())
                    };

                    pullStream$.next({
                        documents,
                        checkpoint: newCheckpoint
                    });

                     /**
                     * There is no good way to observe the event stream in firestore.
                     * So instead we listen to any write to the collection
                     * and then emit a 'RESYNC' flag.
                     */
                    replicationState.reSync();
                },
                (error) => {
                    replicationState.subjects.error.next(
                        newRxError('RC_STREAM', { error: errorToPlainJson(error) })
                    );
                }
            );

            replicationState.cancel = () => {
                snapshotUnsubscribe?.();
                return cancelBefore();
            };
            return startPromise;
        };
    }

    startReplicationOnLeaderShip(options.waitForLeadership, replicationState);

    return replicationState;
}
