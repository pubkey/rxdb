import {
    RxDocument
} from './rx-document';

export declare class RxAttachment<RxDocumentType> {
    doc: RxDocument<RxDocumentType>;
    id: string;
    type: string;
    length: number;
    digest: string;
    rev: string;

    remove(): Promise<void>;
    getData(): Promise<Blob>;
    getStringData(): Promise<string>;
}
