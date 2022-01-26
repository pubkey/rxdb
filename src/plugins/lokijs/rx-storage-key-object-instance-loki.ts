import type { ChangeEvent } from 'event-reduce-js';
import { Observable, Subject } from 'rxjs';
import { newRxError } from '../../rx-error';
import type {
    BulkWriteLocalRow,
    EventBulk,
    LokiDatabaseSettings,
    LokiLocalDatabaseState,
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
    closeLokiCollections,
    getLokiDatabase,
    getLokiEventKey,
    getLokiLeaderElector,
    handleRemoteRequest,
    LOKIJS_COLLECTION_DEFAULT_OPTIONS,
    mustUseLocalState,
    OPEN_LOKIJS_STORAGE_INSTANCES,
    removeLokiLeaderElectorReference,
    requestRemoteInstance,
    stripLokiKey
} from './lokijs-helper';
import type {
    Collection
} from 'lokijs';
import type { RxStorageLoki } from './rx-storage-lokijs';

let instanceId = 1;

export class RxStorageKeyObjectInstanceLoki implements RxStorageKeyObjectInstance<LokiStorageInternals, LokiSettings> {

    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxLocalDocumentData>>> = new Subject();

    public instanceId = instanceId++;
    public closed = false;

    constructor(
        public readonly storage: RxStorageLoki,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly internals: LokiStorageInternals,
        public readonly options: Readonly<LokiSettings>,
        public readonly databaseSettings: LokiDatabaseSettings
    ) {
        OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
        if (this.internals.leaderElector) {
            this.internals.leaderElector.awaitLeadership().then(() => {
                // this instance is leader now, so it has to reply to queries from other instances
                ensureNotFalsy(this.internals.leaderElector).broadcastChannel
                    .addEventListener('message', async (msg) => handleRemoteRequest(this, msg));
            });
        }
    }

    async bulkWrite<RxDocType>(documentWrites: BulkWriteLocalRow<RxDocType>[]): Promise<RxLocalStorageBulkWriteResponse<RxDocType>> {
        if (documentWrites.length === 0) {
            throw newRxError('P2', {
                args: {
                    documentWrites
                }
            });
        }

        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'bulkWrite', [documentWrites]);
        }

        const startTime = now();
        await promiseWait(0);

        const ret: RxLocalStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };
        const writeRowById: Map<string, BulkWriteLocalRow<RxDocType>> = new Map();
        const eventBulk: EventBulk<RxStorageChangeEvent<RxLocalDocumentData>> = {
            id: randomCouchString(10),
            events: []
        };
        documentWrites.forEach(writeRow => {
            const id = writeRow.document._id;
            writeRowById.set(id, writeRow);
            const writeDoc = flatClone(writeRow.document);
            const docInDb = localState.collection.by('_id', id);

            // TODO why not use docInDb instead of collection.by() ??
            const previous = writeRow.previous ? writeRow.previous : localState.collection.by('_id', id);

            const newRevHeight = previous ? parseRevision(previous._rev).height + 1 : 1;
            const newRevision = newRevHeight + '-' + createRevision(writeRow.document);
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
                    ret.error[id] = err;
                    return;
                } else {
                    const toLoki: any = flatClone(writeDoc);
                    toLoki.$loki = docInDb.$loki;
                    toLoki.$lastWriteAt = startTime;
                    localState.collection.update(toLoki);
                }
            } else {
                const insertData: any = flatClone(writeDoc);
                insertData.$lastWriteAt = startTime;
                localState.collection.insert(insertData);
            }

            ret.success[id] = stripLokiKey(writeDoc);

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
                eventBulk.events.push(storageChangeEvent);
            }
        });

        localState.databaseState.saveQueue.addWrite();
        this.changes$.next(eventBulk);
        return ret;
    }
    async findLocalDocumentsById<RxDocType = any>(ids: string[]): Promise<{ [documentId: string]: RxLocalDocumentData<RxDocType> }> {
        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'findLocalDocumentsById', [ids]);
        }

        await promiseWait(0);
        const ret: { [documentId: string]: RxLocalDocumentData<RxDocType> } = {};
        ids.forEach(id => {
            const documentInDb = localState.collection.by('_id', id);
            if (
                documentInDb &&
                !documentInDb._deleted
            ) {
                ret[id] = stripLokiKey(documentInDb);
            }
        });
        return ret;
    }
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxLocalDocumentData<{ [key: string]: any; }>>>> {
        return this.changes$.asObservable();
    }
    async close(): Promise<void> {
        this.closed = true;
        this.changes$.complete();
        OPEN_LOKIJS_STORAGE_INSTANCES.delete(this);
        if (this.internals.localState) {
            const localState = await ensureNotFalsy(this.internals.localState);
            await closeLokiCollections(
                this.databaseName,
                [
                    ensureNotFalsy(localState.collection),
                    ensureNotFalsy(localState.changesCollection)
                ]
            );
        }
        removeLokiLeaderElectorReference(this.storage, this.databaseName);
    }
    async remove(): Promise<void> {
        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'remove', []);
        }
        localState.databaseState.database.removeCollection(localState.collection.name);
        localState.databaseState.database.removeCollection(localState.changesCollection.name);
        this.close();
    }
}


export async function createLokiKeyValueLocalState(
    params: RxKeyObjectStorageInstanceCreationParams<LokiSettings>,
    databaseSettings: LokiDatabaseSettings
): Promise<LokiLocalDatabaseState> {
    if (!params.options) {
        params.options = {};
    }
    const databaseState = await getLokiDatabase(
        params.databaseName,
        databaseSettings
    );

    const collectionOptions: Partial<CollectionOptions<RxLocalDocumentData>> = Object.assign(
        {},
        params.options.collection,
        {
            indices: [],
            unique: ['_id']
        } as any,
        LOKIJS_COLLECTION_DEFAULT_OPTIONS
    );

    const collection: Collection = databaseState.database.addCollection(
        params.collectionName,
        collectionOptions
    );
    databaseState.collections[params.collectionName] = collection;

    const changesCollectionName = params.collectionName + CHANGES_COLLECTION_SUFFIX;
    const changesCollectionOptions = Object.assign({
        unique: ['eventId'],
        indices: ['sequence']
    }, LOKIJS_COLLECTION_DEFAULT_OPTIONS);
    const changesCollection: Collection = databaseState.database.addCollection(
        changesCollectionName,
        changesCollectionOptions
    );
    databaseState.collections[changesCollectionName] = collection;

    return {
        changesCollection,
        collection,
        databaseState
    }
}

export async function createLokiKeyObjectStorageInstance(
    storage: RxStorageLoki,
    params: RxKeyObjectStorageInstanceCreationParams<LokiSettings>,
    databaseSettings: LokiDatabaseSettings
): Promise<RxStorageKeyObjectInstanceLoki> {
    const internals: LokiStorageInternals = {};


    if (params.multiInstance) {
        const leaderElector = getLokiLeaderElector(storage, params.databaseName);
        internals.leaderElector = leaderElector;
    } else {
        // optimisation shortcut, directly create db is non multi instance.
        internals.localState = createLokiKeyValueLocalState(params, databaseSettings);
        await internals.localState;
    }

    const instance = new RxStorageKeyObjectInstanceLoki(
        storage,
        params.databaseName,
        params.collectionName,
        internals,
        params.options,
        databaseSettings
    );

    /**
     * Directly create the localState if the db becomes leader.
     */
    if (params.multiInstance) {
        ensureNotFalsy(internals.leaderElector)
            .awaitLeadership()
            .then(() => mustUseLocalState(instance));
    }


    return instance;
}
