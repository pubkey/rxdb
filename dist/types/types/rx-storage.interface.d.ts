import type {
    DeterministicSortComparator,
    QueryMatcher
} from 'event-reduce-js';
import type {
    BulkWriteRow,
    EventBulk,
    PreparedQuery,
    RxDocumentData,
    RxDocumentDataById,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult
} from './rx-storage';
import type {
    MangoQuery,
    MangoQuerySelector,
    MangoQuerySortPart,
    Override,
    RxJsonSchema
} from './';
import type {
    Observable
} from 'rxjs';

/**
 * RxStorage
 * This is an interface that abstracts the storage engine.
 * This allows us to use RxDB with different engines like PouchDB or LokiJS.
 *
 * Also see
 * @link https://github.com/pubkey/rxdb/issues/1636
 *
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
     * used to detect if plugins do not work so we can throw propper errors.
     */
    readonly name: string;

    /**
     * Static functions
     */
    readonly statics: RxStorageStatics;

    /**
     * creates a storage instance
     * that can contain the internal database
     * For example the PouchDB instance
     */
    createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, InstanceCreationOptions>
    ): Promise<RxStorageInstance<RxDocType, Internals, InstanceCreationOptions>>;
}


/**
 * User provided mango queries will be filled up by RxDB via normalizeMangoQuery()
 * so we do not have to do many if-field-exist tests in the internals.
 */
export type FilledMangoQuery<RxDocType> = Override<
    MangoQuery<RxDocType>,
    {

        /**
         * The selector is required here.
         */
        selector: MangoQuerySelector<RxDocType>;

        /**
         * In contrast to the user-provided MangoQuery,
         * the sorting is required here because
         * RxDB has to ensure that the primary key is always
         * part of the sort params.
         */
        sort: MangoQuerySortPart<RxDocType>[];

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
    }
>;

/**
 * Static functions of the RxStorage.
 * Can be used without creating an instance of any kind.
 * These functions are not directy childs of RxStorage because
 * we might need them without having to import the whole storage engine.
 * For example when the Worker plugin is used, the main process only needs the
 * static functions, while the worker process needs the whole storage engine.
 */
export type RxStorageStatics = Readonly<{
    /**
     * Returns a hash of the given value.
     * Used to check equalness of attachments data and other stuff.
     * Pouchdb uses md5 but we can use whatever we want as long as each
     * storage class returns the same hash each time.
     */
    hash(data: Buffer | Blob | string): Promise<string>;

    /**
     * Key of the used hash algorithm.
     * Like 'md5' or 'sha1'.
     */
    hashKey: string;

    /**
     * PouchDB and others have some bugs
     * and behaviors that must be worked arround
     * before querying the db.
     * 
     * Also some storages do optimizations
     * and other things related to query planning.
     * 
     * For performance reason this preparation
     * runs in a single step so it can be cached
     * when the query is used multiple times.
     *
     * @returns a format of the query that can be used with the storage
     * when calling .query()
     */
    prepareQuery<RxDocType>(
        schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        /**
         * a query that can be mutated by the function without side effects.
         */
        mutateableQuery: FilledMangoQuery<RxDocType>
    ): PreparedQuery<RxDocType>;

    /**
     * Returns the sort-comparator,
     * which is able to sort documents in the same way
     * a query over the db would do.
     */
    getSortComparator<RxDocType>(
        schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        preparedQuery: PreparedQuery<RxDocType>
    ): DeterministicSortComparator<RxDocType>;

    /**
     * Returns a function
     * that can be used to check if a document
     * matches the query.
     *  
     */
    getQueryMatcher<RxDocType>(
        schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        preparedQuery: PreparedQuery<RxDocType>
    ): QueryMatcher<RxDocumentData<RxDocType>>;
}>;



export interface RxStorageInstance<
    /**
     * The type of the documents that can be stored in this instance.
     * All documents in an instance must comply to the same schema.
     * Also all documents are RxDocumentData with the meta properties like
     * _deleted or _rev etc.
     */
    RxDocType,
    Internals,
    InstanceCreationOptions
    > {

    /**
     * The RxStorage which was used to create the given instance.
     * We need this here to make it easy to get access static methods and stuff
     * when working with the RxStorageInstance.
     */
    readonly storage: RxStorage<Internals, InstanceCreationOptions>;

    readonly databaseName: string;
    /**
     * Returns the internal data that is used by the storage engine.
     * For example the pouchdb instance.
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
     * Writes multiple documents to the storage instance.
     * The write for each single document is atomic, there
     * is no transaction arround all documents.
     * The written documents must be the newest revision of that documents data.
     * If the previous document is not the current newest revision, a conflict error
     * must be returned.
     * It must be possible that some document writes succeed
     * and others error. We need this to have a similar behavior as most NoSQL databases.
     */
    bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[]
    ): Promise<
        /**
         * returns the response, splitted into success and error lists.
         */
        RxStorageBulkWriteResponse<RxDocType>
    >;

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
    ): Promise<RxDocumentDataById<RxDocType>>;

    /**
     * Runs a NoSQL 'mango' query over the storage
     * and returns the found documents data.
     * Having all storage instances behave similar
     * is likely the most difficult thing when creating a new
     * rx-storage implementation. Atm we use the pouchdb-find plugin
     * as reference to how NoSQL-queries must work.
     * But the past has shown that pouchdb find can behave wrong,
     * which must be fixed or at least documented.
     */
    query(
        /**
         * Here we get the result of this.prepareQuery()
         * instead of the plain mango query.
         * This makes it easier to have good performance
         * when transformations of the query must be done.
         */
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>>;


    /**
     * Returns the plain data of a single attachment.
     */
    getAttachmentData(
        documentId: string,
        attachmentId: string
    ): Promise<string>;


    /**
     * Returns the current (not the old!) data of all documents that have been changed AFTER the given checkpoint.
     * If the returned array does not reach the limit, it can be assumed that the "end" is reached, when paginating over the changes.
     * Also returns a new checkpoint for each document which can be used to continue with the pagination from that change on.
     * Must never return the same document multiple times in the same call operation.
     * This is used by RxDB to known what has changed since X so these docs can be handled by the backup or the replication
     * plugin.
     */
    getChangedDocumentsSince(
        limit: number,
        checkpoint?: any
    ): Promise<{
        document: RxDocumentData<RxDocType>;
        /**
         * For each document, an own checkpoint is returned.
         * This is usefull when RxDB does only need a part of the returned changes
         * but still wants to be able to continue the pagination
         * from the correct document on.
         */
        checkpoint: any;
    }[]>;

    /**
     * Returns an ongoing stream
     * of all changes that happen to the
     * storage instance.
     * Do not forget to unsubscribe.
     * 
     * If the RxStorage support multi-instance,
     * and the storage is persistend,
     * then the emitted changes of one RxStorageInstance
     * must be also emitted to other instances with the same databaseName+collectionName.
     * See ./rx-storage-multiinstance.ts
     */
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>>;

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
