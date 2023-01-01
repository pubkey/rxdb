import { Observable } from 'rxjs';
import type { RxDocument, RxCollection, RxDocumentData, RxDocumentWriteData, UpdateQuery, CRDTEntry, ModifyFunction } from './types';
export declare const basePrototype: {
    readonly primaryPath: "_deleted" | "_attachments" | "_rev" | "_meta" | undefined;
    readonly primary: any;
    readonly revision: string | undefined;
    readonly deleted$: any;
    readonly deleted: boolean | undefined;
    getLatest(this: import("./types").RxDocumentBase<{}, {}>): import("./types").RxDocumentBase<{}, {}>;
    /**
     * returns the observable which emits the plain-data of this document
     */
    readonly $: Observable<any>;
    /**
     * returns observable of the value of the given path
     */
    get$(this: import("./types").RxDocumentBase<{}, {}>, path: string): Observable<any>;
    /**
     * populate the given path
     */
    populate(this: import("./types").RxDocumentBase<{}, {}>, path: string): Promise<RxDocument | null>;
    /**
     * get data by objectPath
     */
    get(this: import("./types").RxDocumentBase<{}, {}>, objPath: string): any | null;
    toJSON(this: import("./types").RxDocumentBase<{}, {}>, withMetaFields?: boolean): import("./types").DeepReadonlyObject<{
        _deleted: boolean;
        _attachments: {
            [attachmentId: string]: import("./types").RxAttachmentData;
        };
        _rev: string;
        _meta: import("./types").RxDocumentMeta;
    }>;
    toMutableJSON(this: import("./types").RxDocumentBase<{}, {}>, withMetaFields?: boolean): {
        _deleted: boolean;
        _attachments: {
            [attachmentId: string]: import("./types").RxAttachmentData;
        };
        _rev: string;
        _meta: import("./types").RxDocumentMeta;
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
    modify<RxDocType>(this: RxDocument<RxDocType, {}>, mutationFunction: ModifyFunction<RxDocType>, _context?: string): Promise<RxDocument>;
    /**
     * runs an incremental update over the document
     * @param function that takes the document-data and returns a new data-object
     */
    incrementalModify(this: import("./types").RxDocumentBase<{}, {}>, mutationFunction: ModifyFunction<any>, _context?: string): Promise<RxDocument>;
    patch<RxDocType_1>(this: RxDocument<RxDocType_1, {}>, patch: Partial<RxDocType_1>): Promise<RxDocument<RxDocType_1, {}>>;
    /**
     * patches the given properties
     */
    incrementalPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType, {}>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, {}>>;
    /**
     * saves the new document-data
     * and handles the events
     */
    _saveData<RxDocType_2>(this: RxDocument<RxDocType_2, {}>, newData: RxDocumentWriteData<RxDocType_2>, oldData: RxDocumentData<RxDocType_2>): Promise<RxDocument<RxDocType_2, {}>>;
    /**
     * Remove the document.
     * Notice that there is no hard delete,
     * instead deleted documents get flagged with _deleted=true.
     */
    remove(this: import("./types").RxDocumentBase<{}, {}>): Promise<RxDocument>;
    incrementalRemove(this: import("./types").RxDocumentBase<{}, {}>): Promise<RxDocument>;
    destroy(): never;
};
export declare function createRxDocumentConstructor(proto?: {
    readonly primaryPath: "_deleted" | "_attachments" | "_rev" | "_meta" | undefined;
    readonly primary: any;
    readonly revision: string | undefined;
    readonly deleted$: any;
    readonly deleted: boolean | undefined;
    getLatest(this: import("./types").RxDocumentBase<{}, {}>): import("./types").RxDocumentBase<{}, {}>;
    /**
     * returns the observable which emits the plain-data of this document
     */
    readonly $: Observable<any>;
    /**
     * returns observable of the value of the given path
     */
    get$(this: import("./types").RxDocumentBase<{}, {}>, path: string): Observable<any>;
    /**
     * populate the given path
     */
    populate(this: import("./types").RxDocumentBase<{}, {}>, path: string): Promise<import("./types").RxDocumentBase<{}, {}> | null>;
    /**
     * get data by objectPath
     */
    get(this: import("./types").RxDocumentBase<{}, {}>, objPath: string): any;
    toJSON(this: import("./types").RxDocumentBase<{}, {}>, withMetaFields?: boolean): import("./types").DeepReadonlyObject<{
        _deleted: boolean;
        _attachments: {
            [attachmentId: string]: import("./types").RxAttachmentData;
        };
        _rev: string;
        _meta: import("./types").RxDocumentMeta;
    }>;
    toMutableJSON(this: import("./types").RxDocumentBase<{}, {}>, withMetaFields?: boolean): {
        _deleted: boolean;
        _attachments: {
            [attachmentId: string]: import("./types").RxAttachmentData;
        };
        _rev: string;
        _meta: import("./types").RxDocumentMeta;
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
    modify<RxDocType>(this: RxDocument<RxDocType, {}>, mutationFunction: ModifyFunction<RxDocType>, _context?: string | undefined): Promise<import("./types").RxDocumentBase<{}, {}>>;
    /**
     * runs an incremental update over the document
     * @param function that takes the document-data and returns a new data-object
     */
    incrementalModify(this: import("./types").RxDocumentBase<{}, {}>, mutationFunction: ModifyFunction<any>, _context?: string | undefined): Promise<import("./types").RxDocumentBase<{}, {}>>;
    patch<RxDocType_1>(this: RxDocument<RxDocType_1, {}>, patch: Partial<RxDocType_1>): Promise<RxDocument<RxDocType_1, {}>>;
    /**
     * patches the given properties
     */
    incrementalPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType, {}>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, {}>>;
    /**
     * saves the new document-data
     * and handles the events
     */
    _saveData<RxDocType_2>(this: RxDocument<RxDocType_2, {}>, newData: RxDocumentWriteData<RxDocType_2>, oldData: RxDocumentData<RxDocType_2>): Promise<RxDocument<RxDocType_2, {}>>;
    /**
     * Remove the document.
     * Notice that there is no hard delete,
     * instead deleted documents get flagged with _deleted=true.
     */
    remove(this: import("./types").RxDocumentBase<{}, {}>): Promise<import("./types").RxDocumentBase<{}, {}>>;
    incrementalRemove(this: import("./types").RxDocumentBase<{}, {}>): Promise<import("./types").RxDocumentBase<{}, {}>>;
    destroy(): never;
}): {
    (this: import("./types").RxDocumentBase<{}, {}>, collection: RxCollection, docData: RxDocumentData<any>): void;
    prototype: {
        readonly primaryPath: "_deleted" | "_attachments" | "_rev" | "_meta" | undefined;
        readonly primary: any;
        readonly revision: string | undefined;
        readonly deleted$: any;
        readonly deleted: boolean | undefined;
        getLatest(this: import("./types").RxDocumentBase<{}, {}>): import("./types").RxDocumentBase<{}, {}>;
        /**
         * returns the observable which emits the plain-data of this document
         */
        readonly $: Observable<any>;
        /**
         * returns observable of the value of the given path
         */
        get$(this: import("./types").RxDocumentBase<{}, {}>, path: string): Observable<any>;
        /**
         * populate the given path
         */
        populate(this: import("./types").RxDocumentBase<{}, {}>, path: string): Promise<import("./types").RxDocumentBase<{}, {}> | null>;
        /**
         * get data by objectPath
         */
        get(this: import("./types").RxDocumentBase<{}, {}>, objPath: string): any;
        toJSON(this: import("./types").RxDocumentBase<{}, {}>, withMetaFields?: boolean): import("./types").DeepReadonlyObject<{
            _deleted: boolean;
            _attachments: {
                [attachmentId: string]: import("./types").RxAttachmentData;
            };
            _rev: string;
            _meta: import("./types").RxDocumentMeta;
        }>;
        toMutableJSON(this: import("./types").RxDocumentBase<{}, {}>, withMetaFields?: boolean): {
            _deleted: boolean;
            _attachments: {
                [attachmentId: string]: import("./types").RxAttachmentData;
            };
            _rev: string;
            _meta: import("./types").RxDocumentMeta;
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
        modify<RxDocType>(this: RxDocument<RxDocType, {}>, mutationFunction: ModifyFunction<RxDocType>, _context?: string | undefined): Promise<import("./types").RxDocumentBase<{}, {}>>;
        /**
         * runs an incremental update over the document
         * @param function that takes the document-data and returns a new data-object
         */
        incrementalModify(this: import("./types").RxDocumentBase<{}, {}>, mutationFunction: ModifyFunction<any>, _context?: string | undefined): Promise<import("./types").RxDocumentBase<{}, {}>>;
        patch<RxDocType_1>(this: RxDocument<RxDocType_1, {}>, patch: Partial<RxDocType_1>): Promise<RxDocument<RxDocType_1, {}>>;
        /**
         * patches the given properties
         */
        incrementalPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType, {}>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, {}>>;
        /**
         * saves the new document-data
         * and handles the events
         */
        _saveData<RxDocType_2>(this: RxDocument<RxDocType_2, {}>, newData: RxDocumentWriteData<RxDocType_2>, oldData: RxDocumentData<RxDocType_2>): Promise<RxDocument<RxDocType_2, {}>>;
        /**
         * Remove the document.
         * Notice that there is no hard delete,
         * instead deleted documents get flagged with _deleted=true.
         */
        remove(this: import("./types").RxDocumentBase<{}, {}>): Promise<import("./types").RxDocumentBase<{}, {}>>;
        incrementalRemove(this: import("./types").RxDocumentBase<{}, {}>): Promise<import("./types").RxDocumentBase<{}, {}>>;
        destroy(): never;
    };
};
export declare function defineGetterSetter(schema: any, valueObj: any, objPath?: string, thisObj?: boolean): void;
export declare function createWithConstructor<RxDocType>(constructor: any, collection: RxCollection<RxDocType>, jsonData: RxDocumentData<RxDocType>): RxDocument<RxDocType> | null;
export declare function isRxDocument(obj: any): boolean;
export declare function beforeDocumentUpdateWrite<RxDocType>(collection: RxCollection<RxDocType>, newData: RxDocumentWriteData<RxDocType>, oldData: RxDocumentData<RxDocType>): Promise<any>;
