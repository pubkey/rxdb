import type { PouchDBInstance } from '../../types';
/**
 * check if the given module is a leveldown-adapter
 * throws if not
 */
export declare function isLevelDown(adapter: any): void;
/**
 * get the correct function-name for pouchdb-replication
 */
export declare function pouchReplicationFunction(pouch: PouchDBInstance, { pull, push }: {
    pull?: boolean | undefined;
    push?: boolean | undefined;
}): any;
export declare function isInstanceOf(obj: any): boolean;
/**
 * Add a pouchdb plugin to the pouchdb library.
 */
export declare function addPouchPlugin(plugin: any): void;
export declare const PouchDB: any;
