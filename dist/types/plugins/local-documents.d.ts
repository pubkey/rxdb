/**
 * This plugin adds the local-documents-support
 * Local documents behave equal then with pouchdb
 * @link https://pouchdb.com/guides/local-documents.html
 */
import type { RxCollection, RxDatabase, RxPlugin } from '../types';
declare const RxDocumentParent: any;
export declare class RxLocalDocument extends RxDocumentParent {
    id: string;
    parent: RxCollection | RxDatabase;
    constructor(id: string, jsonData: any, parent: RxCollection | RxDatabase);
}
export declare const rxdb = true;
export declare const prototypes: {
    RxCollection: (proto: any) => void;
    RxDatabase: (proto: any) => void;
};
export declare const overwritable: {};
export declare const RxDBLocalDocumentsPlugin: RxPlugin;
export {};
