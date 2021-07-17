/**
 * Validates that a given string is ok to be used with couchdb-collection-names.
 * We only allow these strings as database- or collectionnames because it ensures
 * that you later do not get in troubble when you want to use the database together witch couchdb.
 *
 * @link https://wiki.apache.org/couchdb/HTTP_database_API
 * @throws  {Error}
 */
export declare function validateDatabaseName(name: string): true;
