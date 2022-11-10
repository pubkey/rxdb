import { WithDeleted } from '../../types';
import { pouchSwapIdToPrimary } from '../pouchdb';
import { URLQueryParams } from './couchdb-types';


export const COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-couchdb-';


export function mergeUrlQueryParams(
    params: URLQueryParams
): string {
    return Object.entries(params)
        .filter(([_k, value]) => typeof value !== 'undefined')
        .map(([key, value]) => key + '=' + value)
        .join('&');
}

export function couchDBDocToRxDocData<RxDocType>(
    primaryPath: string,
    couchDocData: any
): WithDeleted<RxDocType> {
    const doc = pouchSwapIdToPrimary(primaryPath, couchDocData);

    // ensure deleted flag is set.
    doc._deleted = !!doc._deleted;

    return doc;
}
