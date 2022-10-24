import objectPath from 'object-path';
import {
    Observable,
    BehaviorSubject
} from 'rxjs';
import {
    distinctUntilChanged,
    map
} from 'rxjs/operators';
import {
    clone,
    trimDots,
    getHeightOfRevision,
    pluginMissing,
    flatClone,
    PROMISE_RESOLVE_NULL,
    PROMISE_RESOLVE_VOID,
    ensureNotFalsy
} from './util';
import {
    newRxError,
    isBulkWriteConflictError
} from './rx-error';
import {
    runPluginHooks
} from './hooks';

import type {
    RxDocument,
    RxCollection,
    RxDocumentData,
    RxDocumentWriteData,
    RxChangeEvent,
    UpdateQuery,
    CRDTEntry
} from './types';
import { getDocumentDataOfRxChangeEvent } from './rx-change-event';
import { overwritable } from './overwritable';
import { getSchemaByObjectPath } from './rx-schema-helper';
import { throwIfIsStorageWriteError } from './rx-storage-helper';

export const basePrototype = {

    /**
     * TODO
     * instead of appliying the _this-hack
     * we should make these accesors functions instead of getters.
     */
    get _data() {
        const _this: RxDocument = this as any;
        /**
         * Might be undefined when vuejs-devtools are used
         * @link https://github.com/pubkey/rxdb/issues/1126
         */
        if (!_this.isInstanceOfRxDocument) {
            return undefined;
        }

        return _this._dataSync$.getValue();
    },
    get primaryPath() {
        const _this: RxDocument = this as any;
        if (!_this.isInstanceOfRxDocument) {
            return undefined;
        }
        return _this.collection.schema.primaryPath;
    },
    get primary() {
        const _this: RxDocument = this as any;
        if (!_this.isInstanceOfRxDocument) {
            return undefined;
        }
        return (_this._data as any)[_this.primaryPath];
    },
    get revision() {
        const _this: RxDocument = this as any;
        if (!_this.isInstanceOfRxDocument) {
            return undefined;
        }
        return _this._data._rev;
    },
    get deleted$() {
        const _this: RxDocument<any> = this as any;
        if (!_this.isInstanceOfRxDocument) {
            return undefined;
        }
        return _this._dataSync$.pipe(
            map((d: any) => d._deleted)
        );
    },
    get deleted() {
        const _this: RxDocument = this as any;
        if (!_this.isInstanceOfRxDocument) {
            return undefined;
        }
        return _this._data._deleted;
    },

    /**
     * returns the observable which emits the plain-data of this document
     */
    get $(): Observable<any> {
        const _this: RxDocument = this as any;
        return _this._dataSync$.asObservable().pipe(
            map(docData => overwritable.deepFreezeWhenDevMode(docData))
        );
    },

    _handleChangeEvent(this: RxDocument, changeEvent: RxChangeEvent<any>) {
        if (changeEvent.documentId !== this.primary) {
            return;
        }

        // ensure that new _rev is higher then current
        const docData = getDocumentDataOfRxChangeEvent(changeEvent);
        const newRevNr = getHeightOfRevision(docData._rev);
        const currentRevNr = getHeightOfRevision(this._data._rev);
        if (currentRevNr > newRevNr) return;

        switch (changeEvent.operation) {
            case 'INSERT':
                break;
            case 'UPDATE':
                this._dataSync$.next(changeEvent.documentData);
                break;
            case 'DELETE':
                // remove from docCache to assure new upserted RxDocuments will be a new instance
                this.collection._docCache.delete(this.primary);
                this._dataSync$.next(changeEvent.documentData);
                break;
        }
    },

    /**
     * returns observable of the value of the given path
     */
    get$(this: RxDocument, path: string): Observable<any> {
        if (path.includes('.item.')) {
            throw newRxError('DOC1', {
                path
            });
        }

        if (path === this.primaryPath)
            throw newRxError('DOC2');

        // final fields cannot be modified and so also not observed
        if (this.collection.schema.finalFields.includes(path)) {
            throw newRxError('DOC3', {
                path
            });
        }

        const schemaObj = getSchemaByObjectPath(
            this.collection.schema.jsonSchema,
            path
        );
        if (!schemaObj) {
            throw newRxError('DOC4', {
                path
            });
        }

        return this._dataSync$
            .pipe(
                map(data => objectPath.get(data, path)),
                distinctUntilChanged()
            );
    },

    /**
     * populate the given path
     */
    populate(this: RxDocument, path: string): Promise<RxDocument | null> {
        const schemaObj = getSchemaByObjectPath(
            this.collection.schema.jsonSchema,
            path
        );
        const value = this.get(path);
        if (!value) {
            return PROMISE_RESOLVE_NULL;
        }
        if (!schemaObj) {
            throw newRxError('DOC5', {
                path
            });
        }
        if (!schemaObj.ref) {
            throw newRxError('DOC6', {
                path,
                schemaObj
            });
        }

        const refCollection: RxCollection = this.collection.database.collections[schemaObj.ref];
        if (!refCollection) {
            throw newRxError('DOC7', {
                ref: schemaObj.ref,
                path,
                schemaObj
            });
        }

        if (schemaObj.type === 'array') {
            return refCollection.findByIds(value).then(res => {
                const valuesIterator = res.values();
                return Array.from(valuesIterator) as any;
            });
        } else {
            return refCollection.findOne(value).exec();
        }
    },

    /**
     * get data by objectPath
     */
    get(this: RxDocument, objPath: string): any | null {
        if (!this._data) return undefined;
        let valueObj = objectPath.get(this._data, objPath);

        // direct return if array or non-object
        if (
            typeof valueObj !== 'object' ||
            Array.isArray(valueObj)
        ) {
            return overwritable.deepFreezeWhenDevMode(valueObj);
        }

        /**
         * TODO find a way to deep-freeze together with defineGetterSetter
         * so we do not have to do a deep clone here.
         */
        valueObj = clone(valueObj);
        defineGetterSetter(
            this.collection.schema,
            valueObj,
            objPath,
            this as any
        );
        return valueObj;
    },

    toJSON(this: RxDocument, withMetaFields = false) {
        if (!withMetaFields) {
            const data = flatClone(this._data);
            delete (data as any)._rev;
            delete (data as any)._attachments;
            delete (data as any)._deleted;
            delete (data as any)._meta;
            return overwritable.deepFreezeWhenDevMode(data);
        } else {
            return overwritable.deepFreezeWhenDevMode(this._data);
        }
    },
    toMutableJSON(this: RxDocument, withMetaFields = false) {
        return clone(this.toJSON(withMetaFields as any));
    },

    /**
     * updates document
     * @overwritten by plugin (optinal)
     * @param updateObj mongodb-like syntax
     */
    update(_updateObj: UpdateQuery<any>) {
        throw pluginMissing('update');
    },
    updateCRDT(_updateObj: CRDTEntry<any> | CRDTEntry<any>[]) {
        throw pluginMissing('crdt');
    },
    putAttachment() {
        throw pluginMissing('attachments');
    },
    getAttachment() {
        throw pluginMissing('attachments');
    },
    allAttachments() {
        throw pluginMissing('attachments');
    },
    get allAttachments$() {
        throw pluginMissing('attachments');
    },


    /**
     * runs an atomic update over the document
     * @param function that takes the document-data and returns a new data-object
     */
    atomicUpdate(
        this: RxDocument,
        mutationFunction: Function,
        // used by some plugins that wrap the method
        _context?: string
    ): Promise<RxDocument> {
        return new Promise((res, rej) => {
            this._atomicQueue = this
                ._atomicQueue
                .then(async () => {
                    let done = false;
                    // we need a hacky while loop to stay incide the chain-link of _atomicQueue
                    // while still having the option to run a retry on conflicts
                    while (!done) {
                        const oldData = this._dataSync$.getValue();
                        // always await because mutationFunction might be async
                        let newData;

                        try {
                            newData = await mutationFunction(
                                clone(oldData),
                                this
                            );
                            if (this.collection) {
                                newData = this.collection.schema.fillObjectWithDefaults(newData);
                            }
                        } catch (err) {
                            rej(err);
                            return;
                        }

                        try {
                            await this._saveData(newData, oldData);
                            done = true;
                        } catch (err: any) {
                            const useError = err.parameters && err.parameters.error ? err.parameters.error : err;
                            /**
                             * conflicts cannot happen by just using RxDB in one process
                             * There are two ways they still can appear which is
                             * replication and multi-tab usage
                             * Because atomicUpdate has a mutation function,
                             * we can just re-run the mutation until there is no conflict
                             */
                            const isConflict = isBulkWriteConflictError(useError as any);
                            if (isConflict) {
                                // conflict error -> retrying
                            } else {
                                rej(useError);
                                return;
                            }
                        }
                    }
                    res(this);
                });
        });
    },


    /**
     * patches the given properties
     */
    atomicPatch<RxDocumentType = any>(
        this: RxDocument<RxDocumentType>,
        patch: Partial<RxDocumentType>
    ): Promise<RxDocument<RxDocumentType>> {
        return this.atomicUpdate((docData: RxDocumentType) => {
            Object
                .entries(patch)
                .forEach(([k, v]) => {
                    (docData as any)[k] = v;
                });
            return docData;
        });
    },

    /**
     * saves the new document-data
     * and handles the events
     */
    async _saveData<RxDocumentType>(
        this: RxDocument<RxDocumentType>,
        newData: RxDocumentWriteData<RxDocumentType>,
        oldData: RxDocumentData<RxDocumentType>
    ): Promise<void> {
        newData = flatClone(newData);

        // deleted documents cannot be changed
        if (this._data._deleted) {
            throw newRxError('DOC11', {
                id: this.primary,
                document: this
            });
        }

        /**
         * Meta values must always be merged
         * instead of overwritten.
         * This ensures that different plugins do not overwrite
         * each others meta properties.
         */
        newData._meta = Object.assign(
            {},
            oldData._meta,
            newData._meta
        );

        // ensure modifications are ok
        if (overwritable.isDevMode()) {
            this.collection.schema.validateChange(oldData, newData);
        }

        await this.collection._runHooks('pre', 'save', newData, this);

        const writeResult = await this.collection.storageInstance.bulkWrite([{
            previous: oldData,
            document: newData
        }], 'rx-document-save-data');

        const isError = writeResult.error[this.primary];
        throwIfIsStorageWriteError(this.collection, this.primary, newData, isError);

        return this.collection._runHooks('post', 'save', newData, this);
    },

    /**
     * remove the document,
     * this not not equal to a pouchdb.remove(),
     * instead we keep the values and only set _deleted: true
     */
    remove(this: RxDocument): Promise<RxDocument> {
        const collection = this.collection;
        if (this.deleted) {
            return Promise.reject(newRxError('DOC13', {
                document: this,
                id: this.primary
            }));
        }

        const deletedData = flatClone(this._data);
        return collection._runHooks('pre', 'remove', deletedData, this)
            .then(async () => {
                deletedData._deleted = true;

                const writeResult = await collection.storageInstance.bulkWrite([{
                    previous: this._data,
                    document: deletedData
                }], 'rx-document-remove');
                const isError = writeResult.error[this.primary];
                throwIfIsStorageWriteError(collection, this.primary, deletedData, isError);
                return ensureNotFalsy(writeResult.success[this.primary]);
            })
            .then(() => {
                return this.collection._runHooks('post', 'remove', deletedData, this);
            })
            .then(() => this);
    },
    destroy() {
        throw newRxError('DOC14');
    }
};

