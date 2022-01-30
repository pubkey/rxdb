/**
 * Copied from
 * @link https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-adapter-indexeddb/src/find.js
 */
/**
 * Generates a keyrange based on the opts passed to query
 *
 * The first key is always 0, as that's how we're filtering out deleted entries.
 */
export declare function generateKeyRange(opts: any, IDBKeyRange: any, low?: any, height?: any): any;
