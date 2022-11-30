/**
 * this plugin adds the RxCollection.syncCouchDBNew()-function to rxdb
 * you can use it to sync collections with a remote CouchDB endpoint.
 */
import {
    ensureNotFalsy,
    fastUnsecureHash,
    flatClone,
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
    writeBatch,
    serverTimestamp,
    QueryDocumentSnapshot,
    Timestamp
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
    getSchemaByObjectPath,
    newRxError,
    WithDeleted
} from '../../';

import type {
    FirestoreCheckpointType,
    FirestoreOptions,
    SyncOptionsFirestore
} from './firestore-types';
import { Subject } from 'rxjs';
import { FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX, isoStringToServerTimestamp, serverTimestampToIsoString, stripServerTimestampField } from './firestore-helper';

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
    const serverTimestampField = typeof options.serverTimestampField === 'undefined' ? 'serverTimestamp' : options.serverTimestampField;
    options.serverTimestampField = serverTimestampField;
    const primaryPath = collection.schema.primaryPath;

    /**
     * The serverTimestampField MUST NOT be part of the collections RxJsonSchema.
     */
    const schemaPart = getSchemaByObjectPath(this.schema.jsonSchema, serverTimestampField);
    if (
        schemaPart ||
        // also must not be nested.
        serverTimestampField.includes('.')
    ) {
        throw newRxError('RC6', {
            field: serverTimestampField,
            schema: this.schema.jsonSchema
        });
    }

    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: FirestoreCheckpointType,
                batchSize: number
            ) {

                console.log('PULL !! ' + serverTimestampField);
                console.dir(lastPulledCheckpoint);

                let newerQuery: ReturnType<typeof query>;
                let sameTimeQuery: ReturnType<typeof query> | undefined;

                if (lastPulledCheckpoint) {
                    const lastServerTimestamp = isoStringToServerTimestamp(lastPulledCheckpoint.serverTimestamp);
                    newerQuery = query(options.firestore.collection,
                        where(serverTimestampField, '>', lastServerTimestamp),
                        orderBy(serverTimestampField, 'asc'),
                        limit(batchSize)
                    );
                    sameTimeQuery = query(options.firestore.collection,
                        where(serverTimestampField, '==', lastServerTimestamp),
                        where(primaryPath, '>', lastPulledCheckpoint.id),
                        orderBy(primaryPath, 'asc'),
                        orderBy(serverTimestampField, 'asc'),
                        limit(batchSize)
                    );
                } else {
                    newerQuery = query(options.firestore.collection,
                        orderBy(serverTimestampField, 'asc'),
                        limit(batchSize)
                    );
                }

                const [
                    newerQueryResult,
                    sameTimeQueryResult
                ] = await Promise.all([
                    getDocs(newerQuery),
                    sameTimeQuery ? getDocs(sameTimeQuery) : undefined
                ]);

                let useDocs: QueryDocumentSnapshot<RxDocType>[] = [];
                if (sameTimeQuery) {
                    useDocs = ensureNotFalsy(sameTimeQueryResult).docs as any;
                }
                const missingAmount = batchSize - useDocs.length;
                if (missingAmount > 0) {
                    const additonalDocs = newerQueryResult.docs.slice(0, missingAmount).filter(x => !!x);
                    useDocs = useDocs.concat(additonalDocs as any);
                }

                if (useDocs.length === 0) {
                    return {
                        checkpoint: lastPulledCheckpoint,
                        documents: []
                    };
                }
                const lastDoc = ensureNotFalsy(lastOfArray(useDocs)).data();
                const documents: WithDeleted<RxDocType>[] = useDocs
                    .map(row => stripServerTimestampField(serverTimestampField, row.data())) as any;


                const newCheckpoint: FirestoreCheckpointType = {
                    id: (lastDoc as any)[primaryPath],
                    serverTimestamp: serverTimestampToIsoString(serverTimestampField, lastDoc)
                };
                console.log('newCheckpoint: ');
                console.dir(newCheckpoint);

                const ret = {
                    documents: documents,
                    checkpoint: newCheckpoint
                };
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
                        const docDataInDb = stripServerTimestampField(serverTimestampField, row.data());
                        const docId = (docDataInDb as any)[primaryPath];
                        docsInDbById[docId] = docDataInDb;
                    });

                    /**
                     * @link https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes
                     */
                    const batch = writeBatch(options.firestore.database);
                    let hasWrite = false;

                    console.log('PUSH !!');
                    await Promise.all(
                        Object.entries(writeRowsById).map(async ([docId, writeRow]) => {
                            const docInDb: RxDocType | undefined = docsInDbById[docId];

                            if (
                                docInDb &&
                                (
                                    !writeRow.assumedMasterState ||
                                    (await collection.conflictHandler({
                                        newDocumentState: docInDb as any,
                                        realMasterState: writeRow.assumedMasterState
                                    }, 'replication-firestore-push')).isEqual === false
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
                                    batch.set(docRef, writeDocData);
                                } else {
                                    // update
                                    batch.update(docRef, writeDocData as any);
                                }
                            }
                        })
                    );


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
                orderBy(serverTimestampField, 'desc'),
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
