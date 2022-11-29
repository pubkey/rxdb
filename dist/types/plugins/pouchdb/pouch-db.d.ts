/**
 * check if the given module is a leveldown-adapter
 * throws if not
 */
export declare function isLevelDown(adapter: any): void;
export declare function isInstanceOf(obj: any): boolean;
/**
 * Add a pouchdb plugin to the pouchdb library.
 * @deprecated PouchDB RxStorage is deprecated, see
 * @link https://rxdb.info/questions-answers.html#why-is-the-pouchdb-rxstorage-deprecated
 */
export declare function addPouchPlugin(plugin: any): void;
export declare const PouchDB: any;
