import IdleQueue from 'custom-idle-queue';
import objectPath from 'object-path';
import deepEqual from 'deep-equal';

import * as util from './util';
import RxChangeEvent from './rx-change-event';
import RxError from './rx-error';
import {
    runPluginHooks
} from './hooks';

import {
    BehaviorSubject
} from 'rxjs/BehaviorSubject';
import {
    distinctUntilChanged
} from 'rxjs/operators/distinctUntilChanged';
import {
    map
} from 'rxjs/operators/map';

export class RxDocument {
    constructor(collection, jsonData) {
        this.collection = collection;

        // if true, this is a temporary document
        this._isTemporary = false;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new BehaviorSubject(util.clone(jsonData));

        // current doc-data, changes when setting values etc
        this._data = util.clone(jsonData);

        // false when _data !== _dataSync
        this._synced$ = new BehaviorSubject(true);
        this._deleted$ = new BehaviorSubject(false);
    }
    prepare() {
        // set getter/setter/observable
        this._defineGetterSetter(this, '');
    }
    get primaryPath() {
        return this.collection.schema.primaryPath;
    }
    get primary() {
        return this._data[this.primaryPath];
    }
    get revision() {
        return this._data._rev;
    }
    get deleted$() {
        return this._deleted$.asObservable();
    }
    get deleted() {
        return this._deleted$.getValue();
    }
    get atomicQueue() {
        if (!this._atomicQueue)
            this._atomicQueue = new IdleQueue();
        return this._atomicQueue;
    }
    get synced$() {
        return this._synced$
            .pipe(
                distinctUntilChanged()
            ).asObservable();
    }
    get synced() {
        return this._synced$.getValue();
    }
    resync() {
        const syncedData = this._dataSync$.getValue();
        if (this._synced$.getValue() && deepEqual(syncedData, this._data))
            return;
        else {
            this._data = util.clone(this._dataSync$.getValue());
            this._synced$.next(true);
        }
    }

    /**
     * returns the observable which emits the plain-data of this document
     * @return {Observable}
     */
    get $() {
        return this._dataSync$.asObservable();
    }

    /**
     * @param {ChangeEvent}
     */
    _handleChangeEvent(changeEvent) {
        if (changeEvent.data.doc !== this.primary)
            return;

        // TODO check if new _rev is higher then current

        switch (changeEvent.data.op) {
            case 'INSERT':
                break;
            case 'UPDATE':
                const newData = util.clone(changeEvent.data.v);
                const prevSyncData = this._dataSync$.getValue();
                const prevData = this._data;

                if (deepEqual(prevSyncData, prevData)) {
                    // document is in sync, overwrite _data
                    this._data = newData;

                    if (this._synced$.getValue() !== true)
                        this._synced$.next(true);
                } else {
                    // not in sync, emit to synced$
                    if (this._synced$.getValue() !== false)
                        this._synced$.next(false);

                    // overwrite _rev of data
                    this._data._rev = newData._rev;
                }
                this._dataSync$.next(util.clone(newData));
                break;
            case 'REMOVE':
                // remove from docCache to assure new upserted RxDocuments will be a new instance
                this.collection._docCache.delete(this.primary);
                this._deleted$.next(true);
                break;
        }
    }

