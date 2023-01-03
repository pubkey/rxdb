import type { RxDocumentData, StringKeys, WithDeleted } from '../../types';
import { flatClone } from '../../plugins/utils';
import { URLQueryParams } from './couchdb-types';


export const COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'couchdb';


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
    const doc = couchSwapIdToPrimary(primaryPath, couchDocData);

    // ensure deleted flag is set.
    doc._deleted = !!doc._deleted;

    return doc;
}


export function couchSwapIdToPrimary<T>(
    primaryKey: StringKeys<RxDocumentData<T>>,
    docData: any
): any {
    if (primaryKey === '_id' || docData[primaryKey]) {
        return docData;
    }
    docData = flatClone(docData);
    docData[primaryKey] = docData._id;
    delete docData._id;

    return docData;
}

/**
 * Swaps the primaryKey of the document
 * to the _id property.
 */
export function couchSwapPrimaryToId<RxDocType>(
    primaryKey: StringKeys<RxDocumentData<RxDocType>>,
    docData: any
): RxDocType & { _id: string; } {
    // optimisation shortcut
    if (primaryKey === '_id') {
        return docData;
    }

    const idValue = docData[primaryKey];
    const ret = flatClone(docData);
    delete ret[primaryKey];
    ret._id = idValue;
    return ret;
}


export function getDefaultFetch() {
    if (
        typeof window === 'object' &&
        (window as any)['fetch']
    ) {
        /**
         * @link https://stackoverflow.com/a/47180009/3443137
         */
        return window.fetch.bind(window);
    } else {
        return fetch;
    }
}