export function createRxDocumentConstructor(proto = basePrototype) {
    const constructor = function RxDocumentConstructor(
        this: RxDocument,
        collection: RxCollection,
        jsonData: any
    ) {
        this.collection = collection;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new BehaviorSubject(jsonData);

        this._atomicQueue = PROMISE_RESOLVE_VOID;

        /**
         * because of the prototype-merge,
         * we can not use the native instanceof operator
         */
        this.isInstanceOfRxDocument = true;
    };
    constructor.prototype = proto;
    return constructor;
}

export function defineGetterSetter(
    schema: any,
    valueObj: any,
    objPath = '',
    thisObj = false
) {
    if (valueObj === null) return;


    let pathProperties = getSchemaByObjectPath(
        schema.jsonSchema,
        objPath
    );

    if (typeof pathProperties === 'undefined') return;
    if (pathProperties.properties) pathProperties = pathProperties.properties;

    Object.keys(pathProperties)
        .forEach(key => {
            const fullPath = trimDots(objPath + '.' + key);

            // getter - value
            valueObj.__defineGetter__(
                key,
                function (this: RxDocument) {
                    const _this: RxDocument = thisObj ? thisObj : (this as any);
                    if (!_this.get || typeof _this.get !== 'function') {
                        /**
                         * When an object gets added to the state of a vuejs-component,
                         * it happens that this getter is called with another scope.
                         * To prevent errors, we have to return undefined in this case
                         */
                        return undefined;
                    }
                    const ret = _this.get(fullPath);
                    return ret;
                }
            );
            // getter - observable$
            Object.defineProperty(valueObj, key + '$', {
                get: function () {
                    const _this = thisObj ? thisObj : this;
                    return _this.get$(fullPath);
                },
                enumerable: false,
                configurable: false
            });
            // getter - populate_
            Object.defineProperty(valueObj, key + '_', {
                get: function () {
                    const _this = thisObj ? thisObj : this;
                    return _this.populate(fullPath);
                },
                enumerable: false,
                configurable: false
            });
            // setter - value
            valueObj.__defineSetter__(key, function (
                this: RxDocument,
                val: any
            ) {
                const _this: any = thisObj ? thisObj : this;
                return _this.set(fullPath, val);
            });
        });
}

export function createWithConstructor<RxDocType>(
    constructor: any,
    collection: RxCollection<RxDocType>,
    jsonData: RxDocumentData<RxDocType>
): RxDocument<RxDocType> | null {
    const primary: string = jsonData[collection.schema.primaryPath] as any;
    if (
        primary &&
        primary.startsWith('_design')
    ) {
        return null;
    }

    const doc = new constructor(collection, jsonData);
    runPluginHooks('createRxDocument', doc);
    return doc;
}

export function isRxDocument(obj: any): boolean {
    if (typeof obj === 'undefined') return false;
    return !!obj.isInstanceOfRxDocument;
}
