import type {
    BulkWriteRow,
    EventBulk,
    RxDocumentData,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageCountResult,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult
} from './rx-storage.ts';
import type {
    MangoQuerySelector,
    MangoQuerySortPart,
    RxJsonSchema,
    RxQueryPlan
} from './index.d.ts';
import type {
    Observable
} from 'rxjs';

/**
 * RxStorage
 * This is an interface that abstracts the storage engine.
 * This allows us to use RxDB with different storage engines.
 *
 * @link https://rxdb.info/rx-storage.html
 * @link https://github.com/pubkey/rxdb/issues/1636
 */

/**
 * A RxStorage is a module that acts
 * as a factory that can create multiple RxStorageInstance
 * objects.
 *
 * All data inputs and outputs of a StorageInstance must be plain json objects.
 * Do not use Map, Set or anything else that cannot be JSON.stringify-ed.
 * This will ensure that the storage can exchange data
 * when it is a WebWorker or a WASM process or data is send via BroadcastChannel.
 */
export interface RxStorage<Internals, InstanceCreationOptions> {
    /**
     * name of the storage engine
     * used to detect if plugins do not work so we can throw proper errors.
     */
    readonly name: string;

    /**
     * RxDB version is part of the storage
     * so we can have fallbacks and stuff when
     * multiple storages with different version are in use
     * like in the storage migration plugin.
     */
    readonly rxdbVersion: string;

    /**
     * Creates a storage instance
     * that can contain the NoSQL documents of a collection.
     */
    createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, InstanceCreationOptions>
    ): Promise<RxStorageInstance<RxDocType, Internals, InstanceCreationOptions>>;
}


/**
 * User provided mango queries will be filled up by RxDB via normalizeMangoQuery()
 * so we do not have to do many if-field-exist tests in the internals.
 */
export type FilledMangoQuery<RxDocType> = {
    /**
     * The selector is required here.
     */
    selector: MangoQuerySelector<RxDocumentData<RxDocType>>;

    /**
     * In contrast to the user-provided MangoQuery,
     * the sorting is required here because
     * RxDB has to ensure that the primary key is always
     * part of the sort params.
     */
    sort: MangoQuerySortPart<RxDocumentData<RxDocType>>[];

    /**
     * In the normalized mango query,
     * the index must always be a string[],
     * never just a string.
     * This makes it easier to use the query because
     * we do not have to do an array check.
     */
    index?: string[];

    /**
     * Skip must be set which defaults to 0
     */
    skip: number;

    limit?: number;
};


/**
 * Before sending a query to the storageInstance.query()
 * we run it through the query planner and do some normalization
 * stuff. Notice that the queryPlan is a hint for the storage and
 * it is not required to use it when running queries. Some storages
 * might use their own query planning instead.
 */
export type PreparedQuery<RxDocType> = {
    // original query from the input
    query: FilledMangoQuery<RxDocType>;
    queryPlan: RxQueryPlan;
};

export interface RxStorageInstance<
    /**
     * The type of the documents that can be stored in this instance.
     * All documents in an instance must comply to the same schema.
     * Also all documents are RxDocumentData with the meta properties like
     * _deleted or _rev etc.
     */
    RxDocType,
    Internals,
    InstanceCreationOptions,
    CheckpointType = any
