import type {
    RxDocument
} from './rx-document.d.ts';

declare type Buffer = any;

export type RxAttachmentCreator = {
    id: string;
    /**
     * Content type like 'plain/text'
     */
    type: string;
    /**
     * The data of the attachment.
     */
    data: Blob;
};

export declare class RxAttachment<RxDocumentType, OrmMethods = {}, Reactivity = unknown> {
    readonly doc: RxDocument<RxDocumentType, OrmMethods, Reactivity>;
    readonly id: string;
    readonly type: string;
    readonly length: number;
    readonly digest: string;
    readonly rev: string;

    remove(): Promise<void>;
    getData(): Promise<Blob>;
    getStringData(): Promise<string>;
}
