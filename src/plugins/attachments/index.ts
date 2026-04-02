import {
    map
} from 'rxjs';

import {
    blobToBase64String,
    blobToString,
    createBlobFromBase64,
    flatClone,
    PROMISE_RESOLVE_VOID
} from '../../plugins/utils/index.ts';
import type {
    RxDocument,
    RxPlugin,
    RxDocumentWriteData,
    RxAttachmentData,
    RxDocumentData,
    RxAttachmentCreator,
    RxAttachmentWriteData,
    RxCollection,
    RxAttachmentCreatorBase64
} from '../../types/index.d.ts';
import {
    assignMethodsToAttachment,
    ensureSchemaSupportsAttachments
} from './attachments-utils.ts';



/**
 * an RxAttachment is basically just the attachment-stub
 * wrapped so that you can access the attachment-data
 */
export class RxAttachment {
    public doc: RxDocument;
    public id: string;
    public type: string;
    public length: number;
    public digest: string;
    constructor({
        doc,
        id,
        type,
        length,
        digest
    }: any) {
        this.doc = doc;
        this.id = id;
        this.type = type;
        this.length = length;
        this.digest = digest;

        assignMethodsToAttachment(this);
    }

    remove(): Promise<void> {
        return this.doc.collection.incrementalWriteQueue.addWrite(
            this.doc._data,
            docWriteData => {
                delete docWriteData._attachments[this.id];
                return docWriteData;
            }
        ).then(() => { });
    }

    /**
     * returns the data for the attachment
     */
    async getData(): Promise<Blob> {
        const blob = await this.doc.collection.storageInstance.getAttachmentData(
            this.doc.primary,
            this.id,
            this.digest
        );
        // Some storage layers return blobs without the original MIME type.
        // Ensure the returned Blob has the attachment's MIME type.
        if (blob && blob.type !== this.type) {
            return blob.slice(0, blob.size, this.type);
        }
        return blob;
    }

    async getStringData(): Promise<string> {
        const data = await this.getData();
        const asString = await blobToString(data);
        return asString;
    }

    async getDataBase64(): Promise<string> {
        const blob = await this.getData();
        return blobToBase64String(blob);
    }
}

export function fromStorageInstanceResult<RxDocType>(
    id: string,
    attachmentData: RxAttachmentData,
    rxDocument: RxDocument<RxDocType>
) {
    return new RxAttachment({
        doc: rxDocument,
        id,
        type: attachmentData.type,
        length: attachmentData.length,
        digest: attachmentData.digest
    });
}

async function _putAttachmentsImpl<RxDocType>(
    doc: RxDocument<RxDocType>,
    attachments: RxAttachmentCreator[]
): Promise<RxAttachment[]> {
    ensureSchemaSupportsAttachments(doc);

    if (attachments.length === 0) {
        return [];
    }

    const prepared = await Promise.all(
        attachments.map(async (att) => ({
            id: att.id,
            type: att.type,
            data: att.data,
            digest: await doc.collection.database.hashFunction(att.data)
        }))
    );

    const writeResult = await doc.collection.incrementalWriteQueue.addWrite(
        doc._data,
        (docWriteData: RxDocumentWriteData<RxDocType>) => {
            docWriteData = flatClone(docWriteData);
            docWriteData._attachments = flatClone(docWriteData._attachments);
            for (const att of prepared) {
                docWriteData._attachments[att.id] = {
                    length: att.data.size,
                    type: att.type,
                    data: att.data,
                    digest: att.digest
                };
            }
            return docWriteData;
        }
    );

    const newDocument = doc.collection._docCache.getCachedRxDocument(writeResult);
    return prepared.map((att) => fromStorageInstanceResult(
        att.id,
        writeResult._attachments[att.id],
        newDocument
    ));
}

export async function putAttachment<RxDocType>(
    this: RxDocument<RxDocType>,
    attachmentData: RxAttachmentCreator
): Promise<RxAttachment> {
    const results = await _putAttachmentsImpl(this, [attachmentData]);
    return results[0];
}

