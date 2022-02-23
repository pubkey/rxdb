import {
    map
} from 'rxjs/operators';
import {
    blobBufferUtil,
    flatClone
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
    RxAttachmentWriteData,
    RxStorageStatics,
    RxAttachmentDataMeta
} from '../types';
import { writeSingle } from '../rx-storage-helper';
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
                const docWriteData: RxDocumentWriteData<{}> = flatClone(this.doc._data);
                docWriteData._attachments = flatClone(docWriteData._attachments);
                delete docWriteData._attachments[this.id];

                const writeResult: RxDocumentData<any> = await writeSingle(
                    this.doc.collection.storageInstance,
                    {
                        previous: flatClone(this.doc._data),
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
        const plainData = await this.doc.collection.storageInstance.getAttachmentData(
            this.doc.primary,
            this.id
        );

        const hookInput = {
            database: this.doc.collection.database,
            schema: this.doc.collection.schema.jsonSchema,
            type: this.type,
            plainData
        };
        await runAsyncPluginHooks('postReadAttachment', hookInput);
        return hookInput.plainData;
    }

    getStringData(): Promise<string> {
        return this.getData().then(bufferBlob => blobBufferUtil.toString(bufferBlob));
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

    await runAsyncPluginHooks('preWriteAttachment', {
        database: this.collection.database,
        schema: this.collection.schema.jsonSchema,
        attachmentData
    });

    const {
        id, data, type
    } = attachmentData;

    const statics = this.collection.database.storage.statics;
    this._atomicQueue = this._atomicQueue
        .then(async () => {
            if (skipIfSame && this._data._attachments && this._data._attachments[id]) {
                const currentMeta = this._data._attachments[id];
                const newHash = await statics.hash(data);
                const newDigest = statics.hashKey + '-' + newHash;
                if (currentMeta.type === type && currentMeta.digest === newDigest) {
                    // skip because same data and same type
                    return this.getAttachment(id);
                }
            }

            const docWriteData: RxDocumentWriteData<{}> = flatClone(this._data);
            docWriteData._attachments = flatClone(docWriteData._attachments);

            const meta = await getAttachmentDataMeta(
                this.collection.database.storage.statics,
                data
            );
            docWriteData._attachments[id] = {
                digest: meta.digest,
                length: meta.length,
                type,
                data: data
            };

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

                const meta = await getAttachmentDataMeta(
                    data.oldCollection.database.storage.statics,
                    rawAttachmentData
                );
                newAttachments[attachmentId] = {
                    digest: meta.digest,
                    length: meta.length,
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

export async function getAttachmentDataMeta(
    storageStatics: RxStorageStatics,
    data: BlobBuffer
): Promise<RxAttachmentDataMeta> {
    const hash = await storageStatics.hash(data);
    const length = blobBufferUtil.size(data);
    return {
        digest: storageStatics.hashKey + '-' + hash,
        length
    }
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
