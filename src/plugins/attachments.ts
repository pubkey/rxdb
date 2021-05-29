import {
    map
} from 'rxjs/operators';
import {
    createUpdateEvent
} from './../rx-change-event';
import {
    now,
    blobBufferUtil
} from './../util';
import {
    newRxError
} from '../rx-error';
import type {
    RxDocument,
    RxPlugin,
    RxDocumentTypeWithRev,
    PouchAttachmentWithData,
    BlobBuffer,
    WithAttachments,
    OldRxCollection,
    PouchAttachmentMeta
} from '../types';
import { pouchAttachmentBinaryHash } from '../pouch-db';
import { RxSchema } from '../rx-schema';

function ensureSchemaSupportsAttachments(doc: any) {
    const schemaJson = doc.collection.schema.jsonSchema;
    if (!schemaJson.attachments) {
        throw newRxError('AT1', {
            link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
        });
    }
}

function resyncRxDocument<RxDocType>(doc: any) {
    const startTime = now();
    return doc.collection.pouch.get(doc.primary).then((docDataFromPouch: any) => {
        const data: RxDocumentTypeWithRev<RxDocType> = doc.collection._handleFromPouch(docDataFromPouch);
        const endTime = now();
        const changeEvent = createUpdateEvent(
            doc.collection,
            data,
            null,
            startTime,
            endTime,
            doc
        );
        doc.$emit(changeEvent);
    });
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
    public doc: any;
    public id: string;
    public type: string;
    public length: number;
    public digest: string;
    public rev: string;
    constructor({
        doc,
        id,
        type,
        length,
        digest,
        rev
    }: any) {
        this.doc = doc;
        this.id = id;
        this.type = type;
        this.length = length;
        this.digest = digest;
        this.rev = rev;

        _assignMethodsToAttachment(this);
    }

    remove(): Promise<any> {
        return this.doc.collection.pouch.removeAttachment(
            this.doc.primary,
            this.id,
            this.doc._data._rev
        ).then(() => resyncRxDocument(this.doc));
    }

    /**
     * returns the data for the attachment
     */
    getData(): Promise<BlobBuffer> {
        return this.doc.collection.pouch.getAttachment(this.doc.primary, this.id)
            .then((data: any) => {
                if (shouldEncrypt(this.doc.collection.schema)) {
                    return blobBufferUtil.toString(data)
                        .then(dataString => blobBufferUtil.createBlobBuffer(
                            this.doc.collection._crypter._decryptValue(dataString),
                            this.type as any
                        ));
                } else return data;
            });
    }

    getStringData(): Promise<string> {
        return this.getData().then(bufferBlob => blobBufferUtil.toString(bufferBlob));
    }
}

export function fromPouchDocument(
    id: string,
    pouchDocAttachment: any,
    rxDocument: RxDocument
) {
    return new RxAttachment({
        doc: rxDocument,
        id,
        type: pouchDocAttachment.content_type,
        length: pouchDocAttachment.length,
        digest: pouchDocAttachment.digest,
        rev: pouchDocAttachment.revpos
    });
}

function shouldEncrypt(schema: RxSchema): boolean {
    return !!(schema.jsonSchema.attachments && schema.jsonSchema.attachments.encrypted);
}

export async function putAttachment(
    this: RxDocument,
    {
        id,
        data,
        type = 'text/plain'
    }: any,
    /**
     * TODO set to default=true
     * in next major release
     */
    skipIfSame: boolean = false
): Promise<RxAttachment> {
    ensureSchemaSupportsAttachments(this);

    if (shouldEncrypt(this.collection.schema)) {
        data = (this.collection._crypter as any)._encryptValue(data);
    }

    const blobBuffer = blobBufferUtil.createBlobBuffer(data, type);

    this._atomicQueue = this._atomicQueue
        .then(async () => {
            if (skipIfSame && this._data._attachments && this._data._attachments[id]) {
                const currentMeta = this._data._attachments[id];

                const newHash: string = await pouchAttachmentBinaryHash(data);

                if (currentMeta.content_type === type && currentMeta.digest === newHash) {
                    // skip because same data and same type
                    return this.getAttachment(id);
                }
            }
            return this.collection.pouch.putAttachment(
                this.primary,
                id,
                this._data._rev,
                blobBuffer,
                type
            ).then(() => this.collection.pouch.get(this.primary))
                .then(docData => {
                    const attachmentData = docData._attachments[id];
                    const attachment = fromPouchDocument(
                        id,
                        attachmentData,
                        this
                    );

                    this._data._rev = docData._rev;
                    this._data._attachments = docData._attachments;
                    return resyncRxDocument(this)
                        .then(() => attachment);
                });
        });
    return this._atomicQueue;
}

