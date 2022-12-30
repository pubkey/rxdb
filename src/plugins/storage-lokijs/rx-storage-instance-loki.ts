import {
    Subject,
    Observable
} from 'rxjs';
import {
    flatClone,
    now,
    ensureNotFalsy,
    isMaybeReadonlyArray,
    getFromMapOrThrow,
    getSortDocumentsByLastWriteTimeComparator,
    RX_META_LWT_MINIMUM,
    lastOfArray
} from '../utils';
import { newRxError } from '../../rx-error';
import type {
    RxStorageInstance,
    LokiSettings,
    RxStorageChangeEvent,
    RxDocumentData,
    BulkWriteRow,
    RxStorageBulkWriteResponse,
    RxStorageQueryResult,
    RxJsonSchema,
    MangoQuery,
    LokiStorageInternals,
    RxStorageInstanceCreationParams,
    LokiDatabaseSettings,
    LokiLocalDatabaseState,
    EventBulk,
    StringKeys,
    RxDocumentDataById,
    DeepReadonly,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxStorageDefaultCheckpoint,
    RxStorageCountResult
} from '../../types';
import {
    closeLokiCollections,
    getLokiDatabase,
    OPEN_LOKIJS_STORAGE_INSTANCES,
    LOKIJS_COLLECTION_DEFAULT_OPTIONS,
    stripLokiKey,
    getLokiSortComparator,
    getLokiLeaderElector,
    requestRemoteInstance,
    mustUseLocalState,
    handleRemoteRequest,
    RX_STORAGE_NAME_LOKIJS
} from './lokijs-helper';
import type {
    Collection
} from 'lokijs';
import type { RxStorageLoki } from './rx-storage-lokijs';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { categorizeBulkWriteRows, getNewestOfDocumentStates } from '../../rx-storage-helper';
import { addRxStorageMultiInstanceSupport, removeBroadcastChannelReference } from '../../rx-storage-multiinstance';

let instanceId = now();

export class RxStorageInstanceLoki<RxDocType> implements RxStorageInstance<
    RxDocType,
    LokiStorageInternals,
    LokiSettings,
    RxStorageDefaultCheckpoint
