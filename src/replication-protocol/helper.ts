import type {
    BulkWriteRow,
    RxDocumentData,
    RxDocumentWriteData,
    RxStorageInstance,
    RxStorageInstanceReplicationState,
    RxStorageReplicationMeta,
    WithDeletedAndAttachments
} from '../types/index.d.ts';
import {
    blobToBase64String,
    clone,
    createBlobFromBase64,
    createRevision,
    flatClone,
    getDefaultRevision,
    now
} from '../plugins/utils/index.ts';
import { stripAttachmentsDataFromDocument } from '../rx-storage-helper.ts';

export function docStateToWriteDoc<RxDocType>(
    databaseInstanceToken: string,
    hasAttachments: boolean,
    keepMeta: boolean,
    docState: WithDeletedAndAttachments<RxDocType>,
    previous?: RxDocumentData<RxDocType>
): RxDocumentWriteData<RxDocType> {
    const docData: RxDocumentWriteData<RxDocType> = Object.assign(
        {},
        docState,
        {
            _attachments: hasAttachments && docState._attachments ? docState._attachments : {},
            _meta: keepMeta ? (docState as any)._meta : Object.assign(
                {},
                previous ? previous._meta : {},
                {
                    lwt: now()
                }
            ),
            _rev: keepMeta ? (docState as any)._rev : getDefaultRevision()
        }
    );
    if (!docData._rev) {
        docData._rev = createRevision(
            databaseInstanceToken,
            previous
        );
    }

    return docData;
}

export function writeDocToDocState<RxDocType>(
    writeDoc: RxDocumentData<RxDocType>,
    keepAttachments: boolean,
    keepMeta: boolean
): WithDeletedAndAttachments<RxDocType> {
    const ret = flatClone(writeDoc);

    if (!keepAttachments) {
        delete (ret as any)._attachments;
    }
    if (!keepMeta) {
        delete (ret as any)._meta;
        delete (ret as any)._rev;
    }
    return ret;
}


export function stripAttachmentsDataFromMetaWriteRows<RxDocType>(
    state: RxStorageInstanceReplicationState<any>,
    rows: BulkWriteRow<RxStorageReplicationMeta<RxDocType, any>>[]
): BulkWriteRow<RxStorageReplicationMeta<RxDocType, any>>[] {
    if (!state.hasAttachments) {
        return rows;
    }
    return rows.map(row => {
        const document = clone(row.document);
        document.docData = stripAttachmentsDataFromDocument(document.docData);
        return {
            document,
            previous: row.previous
        };
    });
}

/**
 * Serialises attachment data in a document clone so it can safely be stored
 * as JSON in a remote storage that does not natively support attachments
 * (e.g. Google Drive, OneDrive).
 *
 * - When `serializeData` is true: Blob values are extracted and stored as
 *   base64 strings in the top-level `_attachments_data` field, while
 *   `_attachments` is stripped to clean stubs via `stripAttachmentsDataFromDocument`.
 * - When `serializeData` is false: `_attachments` is set to `{}` so that
 *   attachment stubs (without binary data) are never persisted. This
 *   prevents the downstream replication protocol from trying to write
 *   attachment data it does not have when a peer pulls the document.
 *
 * The function returns a NEW document object; the original is not mutated.
 */
export async function serializeDocAttachments<T>(doc: T, serializeData: boolean): Promise<T> {
    const d = doc as any;
    if (!d?._attachments) {
        return doc;
    }

    if (!serializeData) {
        return { ...d, _attachments: {} } as any;
    }

    const attachmentData: Record<string, string> = {};
    await Promise.all(
        Object.entries(d._attachments as Record<string, any>).map(async ([id, att]) => {
            if (att.data instanceof Blob) {
                attachmentData[id] = await blobToBase64String(att.data);
            }
        })
    );

    const stripped = stripAttachmentsDataFromDocument(d) as any;

    if (Object.keys(attachmentData).length > 0) {
        return { ...stripped, _attachments_data: attachmentData } as any;
    }
    return stripped as any;
}

/**
 * Strips both `_attachments` data and the serialised `_attachments_data` field
 * from a document, leaving only the structural attachment metadata
 * (digest / length / type). Used to compare two document states without
 * being affected by attachment binary data that lives in different shapes on
 * each side (Blobs in memory vs base64 in the serialised JSON file).
 */
export function stripAllAttachmentDataForComparison<T>(doc: T): T {
    const stripped = stripAttachmentsDataFromDocument(doc as any) as any;
    delete stripped._attachments_data;
    return stripped;
}

/**
 * Converts attachment data stored in `_attachments_data` back to Blobs in the
 * document, so that the downstream replication protocol can write them to the
 * fork storage instance correctly.
 *
 * Mutates the document in place and removes the `_attachments_data` field.
 */
export async function deserializeDocAttachments(doc: any): Promise<void> {
    const attachmentData: Record<string, string> | undefined = doc._attachments_data;
    if (!attachmentData || !doc._attachments) {
        return;
    }
    await Promise.all(
        Object.entries(attachmentData).map(async ([id, base64]) => {
            if (doc._attachments[id]) {
                doc._attachments[id] = {
                    ...doc._attachments[id],
                    data: await createBlobFromBase64(base64, doc._attachments[id].type)
                };
            }
        })
    );
    delete doc._attachments_data;
}

export function getUnderlyingPersistentStorage<RxDocType>(
    instance: RxStorageInstance<RxDocType, any, any, any>
): RxStorageInstance<RxDocType, any, any, any> {
    while (true) {
        if (instance.underlyingPersistentStorage) {
            instance = instance.underlyingPersistentStorage;
        } else {
            return instance;
        }
    }
}
