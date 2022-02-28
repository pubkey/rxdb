import { DocCache } from '../../doc-cache';
import { RxCollection } from '../rx-collection';
import { RxDatabase } from '../rx-database';
import { RxDocumentBase } from '../rx-document';
import { RxStorageInstance } from '../rx-storage.interface';

export type LocalDocumentParent = RxDatabase | RxCollection;
export type LocalDocumentState = {
    database: RxDatabase,
    parent: LocalDocumentParent;
    storageInstance: RxStorageInstance<RxLocalDocumentData, any, any>;
    docCache: DocCache<RxLocalDocument<any, any>>;
}
export type RxLocalDocumentData<
    Data = {
        // local documents are schemaless and contain any data
        [key: string]: any
    }
    > = {
        id: string;
        data: Data;
    };


    export declare type RxLocalDocument<Parent, Data = any> = RxDocumentBase<RxLocalDocumentData<Data>> & {
        readonly parent: Parent;
        isLocal(): true;
    }
