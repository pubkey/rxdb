import type { RxDocumentData, StringKeys, WithDeleted } from '../../types/index.d.ts';
import { URLQueryParams } from './couchdb-types.ts';
export declare const COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = "couchdb";
export declare function mergeUrlQueryParams(params: URLQueryParams): string;
export declare function couchDBDocToRxDocData<RxDocType>(primaryPath: string, couchDocData: any): WithDeleted<RxDocType>;
export declare function couchSwapIdToPrimary<T>(primaryKey: StringKeys<RxDocumentData<T>>, docData: any): any;
/**
 * Swaps the primaryKey of the document
 * to the _id property.
 */
export declare function couchSwapPrimaryToId<RxDocType>(primaryKey: StringKeys<RxDocumentData<RxDocType>>, docData: any): RxDocType & {
    _id: string;
};
export declare function getDefaultFetch(): typeof fetch;
/**
 * Returns a fetch handler that contains the username and password
 * in the Authorization header
 */
export declare function getFetchWithCouchDBAuthorization(username: string, password: string): typeof fetch;
