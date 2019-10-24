/// <reference types="pouchdb-core" />
import { PouchDBInstance } from './types';
/**
 * get the number of all undeleted documents
 */
export declare function countAllUndeleted(pouchdb: PouchDBInstance): Promise<number>;
/**
 * get a batch of documents from the pouch-instance
 */
export declare function getBatch(pouchdb: PouchDBInstance, limit: number): Promise<any[]>;
/**
 * check if the given module is a leveldown-adapter
 * throws if not
 */
export declare function isLevelDown(adapter: any): void;
/**
 * validates that a given string is ok to be used with couchdb-collection-names
 * @link https://wiki.apache.org/couchdb/HTTP_database_API
 * @throws  {Error}
 */
export declare function validateCouchDBString(name: string): true;
/**
 * get the correct function-name for pouchdb-replication
 */
export declare function pouchReplicationFunction(pouch: PouchDBInstance, { pull, push }: {
    pull?: boolean | undefined;
    push?: boolean | undefined;
}): any;
export declare function isInstanceOf(obj: any): boolean;
export declare const PouchDB: PouchDB.Static;
