import type { RxCollection, RxDatabase, RxPlugin } from '../types';
declare const RxDocumentParent: any;
export declare class RxLocalDocument extends RxDocumentParent {
    readonly id: string;
    readonly parent: RxCollection | RxDatabase;
    constructor(id: string, jsonData: any, parent: RxCollection | RxDatabase);
}
export declare const RxDBLocalDocumentsPlugin: RxPlugin;
export {};