> {

    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> = new Subject();
    public readonly instanceId = instanceId++;

    public closed = false;

    constructor(
        public readonly databaseInstanceToken: string,
        public readonly storage: RxStorageLoki,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: LokiStorageInternals,
        public readonly options: Readonly<LokiSettings>,
        public readonly databaseSettings: LokiDatabaseSettings
    ) {
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
        OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
        if (this.internals.leaderElector) {


            /**
             * To run handleRemoteRequest(),
             * the instance will call its own methods.
             * But these methods could have already been swapped out by a RxStorageWrapper
             * so we must store the original methods here and use them instead.
             */
            const copiedSelf: RxStorageInstance<RxDocType, any, any> = {
                bulkWrite: this.bulkWrite.bind(this),
                changeStream: this.changeStream.bind(this),
                cleanup: this.cleanup.bind(this),
                close: this.close.bind(this),
                query: this.query.bind(this),
                count: this.count.bind(this),
                findDocumentsById: this.findDocumentsById.bind(this),
                collectionName: this.collectionName,
                databaseName: this.databaseName,
                conflictResultionTasks: this.conflictResultionTasks.bind(this),
                getAttachmentData: this.getAttachmentData.bind(this),
                getChangedDocumentsSince: this.getChangedDocumentsSince.bind(this),
                internals: this.internals,
                options: this.options,
                remove: this.remove.bind(this),
                resolveConflictResultionTask: this.resolveConflictResultionTask.bind(this),
                schema: this.schema
            };

            this.internals.leaderElector.awaitLeadership().then(() => {
                // this instance is leader now, so it has to reply to queries from other instances
                ensureNotFalsy(this.internals.leaderElector).broadcastChannel
                    .addEventListener('message', (msg) => handleRemoteRequest(copiedSelf as any, msg));
            });
        }
    }

    async bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
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

        const docsInDb: Map<RxDocumentData<RxDocType>[StringKeys<RxDocType>], RxDocumentData<RxDocType>> = new Map();
        const docsInDbWithLokiKey: Map<
            RxDocumentData<RxDocType>[StringKeys<RxDocType>],
            RxDocumentData<RxDocType> & { $loki: number; }
        > = new Map();
        documentWrites.forEach(writeRow => {
            const id = writeRow.document[this.primaryPath];
            const documentInDb = localState.collection.by(this.primaryPath, id);
            if (documentInDb) {
                docsInDbWithLokiKey.set(id as any, documentInDb);
                docsInDb.set(id as any, stripLokiKey(documentInDb));
            }
        });

        const categorized = categorizeBulkWriteRows<RxDocType>(
            this,
            this.primaryPath as any,
            docsInDb,
            documentWrites,
            context
        );
        ret.error = categorized.errors;

        categorized.bulkInsertDocs.forEach(writeRow => {
            const docId = writeRow.document[this.primaryPath];
            localState.collection.insert(flatClone(writeRow.document));
            ret.success[docId as any] = writeRow.document;
        });
        categorized.bulkUpdateDocs.forEach(writeRow => {
            const docId = writeRow.document[this.primaryPath];
            const documentInDbWithLokiKey = getFromMapOrThrow(docsInDbWithLokiKey, docId as any);
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
        localState.databaseState.saveQueue.addWrite();

        if (categorized.eventBulk.events.length > 0) {
            const lastState = getNewestOfDocumentStates(
                this.primaryPath as any,
                Object.values(ret.success)
            );
            categorized.eventBulk.checkpoint = {
                id: lastState[this.primaryPath],
                lwt: lastState._meta.lwt
            };
            this.changes$.next(categorized.eventBulk);
        }

        return ret;
    }
    async findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentDataById<RxDocType>> {
        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'findDocumentsById', [ids, deleted]);
        }

        const ret: RxDocumentDataById<RxDocType> = {};
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
    async count(
        preparedQuery: MangoQuery<RxDocType>
    ): Promise<RxStorageCountResult> {
        const result = await this.query(preparedQuery);
        return {
            count: result.documents.length,
            mode: 'fast'
        };
    }
    getAttachmentData(_documentId: string, _attachmentId: string): Promise<string> {
        throw new Error('Attachments are not implemented in the lokijs RxStorage. Make a pull request.');
    }


    async getChangedDocumentsSince(
        limit: number,
        checkpoint?: RxStorageDefaultCheckpoint | null
    ): Promise<{
        documents: RxDocumentData<RxDocType>[];
        checkpoint: RxStorageDefaultCheckpoint;
    }> {
        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'getChangedDocumentsSince', [limit, checkpoint]);
        }

        const sinceLwt = checkpoint ? checkpoint.lwt : RX_META_LWT_MINIMUM;
        const query = localState.collection
            .chain()
            .find({
                '_meta.lwt': {
                    $gte: sinceLwt
                }
            })
            .sort(getSortDocumentsByLastWriteTimeComparator(this.primaryPath as any));
        let changedDocs = query.data();

        const first = changedDocs[0];
        if (
            checkpoint &&
            first &&
            first[this.primaryPath] === checkpoint.id &&
            first._meta.lwt === checkpoint.lwt
        ) {
            changedDocs.shift();
        }

        changedDocs = changedDocs.slice(0, limit);
        const lastDoc = lastOfArray(changedDocs);
        return {
            documents: changedDocs.map(docData => stripLokiKey(docData)),
            checkpoint: lastDoc ? {
                id: lastDoc[this.primaryPath],
                lwt: lastDoc._meta.lwt
            } : checkpoint ? checkpoint : {
                id: '',
                lwt: 0
            }
        };
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> {
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
        if (this.closed) {
            return Promise.reject(new Error('already closed'));
        }
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
                    localState.collection
                ]
            );
        }
    }
    async remove(): Promise<void> {
        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'remove', []);
        }
        localState.databaseState.database.removeCollection(localState.collection.name);
        await localState.databaseState.saveQueue.run();
        return this.close();
    }

    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>> {
        return new Subject();
    }
    async resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void> { }

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

    const lokiCollectionName = params.collectionName + '-' + params.schema.version;
    const collectionOptions: Partial<CollectionOptions<RxDocumentData<RxDocType>>> = Object.assign(
        {},
        lokiCollectionName,
        {
            indices: indices as string[],
            unique: [primaryKey]
        } as any,
        LOKIJS_COLLECTION_DEFAULT_OPTIONS
    );

    const collection: Collection = databaseState.database.addCollection(
        lokiCollectionName,
        collectionOptions as any
    );
    databaseState.collections[params.collectionName] = collection;
    const ret: LokiLocalDatabaseState = {
        databaseState,
        collection
    };

    return ret;
}


export async function createLokiStorageInstance<RxDocType>(
    storage: RxStorageLoki,
    params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>,
    databaseSettings: LokiDatabaseSettings
): Promise<RxStorageInstanceLoki<RxDocType>> {
    const internals: LokiStorageInternals = {};

    const broadcastChannelRefObject: DeepReadonly<any> = {};


    if (params.multiInstance) {
        const leaderElector = getLokiLeaderElector(
            params.databaseInstanceToken,
            broadcastChannelRefObject,
            params.databaseName
        );
        internals.leaderElector = leaderElector;
    } else {
        // optimisation shortcut, directly create db is non multi instance.
        internals.localState = createLokiLocalState(params, databaseSettings);
        await internals.localState;
    }

    const instance = new RxStorageInstanceLoki(
        params.databaseInstanceToken,
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        internals,
        params.options,
        databaseSettings
    );

    addRxStorageMultiInstanceSupport(
        RX_STORAGE_NAME_LOKIJS,
        params,
        instance,
        internals.leaderElector ? internals.leaderElector.broadcastChannel : undefined
    );

    if (params.multiInstance) {
        /**
         * Clean up the broadcast-channel reference on close()
         */
        const closeBefore = instance.close.bind(instance);
        instance.close = function () {
            removeBroadcastChannelReference(
                params.databaseInstanceToken,
                broadcastChannelRefObject
            );
            return closeBefore();
        };
        const removeBefore = instance.remove.bind(instance);
        instance.remove = function () {
            removeBroadcastChannelReference(
                params.databaseInstanceToken,
                broadcastChannelRefObject
            );
            return removeBefore();
        };

        /**
         * Directly create the localState when/if the db becomes leader.
         */
        ensureNotFalsy(internals.leaderElector)
            .awaitLeadership()
            .then(() => {
                if (!instance.closed) {
                    mustUseLocalState(instance);
                }
            });
    }


    return instance;
}
