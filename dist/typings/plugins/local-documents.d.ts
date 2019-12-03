/**
 * This plugin adds the local-documents-support
 * Local documents behave equal then with pouchdb
 * @link https://pouchdb.com/guides/local-documents.html
 */
import { RxCollection, RxDatabase } from '../types';
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
declare const _default: {
    rxdb: boolean;
    prototypes: {
        RxCollection: (proto: any) => void;
        RxDatabase: (proto: any) => void;
    };
    overwritable: {};
};
export default _default;
