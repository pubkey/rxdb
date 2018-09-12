import objectPath from 'object-path';

import {
    clone,
    trimDots,
    getHeightOfRevision
} from './util';
import RxChangeEvent from './rx-change-event';
import RxError from './rx-error';
import {
    runPluginHooks
} from './hooks';

import {
    BehaviorSubject
} from 'rxjs';
import {
    distinctUntilChanged,
    map
} from 'rxjs/operators';


export function createRxDocumentConstructor(proto = basePrototype) {
    const constructor = function RxDocument(collection, jsonData) {
        this.collection = collection;

        // if true, this is a temporary document
        this._isTemporary = false;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new BehaviorSubject(clone(jsonData));
        this._deleted$ = new BehaviorSubject(false);

        this._atomicQueue = Promise.resolve();
    };
    constructor.prototype = proto;
    return constructor;
}

export const basePrototype = {
    /**
     * because of the prototype-merge,
     * we can not use the native instanceof operator
     */
    get isInstanceOfRxDocument() {
        return true;
    },
    get _data() {
        return this._dataSync$.getValue();
    },
    get primaryPath() {
        return this.collection.schema.primaryPath;
    },
    get primary() {
        return this._data[this.primaryPath];
    },
    get revision() {
        return this._data._rev;
    },
    get deleted$() {
        return this._deleted$.asObservable();
    },
    get deleted() {
        return this._deleted$.getValue();
    },

    /**
     * returns the observable which emits the plain-data of this document
     * @return {Observable}
     */
    get $() {
        return this._dataSync$.asObservable();
    },

    /**
     * @param {ChangeEvent}
     */
    _handleChangeEvent(changeEvent) {
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
                const newData = clone(changeEvent.data.v);
                this._dataSync$.next(clone(newData));
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
     * @param  {RxChangeEvent} changeEvent
     */
    $emit(changeEvent) {
        return this.collection.$emit(changeEvent);
    },

    /**
     * returns observable of the value of the given path
     * @param {string} path
     * @return {Observable}
     */
    get$(path) {
        if (path.includes('.item.')) {
            throw RxError.newRxError('DOC1', {
                path
            });
        }

        if (path === this.primaryPath)
            throw RxError.newRxError('DOC2');

        // final fields cannot be modified and so also not observed
        if (this.collection.schema.finalFields.includes(path)) {
            throw RxError.newRxError('DOC3', {
                path
            });
        }

        const schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        if (!schemaObj) {
            throw RxError.newRxError('DOC4', {
                path
            });
        }

        return this._dataSync$
            .pipe(
                map(data => objectPath.get(data, path)),
                distinctUntilChanged()
            ).asObservable();
    },

    /**
     * populate the given path
     * @param  {string}  path
     * @return {Promise<RxDocument>}
     */
    populate(path) {
        const schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        const value = this.get(path);
        if (!schemaObj) {
            throw RxError.newRxError('DOC5', {
                path
            });
        }
        if (!schemaObj.ref) {
            throw RxError.newRxError('DOC6', {
                path,
                schemaObj
            });
        }

        const refCollection = this.collection.database.collections[schemaObj.ref];
        if (!refCollection) {
            throw RxError.newRxError('DOC7', {
                ref: schemaObj.ref,
                path,
                schemaObj
            });
        }

        if (schemaObj.type === 'array')
            return Promise.all(value.map(id => refCollection.findOne(id).exec()));
        else
            return refCollection.findOne(value).exec();
    },

    /**
     * get data by objectPath
     * @param {string} objPath
     * @return {object} valueObj
     */
    get(objPath) {
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
            this
        );
        return valueObj;
    },

    toJSON() {
        return clone(this._data);
    },

    /**
     * set data by objectPath
     * This can only be called on temporary documents
     * @param {string} objPath
     * @param {object} value
     */
    set(objPath, value) {

        // setters can only be used on temporary documents
        if (!this._isTemporary) {
            throw RxError.newRxTypeError('DOC16', {
                objPath,
                value
            });
        }

        if (typeof objPath !== 'string') {
            throw RxError.newRxTypeError('DOC15', {
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
            throw RxError.newRxError('DOC10', {
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
     * @param  {object} updateObj mongodb-like syntax
     */
    update() {
        throw RxError.pluginMissing('update');
    },
    putAttachment() {
        throw RxError.pluginMissing('attachments');
    },
    getAttachment() {
        throw RxError.pluginMissing('attachments');
    },
    allAttachments() {
        throw RxError.pluginMissing('attachments');
    },
    get allAttachments$() {
        throw RxError.pluginMissing('attachments');
    },

    /**
     * runs an atomic update over the document
     * @param  {function(any)} fun that takes the document-data and returns a new data-object
     * @return {Promise<RxDocument>}
     */
    atomicUpdate(fun) {
        this._atomicQueue = this._atomicQueue
            .then(async () => {
                const oldData = clone(this._dataSync$.getValue());

                // use await here because it's unknown if a promise is returned
                const newData = await fun(clone(this._dataSync$.getValue()), this);

                return this._saveData(newData, oldData);
            });

        return this._atomicQueue.then(() => this);
    },

    atomicSet(key, value) {
        return this.atomicUpdate(docData => {
            objectPath.set(docData, key, value);
            return docData;
        });
    },

    /**
     * saves the new document-data
     * and handles the events
     * @param {any} newData
     * @param {any} oldData
     * @return {Promise}
     */
    _saveData(newData, oldData) {
        newData = clone(newData);


        // deleted documents cannot be changed
        if (this._deleted$.getValue()) {
            throw RxError.newRxError('DOC11', {
                id: this.primary,
                document: this
            });
        }

        // ensure modifications are ok
        this.collection.schema.validateChange(newData, oldData);

        return this.collection._runHooks('pre', 'save', newData, this)
            .then(() => {
                this.collection.schema.validate(newData);

                return this.collection._pouchPut(clone(newData));
            })
            .then(ret => {
                if (!ret.ok) {
                    throw RxError.newRxError('DOC12', {
                        data: ret
                    });
                }
                newData._rev = ret.rev;

                // emit event
                const changeEvent = RxChangeEvent.create(
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
     * @return {boolean} false if nothing to save
     */
    save() {
        // .save() cannot be called on non-temporary-documents
        if (!this._isTemporary) {
            throw RxError.newRxError('DOC17', {
                id: this.primary,
                document: this
            });
        }

        return this.collection.insert(this)
            .then(() => {
                this._isTemporary = false;
                this.collection._docCache.set(this.primary, this);

                // internal events
                this._dataSync$.next(clone(this._data));

                return true;
            });
    },

    /**
     * remove the document,
     * this not not equal to a pouchdb.remove(),
     * instead we keep the values and only set _deleted: true
     * @return {Promise<RxDocument>}
     */
    remove() {
        if (this.deleted) {
            throw RxError.newRxError('DOC13', {
                document: this,
                id: this.primary
            });
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
                this.$emit(RxChangeEvent.create(
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
        throw RxError.newRxError('DOC14');
    }
};

const pseudoConstructor = createRxDocumentConstructor(basePrototype);
const pseudoRxDocument = new pseudoConstructor();

export function defineGetterSetter(schema, valueObj, objPath = '', thisObj = false) {
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
                function() {
                    const _this = thisObj ? thisObj : this;
                    return _this.get(fullPath);
                }
            );
            // getter - observable$
            Object.defineProperty(valueObj, key + '$', {
                get: function() {
                    const _this = thisObj ? thisObj : this;
                    return _this.get$(fullPath);
                },
                enumerable: false,
                configurable: false
            });
            // getter - populate_
            Object.defineProperty(valueObj, key + '_', {
                get: function() {
                    const _this = thisObj ? thisObj : this;
                    return _this.populate(fullPath);
                },
                enumerable: false,
                configurable: false
            });
            // setter - value
            valueObj.__defineSetter__(key, function(val) {
                const _this = thisObj ? thisObj : this;
                return _this.set(fullPath, val);
            });
        });
}

export function createWithConstructor(constructor, collection, jsonData) {
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
 * @return {string[]} property-names
 */
let _properties;
export function properties() {
    if (!_properties) {
        const reserved = ['deleted', 'synced'];
        const ownProperties = Object.getOwnPropertyNames(pseudoRxDocument);
        const prototypeProperties = Object.getOwnPropertyNames(basePrototype);
        _properties = [...ownProperties, ...prototypeProperties, ...reserved];
    }
    return _properties;
}

export function isInstanceOf(obj) {
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
