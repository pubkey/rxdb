import type {
    ChangeStreamEvent,
    DeepReadonly,
    JsonSchema,
    MaybeReadonly,
    PouchChangeRow,
    PouchCheckpoint,
    PouchDBInstance,
    RxAttachmentData,
    RxAttachmentWriteData,
    RxDocumentData,
    RxDocumentWriteData,
    RxLocalDocumentData,
    StringKeys,
    WithAttachments
} from '../../types';
import type { RxStorageInstancePouch } from './rx-storage-instance-pouch';
import { binaryMd5 } from 'pouchdb-md5';
import {
    blobBufferUtil,
    flatClone,
    getHeightOfRevision
} from '../../util';
import { newRxError } from '../../rx-error';
import type { ChangeEvent } from 'event-reduce-js';
import { getAttachmentSize, hashAttachmentData } from '../attachments';

export type PouchStorageInternals = {
    pouchInstanceId: string;
    pouch: PouchDBInstance;
};


export const RX_STORAGE_NAME_POUCHDB = 'pouchdb';

/**
 * Used to check in tests if all instances have been cleaned up.
 */
export const OPEN_POUCHDB_STORAGE_INSTANCES: Set<RxStorageInstancePouch<any>> = new Set();

/**
 * All open PouchDB instances are stored here
 * so that we can find them again when needed in the internals.
 */
export const OPEN_POUCH_INSTANCES: Map<string, PouchDBInstance> = new Map();
export function openPouchId(
    databaseInstanceToken: string,
    databaseName: string,
    collectionName: string,
    schemaVersion: number
): string {
    return [
        databaseInstanceToken,
        databaseName,
        collectionName,
        schemaVersion + ''
    ].join('||');
}


/**
 * prefix of local pouchdb documents
 */
export const POUCHDB_LOCAL_PREFIX: '_local/' = '_local/';
export const POUCHDB_LOCAL_PREFIX_LENGTH = POUCHDB_LOCAL_PREFIX.length;

/**
 * Pouchdb stores indexes as design documents,
 * we have to filter them out and not return the
 * design documents to the outside.
 */
export const POUCHDB_DESIGN_PREFIX: '_design/' = '_design/';


/**
 * PouchDB does not allow to add custom properties
 * that start with lodash like RxDB's _meta field.
 * So we have to map this field into a non-lodashed field.
 */
export const POUCHDB_META_FIELDNAME = 'rxdbMeta';

export function pouchSwapIdToPrimary<T>(
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

export function pouchSwapIdToPrimaryString<T>(
    primaryKey: StringKeys<RxDocumentData<T>>,
    str: keyof T
): StringKeys<RxDocumentData<T>> {
    if (str === '_id') {
        return primaryKey;
    } else {
        return str as any;
    }
}

export function pouchDocumentDataToRxDocumentData<T>(
    primaryKey: StringKeys<RxDocumentData<T>>,
    pouchDoc: WithAttachments<T>
): RxDocumentData<T> {
    let useDoc: RxDocumentData<T> = pouchSwapIdToPrimary(primaryKey, pouchDoc);

    // always flat clone because we mutate the _attachments property.
    useDoc = flatClone(useDoc);
    delete (useDoc as any)._revisions;

    // ensure deleted flag is set.
    useDoc._deleted = !!useDoc._deleted;

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

    useDoc._meta = (useDoc as any)[POUCHDB_META_FIELDNAME];
    delete (useDoc as any)[POUCHDB_META_FIELDNAME];

    return useDoc;
}

export function rxDocumentDataToPouchDocumentData<T>(
    primaryKey: StringKeys<RxDocumentData<T>>,
    doc: RxDocumentData<T> | RxDocumentWriteData<T>
): WithAttachments<T & { _id: string; }> {
    let pouchDoc: WithAttachments<T> = pouchSwapPrimaryToId(primaryKey, doc);

    // always flat clone because we mutate the _attachments property.
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

    (pouchDoc as any)[POUCHDB_META_FIELDNAME] = (pouchDoc as any)._meta;
    delete (pouchDoc as any)._meta;

    return pouchDoc as any;
}


/**
 * Swaps the primaryKey of the document
 * to the _id property.
 */
export function pouchSwapPrimaryToId<RxDocType>(
    primaryKey: StringKeys<RxDocumentData<RxDocType>>,
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
    pouchDBInstance: PouchDBInstance,
    primary: string,
    change: ChangeEvent<RxDocumentData<any>>
): string {
    const useRev = change.doc ? change.doc._rev : change.previous._rev;
    const eventKey = pouchDBInstance.name + '|' + primary + '|' + change.operation + '|' + useRev;
    return eventKey;
}

export function pouchChangeRowToChangeEvent<DocumentData>(
    primaryKey: StringKeys<DocumentData>,
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
    primaryKey: StringKeys<DocumentData>,
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
 * Runs a primary swap with transform all custom primaryKey occurrences
 * into '_id'
 * @recursive
 */
export function primarySwapPouchDbQuerySelector<RxDocType>(
    selector: any,
    primaryKey: StringKeys<RxDocumentData<RxDocType>>
): any {
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

export async function writeAttachmentsToAttachments(
    attachments: { [attachmentId: string]: RxAttachmentData | RxAttachmentWriteData; }
): Promise<{ [attachmentId: string]: RxAttachmentData; }> {
    if (!attachments) {
        return {};
    }
    const ret: { [attachmentId: string]: RxAttachmentData; } = {};
    await Promise.all(
        Object.entries(attachments)
            .map(async ([key, obj]) => {
                if (!obj.type) {
                    throw newRxError('SNH', { args: { obj } });
                }
                /**
                 * Is write attachment,
                 * so we have to remove the data to have a
                 * non-write attachment.
                 */
                if ((obj as RxAttachmentWriteData).data) {
                    const asWrite = (obj as RxAttachmentWriteData);
                    let data: any = asWrite.data;
                    const isBuffer = typeof Buffer !== 'undefined' && Buffer.isBuffer(data);
                    if (isBuffer) {
                        data = new Blob([data]);
                    }
                    const dataAsBase64String = typeof data === 'string' ? data : await blobBufferUtil.toBase64String(data);
                    const hash = await hashAttachmentData(dataAsBase64String);
                    const length = getAttachmentSize(dataAsBase64String);
                    ret[key] = {
                        digest: 'md5-' + hash,
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

/**
 * PouchDB has not way to read deleted local documents
 * out of the database.
 * So instead of deleting them, we set a custom deleted flag.
 */
export const RXDB_POUCH_DELETED_FLAG = 'rxdb-pouch-deleted' as const;


export type RxLocalDocumentDataWithCustomDeletedField<D> = RxLocalDocumentData<D> & {
    [k in typeof RXDB_POUCH_DELETED_FLAG]?: boolean;
};


export const POUCHDB_CHECKPOINT_SCHEMA: DeepReadonly<JsonSchema<PouchCheckpoint>> = {
    type: 'object',
    properties: {
        sequence: {
            type: 'number'
        }
    },
    required: [
        'sequence'
    ],
    additionalProperties: false
};
