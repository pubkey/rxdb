import { Observable } from 'rxjs';
import { RxChangeEvent } from './rx-change-event';
import type { RxDocument, RxCollection } from './types';
export declare const basePrototype: {
    /**
     * TODO
     * instead of appliying the _this-hack
     * we should make these accesors functions instead of getters.
     */
    readonly _data: {} | undefined;
    readonly primaryPath: string | undefined;
    readonly primary: any;
    readonly revision: string | undefined;
    readonly deleted$: Observable<boolean> | undefined;
    readonly deleted: boolean | undefined;
    /**
     * returns the observable which emits the plain-data of this document
     */
    readonly $: Observable<any>;
    _handleChangeEvent(this: import("./types").RxDocumentBase<{}, {}>, changeEvent: RxChangeEvent): void;
    /**
     * emits the changeEvent to the upper instance (RxCollection)
     */
    $emit(this: import("./types").RxDocumentBase<{}, {}>, changeEvent: RxChangeEvent): void;
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
    toJSON(this: import("./types").RxDocumentBase<{}, {}>, withRevAndAttachments?: boolean): {
        _rev: string;
        _attachments?: {
            [attachmentId: string]: import("./types").PouchAttachmentMeta;
        } | undefined;
        _deleted?: boolean | undefined;
    };
    /**
     * set data by objectPath
     * This can only be called on temporary documents
     */
    set(this: import("./types").RxDocumentBase<{}, {}>, objPath: string, value: any): import("./types").RxDocumentBase<{}, {}> | undefined;
    /**
     * updates document
     * @overwritten by plugin (optinal)
     * @param updateObj mongodb-like syntax
     */
    update(_updateObj: any): never;
    putAttachment(): never;
    getAttachment(): never;
    allAttachments(): never;
    readonly allAttachments$: void;
    /**
     * runs an atomic update over the document
     * @param function that takes the document-data and returns a new data-object
     */
    atomicUpdate(this: import("./types").RxDocumentBase<{}, {}>, mutationFunction: Function): Promise<RxDocument>;
    /**
     * patches the given properties
     */
    atomicPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType, {}>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, {}>>;
    /**
     * @deprecated use atomicPatch instead because it is better typed
     * and does not allow any keys and values
     */
    atomicSet(this: import("./types").RxDocumentBase<{}, {}>, key: string, value: any): Promise<import("./types").RxDocumentBase<{}, {}>>;
    /**
     * saves the new document-data
     * and handles the events
     */
    _saveData(this: import("./types").RxDocumentBase<{}, {}>, newData: any, oldData: any): Promise<void>;
    /**
     * saves the temporary document and makes a non-temporary out of it
     * Saving a temporary doc is basically the same as RxCollection.insert()
     * @return false if nothing to save
     */
    save(this: import("./types").RxDocumentBase<{}, {}>): Promise<boolean>;
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
     * we should make these accesors functions instead of getters.
     */
    readonly _data: {} | undefined;
    readonly primaryPath: string | undefined;
    readonly primary: any;
    readonly revision: string | undefined;
    readonly deleted$: Observable<boolean> | undefined;
    readonly deleted: boolean | undefined;
    /**
     * returns the observable which emits the plain-data of this document
     */
    readonly $: Observable<any>;
    _handleChangeEvent(this: import("./types").RxDocumentBase<{}, {}>, changeEvent: RxChangeEvent<any>): void;
    /**
     * emits the changeEvent to the upper instance (RxCollection)
     */
    $emit(this: import("./types").RxDocumentBase<{}, {}>, changeEvent: RxChangeEvent<any>): void;
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
    toJSON(this: import("./types").RxDocumentBase<{}, {}>, withRevAndAttachments?: boolean): {
        _rev: string;
        _attachments?: {
            [attachmentId: string]: import("./types").PouchAttachmentMeta;
        } | undefined;
        _deleted?: boolean | undefined;
    };
    /**
     * set data by objectPath
     * This can only be called on temporary documents
     */
    set(this: import("./types").RxDocumentBase<{}, {}>, objPath: string, value: any): import("./types").RxDocumentBase<{}, {}> | undefined;
    /**
     * updates document
     * @overwritten by plugin (optinal)
     * @param updateObj mongodb-like syntax
     */
    update(_updateObj: any): never;
    putAttachment(): never;
    getAttachment(): never;
    allAttachments(): never;
    readonly allAttachments$: void;
    /**
     * runs an atomic update over the document
     * @param function that takes the document-data and returns a new data-object
     */
    atomicUpdate(this: import("./types").RxDocumentBase<{}, {}>, mutationFunction: Function): Promise<import("./types").RxDocumentBase<{}, {}>>;
    /**
     * patches the given properties
     */
    atomicPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType, {}>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, {}>>;
    /**
     * @deprecated use atomicPatch instead because it is better typed
     * and does not allow any keys and values
     */
    atomicSet(this: import("./types").RxDocumentBase<{}, {}>, key: string, value: any): Promise<import("./types").RxDocumentBase<{}, {}>>;
    /**
     * saves the new document-data
     * and handles the events
     */
    _saveData(this: import("./types").RxDocumentBase<{}, {}>, newData: any, oldData: any): Promise<void>;
    /**
     * saves the temporary document and makes a non-temporary out of it
     * Saving a temporary doc is basically the same as RxCollection.insert()
     * @return false if nothing to save
     */
    save(this: import("./types").RxDocumentBase<{}, {}>): Promise<boolean>;
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
         * we should make these accesors functions instead of getters.
         */
        readonly _data: {} | undefined;
        readonly primaryPath: string | undefined;
        readonly primary: any;
        readonly revision: string | undefined;
        readonly deleted$: Observable<boolean> | undefined;
        readonly deleted: boolean | undefined;
        /**
         * returns the observable which emits the plain-data of this document
         */
        readonly $: Observable<any>;
        _handleChangeEvent(this: import("./types").RxDocumentBase<{}, {}>, changeEvent: RxChangeEvent<any>): void;
        /**
         * emits the changeEvent to the upper instance (RxCollection)
         */
        $emit(this: import("./types").RxDocumentBase<{}, {}>, changeEvent: RxChangeEvent<any>): void;
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
        toJSON(this: import("./types").RxDocumentBase<{}, {}>, withRevAndAttachments?: boolean): {
            _rev: string;
            _attachments?: {
                [attachmentId: string]: import("./types").PouchAttachmentMeta;
            } | undefined;
            _deleted?: boolean | undefined;
        };
        /**
         * set data by objectPath
         * This can only be called on temporary documents
         */
        set(this: import("./types").RxDocumentBase<{}, {}>, objPath: string, value: any): import("./types").RxDocumentBase<{}, {}> | undefined;
        /**
         * updates document
         * @overwritten by plugin (optinal)
         * @param updateObj mongodb-like syntax
         */
        update(_updateObj: any): never;
        putAttachment(): never;
        getAttachment(): never;
        allAttachments(): never;
        readonly allAttachments$: void;
        /**
         * runs an atomic update over the document
         * @param function that takes the document-data and returns a new data-object
         */
        atomicUpdate(this: import("./types").RxDocumentBase<{}, {}>, mutationFunction: Function): Promise<import("./types").RxDocumentBase<{}, {}>>;
        /**
         * patches the given properties
         */
        atomicPatch<RxDocumentType = any>(this: RxDocument<RxDocumentType, {}>, patch: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, {}>>;
        /**
         * @deprecated use atomicPatch instead because it is better typed
         * and does not allow any keys and values
         */
        atomicSet(this: import("./types").RxDocumentBase<{}, {}>, key: string, value: any): Promise<import("./types").RxDocumentBase<{}, {}>>;
        /**
         * saves the new document-data
         * and handles the events
         */
        _saveData(this: import("./types").RxDocumentBase<{}, {}>, newData: any, oldData: any): Promise<void>;
        /**
         * saves the temporary document and makes a non-temporary out of it
         * Saving a temporary doc is basically the same as RxCollection.insert()
         * @return false if nothing to save
         */
        save(this: import("./types").RxDocumentBase<{}, {}>): Promise<boolean>;
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
export declare function createWithConstructor(constructor: any, collection: RxCollection, jsonData: any): RxDocument | null;
export declare function isInstanceOf(obj: any): boolean;
