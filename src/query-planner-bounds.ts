/**
 * The bound markers of a query plan are in their own file
 * so that the custom index helpers and the query planner
 * can both use them without a circular import.
 */
export const INDEX_MAX = String.fromCharCode(65535);

/**
 * Do not use -Infinity here because it would be
 * transformed to null on JSON.stringify() which can break things
 * when the query plan is sent to the storage as json.
 * @link https://stackoverflow.com/a/16644751
 * Notice that for IndexedDB IDBKeyRange we have
 * to transform the value back to -Infinity
 * before we can use it in IDBKeyRange.bound.
 */
export const INDEX_MIN = Number.MIN_SAFE_INTEGER;
