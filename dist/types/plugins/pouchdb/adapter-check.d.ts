/**
 * The same pouchdb-location is used on each run
 * To ensure when this is run multiple times,
 * there will not be many created databases
 */
export declare const POUCHDB_LOCATION = "rxdb-adapter-check";
export declare function checkAdapter(adapter: any): Promise<any>;
