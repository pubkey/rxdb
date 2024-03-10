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
    hasDeepProperty
} from '../utils/index.ts';
import { newRxError } from '../../rx-error.ts';
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
    DeepReadonly,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxStorageDefaultCheckpoint,
    RxStorageCountResult,
    PreparedQuery
} from '../../types/index.d.ts';
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
    RX_STORAGE_NAME_LOKIJS,
    transformRegexToRegExp
} from './lokijs-helper.ts';
import type { RxStorageLoki } from './rx-storage-lokijs.ts';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper.ts';
import { categorizeBulkWriteRows } from '../../rx-storage-helper.ts';
import {
    addRxStorageMultiInstanceSupport,
    removeBroadcastChannelReference
} from '../../rx-storage-multiinstance.ts';
import { getQueryMatcher } from '../../rx-query-helper.ts';

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

    public closed?: Promise<void>;

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
            }).catch(() => { });
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
            success: [],
            error: []
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
            localState.collection.insert(flatClone(writeRow.document));
            ret.success.push(writeRow.document);
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
            ret.success.push(writeRow.document);
        });
        localState.databaseState.saveQueue.addWrite();

        if (categorized.eventBulk.events.length > 0) {
            const lastState = ensureNotFalsy(categorized.newestRow).document;
            categorized.eventBulk.checkpoint = {
                id: lastState[this.primaryPath],
                lwt: lastState._meta.lwt
            };
            categorized.eventBulk.endTime = now();
            this.changes$.next(categorized.eventBulk);
        }

        return ret;
    }
    async findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentData<RxDocType>[]> {
        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'findDocumentsById', [ids, deleted]);
        }

        const ret: RxDocumentData<RxDocType>[] = [];
        ids.forEach(id => {
            const documentInDb = localState.collection.by(this.primaryPath, id);
            if (
                documentInDb &&
                (!documentInDb._deleted || deleted)
            ) {
                ret.push(stripLokiKey(documentInDb));
            }
        });
        return ret;
    }
    async query(preparedQueryOriginal: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>> {
        const localState = await mustUseLocalState(this);
        if (!localState) {
            return requestRemoteInstance(this, 'query', [preparedQueryOriginal]);
        }

        let preparedQuery = ensureNotFalsy(preparedQueryOriginal.query);
        if (preparedQuery.selector) {
            preparedQuery = flatClone(preparedQuery);
            preparedQuery.selector = transformRegexToRegExp(preparedQuery.selector);
        }

        const query = preparedQueryOriginal.query;
        const skip = query.skip ? query.skip : 0;
        const limit = query.limit ? query.limit : Infinity;
        const skipPlusLimit = skip + limit;

        /**
         * LokiJS is not able to give correct results for some
         * operators, so we have to check all documents in that case
         * and laster apply skip and limit manually.
         * @link https://github.com/pubkey/rxdb/issues/5320
         */
        let mustRunMatcher = false;
        if (hasDeepProperty(preparedQuery.selector, '$in')) {
            mustRunMatcher = true;
        }


        let lokiQuery = localState.collection
            .chain()
            .find(mustRunMatcher ? {} : preparedQuery.selector);

        if (preparedQuery.sort) {
            lokiQuery = lokiQuery.sort(getLokiSortComparator(this.schema, preparedQuery));
        }


        let foundDocuments = lokiQuery.data().map((lokiDoc: any) => stripLokiKey(lokiDoc));


        /**
         * LokiJS returned wrong results on some queries
         * with complex indexes. Therefore we run the query-match
         * over all result docs to patch this bug.
         * TODO create an issue at the LokiJS repository.
         */
        const queryMatcher = getQueryMatcher(
            this.schema,
            preparedQuery as any
        );
        foundDocuments = foundDocuments.filter((d: any) => queryMatcher(d));

        // always apply offset and limit like this, because
        // sylvieQuery.offset() and sylvieQuery.limit() results were inconsistent
        foundDocuments = foundDocuments.slice(skip, skipPlusLimit);

        return {
            documents: foundDocuments
        };
    }
    async count(
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageCountResult> {
        const result = await this.query(preparedQuery);
        return {
            count: result.documents.length,
            mode: 'fast'
        };
    }
    getAttachmentData(_documentId: string, _attachmentId: string, _digest: string): Promise<string> {
        throw new Error('Attachments are not implemented in the lokijs RxStorage. Make a pull request.');
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
            return this.closed;
        }
        this.closed = (async () => {
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
        })();
        return this.closed;
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
    const collectionOptions: Partial<any> = Object.assign(
        {},
        lokiCollectionName,
        {
            indices: indices as string[],
            unique: [primaryKey]
        } as any,
        LOKIJS_COLLECTION_DEFAULT_OPTIONS
    );

    const collection: any = databaseState.database.addCollection(
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

    await addRxStorageMultiInstanceSupport(
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
