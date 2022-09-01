import type { RxDocument, RxPlugin, BlobBuffer, OldRxCollection, RxAttachmentData, RxDocumentData, RxAttachmentCreator } from '../types';
/**
 * To be able to support PouchDB with attachments,
 * we have to use the md5 hashing here, even if the RxDatabase itself
 * has a different hashing function.
 */
export declare function hashAttachmentData(attachmentBase64String: string): Promise<string>;
export declare function getAttachmentSize(attachmentBase64String: string): number;
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
    getData(): Promise<BlobBuffer>;
    getStringData(): Promise<string>;
}
export declare function fromStorageInstanceResult(id: string, attachmentData: RxAttachmentData, rxDocument: RxDocument): RxAttachment;
export declare function putAttachment(this: RxDocument, attachmentData: RxAttachmentCreator, 
/**
 * If set to true, the write will be skipped
 * when the attachment already contains the same data.
 */
skipIfSame?: boolean): Promise<RxAttachment>;
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
    oldCollection: OldRxCollection;
}): Promise<void>;
export declare function postMigrateDocument(_action: any): Promise<void>;
export declare const RxDBAttachmentsPlugin: RxPlugin;