> {
    readonly databaseName: string;
    /**
     * Returns the internal data that is used by the storage engine.
     */
    readonly internals: Readonly<Internals>;
    readonly options: Readonly<InstanceCreationOptions>;
    /**
     * The schema that defines the documents that are stored in this instance.
     * Notice that the schema must be enhanced with the meta properties like
     * _meta, _rev and _deleted etc. which are added by fillWithDefaultSettings()
     */
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly collectionName: string;

    /**
     * (Optional) reference to the underlying persistent storage instance.
     * If set, things like replication will run on that storageInstance instead of the parent.
     * This is mostly used in things like the memory-synced storage where we want to
     * run replications and migrations on the persistent storage instead of the in-memory storage.
     *
     * Having this is the least hacky option. The only other option would be to toggle all calls to the
     * storageInstance by checking the givent context-string. But this would make it impossible
     * to run a replication on the parentStorage itself.
     */
    readonly underlyingPersistentStorage?: RxStorageInstance<RxDocType, any, any, any>;

    /**
     * Writes multiple documents to the storage instance.
     * The write for each single document is atomic, there
     * is no transaction around all documents.
     * The written documents must be the newest revision of that documents data.
     * If the previous document is not the current newest revision, a conflict error
     * must be returned.
     * It must be possible that some document writes succeed
     * and others error. We need this to have a similar behavior as most NoSQL databases.
     */
    bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        /**
         * Context will be used in all
         * changeStream()-events that are emitted as a result
         * of that bulkWrite() operation.
         * Used in plugins so that we can detect that event X
         * comes from operation Y.
         */
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>>;

    /**
     * Get Multiple documents by their primary value.
     * This must also return deleted documents.
     */
    findDocumentsById(
        /**
         * List of primary values
         * of the documents to find.
         */
        ids: string[],
        /**
         * If set to true, deleted documents will also be returned.
         */
        withDeleted: boolean

    ): Promise<
        /**
         * For better performance, we return an array
         * instead of an indexed object because most consumers
         * of this anyway have to fill a Map() instance or
         * even do only need the list at all.
         */
        RxDocumentData<RxDocType>[]
    >;

    /**
     * Runs a NoSQL 'mango' query over the storage
     * and returns the found documents data.
     * Having all storage instances behave similar
     * is likely the most difficult thing when creating a new
     * rx-storage implementation.
     */
    query(
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>>;

    /**
     * Returns the amount of non-deleted documents
     * that match the given query.
     * Sort, skip and limit of the query must be ignored!
     */
    count(
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageCountResult>;

    /**
     * Returns the plain data of a single attachment.
     */
    getAttachmentData(
        documentId: string,
        attachmentId: string,
        digest: string
    ): Promise<string>;

    /**
     * Returns the current (not the old!) data of all documents that have been changed AFTER the given checkpoint.
     * If the returned array does not reach the limit, it can be assumed that the "end" is reached, when paginating over the changes.
     * Also returns a new checkpoint for each document which can be used to continue with the pagination from that change on.
     * Must never return the same document multiple times in the same call operation.
     * This is used by RxDB to known what has changed since X so these docs can be handled by the backup or the replication
     * plugin.
     *
     * Important: This method is optional. If not defined,
     * RxDB will manually run a query and use the last returned document
     * for checkpointing. In  the future we might even remove this method completely
     * and let RxDB do the work instead of the RxStorage.
     */
    getChangedDocumentsSince?(
        limit: number,
        /**
         * The checkpoint from with to start
         * when the events are sorted in time.
         * If we want to start from the beginning,
         * undefined is used as a checkpoint.
         */
        checkpoint?: CheckpointType
    ): Promise<{
        documents: RxDocumentData<RxDocType>[];
        /**
         * The checkpoint contains data so that another
         * call to getChangedDocumentsSince() will continue
         * from exactly the last document that was returned before.
         */
        checkpoint: CheckpointType;
    }>;

    /**
     * Returns an ongoing stream
     * of all changes that happen to the
     * storage instance.
     * Do not forget to unsubscribe.
     *
     * If the RxStorage support multi-instance,
     * and the storage is persistent,
     * then the emitted changes of one RxStorageInstance
     * must be also emitted to other instances with the same databaseName+collectionName.
     * See ./rx-storage-multiinstance.ts
     */
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocType>, CheckpointType>>;

    /**
     * Runs a cleanup that removes all tompstones
     * of documents that have _deleted set to true
     * to free up disc space.
     *
     * Returns true if all cleanable documents have been removed.
     * Returns false if there are more documents to be cleaned up,
     * but not all have been purged because that would block the storage for too long.
     */
    cleanup(
        /**
         * The minimum time in milliseconds
         * of how long a document must have been deleted
         * until it is purged by the cleanup.
         */
        minimumDeletedTime: number
    ): Promise<
        /**
         * True if all docs cleaned up,
         * false if there are more docs to clean up
         */
        boolean
    >;

    /**
     * Closes the storage instance so it cannot be used
     * anymore and should clear all memory.
     * The returned promise must resolve when everything is cleaned up.
     */
    close(): Promise<void>;

    /**
     * Remove the database and
     * deletes all of its data.
     */
    remove(): Promise<void>;
}
