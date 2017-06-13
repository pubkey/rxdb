import clone from 'clone';
import objectPath from 'object-path';
import deepEqual from 'deep-equal';
import modify from 'modifyjs';

import * as util from './util';
import * as RxChangeEvent from './RxChangeEvent';

class RxDocument {
    constructor(collection, jsonData) {
        this.collection = collection;

        // if true, this is a temporary document
        this._isTemporary = false;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new util.Rx.BehaviorSubject(clone(jsonData));

        // current doc-data, changes when setting values etc
        this._data = clone(jsonData);

        // atomic-update-functions that have not run yes
        this._atomicUpdates = [];
        // resolve-functions to resolve the promises of atomicUpdate
        this._atomicUpdatesResolveFunctions = new WeakMap();

        // false when _data !== _dataSync
        this._synced$ = new util.Rx.BehaviorSubject(true);

        this._deleted$ = new util.Rx.BehaviorSubject(false);
    }
    prepare() {
        // set getter/setter/observable
        this._defineGetterSetter(this, '');
    }

    getPrimaryPath() {
        return this.collection.schema.primaryPath;
    }

    getPrimary() {
        return this._data[this.getPrimaryPath()];
    }
    getRevision() {
        return this._data._rev;
    }

    get deleted$() {
        return this._deleted$.asObservable();
    }
    get deleted() {
        return this._deleted$.getValue();
    }
    get synced$() {
        return this._synced$.asObservable().distinctUntilChanged();
    }
    get synced() {
        return this._synced$.getValue();
    }

