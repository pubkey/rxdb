import type { LocalDocumentParent, RxCollection, RxDatabase, RxDocumentData, RxLocalDocument, RxLocalDocumentData } from '../../types/';
declare const RxDocumentParent: any;
declare class RxLocalDocumentClass<DocData = any> extends RxDocumentParent {
    readonly id: string;
    readonly parent: RxCollection | RxDatabase;
    constructor(id: string, jsonData: DocData, parent: RxCollection | RxDatabase);
}
export declare function createRxLocalDocument<DocData>(data: RxDocumentData<RxLocalDocumentData<DocData>>, parent: any): RxLocalDocument<DocData>;
export declare function getRxDatabaseFromLocalDocument(doc: RxLocalDocument<any> | RxLocalDocumentClass): RxDatabase<import("../../types/rx-database").CollectionsOfDatabase, any, {}, unknown> | import("../../rx-database.ts").RxDatabaseBase<any, any, any, any>;
export declare function createLocalDocStateByParent(parent: LocalDocumentParent): void;
export {};
