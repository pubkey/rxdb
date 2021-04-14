import type { RxDocument, RxPlugin, BlobBuffer, WithAttachments, OldRxCollection } from '../types';
/**
 * an RxAttachment is basically just the attachment-stub
 * wrapped so that you can access the attachment-data
 */
export declare class RxAttachment {
    doc: any;
    id: string;
    type: string;
    length: number;
    digest: string;
    rev: string;
    constructor({ doc, id, type, length, digest, rev }: any);
    remove(): Promise<any>;
    /**
     * returns the data for the attachment
     */
    getData(): Promise<BlobBuffer>;
    getStringData(): Promise<string>;
}
export declare function fromPouchDocument(id: string, pouchDocAttachment: any, rxDocument: RxDocument): RxAttachment;
export declare function putAttachment(this: RxDocument, { id, data, type }: any, 
/**
 * TODO set to default=true
 * in next major release
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
export declare function preMigrateDocument(data: {
    docData: WithAttachments<any>;
    oldCollection: OldRxCollection;
}): Promise<void>;
export declare function postMigrateDocument(action: any): Promise<void>;
export declare const rxdb = true;
export declare const prototypes: {
    RxDocument: (proto: any) => void;
};
export declare const overwritable: {};
export declare const hooks: {
    preMigrateDocument: typeof preMigrateDocument;
    postMigrateDocument: typeof postMigrateDocument;
};
export declare const RxDBAttachmentsPlugin: RxPlugin;
