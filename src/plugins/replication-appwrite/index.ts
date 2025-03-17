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
    RxReplicationWriteToMasterRow,
    WithDeleted
} from '../../types';
import { addRxPlugin } from '../../plugin.ts';
import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import {
    Client,
    Databases,
    Query,
    Models
} from 'appwrite';
import { lastOfArray } from '../utils/utils-array.ts';
import { appwriteDocToRxDB } from './appwrite-helpers.ts';
import { flatClone } from '../utils/utils-object.ts';

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
    const collection: RxCollection<RxDocType> = options.collection;
    const primaryKey = collection.schema.primaryPath;
    addRxPlugin(RxDBLeaderElectionPlugin);
    options.live = typeof options.live === 'undefined' ? true : options.live;
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;

    const databases = new Databases(options.client);



    const replicationPrimitivesPull: ReplicationPullOptions<RxDocType, AppwriteCheckpointType> | undefined = options.pull ? {
        batchSize: options.pull.batchSize,
        modifier: options.pull.modifier,
        // stream$: pullStream$.asObservable(), TODO
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
            const newCheckpoint: AppwriteCheckpointType | null = lastDoc ? {
                id: lastDoc.$id,
                updatedAt: lastDoc.$updatedAt
            } : null;
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
            if (rows.length > 1) {
                query = Query.or(
                    rows.map(row => {
                        const id: string = (row.newDocumentState as any)[primaryKey];
                        return Query.equal('$id', id);
                    })
                );
            } else {
                const id: string = (rows[0].newDocumentState as any)[primaryKey];
                query = Query.equal('$id', id);
            }
            const docsOnServer = await databases.listDocuments(
                options.databaseId,
                options.collectionId,
                [query]
            );
            const docsInDbById: ById<RxDocType> = {};
            docsOnServer.documents.forEach(doc => {
                const docDataInDb = appwriteDocToRxDB<RxDocType>(doc, primaryKey, options.deletedField);
                const docId: string = doc.$id;
                (docDataInDb as any)[primaryKey] = docId;
                docsInDbById[docId] = docDataInDb;
            });
            console.log('docsInDbById:');
            console.dir(docsInDbById);
            const conflicts: WithDeleted<RxDocType>[] = [];
            await Promise.all(
                rows.map(async (writeRow) => {
                    const docId = (writeRow.newDocumentState as any)[primaryKey];
                    const docInDb: RxDocType | undefined = docsInDbById[docId];

                    if (
                        docInDb &&
                        (
                            !writeRow.assumedMasterState ||
                            collection.conflictHandler.isEqual(docInDb as any, writeRow.assumedMasterState, 'replication-appwrite-push') === false
                        )
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

                        console.log('push data:');
                        console.dir({
                            docId,
                            writeDoc
                        });
                        let result: Models.Document;
                        if (!docInDb) {
                            result = await databases.createDocument(
                                options.databaseId,
                                options.collectionId,
                                docId,
                                writeDoc,
                                // ["read("any")"] // permissions (optional)
                            );

                        } else {
                            result = await databases.updateDocument(
                                options.databaseId,
                                options.collectionId,
                                docId,
                                writeDoc,
                                // ["read("any")"] // permissions (optional)
                            );
                        }
                        console.log('write result:');
                        console.dir(result);
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

            console.log('-- start');
            const channel = 'databases.test-db-1.collections.test-collection-1.documents.*';
            // const channel = 'databases.' + options.databaseId + '.collections.' + options.collectionId + '.documents';
            // const channel = 'databases.*';
            const unsubscribe = options.client.subscribe(
                channel,
                response => {
                    console.log('############# GOT ONE EVENT!!!');
                    console.log(response);
                    replicationState.reSync();
                }
            );
            console.log('-- done');

            // const unsubscribe = onSnapshot(
            //     lastChangeQuery,
            //     (_querySnapshot) => {
            //         /**
            //          * There is no good way to observe the event stream in firestore.
            //          * So instead we listen to any write to the collection
            //          * and then emit a 'RESYNC' flag.
            //          */
            //         replicationState.reSync();
            //     },
            //     (error) => {
            //         replicationState.subjects.error.next(
            //             newRxError('RC_STREAM', { error: errorToPlainJson(error) })
            //         );
            //     }
            // );
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
