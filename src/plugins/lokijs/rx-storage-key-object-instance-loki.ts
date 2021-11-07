import type { ChangeEvent } from 'event-reduce-js';
import { Observable, Subject } from 'rxjs';
import { newRxError } from '../../rx-error';
import type { BroadcastChannel, LeaderElector } from 'broadcast-channel';
import type {
    BulkWriteLocalRow,
    LokiDatabaseSettings,
    LokiLocalState,
    LokiRemoteRequestBroadcastMessage,
    LokiRemoteResponseBroadcastMessage,
    LokiSettings,
    LokiStorageInternals,
    RxKeyObjectStorageInstanceCreationParams,
    RxLocalDocumentData,
    RxLocalStorageBulkWriteResponse,
    RxStorageBulkWriteLocalError,
    RxStorageChangeEvent,
    RxStorageKeyObjectInstance
} from '../../types';
import {
    createRevision,
    ensureNotFalsy,
    flatClone,
    now,
    parseRevision,
    promiseWait,
    randomCouchString
} from '../../util';
import {
    CHANGES_COLLECTION_SUFFIX,
    CHANGES_LOCAL_SUFFIX,
    closeLokiCollections,
    getLokiDatabase,
    getLokiEventKey,
    LOKIJS_COLLECTION_DEFAULT_OPTIONS,
    LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE,
    OPEN_LOKIJS_STORAGE_INSTANCES,
    stripLokiKey
} from './lokijs-helper';
import type {
    Collection
} from 'lokijs';
import { getLeaderElectorByBroadcastChannel } from '../leader-election';

let instanceId = 1;

export class RxStorageKeyObjectInstanceLoki implements RxStorageKeyObjectInstance<LokiStorageInternals, LokiSettings> {

    private changes$: Subject<RxStorageChangeEvent<RxLocalDocumentData>> = new Subject();
    public readonly leaderElector?: LeaderElector;

