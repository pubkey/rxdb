import type { Observable } from 'rxjs';
import type { DocumentCache } from '../../doc-cache.d.ts';
import type { IncrementalWriteQueue } from '../../incremental-write.d.ts';
import type { RxCollection } from '../rx-collection.d.ts';
import type { RxDatabase } from '../rx-database.d.ts';
import type { RxDocumentBase } from '../rx-document.d.ts';
import type { RxStorageInstance } from '../rx-storage.interface.d.ts';
import type { Override } from '../util.d.ts';

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


export declare type RxLocalDocument<Parent, Data = any, Reactivity = unknown> = Override<
    RxDocumentBase<RxLocalDocumentData<Data>, {}, Reactivity>,
    {
        readonly parent: Parent;
        isLocal(): true;

        /**
             * Because local documents store their relevant data inside of the 'data' property,
             * the incremental mutation methods are changed a bit to only allow to change parts of the data property.
             */
        incrementalModify(mutationFunction: LocalDocumentModifyFunction<Data>): Promise<RxLocalDocument<Parent, Data, Reactivity>>;
        incrementalPatch(patch: Partial<Data>): Promise<RxLocalDocument<Parent, Data, Reactivity>>;

        $: Observable<RxLocalDocument<Parent, Data, Reactivity>>;
    }
>;
