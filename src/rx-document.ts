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
    toPromise,
    pluginMissing
} from './util';
import {
    createChangeEvent,
    RxChangeEvent
} from './rx-change-event';
import {
    newRxError,
    newRxTypeError
} from './rx-error';
import {
    runPluginHooks
} from './hooks';

import {
    RxDocument,
    RxCollection
} from './types';

export const basePrototype = {
    get _data(this: RxDocument) {
        /**
         * Might be undefined when vuejs-devtools are used
         * @link https://github.com/pubkey/rxdb/issues/1126
         */
        if (!this.isInstanceOfRxDocument) return undefined;

        return this._dataSync$.getValue();
    },
    get primaryPath(this: RxDocument) {
        if (!this.isInstanceOfRxDocument) return undefined;
        return this.collection.schema.primaryPath;
    },
    get primary(this: RxDocument) {
        if (!this.isInstanceOfRxDocument) return undefined;
        return this._data[this.primaryPath];
    },
    get revision(this: RxDocument) {
        if (!this.isInstanceOfRxDocument) return undefined;
        return this._data._rev;
    },
    get deleted$(this: RxDocument) {
        if (!this.isInstanceOfRxDocument) return undefined;
        return this._deleted$.asObservable();
    },
    get deleted(this: RxDocument) {
        if (!this.isInstanceOfRxDocument) return undefined;
        return this._deleted$.getValue();
    },

    /**
     * returns the observable which emits the plain-data of this document
     */
    get $(this: RxDocument): Observable<any> {
        return this._dataSync$.asObservable();
    },

    _handleChangeEvent(this: RxDocument, changeEvent: RxChangeEvent) {
        if (changeEvent.data.doc !== this.primary)
            return;

        // ensure that new _rev is higher then current
        const newRevNr = getHeightOfRevision(changeEvent.data.v._rev);
        const currentRevNr = getHeightOfRevision(this._data._rev);
        if (currentRevNr > newRevNr) return;

        switch (changeEvent.data.op) {
            case 'INSERT':
                break;
            case 'UPDATE':
                const newData = changeEvent.data.v;
                this._dataSync$.next(newData);
                break;
            case 'REMOVE':
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

        if (schemaObj.type === 'array')
            return Promise.all(
                value.map((id: string) => refCollection
                    .findOne(id).exec())
            ) as any;
        else
            return refCollection.findOne(value).exec();
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

    toJSON(this: RxDocument, withRevAndAttachments = true) {
        const data = clone(this._data);
        if (!withRevAndAttachments) {
            delete data._rev;
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
     * @param fun that takes the document-data and returns a new data-object
     */
    atomicUpdate(this: RxDocument, fun: Function): Promise<RxDocument> {
        this._atomicQueue = this._atomicQueue
            .then(() => {
                const oldData = this._dataSync$.getValue();
                const ret = fun(clone(this._dataSync$.getValue()), this);
                const retPromise = toPromise(ret);
                return retPromise
                    .then(newData => this._saveData(newData, oldData));
            });
        return this._atomicQueue.then(() => this);
    },

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

        return this.collection._runHooks('pre', 'save', newData, this)
            .then(() => {
                this.collection.schema.validate(newData);
                return this.collection._pouchPut(newData);
            })
            .then(ret => {
                if (!ret.ok) {
                    throw newRxError('DOC12', {
                        data: ret
                    });
                }
                newData._rev = ret.rev;

                // emit event
                const changeEvent = createChangeEvent(
                    'UPDATE',
                    this.collection.database,
                    this.collection,
                    this,
                    newData
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
        return this.collection._runHooks('pre', 'remove', deletedData, this)
            .then(() => {
                deletedData._deleted = true;
                /**
                 * because pouch.remove will also empty the object,
                 * we set _deleted: true and use pouch.put
                 */
                return this.collection._pouchPut(deletedData);
            })
            .then(() => {
                this.$emit(createChangeEvent(
                    'REMOVE',
                    this.collection.database,
                    this.collection,
                    this,
                    this._data
                ));

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

const pseudoConstructor = createRxDocumentConstructor(basePrototype);
const pseudoRxDocument = new (pseudoConstructor as any)();

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

/**
 * returns all possible properties of a RxDocument
 */
let _properties: any;
export function properties(): string[] {
    if (!_properties) {
        const reserved = ['deleted', 'synced'];
        const ownProperties = Object.getOwnPropertyNames(pseudoRxDocument);
        const prototypeProperties = Object.getOwnPropertyNames(basePrototype);
        _properties = [...ownProperties, ...prototypeProperties, ...reserved];
    }
    return _properties;
}

export function isInstanceOf(obj: any): boolean {
    if (typeof obj === 'undefined') return false;
    return !!obj.isInstanceOfRxDocument;
}

export default {
    createWithConstructor,
    properties,
    createRxDocumentConstructor,
    basePrototype,
    isInstanceOf
};
