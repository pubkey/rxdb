import {
    SortComparator,
    QueryMatcher
} from 'event-reduce-js';
import {
    RxStorageBulkWriteDocument,
    RxStorageBulkWriteDocumentLocal,
    RxStorageBulkWriteResponse
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
    createStorageInstance(
        databaseName: string,
        collectionName: string,
        schema: RxJsonSchema,
        options: InstanceCreationOptions
    ): Promise<RxStorageInstance<Internals, InstanceCreationOptions>>;

    /**
     * Creates the internal storage instance
     * that is only cappable of saving schemaless key-object relations.
     */
    createKeyObjectStorageInstance(
        databaseName: string,
        options: InstanceCreationOptions
    ): Promise<RxStorageKeyObjectInstance<Internals, InstanceCreationOptions>>;
}


/**
 * A StorateInstance that is only capable of saving key-object relations,
 * cannot be queried and has no schema.
 */
export interface RxStorageKeyObjectInstance<Internals, InstanceCreationOptions> {
    readonly isKeyObjectInstance: boolean;

    readonly databaseName: string;
    /**
     * Returns the internal data that is used by the storage engine.
     * For example the pouchdb instance.
     */
    readonly internals: Readonly<Internals>;
    readonly options: Readonly<InstanceCreationOptions>;

    /**
     * Writes multiple documents to the storage instance.
     * The write for each single document is atomic, there
     * is not transaction arround all documents.
     * It must be possible that some document writes succeed
     * and others error.
     * We need this to have a similar behavior as most NoSQL databases.
     */
    bulkWrite<RxDocType>(
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
        documents: RxStorageBulkWriteDocument<RxDocType>[]
    ): Promise<
        /**
         * returns the response, splitted into success and error lists.
         */
        RxStorageBulkWriteResponse<RxDocType>
    >;

}

export interface RxStorageInstance<
    Internals,
    InstanceCreationOptions
    > extends RxStorageKeyObjectInstance<Internals, InstanceCreationOptions> {
    readonly isKeyObjectInstance: false;
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
    prepareQuery<RxDocType>(
        /**
         * The RxQuery Object that you can use
         * to obtain additional information about the query.
         */
        rxQuery: RxQuery<RxDocType, any>,
        /**
         * a query that can be mutated by the function without side effects.
         */
        mutateableQuery: MangoQuery<RxDocType>
    ): PreparedQuery<RxDocType>;

    /**
     * returns the sort-comparator,
     * which results in the equal sorting that a query over the db would do
     */
    getSortComparator<RxDocType>(
        query: MangoQuery<RxDocType>
    ): SortComparator<RxDocType>;

    /**
     * returns a function
     * that can be used to check if a document
     * matches the query
     */
    getQueryMatcher<RxDocType>(
        query: MangoQuery<RxDocType>
    ): QueryMatcher<RxDocType>;
}
