import { BlobBuffer } from './pouch';
import {
    RxDocument
} from './rx-document';
import { RxAttachmentWriteData } from './rx-storage';

declare type Buffer = any;

export type RxAttachmentCreator = RxAttachmentWriteData & {
    id: string,
};

export declare class RxAttachment<RxDocumentType, OrmMethods = {}> {
    readonly doc: RxDocument<RxDocumentType, OrmMethods>;
    readonly id: string;
    readonly type: string;
    readonly length: number;
    readonly digest: string;
    readonly rev: string;

    remove(): Promise<void>;
    getData(): Promise<BlobBuffer>;
    getStringData(): Promise<string>;
}
