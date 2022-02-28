import type {
    DeterministicSortComparator,
    QueryMatcher
} from 'event-reduce-js';
import type {
    BulkWriteRow,
    ChangeStreamOnceOptions,
    EventBulk,
    PreparedQuery,
    RxDocumentData,
    RxDocumentWriteData,
    RxStorageBulkWriteResponse,
    RxStorageChangedDocumentMeta,
    RxStorageChangeEvent,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult
} from './rx-storage';
import type {
    MangoQuery,
    MangoQuerySortPart,
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
    createStorageInstance<DocumentData>(
        params: RxStorageInstanceCreationParams<DocumentData, InstanceCreationOptions>
    ): Promise<RxStorageInstance<DocumentData, Internals, InstanceCreationOptions>>;
}


export type FilledMangoQuery<DocumentData> = MangoQuery<DocumentData> & {
    /**
     * In contrast to the user-provided MangoQuery,
     * the sorting is required here because
     * RxDB has to ensure that the primary key is always
     * part of the sort params.
     */
    sort: MangoQuerySortPart<DocumentData>[];
}

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
     * A function that returns true
     * if the RxStorage does broadcast events between
     * multiple instances, like multiple browser tabs
     * or node.js processes.
     * If this returns false, RxDB will use its own BroadcastChannel
     * to ensure all other instances know about changes.
     * If it returns true, RxDB will not broadcast the events
     * to save performance.
     */
    doesBroadcastChangestream(): boolean;

    /**
     * PouchDB and others have some bugs
     * and behaviors that must be worked arround
     * before querying the db.
     * For performance reason this preparation
     * runs in a single step so it can be cached
     * when the query is used multiple times.
     * 
     * If your custom storage engine is capable of running
     * all valid mango queries properly, just return the
     * mutateableQuery here.
     * 
     *
     * @returns a format of the query that can be used with the storage
     */
    prepareQuery<DocumentData>(
        schema: RxJsonSchema<DocumentData>,
        /**
         * a query that can be mutated by the function without side effects.
         */
        mutateableQuery: FilledMangoQuery<DocumentData>
    ): PreparedQuery<DocumentData>;

    /**
     * Returns the sort-comparator,
     * which is able to sort documents in the same way
     * a query over the db would do.
     */
    getSortComparator<DocumentData>(
        schema: RxJsonSchema<DocumentData>,
        query: MangoQuery<DocumentData>
    ): DeterministicSortComparator<DocumentData>;

    /**
     * Returns a function
     * that can be used to check if a document
     * matches the query.
     *  
     */
    getQueryMatcher<DocumentData>(
        schema: RxJsonSchema<DocumentData>,
        query: MangoQuery<DocumentData>
    ): QueryMatcher<RxDocumentWriteData<DocumentData>>;
}>;


export interface RxStorageInstanceBase<Internals, InstanceCreationOptions> {
    readonly databaseName: string;
    /**
     * Returns the internal data that is used by the storage engine.
     * For example the pouchdb instance.
     */
    readonly internals: Readonly<Internals>;
    readonly options: Readonly<InstanceCreationOptions>;

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

export interface RxStorageInstance<
    /**
     * The type of the documents that can be stored in this instance.
     * All documents in an instance must comply to the same schema.
     */
    DocumentData,
    Internals,
    InstanceCreationOptions
    >
    extends RxStorageInstanceBase<Internals, InstanceCreationOptions> {

    readonly schema: Readonly<RxJsonSchema<DocumentData>>;
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
        documentWrites: BulkWriteRow<DocumentData>[]
    ): Promise<
        /**
         * returns the response, splitted into success and error lists.
         */
        RxStorageBulkWriteResponse<DocumentData>
    >;

    /**
     * Adds revisions of documents to the storage instance.
     * The revisions do not have to be the newest ones but can also be past
     * states of the documents.
     * Adding revisions can never cause conflicts.
     * 
     * Notice: When a revisions of a document is added and the storage instance
     * decides that this is now the newest revision, the changeStream() must emit an event
     * based on what the previous newest revision of the document was.
     */
    bulkAddRevisions(
        documents: RxDocumentData<DocumentData>[]
    ): Promise<void>;

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
    ): Promise<{
        [documentId: string]: RxDocumentData<DocumentData>
    }>;

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
        preparedQuery: PreparedQuery<DocumentData>
    ): Promise<RxStorageQueryResult<DocumentData>>;


    /**
     * Returns the plain data of a single attachment.
     */
    getAttachmentData(
        documentId: string,
        attachmentId: string
    ): Promise<string>;

    /**
     * Returns the ids of all documents that have been
     * changed since the given sinceSequence.
     */
    getChangedDocuments(
        options: ChangeStreamOnceOptions
    ): Promise<{
        changedDocuments: RxStorageChangedDocumentMeta[],
        /**
         * The last sequence number is returned in a separate field
         * because the storage instance might have left out some events
         * that it does not want to send out to the user.
         * But still we need to know that they are there for a gapless pagination.
         */
        lastSequence: number;
    }>;

    /**
     * Returns an ongoing stream
     * of all changes that happen to the
     * storage instance.
     * Do not forget to unsubscribe.
     */
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<DocumentData>>>>;
}
