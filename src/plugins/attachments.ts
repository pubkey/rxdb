import {
    map
} from 'rxjs/operators';

import {
    blobBufferUtil,
    createRevision,
    flatClone,
    now
} from './../util';
import {
    newRxError
} from '../rx-error';
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
} from '../types';
import { flatCloneDocWithMeta, hashAttachmentData, writeSingle } from '../rx-storage-helper';
import { runAsyncPluginHooks } from '../hooks';

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

    async remove(): Promise<void> {
        this.doc._atomicQueue = this.doc._atomicQueue
            .then(async () => {
                const docWriteData: RxDocumentWriteData<{}> = flatCloneDocWithMeta(this.doc._data);
                docWriteData._attachments = flatClone(docWriteData._attachments);
                delete docWriteData._attachments[this.id];


                docWriteData._rev = createRevision(docWriteData, this.doc._data);

                const writeResult: RxDocumentData<any> = await writeSingle(
                    this.doc.collection.storageInstance,
                    {
                        previous: flatClone(this.doc._data), // TODO do we need a flatClone here?
                        document: docWriteData
                    }
                );

                const newData = flatClone(this.doc._data);
                newData._rev = writeResult._rev;
                newData._attachments = writeResult._attachments;
                this.doc._dataSync$.next(newData);

            });
        return this.doc._atomicQueue;
    }

    /**
     * returns the data for the attachment
     */
    async getData(): Promise<BlobBuffer> {
        const plainDataBase64 = await this.doc.collection.storageInstance.getAttachmentData(
            this.doc.primary,
            this.id
        );
        const hookInput = {
            database: this.doc.collection.database,
            schema: this.doc.collection.schema.jsonSchema,
            type: this.type,
            plainData: plainDataBase64
        };
        await runAsyncPluginHooks('postReadAttachment', hookInput);
        const ret = await blobBufferUtil.createBlobBufferFromBase64(
            hookInput.plainData,
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

export function fromStorageInstanceResult(
    id: string,
    attachmentData: RxAttachmentData,
    rxDocument: RxDocument
) {
    return new RxAttachment({
        doc: rxDocument,
        id,
        type: attachmentData.type,
        length: attachmentData.length,
        digest: attachmentData.digest
    });
}

export async function putAttachment(
    this: RxDocument,
    attachmentData: RxAttachmentCreator,
    /**
     * If set to true, the write will be skipped
     * when the attachment already contains the same data.
     */
    skipIfSame: boolean = true
): Promise<RxAttachment> {
    ensureSchemaSupportsAttachments(this);


    const dataSize = blobBufferUtil.size(attachmentData.data);
    const storageStatics = this.collection.database.storage.statics;
    const dataString = await blobBufferUtil.toBase64String(attachmentData.data);

    const hookAttachmentData = {
        id: attachmentData.id,
        type: attachmentData.type,
        data: dataString
    };
    await runAsyncPluginHooks('preWriteAttachment', {
        database: this.collection.database,
        schema: this.collection.schema.jsonSchema,
        attachmentData: hookAttachmentData
    });

    const {
        id, data, type
    } = hookAttachmentData;

    const newDigest = await hashAttachmentData(
        dataString,
        storageStatics
    ).then(hash => storageStatics.hashKey + '-' + hash);

    this._atomicQueue = this._atomicQueue
        .then(async () => {
            if (skipIfSame && this._data._attachments && this._data._attachments[id]) {
                const currentMeta = this._data._attachments[id];
                if (currentMeta.type === type && currentMeta.digest === newDigest) {
                    // skip because same data and same type
                    return this.getAttachment(id);
                }
            }

            const docWriteData: RxDocumentWriteData<{}> = flatCloneDocWithMeta(this._data);
            docWriteData._attachments = flatClone(docWriteData._attachments);

            docWriteData._attachments[id] = {
                digest: newDigest,
                length: dataSize,
                type,
                data
            };

            docWriteData._rev = createRevision(docWriteData, this._data);

            const writeRow = {
                previous: flatClone(this._data),
                document: flatClone(docWriteData)
            };

            const writeResult = await writeSingle(
                this.collection.storageInstance,
                writeRow
            );

            const attachmentData = writeResult._attachments[id];
            const attachment = fromStorageInstanceResult(
                id,
                attachmentData,
                this
            );

            const newData = flatClone(this._data);
            newData._rev = writeResult._rev;
            newData._attachments = writeResult._attachments;
            this._dataSync$.next(newData);

            return attachment;
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
    const docData: any = this._dataSync$.getValue();

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
        oldCollection: OldRxCollection
    }
): Promise<void> {
    const attachments = data.docData._attachments;
    if (attachments) {
        const newAttachments: { [attachmentId: string]: RxAttachmentWriteData } = {};
        await Promise.all(
            Object.keys(attachments).map(async (attachmentId) => {
                const attachment: RxAttachmentData = attachments[attachmentId];
                const docPrimary: string = (data.docData as any)[data.oldCollection.schema.primaryPath];

                let rawAttachmentData = await data.oldCollection.storageInstance.getAttachmentData(docPrimary, attachmentId);

                const hookInput = {
                    database: data.oldCollection.database,
                    schema: data.oldCollection.schema.jsonSchema,
                    type: attachment.type,
                    plainData: rawAttachmentData
                };
                await runAsyncPluginHooks('postReadAttachment', hookInput);
                rawAttachmentData = hookInput.plainData;

                newAttachments[attachmentId] = {
                    digest: attachment.digest,
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

export async function postMigrateDocument(_action: any): Promise<void> {
    /**
     * No longer needed because
     * we store the attachemnts data buffers directly in the document.
     */
    return;
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
                get: function allAttachments$() {
                    return this._dataSync$
                        .pipe(
                            map((data: any) => {
                                if (!data['_attachments']) {
                                    return {};
                                }
                                return data['_attachments'];
                            }),
                            map((attachmentsData: any) => Object.entries(
                                attachmentsData
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