    resync() {
        const syncedData = this._dataSync$.getValue();
        if (this._synced$.getValue() && deepEqual(syncedData, this._data)) return;
        else {
            this._data = clone(this._dataSync$.getValue());
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
        if (changeEvent.data.doc != this.getPrimary())
            return;

        // TODO check if new _rev is higher then current

        switch (changeEvent.data.op) {
            case 'INSERT':
                break;
            case 'UPDATE':
                const newData = clone(changeEvent.data.v);
                delete newData._ext;
                const prevSyncData = this._dataSync$.getValue();
                const prevData = this._data;

                if (deepEqual(prevSyncData, prevData)) {
                    // document is in sync, overwrite _data
                    this._data = newData;

                    if (this._synced$.getValue() != true)
                        this._synced$.next(true);
                } else {
                    // not in sync, emit to synced$
                    if (this._synced$.getValue() != false)
                        this._synced$.next(false);

                    // overwrite _rev of data
                    this._data._rev = newData._rev;
                }
                this._dataSync$.next(clone(newData));
                break;
            case 'REMOVE':
                // remove from docCache to assure new upserted RxDocuments will be a new instance
                this.collection._docCache.delete(this.getPrimary());

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
        if (path.includes('.item.'))
            throw new Error(`cannot get observable of in-array fields because order cannot be guessed: ${path}`);

        const schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        if (!schemaObj) throw new Error(`cannot observe a non-existed field (${path})`);

        return this._dataSync$
            .map(data => objectPath.get(data, path))
            .distinctUntilChanged()
            .asObservable();
    }

    async populate(path, object) {
        const schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        const value = this.get(path);
        if (!schemaObj)
            throw new Error(`cannot populate a non-existed field (${path})`);
        if (!schemaObj.ref)
            throw new Error(`cannot populate because path has no ref (${path})`);

        const refCollection = this.collection.database.collections[schemaObj.ref];
        if (!refCollection)
            throw new Error(`ref-collection (${schemaObj.ref}) not in database`);

        if (schemaObj.type == 'array')
            return Promise.all(value.map(id => refCollection.findOne(id).exec()));
        else
            return await refCollection.findOne(value).exec();
    }

    /**
     * get data by objectPath
     * @param {string} objPath
     * @return {object} valueObj
     */
    get(objPath) {
        if (!this._data) return undefined;

        if (typeof objPath !== 'string')
            throw new TypeError('RxDocument.get(): objPath must be a string');

        let valueObj = objectPath.get(this._data, objPath);
        valueObj = clone(valueObj);

        // direct return if array or non-object
        if (
            typeof valueObj != 'object' ||
            Array.isArray(valueObj)
        ) return valueObj;

        this._defineGetterSetter(valueObj, objPath);
        return valueObj;
    }

    _defineGetterSetter(valueObj, objPath = '') {
        let pathProperties = this.collection.schema.getSchemaByObjectPath(objPath);
        if (pathProperties.properties) pathProperties = pathProperties.properties;

        Object.keys(pathProperties)
            .forEach(key => {
                const fullPath = util.trimDots(objPath + '.' + key);

                // getter - value
                valueObj.__defineGetter__(key, () => {
                    return this.get(fullPath);
                });
                // getter - observable$
                Object.defineProperty(valueObj, key + '$', {
                    get: () => {
                        return this.get$(fullPath);
                    },
                    enumerable: false,
                    configurable: false
                });
                // getter - populate_
                Object.defineProperty(valueObj, key + '_', {
                    get: () => {
                        return this.populate(fullPath);
                    },
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
        return clone(this._data);
    }

    /**
     * set data by objectPath
     * @param {string} objPath
     * @param {object} value
     */
    set(objPath, value) {
        if (typeof objPath !== 'string')
            throw new TypeError('RxDocument.set(): objPath must be a string');
        if (objPath == this.getPrimaryPath()) {
            throw new Error(
                `RxDocument.set(): primary-key (${this.getPrimaryPath()})
                cannot be modified`);
        }
        // check if equal
        if (Object.is(this.get(objPath), value)) return;


        // check if nested without root-object
        let pathEls = objPath.split('.');
        pathEls.pop();
        const rootPath = pathEls.join('.');
        if (typeof objectPath.get(this._data, rootPath) === 'undefined') {
            throw new Error(
                `cannot set childpath ${objPath}
                 when rootPath ${rootPath} not selected`);
        }

        // check schema of changed field
        if (!this._isTemporary)
            this.collection.schema.validate(value, objPath);

        objectPath.set(this._data, objPath, value);

        return this;
    };

    /**
     * updates document
     *  @param  {object} updateObj
     */
    async update(updateObj) {
        const newDoc = modify(this._data, updateObj);

        Object.keys(this._data).forEach((previousPropName) => {
            if (newDoc[previousPropName]) {
                // if we don't check inequality, it triggers an update attempt on fields that didn't really change,
                // which causes problems with "readonly" fields
                if (!deepEqual(this._data[previousPropName], newDoc[previousPropName]))
                    this._data[previousPropName] = newDoc[previousPropName];
            } else
                delete this._data[previousPropName];
        });
        delete newDoc._rev;
        delete newDoc._id;
        Object.keys(newDoc).forEach(newPropName => {
            if (!deepEqual(this._data[newPropName], newDoc[newPropName]))
                this._data[newPropName] = newDoc[newPropName];
        });
        await this.save();
    }

    async atomicUpdate(fun) {
        this._atomicUpdates.push(fun);
        const retPromise = new Promise(res => {
            this._atomicUpdatesResolveFunctions.set(fun, res);
        });
        this._runAtomicUpdates();
        return retPromise;
    }
    async _runAtomicUpdates() {
        if (this.__runAtomicUpdates_running) return;
        else this.__runAtomicUpdates_running = true;

        if (this._atomicUpdates.length === 0) return;
        const fun = this._atomicUpdates.shift();

        await fun(this); // run atomic
        this._atomicUpdatesResolveFunctions.get(fun)(); // resolve promise

        this.__runAtomicUpdates_running = false;
        this._runAtomicUpdates();
    }

    /**
     * save document if its data has changed
     * @return {boolean} false if nothing to save
     */
    async save() {
        if (this._isTemporary) return this._saveTemporary();

        if (this._deleted$.getValue())
            throw new Error('RxDocument.save(): cant save deleted document');

        // check if different
        if (deepEqual(this._data, this._dataSync$.getValue())) {
            this._synced$.next(true);
            return false; // nothing changed, dont save
        }

        await this.collection._runHooks('pre', 'save', this);
        this.collection.schema.validate(this._data);

        const ret = await this.collection._pouchPut(clone(this._data));
        if (!ret.ok)
            throw new Error('RxDocument.save(): error ' + JSON.stringify(ret));

        const emitValue = clone(this._data);
        emitValue._rev = ret.rev;

        this._data = emitValue;

        await this.collection._runHooks('post', 'save', this);

        // event
        this._synced$.next(true);
        this._dataSync$.next(clone(emitValue));


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
        this.collection._docCache.set(this.getPrimary(), this);

        // internal events
        this._synced$.next(true);
        this._dataSync$.next(clone(this._data));

        return true;
    }

    async remove() {
        if (this.deleted)
            throw new Error('RxDocument.remove(): Document is already deleted');

        await this.collection._runHooks('pre', 'remove', this);

        await this.collection.pouch.remove(this.getPrimary(), this._data._rev);

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

    destroy() {}
}

export function create(collection, jsonData) {
    if (
        jsonData[collection.schema.primaryPath] &&
        jsonData[collection.schema.primaryPath].startsWith('_design')
    ) return null;

    const doc = new RxDocument(collection, jsonData);
    doc.prepare();
    return doc;
}

export function createAr(collection, jsonDataAr) {
    return jsonDataAr
        .map(jsonData => create(collection, jsonData))
        .filter(doc => doc != null);
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
