import {
    flatClone,
    getDefaultRevision,
    getDefaultRxDocumentMeta
} from '../../util';

import type {
    RxChangeEvent,
    RxCollection,
    RxDatabase,
    RxDocument,
    RxDocumentWriteData,
    RxLocalDocument,
    RxLocalDocumentData
} from '../../types';

import {
    filter,
    map,
    startWith,
    mergeMap
} from 'rxjs/operators';
import { Observable } from 'rxjs';

import { createRxLocalDocument } from './rx-local-document';
import { getLocalDocStateByParent } from './local-documents-helper';
import { getSingleDocument, writeSingle } from '../../rx-storage-helper';



/**
 * save the local-document-data
 * throws if already exists
 */
export async function insertLocal<DocData extends Record<string, any> = any>(
    this: RxDatabase | RxCollection,
    id: string,
    data: DocData
): Promise<RxLocalDocument<DocData>> {
    const state = await getLocalDocStateByParent(this);

    // create new one
    let docData: RxDocumentWriteData<RxLocalDocumentData<DocData>> = {
        id: id,
        data,
        _deleted: false,
        _meta: getDefaultRxDocumentMeta(),
        _rev: getDefaultRevision(),
        _attachments: {}
    };

    return writeSingle(
        state.storageInstance,
        {
            document: docData
        },
        'local-document-insert'
    ).then(res => {
        docData = flatClone(docData);
        docData._rev = res._rev;
        const newDoc = createRxLocalDocument(id, docData as any, this, state);
        return newDoc as any;
    });
}

/**
 * save the local-document-data
 * overwrites existing if exists
 */
export function upsertLocal<DocData extends Record<string,any> = any>(
    this: any,
    id: string,
    data: DocData
): Promise<RxLocalDocument<DocData>> {
    return this.getLocal(id)
        .then((existing: RxDocument) => {
            if (!existing) {
                // create new one
                const docPromise = this.insertLocal(id, data);
                return docPromise;
            } else {
                // update existing
                return existing.atomicUpdate(() => {
                    return data;
                }).then(() => existing);
            }
        });
}

export async function getLocal<DocData = any>(this: any, id: string): Promise<RxLocalDocument<DocData> | null> {
    const state = await getLocalDocStateByParent(this);
    const docCache = state.docCache;

    // check in doc-cache
    const found = docCache.get(id);
    if (found) {
        return Promise.resolve(found as any);
    }

    // if not found, check in storage instance
    return getSingleDocument(state.storageInstance, id)
        .then((docData) => {
            if (!docData) {
                return null;
            }
            const doc = createRxLocalDocument(id, docData, this, state);
            return doc as any;
        })
        .catch(() => null);
}

export function getLocal$<DocData = any>(this: RxCollection, id: string): Observable<RxLocalDocument<DocData> | null> {
    return this.$.pipe(
        startWith(null),
        mergeMap(async (cE: RxChangeEvent<RxLocalDocumentData> | null) => {
            if (cE) {
                return {
                    changeEvent: cE
                };
            } else {
                const doc = await this.getLocal(id);
                return {
                    doc: doc
                };
            }
        }),
        mergeMap(async (changeEventOrDoc) => {
            if (changeEventOrDoc.changeEvent) {
                const cE = changeEventOrDoc.changeEvent;
                if (!cE.isLocal || cE.documentId !== id) {
                    return {
                        use: false
                    };
                } else {
                    const doc = await this.getLocal(id);
                    return {
                        use: true,
                        doc: doc
                    };
                }
            } else {
                return {
                    use: true,
                    doc: changeEventOrDoc.doc
                };
            }
        }),
        filter(filterFlagged => filterFlagged.use),
        map(filterFlagged => {
            return filterFlagged.doc as any;
        })
    );
}
