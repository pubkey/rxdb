import type { MangoQuery, RxQuery } from './types/rx-query';
import { SortComparator, QueryMatcher } from 'event-reduce-js';
export declare type PreparedQuery<DocType> = MangoQuery<DocType> | any;
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
export interface RxStorage<RxStorageInstance = any> {
    name: string;
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
    prepareQuery<RxDocType>(rxQuery: RxQuery<RxDocType, any>, mutateableQuery: MangoQuery<RxDocType>): PreparedQuery<RxDocType>;
    /**
     * returns the sort-comparator,
     * which results in the equal sorting that a query over the db would do
     */
    getSortComparator<RxDocType>(primaryKey: string, query: MangoQuery<RxDocType>): SortComparator<RxDocType>;
    /**
     * returns a function
     * that can be used to check if a document
     * matches the query
     */
    getQueryMatcher<RxDocType>(primaryKey: string, query: MangoQuery<RxDocType>): QueryMatcher<RxDocType>;
    /**
     * creates a storage instance
     * that can contains the internal database
     * For example the PouchDB instance
     */
    createStorageInstance(databaseName: string, collectionName: string, version: number, options?: any): RxStorageInstance;
    /**
     * creates the internal storage instance
     * which is used by the RxDatabase to store metadata
     * Created exactly once per RxDatabase
     */
    createInternalStorageInstance(databaseName: string, options?: any): Promise<RxStorageInstance>;
}
