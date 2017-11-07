import {
    RxDocument
} from './rx-document';

export declare class RxAttachment<RxDocumentType> {
    readonly doc: RxDocument<RxDocumentType>;
    readonly id: string;
    readonly type: string;
    readonly length: number;
    readonly digest: string;
    readonly rev: string;

    remove(): Promise<void>;
    getData(): Promise<Blob>;
    getStringData(): Promise<string>;
}