    /**
     * emits the changeEvent to the upper instance (RxCollection)
     * @param  {RxChangeEvent} changeEvent
     */
    $emit(changeEvent) {
        return this.collection.$emit(changeEvent);
    }

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
    }

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
    }

    /**
     * get data by objectPath
     * @param {string} objPath
     * @return {object} valueObj
     */
    get(objPath) {
        if (!this._data) return undefined;
        let valueObj = objectPath.get(this._data, objPath);
        valueObj = util.clone(valueObj);

        // direct return if array or non-object
        if (
            typeof valueObj !== 'object' ||
            Array.isArray(valueObj)
        ) return valueObj;

        this._defineGetterSetter(valueObj, objPath);
        return valueObj;
    }

    _defineGetterSetter(valueObj, objPath = '') {
        if (valueObj === null) return;

        let pathProperties = this.collection.schema.getSchemaByObjectPath(objPath);
        if (pathProperties.properties) pathProperties = pathProperties.properties;

        Object.keys(pathProperties)
            .forEach(key => {
                const fullPath = util.trimDots(objPath + '.' + key);

                // getter - value
                valueObj.__defineGetter__(
                    key,
                    () => this.get(fullPath)
                );
                // getter - observable$
                Object.defineProperty(valueObj, key + '$', {
                    get: () => this.get$(fullPath),
                    enumerable: false,
                    configurable: false
                });
                // getter - populate_
                Object.defineProperty(valueObj, key + '_', {
                    get: () => this.populate(fullPath),
                    enumerable: false,
                    configurable: false
                });
                // setter - value
                valueObj.__defineSetter__(key, (val) => {
                    return this.set(fullPath, val);
                });
            });
    }

    toJSON() {
        return util.clone(this._data);
    }

    /**
     * set data by objectPath
     * @param {string} objPath
     * @param {object} value
     */
    set(objPath, value) {
        if (typeof objPath !== 'string') {
            throw RxError.newRxTypeError('DOC15', {
                objPath,
                value
            });
        }

        // primary cannot be modified
        if (!this._isTemporary && objPath === this.primaryPath) {
            throw RxError.newRxError('DOC8', {
                objPath,
                value,
                primaryPath: this.primaryPath
            });
        }

        // final fields cannot be modified
        if (!this._isTemporary && this.collection.schema.finalFields.includes(objPath)) {
            throw RxError.newRxError('DOC9', {
                path: objPath,
                value
            });
        }

        // check if equal
        if (Object.is(this.get(objPath), value)) return;

        // check if nested without root-object
        const pathEls = objPath.split('.');
        pathEls.pop();
        const rootPath = pathEls.join('.');
        if (typeof objectPath.get(this._data, rootPath) === 'undefined') {
            throw RxError.newRxError('DOC10', {
                childpath: objPath,
                rootPath
            });
        }

        // check schema of changed field
        if (!this._isTemporary)
            this.collection.schema.validate(value, objPath);

        objectPath.set(this._data, objPath, value);
        return this;
    };

    /**
     * updates document
     * @overwritten by plugin (optinal)
     * @param  {object} updateObj mongodb-like syntax
     */
    async update() {
        throw RxError.pluginMissing('update');
    }

    async putAttachment() {
        throw RxError.pluginMissing('attachments');
    }
    async getAttachment() {
        throw RxError.pluginMissing('attachments');
    }
    async allAttachments() {
        throw RxError.pluginMissing('attachments');
    }
    get allAttachments$() {
        throw RxError.pluginMissing('attachments');
    }

    /**
     * runs an atomic update over the document
     * @param  {function(RxDocument)}  fun
     * @return {Promise<RxDocument>}
     */
    async atomicUpdate(fun) {
        const queue = this.atomicQueue;
        await queue.requestIdlePromise();
        await queue.wrapCall(
            () => Promise
            .resolve(fun(this))
            .then(() => this.save())
        );
        return this;
    }

    /**
     * save document if its data has changed
     * @return {boolean} false if nothing to save
     */
    async save() {
        if (this._isTemporary) return this._saveTemporary();

        if (this._deleted$.getValue()) {
            throw RxError.newRxError('DOC11', {
                id: this.primary,
                document: this
            });
        }

        // check if different
        if (deepEqual(this._data, this._dataSync$.getValue())) {
            this._synced$.next(true);
            return false; // nothing changed, dont save
        }

        await this.collection._runHooks('pre', 'save', this);

        this.collection.schema.validate(this._data);

        const ret = await this.collection._pouchPut(util.clone(this._data));
        if (!ret.ok) {
            throw RxError.newRxError('DOC12', {
                data: ret
            });
        }

        const emitValue = util.clone(this._data);
        emitValue._rev = ret.rev;

        this._data = emitValue;

        await this.collection._runHooks('post', 'save', this);

        // event
        this._synced$.next(true);
        this._dataSync$.next(util.clone(emitValue));


        const changeEvent = RxChangeEvent.create(
            'UPDATE',
            this.collection.database,
            this.collection,
            this,
            emitValue
        );
        this.$emit(changeEvent);
        return true;
    }

    /**
     * does the same as .save() but for temporary documents
     * Saving a temporary doc is basically the same as RxCollection.insert()
     * @return {Promise}
     */
    async _saveTemporary() {
        await this.collection.insert(this);
        this._isTemporary = false;
        this.collection._docCache.set(this.primary, this);

        // internal events
        this._synced$.next(true);
        this._dataSync$.next(util.clone(this._data));

        return true;
    }

    async remove() {
        if (this.deleted) {
            throw RxError.newRxError('DOC13', {
                document: this,
                id: this.primary
            });
        }

        await util.promiseWait(0);
        await this.collection._runHooks('pre', 'remove', this);

        await this.collection.database.lockedRun(
            () => this.collection.pouch.remove(this.primary, this._data._rev)
        );

        this.$emit(RxChangeEvent.create(
            'REMOVE',
            this.collection.database,
            this.collection,
            this,
            this._data
        ));

        await this.collection._runHooks('post', 'remove', this);
        await util.promiseWait(0);
        return;
    }

    destroy() {
        throw RxError.newRxError('DOC14');
    }
}

/**
 * createas an RxDocument from the jsonData
 * @param  {RxCollection} collection
 * @param  {[type]} jsonData   [description]
 * @return {RxDocument}
 */
export function create(collection, jsonData) {
    if (
        jsonData[collection.schema.primaryPath] &&
        jsonData[collection.schema.primaryPath].startsWith('_design')
    ) return null;

    const doc = new RxDocument(collection, jsonData);
    doc.prepare();
    runPluginHooks('createRxDocument', doc);
    return doc;
}

export function createAr(collection, jsonDataAr) {
    return jsonDataAr
        .map(jsonData => create(collection, jsonData))
        .filter(doc => doc !== null);
}

/**
 * returns all possible properties of a RxDocument
 * @return {string[]} property-names
 */
let _properties;
export function properties() {
    if (!_properties) {
        const reserved = ['deleted', 'synced'];
        const pseudoRxDocument = new RxDocument();
        const ownProperties = Object.getOwnPropertyNames(pseudoRxDocument);
        const prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoRxDocument));
        _properties = [...ownProperties, ...prototypeProperties, ...reserved];
    }
    return _properties;
}

export function isInstanceOf(obj) {
    return obj instanceof RxDocument;
}

export default {
    create,
    createAr,
    properties,
    RxDocument,
    isInstanceOf
};
