import type {
    SortComparator,
    QueryMatcher
} from 'event-reduce-js';
import type {
    ChangeStreamEvent,
    ChangeStreamOnceOptions,
    ChangeStreamOptions,
    RxDocumentData,
    RxDocumentWriteData,
    RxLocalDocumentData,
    RxLocalStorageBulkWriteResponse,
    RxStorageBulkWriteResponse,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult
} from './types/rx-storage';
import type {
    BlobBuffer,
    MangoQuery,
    RxJsonSchema
} from './types';
import type {
    Observable
} from 'rxjs';


export type PreparedQuery<DocType> = MangoQuery<DocType> | any;

/**
 * TODO WORK IN PROGRESS!
 * This is an interface that abstracts the storage engine.
 * At the moment we only have PouchDB as storage but
 * in the future we want to create many more of them.
 *
 * Also see
 * @link https://github.com/pubkey/rxdb/issues/1636
 *
 *
 */


/**
 * A RxStorage is a module that acts
 * as a factory that can create multiple RxStorageInstance
 * objects.
 */
export interface RxStorage<Internals, InstanceCreationOptions> {
    /**
     * name of the storage engine
     * used to detect if plugins do not work so we can throw propper errors.
     */
    readonly name: string;

    /**
     * Returns a hash of the given value.
     * Used to check equalness of attachments data and other stuff.
     * Pouchdb uses md5 but we can use whatever we want as long as each
     * storage class returns the same hash each time.
     */
    hash(data: Buffer | Blob | string): Promise<string>;

    /**
     * creates a storage instance
     * that can contain the internal database
     * For example the PouchDB instance
     */
    createStorageInstance<DocumentData>(
        params: RxStorageInstanceCreationParams<DocumentData, InstanceCreationOptions>
    ): Promise<RxStorageInstance<DocumentData, Internals, InstanceCreationOptions>>;

    /**
     * Creates the internal storage instance
     * that is only cappable of saving schemaless key-object relations.
     */
    createKeyObjectStorageInstance(
        databaseName: string,
        collectionName: string,
        options: InstanceCreationOptions
    ): Promise<RxStorageKeyObjectInstance<Internals, InstanceCreationOptions>>;
}


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

/**
 * A StorateInstance that is only capable of saving key-object relations,
 * cannot be queried and has no schema.
 * In the past we saved normal and local documents into the same instance of pouchdb.
 * This was bad because it means that on migration or deletion, we always
 * will remove the local documents. Now this is splitted into
 * as separate RxStorageKeyObjectInstance that only stores the local documents
 * aka key->object sets.
 */
export interface RxStorageKeyObjectInstance<Internals, InstanceCreationOptions>
    extends RxStorageInstanceBase<Internals, InstanceCreationOptions> {

    /**
     * Writes multiple local documents to the storage instance.
     * The write for each single document is atomic, there
     * is not transaction arround all documents.
     * It must be possible that some document writes succeed
     * and others error.
     * We need this to have a similar behavior as most NoSQL databases.
     * Local documents always have _id as primary
     * Local documetns are saved besides the 'normal' documents,
     * but are not returned in any non-local queries.
     * They can only be queried directly by their primary _id.
     */
    bulkWrite<D = any>(
        /**
         * If overwrite is set to true,
         * the storage instance must ignore
         * if the document has already a newer revision,
         * instead save the written data either to the revisions
         * or as newest revision.
         * If overwrite is set to false,
         * the storage instance must throw a 409 conflict
         * error if there is a newer/equal revision of the document
         * already stored.
         *
         * If it is a RxStorageKeyObjectInstance, the call must
         * throw on non-local documents.
         */
        overwrite: boolean,
        documents: RxLocalDocumentData<D>[]
    ): Promise<
        /**
         * returns the response, splitted into success and error lists.
         */
        RxLocalStorageBulkWriteResponse<RxLocalDocumentData<D>>
    >;

    /**
     * Get Multiple local documents by their primary value.
     */
    findLocalDocumentsById<D = any>(
        /**
         * List of primary values
         * of the documents to find.
         */
        ids: string[]
    ): Promise<Map<string, RxLocalDocumentData<D>>>;
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

    readonly schema: Readonly<RxJsonSchema>;
    readonly collectionName: string;

    /**
     * pouchdb and others have some bugs
     * and behaviors that must be worked arround
     * before querying the collection.
     * For performance reason this preparation
     * runs in a single step so it can be cached
     * when the query is used multiple times
     *
     * @returns a format of the query than can be used with the storage
     */
    prepareQuery(
        /**
         * a query that can be mutated by the function without side effects.
         */
        mutateableQuery: MangoQuery<DocumentData>
    ): PreparedQuery<DocumentData>;

    /**
     * returns the sort-comparator,
     * which results in the equal sorting that a query over the db would do
     */
    getSortComparator(
        query: MangoQuery<DocumentData>
    ): SortComparator<DocumentData>;

    /**
     * returns a function
     * that can be used to check if a document
     * matches the query
     */
    getQueryMatcher(
        query: MangoQuery<DocumentData>
    ): QueryMatcher<DocumentData>;

    /**
     * Writes multiple non-local documents to the storage instance.
     * The write for each single document is atomic, there
     * is not transaction arround all documents.
     * It must be possible that some document writes succeed
     * and others error.
     * We need this to have a similar behavior as most NoSQL databases.
     */
    bulkWrite(
        /**
         * If overwrite is set to true,
         * the storage instance must ignore
         * if the document has already a newer revision,
         * instead save the written data either to the revisions
         * or as newest revision.
         * If overwrite is set to false,
         * the storage instance must throw a 409 conflict
         * error if there is a newer/equal revision of the document
         * already stored.
         *
         * If it is a RxStorageKeyObjectInstance, the call must
         * throw on non-local documents.
         */
        overwrite: boolean,
        documents: RxDocumentWriteData<DocumentData>[]
    ): Promise<
        /**
         * returns the response, splitted into success and error lists.
         */
        RxStorageBulkWriteResponse<DocumentData>
    >;

    /**
     * Get Multiple documents by their primary value.
     */
    findDocumentsById(
        /**
         * List of primary values
         * of the documents to find.
         */
        ids: string[]
    ): Promise<Map<string, RxDocumentData<DocumentData>>>;

    /**
     * Runs a NoSQL 'mango' query over the storage
     * and returns the found documents data.
     * Having all storage instances behave similar
     * is likely the most difficult thing when creating a new
     * rx-storage implementation. Atm we use the pouchdb-find plugin
     * as reference to how NoSQL-queries must work.
     * But the past has shown that pouchdb find can behave wrong,
     * which must be fixed or at least documented.
     *
     * TODO should we have a way for streamed results
     * or a way to cancel a running query?
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
    ): Promise<BlobBuffer>;

    /**
     * Returns the changes once,
     * depending on the given options.
     *
     * IMPORTANT: When multiple changes have happened
     * to the same document, only return the newest change
     * of each document. We do this because atm it is not possible
     * to get all changes out of pouchdb.
     * @link https://stackoverflow.com/questions/33474864/is-there-a-way-to-get-all-revisions-of-a-document-in-pouchdb-when-using-the-chan
     * TODO this must be fixed to return all changes event of the same document.
     */
    getChanges(
        options: ChangeStreamOnceOptions
    ): Promise<ChangeStreamEvent<DocumentData>[]>;

    /**
     * Returns an ongoing stream
     * of all changes that happen to the
     * storage instance.
     * Do not forget to unsubscribe.
     */
    changeStream(
        options: ChangeStreamOptions
    ): Observable<ChangeStreamEvent<DocumentData>>;
}
