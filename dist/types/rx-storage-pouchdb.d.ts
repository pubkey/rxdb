import { RxStorage, PreparedQuery } from './rx-storate.interface';
import type { MangoQuery, PouchDBInstance, PouchSettings, RxQuery } from './types';
import { SortComparator, QueryMatcher } from 'event-reduce-js';
export declare class RxStoragePouchDbClass implements RxStorage<PouchDBInstance> {
    adapter: any;
    pouchSettings: PouchSettings;
    name: string;
    constructor(adapter: any, pouchSettings?: PouchSettings);
    getSortComparator<RxDocType>(primaryKey: string, query: MangoQuery<RxDocType>): SortComparator<RxDocType>;
    /**
     * @link https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-selector-core/src/matches-selector.js
     */
    getQueryMatcher<RxDocType>(primaryKey: string, query: MangoQuery<RxDocType>): QueryMatcher<RxDocType>;
    createStorageInstance(databaseName: string, collectionName: string, schemaVersion: number, options?: any): PouchDBInstance;
    createInternalStorageInstance(databaseName: string, _options?: any): Promise<PouchDBInstance>;
    /**
     * pouchdb has many bugs and strange behaviors
     * this functions takes a normal mango query
     * and transforms it to one that fits for pouchdb
     */
    prepareQuery<RxDocType>(rxQuery: RxQuery<RxDocType>, mutateableQuery: MangoQuery<RxDocType>): PreparedQuery<RxDocType>;
}
/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */
export declare function primarySwapPouchDbQuerySelector(selector: any, primaryKey: string): any;
/**
 * returns the pouchdb-database-name
 */
export declare function getPouchLocation(dbName: string, collectionName: string, schemaVersion: number): string;
export declare function getRxStoragePouchDb(adapter: any, pouchSettings?: PouchSettings): RxStorage<PouchDBInstance>;
