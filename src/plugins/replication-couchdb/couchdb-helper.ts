import type {
    RxCollection,
    RxDocumentData,
    StringKeys,
    WithDeleted
} from '../../types/index.d.ts';
import { b64EncodeUnicode, flatClone } from '../../plugins/utils/index.ts';
import { URLQueryParams } from './couchdb-types.ts';
import { newRxError } from '../../rx-error.ts';
import { writeDocToDocState } from '../../replication-protocol/helper.ts';


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

/**
 * Transforms the documents of a CouchDB _changes response
 * into the document states for the pull replication.
 *
 * A document that was deleted with a DELETE request is stored
 * in CouchDB as a tombstone that only contains _id, _rev and _deleted.
 * Such a state does not match the schema of the collection,
 * so the missing fields are taken from the local state of the document.
 * A tombstone of a document that is not known locally is left out
 * because there is nothing to delete.
 * @link https://docs.couchdb.org/en/stable/api/document/common.html#delete--db-docid
 */
export async function couchDBChangesDocsToRxDocData<RxDocType>(
    collection: RxCollection<RxDocType, any, any, any>,
    couchDocs: any[]
): Promise<WithDeleted<RxDocType>[]> {
    const primaryPath = collection.schema.primaryPath;
    const docs = couchDocs.map(couchDoc => couchDBDocToRxDocData<RxDocType>(primaryPath, couchDoc));
    const isTombstoneWithoutBody = (doc: WithDeleted<RxDocType>) => doc._deleted &&
        Object.keys(doc).every(key => key === primaryPath || key.startsWith('_'));
    const tombstoneIds: string[] = docs
        .filter(doc => isTombstoneWithoutBody(doc))
        .map(doc => (doc as any)[primaryPath]);
    if (tombstoneIds.length === 0) {
        return docs;
    }

    const localDocs: RxDocumentData<RxDocType>[] = await collection.storageInstance.findDocumentsById(tombstoneIds, true);
    const localDocById = new Map<string, RxDocumentData<RxDocType>>();
    localDocs.forEach(localDoc => localDocById.set((localDoc as any)[primaryPath], localDoc));

    const ret: WithDeleted<RxDocType>[] = [];
    docs.forEach(doc => {
        if (!isTombstoneWithoutBody(doc)) {
            ret.push(doc);
            return;
        }
        const localDoc = localDocById.get((doc as any)[primaryPath]);
        if (localDoc) {
            ret.push(Object.assign(
                writeDocToDocState(localDoc, false, false),
                doc
            ));
        }
    });
    return ret;
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


/**
 * Reads the JSON body of a CouchDB response.
 * Throws when the HTTP status is not ok or the body
 * does not have the expected shape, so that the replication
 * emits the status and the CouchDB error body
 * like {"error":"illegal_docid","reason":"..."}
 * instead of failing later on a missing property.
 */
export async function getCouchDBResponseJson<T>(
    response: Response,
    url: string,
    isValid: (json: any) => boolean
): Promise<T> {
    const text = await response.text();
    let json: any;
    try {
        json = JSON.parse(text);
    } catch (_err) {
        json = undefined;
    }
    if (!response.ok || !isValid(json)) {
        throw newRxError('RC_COUCHDB_3', {
            url: removeCredentialsFromUrl(url),
            status: response.status,
            body: typeof json === 'undefined' ? text : json
        });
    }
    return json;
}

/**
 * The url can contain basic auth credentials like
 * http://user:password@example.com/db/
 * which must not end up in error messages and logs.
 */
export function removeCredentialsFromUrl(url: string): string {
    return url.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@]*@/i, '$1');
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
