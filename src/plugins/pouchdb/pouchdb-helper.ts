import type {
    ChangeStreamEvent,
    MaybeReadonly,
    PouchChangeRow,
    PouchDBInstance,
    RxAttachmentData,
    RxAttachmentWriteData,
    RxDocumentData,
    RxDocumentWriteData,
    WithAttachments
} from '../../types';
import type { RxStorageInstancePouch } from './rx-storage-instance-pouch';
import { binaryMd5 } from 'pouchdb-md5';
import type {
    RxStorageKeyObjectInstancePouch
} from './rx-storage-key-object-instance-pouch';
import {
    blobBufferUtil,
    flatClone,
    getHeightOfRevision
} from '../../util';
import { newRxError } from '../../rx-error';
import type { ChangeEvent } from 'event-reduce-js';

export type PouchStorageInternals = {
    pouch: PouchDBInstance;
};

/**
 * Used to check in tests if all instances have been cleaned up.
 */
export const OPEN_POUCHDB_STORAGE_INSTANCES: Set<RxStorageKeyObjectInstancePouch | RxStorageInstancePouch<any>> = new Set();

/**
 * prefix of local pouchdb documents
 */
export const POUCHDB_LOCAL_PREFIX: '_local/' = '_local/';
/**
 * Pouchdb stores indexes as design documents,
 * we have to filter them out and not return the
 * design documents to the outside.
 */
export const POUCHDB_DESIGN_PREFIX: '_design/' = '_design/';