    public instanceId = instanceId++;

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly internals: LokiStorageInternals,
        public readonly options: Readonly<LokiSettings>,
        public readonly databaseSettings: LokiDatabaseSettings,
        public readonly broadcastChannel?: BroadcastChannel<LokiRemoteRequestBroadcastMessage | LokiRemoteResponseBroadcastMessage>
    ) {
        OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
        if (broadcastChannel) {
            this.leaderElector = getLeaderElectorByBroadcastChannel(broadcastChannel);
            this.leaderElector.awaitLeadership().then(() => {
                // this instance is leader now, so it has to reply to queries from other instances
                ensureNotFalsy(this.broadcastChannel).addEventListener('message', async (msg) => {
                    if (
                        msg.type === LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE &&
                        msg.requestId &&
                        msg.databaseName === this.databaseName &&
                        msg.collectionName === this.collectionName &&
                        !msg.response
                    ) {
                        const operation = (msg as any).operation;
                        const params = (msg as any).params;
                        let result: any;
                        let isError = false;
                        try {
                            result = await (this as any)[operation](...params);
                        } catch (err) {
                            isError = true;
                            result = err;
                        }
                        const response: LokiRemoteResponseBroadcastMessage = {
                            response: true,
                            requestId: msg.requestId,
                            databaseName: this.databaseName,
                            collectionName: this.collectionName,
                            result,
                            isError,
                            type: msg.type
                        };
                        ensureNotFalsy(this.broadcastChannel).postMessage(response);
                    }
                });
            });
        }
    }

    private getLocalState() {
        const ret = ensureNotFalsy(this.internals.localState);
        return ret;
    }

    /**
     * If the local state must be used, that one is returned.
     * Returns false if a remote instance must be used.
     */
    private async mustUseLocalState(): Promise<LokiLocalState | false> {
        if (this.internals.localState) {
            return this.internals.localState;
        }
        const leaderElector = ensureNotFalsy(this.leaderElector);
        while (
            !leaderElector.hasLeader
        ) {
            await leaderElector.applyOnce();

            // TODO why do we need this line to pass the tests?
            // otherwise we somehow do never get a leader.
            /**
             * TODO why do we need this line to pass the tests?
             * Without it, we somehow do never get a leader.
             * Does applyOnce() fully block the cpu?
             */
            await promiseWait(0); // TODO remove this line
        }

        if (
            leaderElector.isLeader &&
            !this.internals.localState
        ) {
            // own is leader, use local instance
            this.internals.localState = createLokiKeyValueLocalState({
                databaseName: this.databaseName,
                collectionName: this.collectionName,
                options: this.options,
                broadcastChannel: this.broadcastChannel
            }, this.databaseSettings);
            return this.getLocalState();
        } else {
            // other is leader, send message to remote leading instance
            return false;
        }
    }

    private async requestRemoteInstance(
        operation: string,
        params: any[]
    ): Promise<any | any[]> {
        const broadcastChannel = ensureNotFalsy(this.broadcastChannel);
        const requestId = randomCouchString(12);
        const responsePromise = new Promise<any>((res, rej) => {
            const listener = (msg: any) => {
                if (
                    msg.type === LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE &&
                    msg.response === true &&
                    msg.requestId === requestId
                ) {
                    if (msg.isError) {
                        broadcastChannel.removeEventListener('message', listener);
                        rej(msg.result);
                    } else {
                        broadcastChannel.removeEventListener('message', listener);
                        res(msg.result);
                    }
                }
            };
            broadcastChannel.addEventListener('message', listener);
        });
        broadcastChannel.postMessage({
            response: false,
            type: LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE,
            operation,
            params,
            requestId,
            databaseName: this.databaseName,
            collectionName: this.collectionName
        });
        const result = await responsePromise;
        return result;
    }

    async bulkWrite<RxDocType>(documentWrites: BulkWriteLocalRow<RxDocType>[]): Promise<RxLocalStorageBulkWriteResponse<RxDocType>> {
        if (documentWrites.length === 0) {
            throw newRxError('P2', {
                args: {
                    documentWrites
                }
            });
        }

        const localState = await this.mustUseLocalState();
        if (!localState) {
            return this.requestRemoteInstance('bulkWrite', [documentWrites]);
        }

        const collection = localState.collection;
        const startTime = now();
        await promiseWait(0);

        const ret: RxLocalStorageBulkWriteResponse<RxDocType> = {
            success: new Map(),
            error: new Map()
        };
        const writeRowById: Map<string, BulkWriteLocalRow<RxDocType>> = new Map();
        documentWrites.forEach(writeRow => {
            const id = writeRow.document._id;
            writeRowById.set(id, writeRow);
            const writeDoc = flatClone(writeRow.document);
            const docInDb = collection.by('_id', id);
            const previous = writeRow.previous ? writeRow.previous : collection.by('_id', id);
            const newRevHeight = previous ? parseRevision(previous._rev).height + 1 : 1;
            const newRevision = newRevHeight + '-' + createRevision(writeRow.document, true);
            writeDoc._rev = newRevision;
            if (docInDb) {
                if (
                    !writeRow.previous ||
                    docInDb._rev !== writeRow.previous._rev
                ) {
                    // conflict error
                    const err: RxStorageBulkWriteLocalError<RxDocType> = {
                        isError: true,
                        status: 409,
                        documentId: id,
                        writeRow: writeRow
                    };
                    ret.error.set(id, err);
                    return;
                } else {
                    const toLoki: any = flatClone(writeDoc);
                    toLoki.$loki = docInDb.$loki;
                    collection.update(toLoki);
                }
            } else {
                collection.insert(writeDoc);
            }

            ret.success.set(id, stripLokiKey(writeDoc));

            const endTime = now();

            let event: ChangeEvent<RxLocalDocumentData<RxDocType>>;
            if (!writeRow.previous) {
                // was insert
                event = {
                    operation: 'INSERT',
                    doc: writeDoc,
                    id: id,
                    previous: null
                };
            } else if (writeRow.document._deleted) {
                // was delete

                // we need to add the new revision to the previous doc
                // so that the eventkey is calculated correctly.
                // Is this a hack? idk.
                const previousDoc = flatClone(writeRow.previous);
                previousDoc._rev = newRevision;

                event = {
                    operation: 'DELETE',
                    doc: null,
                    id,
                    previous: previousDoc
                };
            } else {
                // was update
                event = {
                    operation: 'UPDATE',
                    doc: writeDoc,
                    id: id,
                    previous: writeRow.previous
                };
            }

            if (
                writeRow.document._deleted &&
                (
                    !writeRow.previous ||
                    writeRow.previous._deleted
                )
            ) {
                /**
                 * An already deleted document was added to the storage engine,
                 * do not emit an event because it does not affect anything.
                 */
            } else {
                const doc: RxLocalDocumentData<RxDocType> = event.operation === 'DELETE' ? event.previous as any : event.doc as any;
                const eventId = getLokiEventKey(true, doc._id, doc._rev ? doc._rev : '');
                const storageChangeEvent: RxStorageChangeEvent<RxLocalDocumentData<RxDocType>> = {
                    eventId,
                    documentId: id,
                    change: event,
                    startTime,
                    endTime
                };
                this.changes$.next(storageChangeEvent);
            }

        });


        return ret;
    }
    async findLocalDocumentsById<RxDocType = any>(ids: string[]): Promise<Map<string, RxLocalDocumentData<RxDocType>>> {
        const localState = await this.mustUseLocalState();
        if (!localState) {
            return this.requestRemoteInstance('findLocalDocumentsById', [ids]);
        }

        await promiseWait(0);
        const collection = localState.collection;

        const ret: Map<string, RxLocalDocumentData<RxDocType>> = new Map();
        ids.forEach(id => {
            const documentInDb = collection.by('_id', id);
            if (
                documentInDb &&
                !documentInDb._deleted
            ) {
                ret.set(id, stripLokiKey(documentInDb));
            }
        });
        return ret;
    }
    changeStream(): Observable<RxStorageChangeEvent<RxLocalDocumentData<{ [key: string]: any; }>>> {
        return this.changes$.asObservable();
    }
    async close(): Promise<void> {
        this.changes$.complete();
        OPEN_LOKIJS_STORAGE_INSTANCES.delete(this);
        if (this.internals.localState) {
            const localState = await this.getLocalState();
            await closeLokiCollections(
                this.databaseName,
                [
                    localState.collection,
                    localState.changesCollection
                ]
            );
        }
    }
    async remove(): Promise<void> {
        const localState = await this.mustUseLocalState();
        if (!localState) {
            return this.requestRemoteInstance('remove', []);
        }
        localState.database.removeCollection(this.collectionName + CHANGES_LOCAL_SUFFIX);
        localState.database.removeCollection(localState.changesCollection.name);
    }
}


