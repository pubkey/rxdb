import type { RxCollectionCreator, RxDatabaseCreator } from '../../types/index.d.ts';
/**
 * if the name of a collection
 * clashes with a property of RxDatabase,
 * we get problems so this function prohibits this
 */
export declare function ensureCollectionNameValid(args: RxCollectionCreator & {
    name: string;
}): void;
export declare function ensureDatabaseNameIsValid(args: RxDatabaseCreator<any, any>): void;
/**
 * Validates that a given string is ok to be used with couchdb-collection-names.
 * We only allow these strings as database- or collection names because it ensures
 * that you later do not get in trouble when you want to use the database together witch couchdb.
 *
 * @link https://docs.couchdb.org/en/stable/api/database/common.html
 * @link https://neighbourhood.ie/blog/2020/10/13/everything-you-need-to-know-about-couchdb-database-names/
 * @throws  {RxError}
 */
export declare function validateDatabaseName(name: string): true;