export function pouchSwapIdToPrimary<T>(
    primaryKey: keyof T,
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

export function pouchSwapIdToPrimaryString<T>(primaryKey: keyof T, str: keyof T): keyof T {
    if (str === '_id') {
        return primaryKey;
    } else {
        return str;
    }
}

export function pouchDocumentDataToRxDocumentData<T>(
    primaryKey: keyof T,
    pouchDoc: WithAttachments<T>
): RxDocumentData<T> {
    let useDoc: RxDocumentData<T> = pouchSwapIdToPrimary(primaryKey, pouchDoc);

    // always flat clone becaues we mutate the _attachments property.
    useDoc = flatClone(useDoc);
    delete (useDoc as any)._revisions;

    useDoc._attachments = {};
    if (pouchDoc._attachments) {
        Object.entries(pouchDoc._attachments).forEach(([key, value]) => {
            if ((value as any).data) {
                useDoc._attachments[key] = {
                    data: (value as any).data,
                    type: (value as any).type ? (value as any).type : (value as any).content_type
                } as any;
            } else {
                useDoc._attachments[key] = {
                    digest: value.digest,
                    // TODO why do we need to access value.type?
                    type: (value as any).type ? (value as any).type : value.content_type,
                    length: value.length
                };
            }
        });
    }

    return useDoc;
}

export function rxDocumentDataToPouchDocumentData<T>(
    primaryKey: keyof T,
    doc: RxDocumentData<T> | RxDocumentWriteData<T>
): WithAttachments<T & { _id: string; }> {
    let pouchDoc: WithAttachments<T> = pouchSwapPrimaryToId(primaryKey, doc);

    // always flat clone becaues we mutate the _attachments property.
    pouchDoc = flatClone(pouchDoc);

    pouchDoc._attachments = {};
    if (doc._attachments) {
        Object.entries(doc._attachments).forEach(([key, value]) => {
            const useValue: RxAttachmentWriteData & RxAttachmentData = value as any;
            if (useValue.data) {
                (pouchDoc as any)._attachments[key] = {
                    data: useValue.data,
                    content_type: useValue.type
                };
            } else {
                (pouchDoc as any)._attachments[key] = {
                    digest: useValue.digest,
                    content_type: useValue.type,
                    length: useValue.length,
                    stub: true
                };
            }
        });
    }

    return pouchDoc as any;
}


/**
 * Swaps the primaryKey of the document
 * to the _id property.
 */
export function pouchSwapPrimaryToId<RxDocType>(
    primaryKey: keyof RxDocType,
    docData: any
): RxDocType & { _id: string } {
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
 * in:  '_local/foobar'
 * out: 'foobar'
 */
export function pouchStripLocalFlagFromPrimary(str: string): string {
    return str.substring(POUCHDB_LOCAL_PREFIX.length);
}

export function getEventKey(
    isLocal: boolean,
    primary: string,
    revision: string
): string {

    // TODO remove this check this should never happen
    if (!primary) {
        throw new Error('primary missing !!');
    }

    const prefix = isLocal ? 'local' : 'non-local';
    const eventKey = prefix + '|' + primary + '|' + revision;
    return eventKey;
}

export function pouchChangeRowToChangeEvent<DocumentData>(
    primaryKey: keyof DocumentData,
    pouchDoc: any
): ChangeEvent<RxDocumentData<DocumentData>> {
    if (!pouchDoc) {
        throw newRxError('SNH', { args: { pouchDoc } });
    }
    const id = pouchDoc._id;

    const doc = pouchDocumentDataToRxDocumentData<DocumentData>(
        primaryKey,
        pouchDoc as any
    );
    const revHeight = doc._rev ? getHeightOfRevision(doc._rev) : 1;

    if (pouchDoc._deleted) {
        return {
            operation: 'DELETE',
            id,
            doc: null,
            previous: doc
        };
    } else if (revHeight === 1) {
        return {
            operation: 'INSERT',
            id,
            doc,
            previous: null
        };
    } else {
        return {
            operation: 'UPDATE',
            id,
            doc: doc,
            previous: 'UNKNOWN'
        };
    }
}

export function pouchChangeRowToChangeStreamEvent<DocumentData>(
    primaryKey: keyof DocumentData,
    pouchRow: PouchChangeRow
): ChangeStreamEvent<DocumentData> {
    const doc = pouchRow.doc;
    if (!doc) {
        throw newRxError('SNH', { args: { pouchRow } });
    }
    const revHeight = getHeightOfRevision(doc._rev);

    if (pouchRow.deleted) {
        const previousDoc = flatClone(
            pouchDocumentDataToRxDocumentData(
                primaryKey,
                pouchRow.doc as any
            )
        );
        delete previousDoc._deleted;
        const ev: ChangeStreamEvent<DocumentData> = {
            sequence: pouchRow.seq,
            id: pouchRow.id,
            operation: 'DELETE',
            doc: null,
            previous: previousDoc
        };
        return ev;
    } else if (revHeight === 1) {
        const ev: ChangeStreamEvent<DocumentData> = {
            sequence: pouchRow.seq,
            id: pouchRow.id,
            operation: 'INSERT',
            doc: pouchDocumentDataToRxDocumentData(
                primaryKey,
                pouchRow.doc as any
            ),
            previous: null
        };
        return ev;
    } else {
        const ev: ChangeStreamEvent<DocumentData> = {
            sequence: pouchRow.seq,
            id: pouchRow.id,
            operation: 'UPDATE',
            doc: pouchDocumentDataToRxDocumentData(
                primaryKey,
                pouchRow.doc as any
            ),
            previous: 'UNKNOWN'
        };
        return ev;
    }
}


/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */
export function primarySwapPouchDbQuerySelector<RxDocType>(selector: any, primaryKey: keyof RxDocType): any {
    if (primaryKey === '_id') {
        return selector;
    }
    if (Array.isArray(selector)) {
        return selector.map(item => primarySwapPouchDbQuerySelector(item, primaryKey));
    } else if (typeof selector === 'object') {
        const ret: any = {};
        Object.entries(selector).forEach(([k, v]) => {
            if (k === primaryKey) {
                ret._id = v;
            } else {
                if (k.startsWith('$')) {
                    ret[k] = primarySwapPouchDbQuerySelector(v, primaryKey);
                } else {
                    ret[k] = v;
                }
            }
        });
        return ret;
    } else {
        return selector;
    }
}

export function pouchHash(data: Buffer | Blob | string): Promise<string> {
    return new Promise(res => {
        binaryMd5(data, (digest: string) => {
            res(digest);
        });
    });
}

export const POUCH_HASH_KEY = 'md5';

export async function writeAttachmentsToAttachments(
    attachments: { [attachmentId: string]: RxAttachmentData | RxAttachmentWriteData; }
): Promise<{ [attachmentId: string]: RxAttachmentData; }> {
    if (!attachments) {
        return {};
    }
    const ret: { [attachmentId: string]: RxAttachmentData; } = {};
    await Promise.all(
        Object.entries(attachments).map(async ([key, obj]) => {
            if (!obj.type) {
                throw newRxError('SNH', { args: { obj } });
            }
            if ((obj as RxAttachmentWriteData).data) {
                const asWrite = (obj as RxAttachmentWriteData);
                const [hash, asString] = await Promise.all([
                    pouchHash(asWrite.data),
                    blobBufferUtil.toString(asWrite.data)
                ]);

                const length = asString.length;
                ret[key] = {
                    digest: POUCH_HASH_KEY + '-' + hash,
                    length,
                    type: asWrite.type
                };
            } else {
                ret[key] = obj as RxAttachmentData;
            }
        })
    );
    return ret;
}

export function getPouchIndexDesignDocNameByIndex(
    index: MaybeReadonly<string[]>
): string {
    const indexName = 'idx-rxdb-index-' + index.join(',');
    return indexName;
}