export async function createLokiKeyValueLocalState(
    params: RxKeyObjectStorageInstanceCreationParams<LokiSettings>,
    databaseSettings: LokiDatabaseSettings
): Promise<LokiLocalState> {
    if (!params.options) {
        params.options = {};
    }
    const databaseState = await getLokiDatabase(params.databaseName, databaseSettings);

    const collectionOptions: Partial<CollectionOptions<RxLocalDocumentData>> = Object.assign(
        {},
        params.options.collection,
        {
            indices: [],
            unique: ['_id']
        } as any,
        LOKIJS_COLLECTION_DEFAULT_OPTIONS
    );

    const localCollectionName = params.collectionName + CHANGES_LOCAL_SUFFIX;
    const collection: Collection = databaseState.database.addCollection(
        localCollectionName,
        collectionOptions
    );
    databaseState.openCollections[localCollectionName] = collection;

    const changesCollectionName = params.collectionName + CHANGES_LOCAL_SUFFIX + CHANGES_COLLECTION_SUFFIX;
    const changesCollectionOptions = Object.assign({
        unique: ['eventId'],
        indices: ['sequence']
    }, LOKIJS_COLLECTION_DEFAULT_OPTIONS);
    const changesCollection: Collection = databaseState.database.addCollection(
        changesCollectionName,
        changesCollectionOptions
    );
    databaseState.openCollections[changesCollectionName] = changesCollection;
    return {
        database: databaseState.database,
        collection,
        changesCollection
    }
}

export async function createLokiKeyObjectStorageInstance(
    params: RxKeyObjectStorageInstanceCreationParams<LokiSettings>,
    databaseSettings: LokiDatabaseSettings
): Promise<RxStorageKeyObjectInstanceLoki> {
    const internals: LokiStorageInternals = {};
    // optimisation shortcut, directly create db is non multi instance.
    if (!params.broadcastChannel) {
        internals.localState = createLokiKeyValueLocalState(params, databaseSettings);
        await internals.localState;
    }

    const instance = new RxStorageKeyObjectInstanceLoki(
        params.databaseName,
        params.collectionName,
        internals,
        params.options,
        databaseSettings,
        params.broadcastChannel
    );
    return instance;
}
