import type { RxDocument, RxPlugin, RxAttachmentData, RxDocumentData, RxAttachmentCreator, RxCollection, RxAttachmentCreatorBase64 } from '../../types/index.ts';
/**
 * an RxAttachment is basically just the attachment-stub
 * wrapped so that you can access the attachment-data
 */
export declare class RxAttachment {
    doc: RxDocument;
    id: string;
    type: string;
    length: number;
    digest: string;
    constructor({ doc, id, type, length, digest }: any);
    remove(): Promise<void>;
    /**
     * returns the data for the attachment
     */
    getData(): Promise<Blob>;
    getStringData(): Promise<string>;
    getDataBase64(): Promise<string>;
}
export declare function fromStorageInstanceResult<RxDocType>(id: string, attachmentData: RxAttachmentData, rxDocument: RxDocument<RxDocType>): RxAttachment;
export declare function putAttachment<RxDocType>(this: RxDocument<RxDocType>, attachmentData: RxAttachmentCreator): Promise<RxAttachment>;
export declare function putAttachmentBase64<RxDocType>(this: RxDocument<RxDocType>, attachmentData: RxAttachmentCreatorBase64): Promise<RxAttachment>;
/**
 * get an attachment of the document by its id
 */
export declare function getAttachment(this: RxDocument, id: string): RxAttachment | null;
/**
 * returns all attachments of the document
 */
export declare function allAttachments(this: RxDocument): RxAttachment[];
export declare function preMigrateDocument<RxDocType>(data: {
    docData: RxDocumentData<RxDocType>;
    oldCollection: RxCollection<RxDocType>;
}): Promise<void>;
export declare function postMigrateDocument(_action: any): Promise<void>;
export declare const RxDBAttachmentsPlugin: RxPlugin;
export * from './attachments-utils.ts';