/**
 * get an attachment of the document by its id
 */
export function getAttachment(
    this: RxDocument,
    id: string
): RxAttachment | null {
    ensureSchemaSupportsAttachments(this);
    const docData: any = this._dataSync$.getValue();
    if (!docData._attachments || !docData._attachments[id])
        return null;

    const attachmentData = docData._attachments[id];
    const attachment = fromPouchDocument(
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
    const docData: any = this._dataSync$.getValue();

    // if there are no attachments, the field is missing
    if (!docData._attachments) return [];

    return Object.keys(docData._attachments)
        .map(id => {
            return fromPouchDocument(
                id,
                docData._attachments[id],
                this
            );
        });
}

export async function preMigrateDocument(
    data: {
        docData: WithAttachments<any>;
        oldCollection: OldRxCollection
    }
): Promise<void> {
    const attachments = data.docData._attachments;
    if (attachments) {
        const mustDecrypt = !!shouldEncrypt(data.oldCollection.schema);
        const newAttachments: { [attachmentId: string]: PouchAttachmentWithData } = {};
        await Promise.all(
            Object.keys(attachments).map(async (attachmentId) => {
                const attachment: PouchAttachmentMeta = attachments[attachmentId];
                const docPrimary: string = data.docData[data.oldCollection.schema.primaryPath];

                let rawAttachmentData = await data.oldCollection.pouchdb.getAttachment(docPrimary, attachmentId);
                if (mustDecrypt) {
                    rawAttachmentData = await blobBufferUtil.toString(rawAttachmentData)
                        .then(dataString => blobBufferUtil.createBlobBuffer(
                            data.oldCollection._crypter._decryptValue(dataString),
                            (attachment as PouchAttachmentMeta).content_type as any
                        ));
                }

                newAttachments[attachmentId] = {
                    digest: attachment.digest,
                    length: attachment.length,
                    revpos: attachment.revpos,
                    content_type: attachment.content_type,
                    stub: false, // set this to false because now we have the full data
                    data: rawAttachmentData
                };
            })
        );

        /**
         * Hooks mutate the input
         * instead of returning stuff
         */
        data.docData._attachments = newAttachments;
    }
}

export async function postMigrateDocument(action: any): Promise<void> {
    /**
     * No longer needed because
     * we store the attachemnts data buffers directly in the document.
     */
    return;
}

export const rxdb = true;
export const prototypes = {
    RxDocument: (proto: any) => {
        proto.putAttachment = putAttachment;
        proto.getAttachment = getAttachment;
        proto.allAttachments = allAttachments;
        Object.defineProperty(proto, 'allAttachments$', {
            get: function allAttachments$() {
                return this._dataSync$
                    .pipe(
                        map((data: any) => {
                            if (!data['_attachments'])
                                return {};
                            return data['_attachments'];
                        }),
                        map((attachmentsData: any) => Object.entries(
                            attachmentsData
                        )),
                        map(entries => {
                            return (entries as any)
                                .map(([id, attachmentData]: any) => {
                                    return fromPouchDocument(
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
};
export const overwritable = {};
export const hooks = {
    preMigrateDocument,
    postMigrateDocument
};

export const RxDBAttachmentsPlugin: RxPlugin = {
    name: 'attachments',
    rxdb,
    prototypes,
    overwritable,
    hooks
};
