import {
    getDefaultRevision,
    getDefaultRxDocumentMeta
} from '../../plugins/utils/index.ts';

import type {
    RxChangeEvent,
    RxCollection,
    RxDatabase,
    RxDocument,
    RxDocumentWriteData,
    RxLocalDocument,
    RxLocalDocumentData
} from '../../types/index.d.ts';

import {
    filter,
    map,
    startWith,
    mergeMap
} from 'rxjs';
import { Observable } from 'rxjs';

import { getLocalDocStateByParent } from './local-documents-helper.ts';
import { getSingleDocument, writeSingle } from '../../rx-storage-helper.ts';



/**
 * save the local-document-data
 * throws if already exists
 */
export async function insertLocal<DocData extends Record<string, any> = any, Reactivity = unknown>(
    this: RxDatabase | RxCollection,
    id: string,
    data: DocData
): Promise<RxLocalDocument<DocData, any, Reactivity>> {
    const state = await getLocalDocStateByParent(this);

    // create new one
    const docData: RxDocumentWriteData<RxLocalDocumentData<DocData>> = {
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
    ).then(newDocData => state.docCache.getCachedRxDocument(newDocData) as any);
}

/**
 * save the local-document-data
 * overwrites existing if exists
 */
export async function upsertLocal<DocData extends Record<string, any> = any, Reactivity = unknown>(
    this: any,
    id: string,
    data: DocData
): Promise<RxLocalDocument<DocData, any, Reactivity>> {
    const existing = await this.getLocal(id);
    if (!existing) {
        // create new one
        return this.insertLocal(id, data);
    } else if (existing.deleted) {
        // document was deleted before, un-delete it via the write queue
        const state = await getLocalDocStateByParent(this);
        const writeResult = await state.incrementalWriteQueue.addWrite(
            (existing as any)._data,
            (docData: any) => {
                docData.data = data;
                docData._deleted = false;
                return docData;
            }
        );
        return state.docCache.getCachedRxDocument(writeResult) as any;
    } else {
        // update existing
        return existing.incrementalModify(() => {
            return data;
        });
    }
}

export async function getLocal<DocData = any, Reactivity = unknown>(this: any, id: string): Promise<RxLocalDocument<DocData, any, Reactivity> | null> {
    const state = await getLocalDocStateByParent(this);
    const docCache = state.docCache;

    // check in doc-cache
    const found = docCache.getLatestDocumentDataIfExists(id);
    if (found) {
        return Promise.resolve(
            docCache.getCachedRxDocument(found) as any
        );
    }

    // if not found, check in storage instance
    return getSingleDocument(state.storageInstance, id)
        .then((docData) => {
            if (!docData) {
                return null;
            }
            return state.docCache.getCachedRxDocument(docData) as any;
        });
}

export function getLocal$<DocData = any, Reactivity = unknown>(this: RxCollection, id: string): Observable<RxLocalDocument<DocData, any, Reactivity> | null> {
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
        mergeMap(async (changeEventOrDoc: { changeEvent?: RxChangeEvent<RxLocalDocumentData>; doc?: any }) => {
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
        filter((filterFlagged: { use: boolean; doc?: any }) => filterFlagged.use),
        map((filterFlagged: { use: boolean; doc?: any }) => {
            return filterFlagged.doc as any;
        })
    );
}
