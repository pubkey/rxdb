import type {
    ChangeEvent
} from 'event-reduce-js';
import {
    Subject,
    Observable
} from 'rxjs';
import {
    promiseWait,
    createRevision,
    getHeightOfRevision,
    parseRevision,
    lastOfArray,
    flatClone,
    now,
    ensureNotFalsy,
    randomCouchString
} from '../../util';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import type {
    RxStorageInstance,
    LokiSettings,
    RxStorageChangeEvent,
    RxDocumentData,
    BulkWriteRow,
    RxStorageBulkWriteResponse,
    RxStorageBulkWriteError,
    RxStorageQueryResult,
    BlobBuffer,
    ChangeStreamOnceOptions,
    RxJsonSchema,
    MangoQuery,
    LokiStorageInternals,
    RxStorageChangedDocumentMeta,
    RxStorageInstanceCreationParams,
    LokiDatabaseSettings,
    LokiLocalDatabaseState,
    EventBulk
} from '../../types';
import {
    CHANGES_COLLECTION_SUFFIX,
    closeLokiCollections,
    getLokiDatabase,
    getLokiEventKey,
    OPEN_LOKIJS_STORAGE_INSTANCES,
    LOKIJS_COLLECTION_DEFAULT_OPTIONS,
    stripLokiKey,
    getLokiSortComparator,
    getLokiLeaderElector,
    removeLokiLeaderElectorReference,
    requestRemoteInstance,
    mustUseLocalState,
    handleRemoteRequest
} from './lokijs-helper';
import type {
    Collection
} from 'lokijs';
import type { RxStorageLoki } from './rx-storage-lokijs';

let instanceId = now();

export class RxStorageInstanceLoki<RxDocType> implements RxStorageInstance<
    RxDocType,
    LokiStorageInternals,
    LokiSettings