export async function putAttachmentBase64<RxDocType>(
    this: RxDocument<RxDocType>,
    attachmentData: RxAttachmentCreatorBase64
) {
    ensureSchemaSupportsAttachments(this);
    const blob = await createBlobFromBase64(attachmentData.data, attachmentData.type);
    return this.putAttachment({
        id: attachmentData.id,
        type: attachmentData.type,
        data: blob
    });
}

/**
 * Write multiple attachments in a single atomic operation.
 */
export function putAttachments<RxDocType>(
    this: RxDocument<RxDocType>,
    attachments: RxAttachmentCreator[]
): Promise<RxAttachment[]> {
    return _putAttachmentsImpl(this, attachments);
}

/**
 * get an attachment of the document by its id
 */
export function getAttachment(
    this: RxDocument,
    id: string
): RxAttachment | null {
    ensureSchemaSupportsAttachments(this);
    const docData: any = this._data;
    if (!docData._attachments || !docData._attachments[id])
        return null;

    const attachmentData = docData._attachments[id];
    const attachment = fromStorageInstanceResult(
        id,
        attachmentData,
        this
    );
    return attachment;
}

/**
 * returns all attachments of the document
 */
export function allAttachments(
    this: RxDocument
): RxAttachment[] {
    ensureSchemaSupportsAttachments(this);
    const docData: any = this._data;

    // if there are no attachments, the field is missing
    if (!docData._attachments) {
        return [];
    }
    return Object.keys(docData._attachments)
        .map(id => {
            return fromStorageInstanceResult(
                id,
                docData._attachments[id],
                this
            );
        });
}

export async function preMigrateDocument<RxDocType>(
    data: {
        docData: RxDocumentData<RxDocType>;
        oldCollection: RxCollection<RxDocType>;
    }
): Promise<void> {
    const attachments = data.docData._attachments;
    if (attachments) {
        const newAttachments: { [attachmentId: string]: RxAttachmentWriteData; } = {};
        await Promise.all(
            Object.keys(attachments).map(async (attachmentId) => {
                const attachment: RxAttachmentData = attachments[attachmentId];
                const docPrimary: string = (data.docData as any)[data.oldCollection.schema.primaryPath];
                const rawAttachmentBlob = await data.oldCollection.storageInstance.getAttachmentData(
                    docPrimary,
                    attachmentId,
                    attachment.digest
                );
                const digest = await data.oldCollection.database.hashFunction(rawAttachmentBlob);
                newAttachments[attachmentId] = {
                    length: rawAttachmentBlob.size,
                    type: attachment.type,
                    data: rawAttachmentBlob,
                    digest
                };
            })
        );

        /**
         * Hooks mutate the input
         * instead of returning stuff
         */
        (data.docData as RxDocumentWriteData<RxDocType>)._attachments = newAttachments;
    }
}

export function postMigrateDocument(_action: any): Promise<void> {
    /**
     * No longer needed because
     * we store the attachments data buffers directly in the document.
     */
    return PROMISE_RESOLVE_VOID;
}

export const RxDBAttachmentsPlugin: RxPlugin = {
    name: 'attachments',
    rxdb: true,
    prototypes: {
        RxDocument: (proto: any) => {
            proto.putAttachment = putAttachment;
            proto.putAttachments = putAttachments;
            proto.putAttachmentBase64 = putAttachmentBase64;
            proto.getAttachment = getAttachment;
            proto.allAttachments = allAttachments;
            Object.defineProperty(proto, 'allAttachments$', {
                get: function allAttachments$(this: RxDocument) {
                    return this.$
                        .pipe(
                            map((rxDocument: RxDocument) => {
                                return Object.entries(
                                    rxDocument.toJSON(true)._attachments
                                ).map(([id, attachmentData]: [string, any]) => {
                                    return fromStorageInstanceResult(
                                        id,
                                        attachmentData,
                                        rxDocument
                                    );
                                });
                            })
                        );
                }
            });
        }
    },
    overwritable: {},
    hooks: {
        preMigrateDocument: {
            after: preMigrateDocument
        },
        postMigrateDocument: {
            after: postMigrateDocument
        }
    }
};


export * from './attachments-utils.ts';
