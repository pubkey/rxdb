import { Observable } from 'rxjs';
import type { RxDocument, RxCollection, RxDocumentData, RxDocumentWriteData, UpdateQuery, CRDTEntry, ModifyFunction } from './types/index.d.ts';
export declare const basePrototype: {
    readonly primaryPath: import("./types/util").StringKeys<{
        _deleted: boolean;
        _attachments: {
            [attachmentId: string]: import("./types/rx-storage").RxAttachmentData;
        };
        _rev: string;
        _meta: import("./types/rx-document").RxDocumentMeta;
    }> | undefined;
    readonly primary: any;
    readonly revision: string | undefined;
    readonly deleted$: any;
    readonly deleted$$: any;
    readonly deleted: boolean | undefined;
    getLatest(this: RxDocument): RxDocument;
    /**
     * returns the observable which emits the plain-data of this document
     */
    readonly $: Observable<any>;
    readonly $$: any;
    /**
     * returns observable of the value of the given path
     */
    get$(this: RxDocument, path: string): Observable<any>;
    get$$(this: RxDocument, path: string): any;
    /**
     * populate the given path
     */
    populate(this: RxDocument, path: string): Promise<RxDocument | null>;
    /**
     * get data by objectPath
     * @hotPath Performance here is really important,
     * run some tests before changing anything.
     */
    get(this: RxDocument, objPath: string): any | null;
    toJSON(this: RxDocument, withMetaFields?: boolean): import("./types/util").DeepReadonlyObject<{
        _deleted: boolean;
        _attachments: {
            [attachmentId: string]: import("./types/rx-storage").RxAttachmentData;
        };
        _rev: string;
        _meta: import("./types/rx-document").RxDocumentMeta;
    }>;
    toMutableJSON(this: RxDocument, withMetaFields?: boolean): {
        _deleted: boolean;
        _attachments: {
            [attachmentId: string]: import("./types/rx-storage").RxAttachmentData;
        };
        _rev: string;
        _meta: import("./types/rx-document").RxDocumentMeta;
    };
    /**
     * updates document
     * @overwritten by plugin (optional)
     * @param updateObj mongodb-like syntax
     */
    update(_updateObj: UpdateQuery<any>): never;
    incrementalUpdate(_updateObj: UpdateQuery<any>): never;
    updateCRDT(_updateObj: CRDTEntry<any> | CRDTEntry<any>[]): never;
    putAttachment(): never;
    getAttachment(): never;
    allAttachments(): never;
    readonly allAttachments$: void;
    modify<RxDocType>(this: RxDocument<RxDocType>, mutationFunction: ModifyFunction<RxDocType>, _context?: string): Promise<RxDocument>;
    /**
     * runs an incremental update over the document
     * @param function that takes the document-data and returns a new data-object
     */
    incrementalModify(this: RxDocument, mutationFunction: ModifyFunction<any>, _context?: string): Promise<RxDocument>;
    patch<RxDocType_1>(this: RxDocument<RxDocType_1>, patch: Partial<RxDocType_1>): Promise<RxDocument<RxDocType_1, {}, unknown>>;
    /**
     * patches the given properties
     */
    incrementalPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType>>;
    /**
     * saves the new document-data
     * and handles the events
     */
    _saveData<RxDocType_2>(this: RxDocument<RxDocType_2>, newData: RxDocumentWriteData<RxDocType_2>, oldData: RxDocumentData<RxDocType_2>): Promise<RxDocument<RxDocType_2>>;
    /**
     * Remove the document.
     * Notice that there is no hard delete,
     * instead deleted documents get flagged with _deleted=true.
     */
    remove(this: RxDocument): Promise<RxDocument>;
    incrementalRemove(this: RxDocument): Promise<RxDocument>;
    destroy(): never;
};
export declare function createRxDocumentConstructor(proto?: {
    readonly primaryPath: import("./types/util").StringKeys<{
        _deleted: boolean;
        _attachments: {
            [attachmentId: string]: import("./types/rx-storage").RxAttachmentData;
        };
        _rev: string;
        _meta: import("./types/rx-document").RxDocumentMeta;
    }> | undefined;
    readonly primary: any;
    readonly revision: string | undefined;
    readonly deleted$: any;
    readonly deleted$$: any;
    readonly deleted: boolean | undefined;
    getLatest(this: RxDocument): RxDocument;
    /**
     * returns the observable which emits the plain-data of this document
     */
    readonly $: Observable<any>;
    readonly $$: any;
    /**
     * returns observable of the value of the given path
     */
    get$(this: RxDocument, path: string): Observable<any>;
    get$$(this: RxDocument, path: string): any;
    /**
     * populate the given path
     */
    populate(this: RxDocument, path: string): Promise<RxDocument | null>;
    /**
     * get data by objectPath
     * @hotPath Performance here is really important,
     * run some tests before changing anything.
     */
    get(this: RxDocument, objPath: string): any;
    toJSON(this: RxDocument, withMetaFields?: boolean): import("./types/util").DeepReadonlyObject<{
        _deleted: boolean;
        _attachments: {
            [attachmentId: string]: import("./types/rx-storage").RxAttachmentData;
        };
        _rev: string;
        _meta: import("./types/rx-document").RxDocumentMeta;
    }>;
    toMutableJSON(this: RxDocument, withMetaFields?: boolean): {
        _deleted: boolean;
        _attachments: {
            [attachmentId: string]: import("./types/rx-storage").RxAttachmentData;
        };
        _rev: string;
        _meta: import("./types/rx-document").RxDocumentMeta;
    };
    /**
     * updates document
     * @overwritten by plugin (optional)
     * @param updateObj mongodb-like syntax
     */
    update(_updateObj: UpdateQuery<any>): never;
    incrementalUpdate(_updateObj: UpdateQuery<any>): never;
    updateCRDT(_updateObj: CRDTEntry<any> | CRDTEntry<any>[]): never;
    putAttachment(): never;
    getAttachment(): never;
    allAttachments(): never;
    readonly allAttachments$: void;
    modify<RxDocType>(this: RxDocument<RxDocType>, mutationFunction: ModifyFunction<RxDocType>, _context?: string | undefined): Promise<RxDocument>;
    /**
     * runs an incremental update over the document
     * @param function that takes the document-data and returns a new data-object
     */
    incrementalModify(this: RxDocument, mutationFunction: ModifyFunction<any>, _context?: string | undefined): Promise<RxDocument>;
    patch<RxDocType_1>(this: RxDocument<RxDocType_1>, patch: Partial<RxDocType_1>): Promise<RxDocument<RxDocType_1, {}, unknown>>;
    /**
     * patches the given properties
     */
    incrementalPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType>>;
    /**
     * saves the new document-data
     * and handles the events
     */
    _saveData<RxDocType_2>(this: RxDocument<RxDocType_2>, newData: RxDocumentWriteData<RxDocType_2>, oldData: RxDocumentData<RxDocType_2>): Promise<RxDocument<RxDocType_2>>;
    /**
     * Remove the document.
     * Notice that there is no hard delete,
     * instead deleted documents get flagged with _deleted=true.
     */
    remove(this: RxDocument): Promise<RxDocument>;
    incrementalRemove(this: RxDocument): Promise<RxDocument>;
    destroy(): never;
}): {
    (this: RxDocument, collection: RxCollection, docData: RxDocumentData<any>): void;
    prototype: {
        readonly primaryPath: import("./types/util").StringKeys<{
            _deleted: boolean;
            _attachments: {
                [attachmentId: string]: import("./types/rx-storage").RxAttachmentData;
            };
            _rev: string;
            _meta: import("./types/rx-document").RxDocumentMeta;
        }> | undefined;
        readonly primary: any;
        readonly revision: string | undefined;
        readonly deleted$: any;
        readonly deleted$$: any;
        readonly deleted: boolean | undefined;
        getLatest(this: RxDocument): RxDocument;
        /**
         * returns the observable which emits the plain-data of this document
         */
        readonly $: Observable<any>;
        readonly $$: any;
        /**
         * returns observable of the value of the given path
         */
        get$(this: RxDocument, path: string): Observable<any>;
        get$$(this: RxDocument, path: string): any;
        /**
         * populate the given path
         */
        populate(this: RxDocument, path: string): Promise<RxDocument | null>;
        /**
         * get data by objectPath
         * @hotPath Performance here is really important,
         * run some tests before changing anything.
         */
        get(this: RxDocument, objPath: string): any;
        toJSON(this: RxDocument, withMetaFields?: boolean): import("./types/util").DeepReadonlyObject<{
            _deleted: boolean;
            _attachments: {
                [attachmentId: string]: import("./types/rx-storage").RxAttachmentData;
            };
            _rev: string;
            _meta: import("./types/rx-document").RxDocumentMeta;
        }>;
        toMutableJSON(this: RxDocument, withMetaFields?: boolean): {
            _deleted: boolean;
            _attachments: {
                [attachmentId: string]: import("./types/rx-storage").RxAttachmentData;
            };
            _rev: string;
            _meta: import("./types/rx-document").RxDocumentMeta;
        };
        /**
         * updates document
         * @overwritten by plugin (optional)
         * @param updateObj mongodb-like syntax
         */
        update(_updateObj: UpdateQuery<any>): never;
        incrementalUpdate(_updateObj: UpdateQuery<any>): never;
        updateCRDT(_updateObj: CRDTEntry<any> | CRDTEntry<any>[]): never;
        putAttachment(): never;
        getAttachment(): never;
        allAttachments(): never;
        readonly allAttachments$: void;
        modify<RxDocType>(this: RxDocument<RxDocType>, mutationFunction: ModifyFunction<RxDocType>, _context?: string | undefined): Promise<RxDocument>;
        /**
         * runs an incremental update over the document
         * @param function that takes the document-data and returns a new data-object
         */
        incrementalModify(this: RxDocument, mutationFunction: ModifyFunction<any>, _context?: string | undefined): Promise<RxDocument>;
        patch<RxDocType_1>(this: RxDocument<RxDocType_1>, patch: Partial<RxDocType_1>): Promise<RxDocument<RxDocType_1, {}, unknown>>;
        /**
         * patches the given properties
         */
        incrementalPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType>>;
        /**
         * saves the new document-data
         * and handles the events
         */
        _saveData<RxDocType_2>(this: RxDocument<RxDocType_2>, newData: RxDocumentWriteData<RxDocType_2>, oldData: RxDocumentData<RxDocType_2>): Promise<RxDocument<RxDocType_2>>;
        /**
         * Remove the document.
         * Notice that there is no hard delete,
         * instead deleted documents get flagged with _deleted=true.
         */
        remove(this: RxDocument): Promise<RxDocument>;
        incrementalRemove(this: RxDocument): Promise<RxDocument>;
        destroy(): never;
    };
};
export declare function createWithConstructor<RxDocType>(constructor: any, collection: RxCollection<RxDocType>, jsonData: RxDocumentData<RxDocType>): RxDocument<RxDocType> | null;
export declare function isRxDocument(obj: any): boolean;
export declare function beforeDocumentUpdateWrite<RxDocType>(collection: RxCollection<RxDocType>, newData: RxDocumentWriteData<RxDocType>, oldData: RxDocumentData<RxDocType>): Promise<any>;