> {

    public readonly primaryPath: keyof RxDocType;
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> = new Subject();
    private lastChangefeedSequence: number = 0;
    public readonly instanceId = instanceId++;

    public closed = false;

    constructor(
        public readonly storage: RxStorageLoki,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocType>>,
        public readonly internals: LokiStorageInternals,
        public readonly options: Readonly<LokiSettings>,
        public readonly databaseSettings: LokiDatabaseSettings
    ) {
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
        OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
        if (this.internals.leaderElector) {
            this.internals.leaderElector.awaitLeadership().then(() => {
                // this instance is leader now, so it has to reply to queries from other instances
                ensureNotFalsy(this.internals.leaderElector).broadcastChannel
                    .addEventListener('message', async (msg) => handleRemoteRequest(this, msg));
            });
        }
    }

    /**
     * Adds an entry to the changes feed
     * that can be queried to check which documents have been
     * changed since sequence X.
     */
    private async addChangeDocumentMeta(id: string) {
        const localState = await ensureNotFalsy(this.internals.localState);
        if (!this.lastChangefeedSequence) {
            const lastDoc = localState.changesCollection
                .chain()
                .simplesort('sequence', true)
                .limit(1)
                .data()[0];
            if (lastDoc) {
                this.lastChangefeedSequence = lastDoc.sequence;
            }
        }

        const nextFeedSequence = this.lastChangefeedSequence + 1;
        localState.changesCollection.insert({
            id,
            sequence: nextFeedSequence
        });
        this.lastChangefeedSequence = nextFeedSequence;
    }

    async bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>> {
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

        /**
         * lokijs is in memory and non-async, so we emulate async behavior
         * to ensure all RxStorage implementations behave equal.
         */
        await promiseWait(0);
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };

        const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = {
            id: randomCouchString(10),
            events: []
        };
        documentWrites.forEach(writeRow => {
            const startTime = now();
            const id: string = writeRow.document[this.primaryPath] as any;
            const documentInDb = localState.collection.by(this.primaryPath, id);

            if (!documentInDb) {
                // insert new document
                const newRevision = '1-' + createRevision(writeRow.document);

                /**
                 * It is possible to insert already deleted documents,
                 * this can happen on replication.
                 */
                const insertedIsDeleted = writeRow.document._deleted ? true : false;

                const writeDoc = Object.assign(
                    {},
                    writeRow.document,
                    {
                        _rev: newRevision,
                        _deleted: insertedIsDeleted,
                        // TODO attachments are currently not working with lokijs
                        _attachments: {} as any
                    }
                );
                const insertData: any = flatClone(writeDoc);
                insertData.$lastWriteAt = startTime;
                localState.collection.insert(insertData);
                if (!insertedIsDeleted) {
                    this.addChangeDocumentMeta(id);
                    eventBulk.events.push({
                        eventId: getLokiEventKey(false, id, newRevision),
                        documentId: id,
                        change: {
                            doc: writeDoc,
                            id,
                            operation: 'INSERT',
                            previous: null
                        },
                        startTime,
                        endTime: now()
                    });
                }
                ret.success[id] = writeDoc;
            } else {
                // update existing document
                const revInDb: string = documentInDb._rev;

                // inserting a deleted document is possible
                // without sending the previous data.
                if (!writeRow.previous && documentInDb._deleted) {
                    writeRow.previous = documentInDb;
                }

                if (
                    (
                        !writeRow.previous &&
                        !documentInDb._deleted
                    ) ||
                    (
                        !!writeRow.previous &&
                        revInDb !== writeRow.previous._rev
                    )
                ) {
                    // conflict error
                    const err: RxStorageBulkWriteError<RxDocType> = {
                        isError: true,
                        status: 409,
                        documentId: id,
                        writeRow: writeRow
                    };
                    ret.error[id] = err;
                } else {
                    const newRevHeight = getHeightOfRevision(revInDb) + 1;
                    const newRevision = newRevHeight + '-' + createRevision(writeRow.document);
                    const isDeleted = !!writeRow.document._deleted;
                    const writeDoc: any = Object.assign(
                        {},
                        writeRow.document,
                        {
                            $loki: documentInDb.$loki,
                            $lastWriteAt: startTime,
                            _rev: newRevision,
                            _deleted: isDeleted,
                            // TODO attachments are currently not working with lokijs
                            _attachments: {}
                        }
                    );
                    localState.collection.update(writeDoc);
                    this.addChangeDocumentMeta(id);

                    let change: ChangeEvent<RxDocumentData<RxDocType>> | null = null;
                    if (writeRow.previous && writeRow.previous._deleted && !writeDoc._deleted) {
                        change = {
                            id,
                            operation: 'INSERT',
                            previous: null,
                            doc: stripLokiKey(writeDoc)
                        };
                    } else if (writeRow.previous && !writeRow.previous._deleted && !writeDoc._deleted) {
                        change = {
                            id,
                            operation: 'UPDATE',
                            previous: writeRow.previous,
                            doc: stripLokiKey(writeDoc)
                        };
                    } else if (writeRow.previous && !writeRow.previous._deleted && writeDoc._deleted) {
                        /**
                         * On delete, we send the 'new' rev in the previous property,
                         * to have the equal behavior as pouchdb.
                         */
                        const previous = flatClone(writeRow.previous);
                        previous._rev = newRevision;
                        change = {
                            id,
                            operation: 'DELETE',
                            previous,
                            doc: null
                        };
                    }
                    if (!change) {
                        throw newRxError('SNH', { args: { writeRow } });
                    }
                    eventBulk.events.push({
                        eventId: getLokiEventKey(false, id, newRevision),
                        documentId: id,
                        change,
                        startTime,
                        endTime: now()
                    });
                    ret.success[id] = stripLokiKey(writeDoc);
                }
            }
        });
        localState.databaseState.saveQueue.addWrite();
        this.changes$.next(eventBulk);
        return ret;
    }

    async bulkAddRevisions(documents: RxDocumentData<RxDocType>[]): Promise<void> {
        if (documents.length === 0) {
            throw newRxError('P3', {
                args: {
                    documents
                }
            });
        }

        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'bulkAddRevisions', [documents]);
        }

        /**
         * lokijs is in memory and non-async, so we emulate async behavior
         * to ensure all RxStorage implementations behave equal.
         */
        await promiseWait(0);

        const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = {
            id: randomCouchString(10),
            events: []
        };
        documents.forEach(docData => {
            const startTime = now();
            const id: string = docData[this.primaryPath] as any;
            const documentInDb = localState.collection.by(this.primaryPath, id);
            if (!documentInDb) {
                // document not here, so we can directly insert
                const insertData: any = flatClone(docData);
                insertData.$lastWriteAt = startTime;
                localState.collection.insert(insertData);
                eventBulk.events.push({
                    documentId: id,
                    eventId: getLokiEventKey(false, id, docData._rev),
                    change: {
                        doc: docData,
                        id,
                        operation: 'INSERT',
                        previous: null
                    },
                    startTime,
                    endTime: now()
                });
                this.addChangeDocumentMeta(id);
            } else {
                const newWriteRevision = parseRevision(docData._rev);
                const oldRevision = parseRevision(documentInDb._rev);

                let mustUpdate: boolean = false;
                if (newWriteRevision.height !== oldRevision.height) {
                    // height not equal, compare base on height
                    if (newWriteRevision.height > oldRevision.height) {
                        mustUpdate = true;
                    }
                } else if (newWriteRevision.hash > oldRevision.hash) {
                    // equal height but new write has the 'winning' hash
                    mustUpdate = true;
                }
                if (mustUpdate) {
                    const storeAtLoki = flatClone(docData) as any;
                    storeAtLoki.$loki = documentInDb.$loki;
                    storeAtLoki.$lastWriteAt = startTime;
                    localState.collection.update(storeAtLoki);
                    let change: ChangeEvent<RxDocumentData<RxDocType>> | null = null;
                    if (documentInDb._deleted && !docData._deleted) {
                        change = {
                            id,
                            operation: 'INSERT',
                            previous: null,
                            doc: docData
                        };
                    } else if (!documentInDb._deleted && !docData._deleted) {
                        change = {
                            id,
                            operation: 'UPDATE',
                            previous: stripLokiKey(documentInDb),
                            doc: docData
                        };
                    } else if (!documentInDb._deleted && docData._deleted) {
                        change = {
                            id,
                            operation: 'DELETE',
                            previous: stripLokiKey(documentInDb),
                            doc: null
                        };
                    } else if (documentInDb._deleted && docData._deleted) {
                        change = null;
                    }
                    if (change) {
                        eventBulk.events.push({
                            documentId: id,
                            eventId: getLokiEventKey(false, id, docData._rev),
                            change,
                            startTime,
                            endTime: now()
                        });
                        this.addChangeDocumentMeta(id);
                    }
                }
            }
        });
        localState.databaseState.saveQueue.addWrite();
        this.changes$.next(eventBulk);
    }
    async findDocumentsById(ids: string[], deleted: boolean): Promise<{ [documentId: string]: RxDocumentData<RxDocType> }> {
        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'findDocumentsById', [ids, deleted]);
        }

        const ret: { [documentId: string]: RxDocumentData<RxDocType> } = {};
        ids.forEach(id => {
            const documentInDb = localState.collection.by(this.primaryPath, id);
            if (
                documentInDb &&
                (!documentInDb._deleted || deleted)
            ) {
                ret[id] = stripLokiKey(documentInDb);
            }
        });
        return ret;
    }
    async query(preparedQuery: MangoQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>> {
        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'query', [preparedQuery]);
        }

        let query = localState.collection
            .chain()
            .find(preparedQuery.selector);

        if (preparedQuery.sort) {
            query = query.sort(getLokiSortComparator(this.schema, preparedQuery));
        }

        /**
         * Offset must be used before limit in LokiJS
         * @link https://github.com/techfort/LokiJS/issues/570
         */
        if (preparedQuery.skip) {
            query = query.offset(preparedQuery.skip);
        }

        if (preparedQuery.limit) {
            query = query.limit(preparedQuery.limit);
        }

        const foundDocuments = query.data().map(lokiDoc => stripLokiKey(lokiDoc));
        return {
            documents: foundDocuments
        };
    }
    getAttachmentData(_documentId: string, _attachmentId: string): Promise<BlobBuffer> {
        throw new Error('Attachments are not implemented in the lokijs RxStorage. Make a pull request.');
    }
    async getChangedDocuments(
        options: ChangeStreamOnceOptions
    ): Promise<{
        changedDocuments: RxStorageChangedDocumentMeta[];
        lastSequence: number;
    }> {
        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'getChangedDocuments', [options]);
        }

        const desc = options.direction === 'before';
        const operator = options.direction === 'after' ? '$gt' : '$lt';

        let query = localState.changesCollection
            .chain()
            .find({
                sequence: {
                    [operator]: options.sinceSequence
                }
            })
            .simplesort(
                'sequence',
                desc
            );
        if (options.limit) {
            query = query.limit(options.limit);
        }
        const changedDocuments: RxStorageChangedDocumentMeta[] = query
            .data()
            .map(result => ({
                id: result.id,
                sequence: result.sequence
            }));

        const useForLastSequence = !desc ? lastOfArray(changedDocuments) : changedDocuments[0];

        const ret: {
            changedDocuments: RxStorageChangedDocumentMeta[];
            lastSequence: number;
        } = {
            changedDocuments,
            lastSequence: useForLastSequence ? useForLastSequence.sequence : options.sinceSequence
        }

        return ret;
    }
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> {
        return this.changes$.asObservable();
    }
    async close(): Promise<void> {
        this.closed = true;
        this.changes$.complete();
        OPEN_LOKIJS_STORAGE_INSTANCES.delete(this);

        if (this.internals.localState) {
            const localState = await this.internals.localState;
            const dbState = await getLokiDatabase(
                this.databaseName,
                this.databaseSettings
            );
            await dbState.saveQueue.run();
            await closeLokiCollections(
                this.databaseName,
                [
                    localState.collection,
                    localState.changesCollection
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
        localState.databaseState.database.removeCollection(this.collectionName);
        localState.databaseState.database.removeCollection(localState.changesCollection.name);
        this.close();
    }
}

export async function createLokiLocalState<RxDocType>(
    params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>,
    databaseSettings: LokiDatabaseSettings
): Promise<LokiLocalDatabaseState> {
    if (!params.options) {
        params.options = {};
    }

    const databaseState = await getLokiDatabase(
        params.databaseName,
        databaseSettings
    );

    /**
     * Construct loki indexes from RxJsonSchema indexes.
     * TODO what about compound indexes? Are they possible in lokijs?
     */
    const indices: string[] = [];
    if (params.schema.indexes) {
        params.schema.indexes.forEach(idx => {
            if (!Array.isArray(idx)) {
                indices.push(idx);
            }
        });
    }
    /**
     * LokiJS has no concept of custom primary key, they use a number-id that is generated.
     * To be able to query fast by primary key, we always add an index to the primary.
     */
    const primaryKey = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);
    indices.push(primaryKey as string);

    /**
     * TODO disable stuff we do not need from CollectionOptions
     */
    const collectionOptions: Partial<CollectionOptions<RxDocumentData<RxDocType>>> = Object.assign(
        {},
        params.options.collection,
        {
            indices: indices as string[],
            unique: [primaryKey]
        } as any,
        LOKIJS_COLLECTION_DEFAULT_OPTIONS
    );

    const collection: Collection = databaseState.database.addCollection(
        params.collectionName,
        collectionOptions as any
    );
    databaseState.collections[params.collectionName] = collection;

    const changesCollectionName = params.collectionName + CHANGES_COLLECTION_SUFFIX;
    const changesCollectionOptions = Object.assign({
        unique: ['eventId'],
        indices: ['sequence']
    }, LOKIJS_COLLECTION_DEFAULT_OPTIONS)
    const changesCollection: Collection = databaseState.database.addCollection(
        changesCollectionName,
        changesCollectionOptions
    );
    databaseState.collections[params.collectionName] = changesCollection;

    const ret: LokiLocalDatabaseState = {
        databaseState,
        collection,
        changesCollection
    };

    return ret;
}


export async function createLokiStorageInstance<RxDocType>(
    storage: RxStorageLoki,
    params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>,
    databaseSettings: LokiDatabaseSettings
): Promise<RxStorageInstanceLoki<RxDocType>> {
    const internals: LokiStorageInternals = {};

    if (params.multiInstance) {
        const leaderElector = getLokiLeaderElector(storage, params.databaseName);
        internals.leaderElector = leaderElector;
    } else {
        // optimisation shortcut, directly create db is non multi instance.
        internals.localState = createLokiLocalState(params, databaseSettings);
        await internals.localState;
    }

    const instance = new RxStorageInstanceLoki(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
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
