import { Observable } from 'rxjs';
import type { RxDocument, RxCollection, RxDocumentData, RxDocumentWriteData, RxChangeEvent, UpdateQuery, CRDTEntry } from './types';
export declare const basePrototype: {
    /**
     * TODO
     * instead of appliying the _this-hack
     * we should make these accessors functions instead of getters.
     */
    readonly _data: import("./types").DeepReadonlyObject<{}> | undefined;
    readonly primaryPath: "_deleted" | "_attachments" | "_rev" | "_meta" | undefined;
    readonly primary: any;
    readonly revision: string | undefined;
    readonly deleted$: any;
    readonly deleted: boolean | undefined;
    /**
     * returns the observable which emits the plain-data of this document
     */
    readonly $: Observable<any>;
    _handleChangeEvent(this: import("./types").RxDocumentBase<{}, {}>, changeEvent: RxChangeEvent<any>): void;
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
    updateCRDT(_updateObj: CRDTEntry<any> | CRDTEntry<any>[]): never;
    putAttachment(): never;
    getAttachment(): never;
    allAttachments(): never;
    readonly allAttachments$: void;
    /**
     * runs an atomic update over the document
     * @param function that takes the document-data and returns a new data-object
     */
    atomicUpdate(this: import("./types").RxDocumentBase<{}, {}>, mutationFunction: Function, _context?: string): Promise<RxDocument>;
    /**
     * patches the given properties
     */
    atomicPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType, {}>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, {}>>;
    /**
     * saves the new document-data
     * and handles the events
     */
    _saveData<RxDocumentType_1>(this: RxDocument<RxDocumentType_1, {}>, newData: RxDocumentWriteData<RxDocumentType_1>, oldData: RxDocumentData<RxDocumentType_1>): Promise<void>;
    /**
     * remove the document,
     * this not not equal to a pouchdb.remove(),
     * instead we keep the values and only set _deleted: true
     */
    remove(this: import("./types").RxDocumentBase<{}, {}>): Promise<RxDocument>;
    destroy(): never;
};
export declare function createRxDocumentConstructor(proto?: {
    /**
     * TODO
     * instead of appliying the _this-hack
     * we should make these accessors functions instead of getters.
     */
    readonly _data: import("./types").DeepReadonlyObject<{}> | undefined;
    readonly primaryPath: "_deleted" | "_attachments" | "_rev" | "_meta" | undefined;
    readonly primary: any;
    readonly revision: string | undefined;
    readonly deleted$: any;
    readonly deleted: boolean | undefined;
    /**
     * returns the observable which emits the plain-data of this document
     */
    readonly $: Observable<any>;
    _handleChangeEvent(this: import("./types").RxDocumentBase<{}, {}>, changeEvent: RxChangeEvent<any>): void;
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
    updateCRDT(_updateObj: CRDTEntry<any> | CRDTEntry<any>[]): never;
    putAttachment(): never;
    getAttachment(): never;
    allAttachments(): never;
    readonly allAttachments$: void;
    /**
     * runs an atomic update over the document
     * @param function that takes the document-data and returns a new data-object
     */
    atomicUpdate(this: import("./types").RxDocumentBase<{}, {}>, mutationFunction: Function, _context?: string | undefined): Promise<import("./types").RxDocumentBase<{}, {}>>;
    /**
     * patches the given properties
     */
    atomicPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType, {}>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, {}>>;
    /**
     * saves the new document-data
     * and handles the events
     */
    _saveData<RxDocumentType_1>(this: RxDocument<RxDocumentType_1, {}>, newData: RxDocumentWriteData<RxDocumentType_1>, oldData: RxDocumentData<RxDocumentType_1>): Promise<void>;
    /**
     * remove the document,
     * this not not equal to a pouchdb.remove(),
     * instead we keep the values and only set _deleted: true
     */
    remove(this: import("./types").RxDocumentBase<{}, {}>): Promise<import("./types").RxDocumentBase<{}, {}>>;
    destroy(): never;
}): {
    (this: import("./types").RxDocumentBase<{}, {}>, collection: RxCollection, jsonData: any): void;
    prototype: {
        /**
         * TODO
         * instead of appliying the _this-hack
         * we should make these accessors functions instead of getters.
         */
        readonly _data: import("./types").DeepReadonlyObject<{}> | undefined;
        readonly primaryPath: "_deleted" | "_attachments" | "_rev" | "_meta" | undefined;
        readonly primary: any;
        readonly revision: string | undefined;
        readonly deleted$: any;
        readonly deleted: boolean | undefined;
        /**
         * returns the observable which emits the plain-data of this document
         */
        readonly $: Observable<any>;
        _handleChangeEvent(this: import("./types").RxDocumentBase<{}, {}>, changeEvent: RxChangeEvent<any>): void;
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
        updateCRDT(_updateObj: CRDTEntry<any> | CRDTEntry<any>[]): never;
        putAttachment(): never;
        getAttachment(): never;
        allAttachments(): never;
        readonly allAttachments$: void;
        /**
         * runs an atomic update over the document
         * @param function that takes the document-data and returns a new data-object
         */
        atomicUpdate(this: import("./types").RxDocumentBase<{}, {}>, mutationFunction: Function, _context?: string | undefined): Promise<import("./types").RxDocumentBase<{}, {}>>;
        /**
         * patches the given properties
         */
        atomicPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType, {}>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, {}>>;
        /**
         * saves the new document-data
         * and handles the events
         */
        _saveData<RxDocumentType_1>(this: RxDocument<RxDocumentType_1, {}>, newData: RxDocumentWriteData<RxDocumentType_1>, oldData: RxDocumentData<RxDocumentType_1>): Promise<void>;
        /**
         * remove the document,
         * this not not equal to a pouchdb.remove(),
         * instead we keep the values and only set _deleted: true
         */
        remove(this: import("./types").RxDocumentBase<{}, {}>): Promise<import("./types").RxDocumentBase<{}, {}>>;
        destroy(): never;
    };
};
export declare function defineGetterSetter(schema: any, valueObj: any, objPath?: string, thisObj?: boolean): void;
export declare function createWithConstructor<RxDocType>(constructor: any, collection: RxCollection<RxDocType>, jsonData: RxDocumentData<RxDocType>): RxDocument<RxDocType> | null;
export declare function isRxDocument(obj: any): boolean;
