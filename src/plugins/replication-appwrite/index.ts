import type {
    SyncOptionsAppwrite,
    AppwriteCheckpointType
} from './appwrite-types';
import {
    RxReplicationState,
    startReplicationOnLeaderShip
} from '../replication/index.ts';
import type {
    ById,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxCollection,
    RxReplicationPullStreamItem,
    RxReplicationWriteToMasterRow,
    WithDeleted
} from '../../types';
import { addRxPlugin } from '../../plugin.ts';
import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import {
    Databases,
    Query,
    Models
} from 'appwrite';
import { lastOfArray } from '../utils/utils-array.ts';
import { appwriteDocToRxDB, rxdbDocToAppwrite } from './appwrite-helpers.ts';
import { flatClone } from '../utils/utils-object.ts';
import { Subject } from 'rxjs';
import { getFromMapOrThrow } from '../utils/index.ts';

export class RxAppwriteReplicationState<RxDocType> extends RxReplicationState<RxDocType, AppwriteCheckpointType> {
    constructor(
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType, AppwriteCheckpointType>,
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

export function replicateAppwrite<RxDocType>(
    options: SyncOptionsAppwrite<RxDocType>
): RxAppwriteReplicationState<RxDocType> {
    const collection: RxCollection<RxDocType, any, any> = options.collection;
    const primaryKey = collection.schema.primaryPath;
    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, AppwriteCheckpointType>> = new Subject();

    addRxPlugin(RxDBLeaderElectionPlugin);
    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.deletedField = options.deletedField ? options.deletedField : '_deleted';
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;

    const databases = new Databases(options.client);

    const replicationPrimitivesPull: ReplicationPullOptions<RxDocType, AppwriteCheckpointType> | undefined = options.pull ? {
        batchSize: options.pull.batchSize,
        modifier: options.pull.modifier,
        stream$: pullStream$.asObservable(),
        initialCheckpoint: options.pull.initialCheckpoint,
        handler: async (
            lastPulledCheckpoint: AppwriteCheckpointType | undefined,
            batchSize: number
        ) => {
            const queries: string[] = [];
            if (lastPulledCheckpoint) {
                queries.push(
                    Query.or([
                        Query.greaterThan('$updatedAt', lastPulledCheckpoint.updatedAt),
                        Query.and([
                            Query.equal('$updatedAt', lastPulledCheckpoint.updatedAt),
                            Query.greaterThan('$id', lastPulledCheckpoint.id)
                        ])
                    ])
                );
            }
            queries.push(Query.orderAsc('$updatedAt'));
            queries.push(Query.orderAsc('$id'));
            queries.push(Query.limit(batchSize));

            const result = await databases.listDocuments(
                options.databaseId,
                options.collectionId,
                queries
            );
            const lastDoc = lastOfArray(result.documents);
            const newCheckpoint: AppwriteCheckpointType | undefined = lastDoc ? {
                id: lastDoc.$id,
                updatedAt: lastDoc.$updatedAt
            } : undefined;
            const resultDocs: WithDeleted<RxDocType>[] = result.documents.map(doc => {
                return appwriteDocToRxDB<RxDocType>(
                    doc,
                    primaryKey,
                    options.deletedField
                );
            });

            return {
                checkpoint: newCheckpoint,
                documents: resultDocs
            };
        }
    } : undefined;

    const replicationPrimitivesPush: ReplicationPushOptions<RxDocType> | undefined = options.push ? {
        async handler(
            rows: RxReplicationWriteToMasterRow<RxDocType>[]
        ) {
            let query: string;

            // inserts will conflict on write
            const nonInsertRows = rows.filter(row => row.assumedMasterState);
            const updateDocsInDbById = new Map<string, RxDocType>();
            if (nonInsertRows.length > 0) {
                if (nonInsertRows.length > 1) {
                    query = Query.or(
                        nonInsertRows.map(row => {
                            const id: string = (row.newDocumentState as any)[primaryKey];
                            return Query.equal('$id', id);
                        })
                    );
                } else {
                    const id: string = (nonInsertRows[0].newDocumentState as any)[primaryKey];
                    query = Query.equal('$id', id);
                }
                const updateDocsOnServer = await databases.listDocuments(
                    options.databaseId,
                    options.collectionId,
                    [query]
                );
                updateDocsOnServer.documents.forEach(doc => {
                    const docDataInDb = appwriteDocToRxDB<RxDocType>(doc, primaryKey, options.deletedField);
                    const docId: string = doc.$id;
                    (docDataInDb as any)[primaryKey] = docId;
                    updateDocsInDbById.set(docId, docDataInDb);
                });
            }

            const conflicts: WithDeleted<RxDocType>[] = [];
            await Promise.all(
                rows.map(async (writeRow) => {
                    const docId = (writeRow.newDocumentState as any)[primaryKey];

                    if (!writeRow.assumedMasterState) {
                        // INSERT
                        const insertDoc = rxdbDocToAppwrite<RxDocType>(
                            writeRow.newDocumentState,
                            primaryKey,
                            options.deletedField
                        );
                        try {
                            await databases.createDocument(
                                options.databaseId,
                                options.collectionId,
                                docId,
                                insertDoc,
                                // ["read("any")"] // permissions (optional)
                            );
                        } catch (err: any) {
                            if (err.code == 409 && err.name === 'AppwriteException') {
                                // document already exists -> conflict
                                const docOnServer = await databases.getDocument(
                                    options.databaseId,
                                    options.collectionId,
                                    docId
                                );
                                const docOnServerData = appwriteDocToRxDB<RxDocType>(docOnServer, primaryKey, options.deletedField);
                                conflicts.push(docOnServerData);
                            } else {
                                throw err;
                            }
                        }
                    } else {
                        // UPDATE
                        /**
                         * TODO appwrite does not have a update-if-equals-X method,
                         * so we pre-fetch the documents and compare them locally.
                         * This might cause problems when multiple users update the
                         * same documents very fast.
                         */
                        const docInDb: RxDocType = getFromMapOrThrow(updateDocsInDbById, docId);
                        if (
                            !writeRow.assumedMasterState ||
                            collection.conflictHandler.isEqual(docInDb as any, writeRow.assumedMasterState, 'replication-appwrite-push') === false
                        ) {
                            // conflict
                            conflicts.push(docInDb as any);
                        } else {
                            // no conflict
                            const writeDoc: any = flatClone(writeRow.newDocumentState);
                            delete writeDoc[primaryKey];
                            writeDoc[options.deletedField] = writeDoc._deleted;
                            if (options.deletedField !== '_deleted') {
                                delete writeDoc._deleted;
                            }

                            await databases.updateDocument(
                                options.databaseId,
                                options.collectionId,
                                docId,
                                writeDoc,
                                // ["read("any")"] // permissions (optional)
                            );
                        }

                    }
                })
            );

            return conflicts;
        }
    } : undefined;

    const replicationState = new RxAppwriteReplicationState<RxDocType>(
        options.replicationIdentifier,
        collection,
        replicationPrimitivesPull,
        replicationPrimitivesPush,
        options.live,
        options.retryTime,
        options.autoStart
    );

    /**
     * Subscribe to changes for the pull.stream$
     */
    if (options.live && options.pull) {
        const startBefore = replicationState.start.bind(replicationState);
        const cancelBefore = replicationState.cancel.bind(replicationState);
        replicationState.start = () => {
            const channel = 'databases.' + options.databaseId + '.collections.' + options.collectionId + '.documents';
            const unsubscribe = options.client.subscribe(
                channel,
                (response) => {
                    const docData = appwriteDocToRxDB<RxDocType>(response.payload, primaryKey, options.deletedField);
                    pullStream$.next({
                        checkpoint: {
                            id: (docData as any)[primaryKey],
                            updatedAt: (response.payload as any).$updatedAt
                        },
                        documents: [docData]
                    });

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
