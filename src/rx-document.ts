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
    now,
    nextTick
} from './util';
import {
    RxChangeEvent, createUpdateEvent, createDeleteEvent
} from './rx-change-event';
import {
    newRxError,
    newRxTypeError,
    isPouchdbConflictError
} from './rx-error';
import {
    runPluginHooks
} from './hooks';

import type {
    RxDocument,
    RxCollection
} from './types';

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
        const _this: RxDocument = this as any;
        if (!_this.isInstanceOfRxDocument) {
            return undefined;
        }
        return _this._deleted$.asObservable();
    },
    get deleted() {
        const _this: RxDocument = this as any;
        if (!_this.isInstanceOfRxDocument) {
            return undefined;
        }
        return _this._deleted$.getValue();
    },

    /**
     * returns the observable which emits the plain-data of this document
     */
    get $(): Observable<any> {
        const _this: RxDocument = this as any;
        return _this._dataSync$.asObservable();
    },

    _handleChangeEvent(this: RxDocument, changeEvent: RxChangeEvent) {
        if (changeEvent.documentId !== this.primary)
            return;

        // ensure that new _rev is higher then current
        const newRevNr = getHeightOfRevision(changeEvent.documentData._rev);
        const currentRevNr = getHeightOfRevision(this._data._rev);
        if (currentRevNr > newRevNr) return;

        switch (changeEvent.operation) {
            case 'INSERT':
                break;
            case 'UPDATE':
                const newData = changeEvent.documentData;
                this._dataSync$.next(newData);
                break;
            case 'DELETE':
                // remove from docCache to assure new upserted RxDocuments will be a new instance
                this.collection._docCache.delete(this.primary);
                this._deleted$.next(true);
                break;
        }
    },

    /**
     * emits the changeEvent to the upper instance (RxCollection)
     */
    $emit(this: RxDocument, changeEvent: RxChangeEvent) {
        return this.collection.$emit(changeEvent);
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

        const schemaObj = this.collection.schema.getSchemaByObjectPath(path);
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
        const schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        const value = this.get(path);
        if (!value) {
            return Promise.resolve(null);
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

        const refCollection = this.collection.database.collections[schemaObj.ref];
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
        valueObj = clone(valueObj);

        // direct return if array or non-object
        if (
            typeof valueObj !== 'object' ||
            Array.isArray(valueObj)
        ) return valueObj;

        defineGetterSetter(
            this.collection.schema,
            valueObj,
            objPath,
            this as any
        );
        return valueObj;
    },

    toJSON(this: RxDocument, withRevAndAttachments = false) {
        const data = clone(this._data);
        if (!withRevAndAttachments) {
            delete (data as any)._rev;
            delete data._attachments;
        }
        return data;
    },

    /**
     * set data by objectPath
     * This can only be called on temporary documents
     */
    set(this: RxDocument, objPath: string, value: any) {

        // setters can only be used on temporary documents
        if (!this._isTemporary) {
            throw newRxTypeError('DOC16', {
                objPath,
                value
            });
        }

        if (typeof objPath !== 'string') {
            throw newRxTypeError('DOC15', {
                objPath,
                value
            });
        }

        // if equal, do nothing
        if (Object.is(this.get(objPath), value)) return;

        // throw if nested without root-object
        const pathEls = objPath.split('.');
        pathEls.pop();
        const rootPath = pathEls.join('.');
        if (typeof objectPath.get(this._data, rootPath) === 'undefined') {
            throw newRxError('DOC10', {
                childpath: objPath,
                rootPath
            });
        }

        objectPath.set(this._data, objPath, value);
        return this;
    },

    /**
     * updates document
     * @overwritten by plugin (optinal)
     * @param updateObj mongodb-like syntax
     */
    update(_updateObj: any) {
        throw pluginMissing('update');
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
    atomicUpdate(this: RxDocument, mutationFunction: Function): Promise<RxDocument> {
        return new Promise((res, rej) => {
            this._atomicQueue = this._atomicQueue
                .then(async () => {
                    let done = false;
                    // we need a hacky while loop to stay incide the chain-link of _atomicQueue
                    // while still having the option to run a retry on conflicts
                    while (!done) {
                        const oldData = this._dataSync$.getValue();
                        try {
                            // always await because mutationFunction might be async
                            let newData = await mutationFunction(clone(this._dataSync$.getValue()), this);
                            if (this.collection) {
                                newData = this.collection.schema.fillObjectWithDefaults(newData);
                            }
                            await this._saveData(newData, oldData);
                            done = true;
                        } catch (err) {
                            /**
                             * conflicts cannot happen by just using RxDB in one process
                             * There are two ways they still can appear which is
                             * replication and multi-tab usage
                             * Because atomicUpdate has a mutation function,
                             * we can just re-run the mutation until there is no conflict
                             */
                            if (isPouchdbConflictError(err)) {
                                // we need to free the cpu for a tick or the browser tests will fail
                                await nextTick();
                                // pouchdb conflict error -> retrying
                            } else {
                                rej(err);
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
     * @deprecated use atomicPatch instead because it is better typed
     * and does not allow any keys and values
     */
    atomicSet(this: RxDocument, key: string, value: any) {
        return this.atomicUpdate(docData => {
            objectPath.set(docData, key, value);
            return docData;
        });
    },

    /**
     * saves the new document-data
     * and handles the events
     */
    _saveData(this: RxDocument, newData: any, oldData: any): Promise<void> {
        newData = newData;

        // deleted documents cannot be changed
        if (this._deleted$.getValue()) {
            throw newRxError('DOC11', {
                id: this.primary,
                document: this
            });
        }

        // ensure modifications are ok
        this.collection.schema.validateChange(oldData, newData);

        let startTime: number;
        return this.collection._runHooks('pre', 'save', newData, this)
            .then(() => {
                this.collection.schema.validate(newData);
                startTime = now();
                return this.collection._pouchPut(newData);
            })
            .then(ret => {
                const endTime = now();
                if (!ret.ok) {
                    throw newRxError('DOC12', {
                        data: ret
                    });
                }
                newData._rev = ret.rev;

                // emit event
                const changeEvent = createUpdateEvent(
                    this.collection,
                    newData,
                    oldData,
                    startTime,
                    endTime,
                    this
                );

                this.$emit(changeEvent);

                return this.collection._runHooks('post', 'save', newData, this);
            });
    },

    /**
     * saves the temporary document and makes a non-temporary out of it
     * Saving a temporary doc is basically the same as RxCollection.insert()
     * @return false if nothing to save
     */
    save(this: RxDocument): Promise<boolean> {
        // .save() cannot be called on non-temporary-documents
        if (!this._isTemporary) {
            throw newRxError('DOC17', {
                id: this.primary,
                document: this
            });
        }

        return this.collection.insert(this)
            .then(() => {
                this._isTemporary = false;
                this.collection._docCache.set(this.primary, this);

                // internal events
                this._dataSync$.next(this._data);

                return true;
            });
    },

    /**
     * remove the document,
     * this not not equal to a pouchdb.remove(),
     * instead we keep the values and only set _deleted: true
     */
    remove(this: RxDocument): Promise<RxDocument> {
        if (this.deleted) {
            return Promise.reject(newRxError('DOC13', {
                document: this,
                id: this.primary
            }));
        }

        const deletedData = clone(this._data);
        let startTime: number;
        return this.collection._runHooks('pre', 'remove', deletedData, this)
            .then(() => {
                deletedData._deleted = true;
                startTime = now();
                /**
                 * because pouch.remove will also empty the object,
                 * we set _deleted: true and use pouch.put
                 */
                return this.collection._pouchPut(deletedData);
            })
            .then(() => {
                const endTime = now();
                this.$emit(
                    createDeleteEvent(
                        this.collection,
                        deletedData,
                        this._data,
                        startTime,
                        endTime,
                        this
                    )
                );

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

        // if true, this is a temporary document
        this._isTemporary = false;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new BehaviorSubject(jsonData);
        this._deleted$ = new BehaviorSubject(false) as any;

        this._atomicQueue = Promise.resolve();

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


    let pathProperties = schema.getSchemaByObjectPath(objPath);
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

export function createWithConstructor(
    constructor: any,
    collection: RxCollection,
    jsonData: any
): RxDocument | null {
    if (
        jsonData[collection.schema.primaryPath] &&
        jsonData[collection.schema.primaryPath].startsWith('_design')
    ) return null;

    const doc = new constructor(collection, jsonData);
    runPluginHooks('createRxDocument', doc);
    return doc;
}

export function isInstanceOf(obj: any): boolean {
    if (typeof obj === 'undefined') return false;
    return !!obj.isInstanceOfRxDocument;
}
