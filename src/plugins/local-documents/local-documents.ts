import {
    newRxError
} from '../../rx-error';
import {
    flatClone,
    getDefaultRxDocumentMeta
} from '../../util';

import type {
    RxChangeEvent,
    RxCollection,
    RxDatabase,
    RxDocument,
    RxDocumentData,
    RxDocumentWriteData,
    RxLocalDocumentData
} from '../../types';

import {
    filter,
    map,
    startWith,
    mergeMap
} from 'rxjs/operators';
import { Observable } from 'rxjs';

import { createRxLocalDocument, RxLocalDocument } from './rx-local-document';
import { getLocalDocStateByParent } from './local-documents-helper';
import { getSingleDocument, writeSingle } from '../../rx-storage-helper';



/**
 * save the local-document-data
 * throws if already exists
 */
export async function insertLocal<DocData>(
    this: RxDatabase | RxCollection,
    id: string,
    data: DocData
): Promise<RxLocalDocument> {
    const state = await getLocalDocStateByParent(this);
    return (this as any).getLocal(id)
        .then((existing: any) => {

            if (existing) {
                throw newRxError('LD7', {
                    id,
                    data
                });
            }

            // create new one
            let docData: RxDocumentWriteData<RxLocalDocumentData<DocData>> = {
                id: id,
                data,
                _deleted: false,
                _meta: getDefaultRxDocumentMeta(),
                _attachments: {}
            };

            return writeSingle(
                state.storageInstance,
                {
                    document: docData
                }
            ).then(res => {
                docData = flatClone(docData);
                docData._rev = res._rev;
                const newDoc = createRxLocalDocument(id, docData, this, state);
                return newDoc;
            });
        });
}

/**
 * save the local-document-data
 * overwrites existing if exists
 */
export function upsertLocal<DocData>(
    this: any,
    id: string,
    data: DocData
): Promise<RxLocalDocument> {
    return this.getLocal(id)
        .then((existing: RxDocument) => {
            if (!existing) {
                // create new one
                const docPromise = this.insertLocal(id, data);
                return docPromise;
            } else {
                // update existing
                const newData: RxDocumentData<RxLocalDocumentData<DocData>> = {
                    id,
                    data,
                    _rev: existing._data._rev,
                    _deleted: false,
                    _attachments: {},
                    _meta: getDefaultRxDocumentMeta()
                };

                return existing.atomicUpdate(() => {
                    newData._rev = existing._data._rev;
                    return newData;
                }).then(() => existing);
            }
        });
}

export async function getLocal(this: any, id: string): Promise<RxLocalDocument | null> {
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
            return doc;
        })
        .catch(() => null);
}

export function getLocal$(this: RxCollection, id: string): Observable<RxLocalDocument | null> {
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
            return filterFlagged.doc;
        })
    );
}
