import {
    map
} from 'rxjs/operators';

import {
    blobBufferUtil,
    flatClone,
    PROMISE_RESOLVE_VOID
} from '../../plugins/utils';
import {
    newRxError
} from '../../rx-error';
import type {
    RxDocument,
    RxPlugin,
    BlobBuffer,
    OldRxCollection,
    RxDocumentWriteData,
    RxAttachmentData,
    RxDocumentData,
    RxAttachmentCreator,
    RxAttachmentWriteData
} from '../../types';

function ensureSchemaSupportsAttachments(doc: any) {
    const schemaJson = doc.collection.schema.jsonSchema;
    if (!schemaJson.attachments) {
        throw newRxError('AT1', {
            link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
        });
    }
}

const _assignMethodsToAttachment = function (attachment: any) {
    Object
        .entries(attachment.doc.collection.attachments)
        .forEach(([funName, fun]) => {
            Object.defineProperty(attachment, funName, {
                get: () => (fun as any).bind(attachment)
            });
        });
};

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

        _assignMethodsToAttachment(this);
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
    async getData(): Promise<BlobBuffer> {
        const plainDataBase64 = await this.doc.collection.storageInstance.getAttachmentData(
            this.doc.primary,
            this.id
        );
        const ret = await blobBufferUtil.createBlobBufferFromBase64(
            plainDataBase64,
            this.type as any
        );
        return ret;
    }

    async getStringData(): Promise<string> {
        const data = await this.getData();
        const asString = await blobBufferUtil.toString(data);
        return asString;
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

export async function putAttachment<RxDocType>(
    this: RxDocument<RxDocType>,
    attachmentData: RxAttachmentCreator
): Promise<RxAttachment> {
    ensureSchemaSupportsAttachments(this);

    const dataSize = blobBufferUtil.size(attachmentData.data);
    const dataString = await blobBufferUtil.toBase64String(attachmentData.data);

    const id = attachmentData.id;
    const type = attachmentData.type;
    const data = dataString;

    return this.collection.incrementalWriteQueue.addWrite(
        this._data,
        (docWriteData: RxDocumentWriteData<RxDocType>) => {
            docWriteData._attachments = flatClone(docWriteData._attachments);

            docWriteData._attachments[id] = {
                length: dataSize,
                type,
                data
            };
            return docWriteData;
        }).then(writeResult => {
            const newDocument = this.collection._docCache.getCachedRxDocument(writeResult);
            const attachmentDataOfId = writeResult._attachments[id];
            const attachment = fromStorageInstanceResult(
                id,
                attachmentDataOfId,
                newDocument
            );
            return attachment;
        });
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
        oldCollection: OldRxCollection;
    }
): Promise<void> {
    const attachments = data.docData._attachments;
    if (attachments) {
        const newAttachments: { [attachmentId: string]: RxAttachmentWriteData; } = {};
        await Promise.all(
            Object.keys(attachments).map(async (attachmentId) => {
                const attachment: RxAttachmentData = attachments[attachmentId];
                const docPrimary: string = (data.docData as any)[data.oldCollection.schema.primaryPath];
                const rawAttachmentData = await data.oldCollection.storageInstance.getAttachmentData(docPrimary, attachmentId);
                newAttachments[attachmentId] = {
                    length: attachment.length,
                    type: attachment.type,
                    data: rawAttachmentData
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
            proto.getAttachment = getAttachment;
            proto.allAttachments = allAttachments;
            Object.defineProperty(proto, 'allAttachments$', {
                get: function allAttachments$(this: RxDocument) {
                    return this.$
                        .pipe(
                            map(data => Object.entries(
                                data._attachments
                            )),
                            map(entries => {
                                return (entries as any)
                                    .map(([id, attachmentData]: any) => {
                                        return fromStorageInstanceResult(
                                            id,
                                            attachmentData,
                                            this
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
