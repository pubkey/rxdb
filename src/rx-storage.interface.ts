import {
    SortComparator,
    QueryMatcher
} from 'event-reduce-js';
import {
    RxLocalDocumentData,
    RxStorageBulkWriteResponse,
    RxStorageQueryResult,
    WithRevision,
    WithWriteRevision
} from './types/rx-storage';
import type {
    MangoQuery,
    RxQuery,
    RxJsonSchema
} from './types';


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
     * creates a storage instance
     * that can contain the internal database
     * For example the PouchDB instance
     */
    createStorageInstance<DocumentData>(
        databaseName: string,
        collectionName: string,
        schema: RxJsonSchema,
        options: InstanceCreationOptions
    ): Promise<RxStorageInstance<DocumentData, Internals, InstanceCreationOptions>>;

    /**
     * Creates the internal storage instance
     * that is only cappable of saving schemaless key-object relations.
     */
    createKeyObjectStorageInstance(
        databaseName: string,
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
        documents: WithWriteRevision<RxLocalDocumentData>[]
    ): Promise<
        /**
         * returns the response, splitted into success and error lists.
         */
        RxStorageBulkWriteResponse<RxLocalDocumentData>
    >;

    /**
     * Get Multiple local documents by their primary value.
     */
    findLocalDocumentsById(
        /**
         * List of primary values
         * of the documents to find.
         */
        ids: string[]
    ): Promise<Map<string, WithRevision<RxLocalDocumentData>>>;
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
         * The RxQuery Object that you can use
         * to obtain additional information about the query.
         *
         * TODO everything should work without dedicated RxDB classes.
         * So do not add the rxQuery here, we already have the json-schema in the instance.
         */
        rxQuery: RxQuery<DocumentData, any>,
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
        documents: WithWriteRevision<DocumentData>[]
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
    ): Promise<Map<string, WithRevision<DocumentData>>>;

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
}
