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
export declare function isInstanceOf(obj: any): boolean;
export declare const PouchDB: PouchDB.Static;
