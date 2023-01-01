import { DocumentCache } from '../../doc-cache';
import { IncrementalWriteQueue } from '../../incremental-write';
import { RxCollection } from '../rx-collection';
import { RxDatabase } from '../rx-database';
import { RxDocumentBase } from '../rx-document';
import { RxStorageInstance } from '../rx-storage.interface';
import { Override } from '../util';

export type LocalDocumentParent = RxDatabase | RxCollection;
export type LocalDocumentState = {
    database: RxDatabase;
    parent: LocalDocumentParent;
    storageInstance: RxStorageInstance<RxLocalDocumentData, any, any>;
    docCache: DocumentCache<RxLocalDocumentData, {}>;
    incrementalWriteQueue: IncrementalWriteQueue<RxLocalDocumentData>;
};
export type RxLocalDocumentData<
    Data = {
        // local documents are schemaless and contain any data
        [key: string]: any;
    }
> = {
    id: string;
    data: Data;
};

declare type LocalDocumentModifyFunction<Data> = (
    doc: Data,
    rxLocalDocument: RxLocalDocument<any, Data>
) => Data | Promise<Data>;


export declare type RxLocalDocument<Parent, Data = any> = Override<
RxDocumentBase<RxLocalDocumentData<Data>, {}>,
{
    readonly parent: Parent;
    isLocal(): true;

    /**
         * Because local documents store their relevant data inside of the 'data' property,
         * the incremental mutation methods are changed a bit to only allow to change parts of the data property.
         */
    incrementalModify(mutationFunction: LocalDocumentModifyFunction<Data>): Promise<RxLocalDocument<Parent, Data>>;
    incrementalPatch(patch: Partial<Data>): Promise<RxLocalDocument<Parent, Data>>;
}
>;
