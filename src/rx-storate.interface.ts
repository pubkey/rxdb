import { MangoQuery } from './types/rx-query';
import {
    SortComparator,
    QueryMatcher
} from 'event-reduce-js';

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
     * returns the sort-comparator,
     * which results in the equal sorting that a query over the db would do
     */
    getSortComparator<RxDocType>(
        primaryKey: string,
        query: MangoQuery<RxDocType>
    ): SortComparator<RxDocType>;

    /**
     * returns a function
     * that can be used to check if a document
     * matches the query
     */
    getQueryMatcher<RxDocType>(
        primaryKey: string,
        query: MangoQuery<RxDocType>
    ): QueryMatcher<RxDocType>;

    /**
     * creates a storage instance
     * that can contains the internal database
     * For example the PouchDB instance
     */
    createStorageInstance(
        databaseName: string,
        collectionName: string,
        version: number,
        options?: any
    ): RxStorageInstance;

}
