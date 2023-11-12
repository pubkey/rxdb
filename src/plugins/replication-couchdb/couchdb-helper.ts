import type {
    RxDocumentData,
    StringKeys,
    WithDeleted
} from '../../types/index.d.ts';
import { b64EncodeUnicode, flatClone } from '../../plugins/utils/index.ts';
import { URLQueryParams } from './couchdb-types.ts';


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
    const doc = couchSwapIdToPrimary(primaryPath as any, couchDocData);

    // ensure deleted flag is set.
    doc._deleted = !!doc._deleted;

    delete doc._rev;

    return doc;
}


export function couchSwapIdToPrimary<T>(
    primaryKey: StringKeys<RxDocumentData<T>>,
    docData: any
): any {
    if (primaryKey === '_id' || docData[primaryKey]) {
        return flatClone(docData);
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

/**
 * Returns a fetch handler that contains the username and password
 * in the Authorization header
 */
export function getFetchWithCouchDBAuthorization(username: string, password: string): typeof fetch {
    const ret: typeof fetch = (url, options) => {
        options = Object.assign({}, options);
        if (!options.headers) {
            options.headers = {};
        }
        (options as any).headers['Authorization'] = 'Basic ' + b64EncodeUnicode(username + ':' + password);
        return fetch(url as any, options);
    };
    return ret;
}
