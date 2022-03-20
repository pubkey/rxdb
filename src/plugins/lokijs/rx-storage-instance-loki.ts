import {
    Subject,
    Observable
} from 'rxjs';
import {
    lastOfArray,
    flatClone,
    now,
    ensureNotFalsy,
    isMaybeReadonlyArray,
    getFromMapOrThrow
} from '../../util';
import { newRxError } from '../../rx-error';
import type {
    RxStorageInstance,
    LokiSettings,
    RxStorageChangeEvent,
    RxDocumentData,
    BulkWriteRow,
    RxStorageBulkWriteResponse,
    RxStorageQueryResult,
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
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { categorizeBulkWriteRows } from '../../rx-storage-helper';

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

        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };

        const docsInDb: Map<RxDocumentData<RxDocType>[keyof RxDocType], RxDocumentData<RxDocType>> = new Map();
        const docsInDbWithLokiKey: Map<
            RxDocumentData<RxDocType>[keyof RxDocType],
            RxDocumentData<RxDocType> & { $loki: number; }
        > = new Map();
        documentWrites.forEach(writeRow => {
            const id = writeRow.document[this.primaryPath];
            const documentInDb = localState.collection.by(this.primaryPath, id);
            if (documentInDb) {
                docsInDbWithLokiKey.set(id, documentInDb);
                docsInDb.set(id, stripLokiKey(documentInDb));
            }
        });

        const categorized = categorizeBulkWriteRows<RxDocType>(
            this.primaryPath,
            docsInDb,
            documentWrites,
            (writeRow: BulkWriteRow<RxDocType>) => {
                return getLokiEventKey(this, this.primaryPath as any, writeRow);
            }
        );

        categorized.bulkInsertDocs.forEach(writeRow => {
            const docId = writeRow.document[this.primaryPath];
            localState.collection.insert(flatClone(writeRow.document));
            ret.success[docId as any] = writeRow.document;
        });
        categorized.bulkUpdateDocs.forEach(writeRow => {
            const docId = writeRow.document[this.primaryPath];
            const documentInDbWithLokiKey = getFromMapOrThrow(docsInDbWithLokiKey, docId);
            const writeDoc: any = Object.assign(
                {},
                writeRow.document,
                {
                    $loki: documentInDbWithLokiKey.$loki
                }
            );
            localState.collection.update(writeDoc);
            ret.success[docId as any] = writeRow.document;
        });
        categorized.errors.forEach(err => {
            ret.error[err.documentId] = err;
        });
        categorized.changedDocumentIds.forEach(docId => {
            this.addChangeDocumentMeta(docId as any);
        });
        localState.databaseState.saveQueue.addWrite();
        this.changes$.next(categorized.eventBulk);

        return ret;
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
    getAttachmentData(_documentId: string, _attachmentId: string): Promise<string> {
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

    async cleanup(minimumDeletedTime: number): Promise<boolean> {
        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'cleanup', [minimumDeletedTime]);
        }

        const deleteAmountPerRun = 10;
        const maxDeletionTime = now() - minimumDeletedTime;
        const query = localState.collection
            .chain()
            .find({
                _deleted: true,
                '_meta.lwt': {
                    $lt: maxDeletionTime
                }
            }).limit(deleteAmountPerRun);
        const foundDocuments = query.data();
        if (foundDocuments.length > 0) {
            localState.collection.remove(foundDocuments);
            localState.databaseState.saveQueue.addWrite();
        }

        return foundDocuments.length !== deleteAmountPerRun;
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
        return this.close();
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
            if (!isMaybeReadonlyArray(idx)) {
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
            .then(() => {
                if (!instance.closed) {
                    mustUseLocalState(instance)
                }
            });
    }


    return instance;
}
