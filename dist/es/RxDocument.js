function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

import clone from 'clone';
import objectPath from 'object-path';
import deepEqual from 'deep-equal';

import * as util from './util';
import * as RxChangeEvent from './RxChangeEvent';

class RxDocument {
    constructor(collection, jsonData) {
        this.collection = collection;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new util.Rx.BehaviorSubject(clone(jsonData));

        // current doc-data, changes when setting values etc
        this._data = clone(jsonData);

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
        if (this._synced$.getValue()) return;else {
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
        if (changeEvent.data.doc != this.getPrimary()) return;

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

                    if (this._synced$.getValue() != true) this._synced$.next(true);
                } else {
                    // not in sync, emit to synced$
                    if (this._synced$.getValue() != false) this._synced$.next(false);

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
        if (path.includes('.item.')) throw new Error(`cannot get observable of in-array fields because order cannot be guessed: ${path}`);

        const schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        if (!schemaObj) throw new Error(`cannot observe a non-existed field (${path})`);

        return this._dataSync$.map(data => objectPath.get(data, path)).distinctUntilChanged().asObservable();
    }

    populate(path, object) {
        var _this = this;

        return _asyncToGenerator(function* () {
            const schemaObj = _this.collection.schema.getSchemaByObjectPath(path);
            const value = _this.get(path);
            if (!schemaObj) throw new Error(`cannot populate a non-existed field (${path})`);
            if (!schemaObj.ref) throw new Error(`cannot populate because path has no ref (${path})`);

            const refCollection = _this.collection.database.collections[schemaObj.ref];
            if (!refCollection) throw new Error(`ref-collection (${schemaObj.ref}) not in database`);

            if (schemaObj.type == 'array') return Promise.all(value.map(function (id) {
                return refCollection.findOne(id).exec();
            }));else return yield refCollection.findOne(value).exec();
        })();
    }

    /**
     * get data by objectPath
     * @param {string} objPath
     * @return {object} valueObj
     */
    get(objPath) {
        if (!this._data) return undefined;

        if (typeof objPath !== 'string') throw new TypeError('RxDocument.get(): objPath must be a string');

        let valueObj = objectPath.get(this._data, objPath);
        valueObj = clone(valueObj);

        // direct return if array or non-object
        if (typeof valueObj != 'object' || Array.isArray(valueObj)) return valueObj;

        this._defineGetterSetter(valueObj, objPath);
        return valueObj;
    }

    _defineGetterSetter(valueObj, objPath = '') {
        let pathProperties = this.collection.schema.getSchemaByObjectPath(objPath);
        if (pathProperties.properties) pathProperties = pathProperties.properties;

        Object.keys(pathProperties).forEach(key => {
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
            valueObj.__defineSetter__(key, val => {
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
        if (typeof objPath !== 'string') throw new TypeError('RxDocument.set(): objPath must be a string');
        if (objPath == this.getPrimaryPath()) {
            throw new Error(`RxDocument.set(): primary-key (${this.getPrimaryPath()})
                cannot be modified`);
        }
        // check if equal
        if (Object.is(this.get(objPath), value)) return;

        // check if nested without root-object
        let pathEls = objPath.split('.');
        pathEls.pop();
        const rootPath = pathEls.join('.');
        if (typeof objectPath.get(this._data, rootPath) === 'undefined') {
            throw new Error(`cannot set childpath ${objPath}
                 when rootPath ${rootPath} not selected`);
        }

        // check schema of changed field
        this.collection.schema.validate(value, objPath);

        objectPath.set(this._data, objPath, value);

        return this;
    }

    /**
     * save document if its data has changed
     * @return {boolean} false if nothing to save
     */
    save() {
        var _this2 = this;

        return _asyncToGenerator(function* () {
            if (_this2._deleted$.getValue()) throw new Error('RxDocument.save(): cant save deleted document');

            // check if different
            if (deepEqual(_this2._data, _this2._dataSync$.getValue())) {
                _this2._synced$.next(true);
                return false; // nothing changed, dont save
            }

            yield _this2.collection._runHooks('pre', 'save', _this2);
            _this2.collection.schema.validate(_this2._data);

            const ret = yield _this2.collection._pouchPut(clone(_this2._data));
            if (!ret.ok) throw new Error('RxDocument.save(): error ' + JSON.stringify(ret));

            const emitValue = clone(_this2._data);
            emitValue._rev = ret.rev;

            _this2._data = emitValue;

            yield _this2.collection._runHooks('post', 'save', _this2);

            // event
            _this2._synced$.next(true);
            _this2._dataSync$.next(clone(emitValue));

            const changeEvent = RxChangeEvent.create('UPDATE', _this2.collection.database, _this2.collection, _this2, emitValue);
            _this2.$emit(changeEvent);
            return true;
        })();
    }

    remove() {
        var _this3 = this;

        return _asyncToGenerator(function* () {
            if (_this3.deleted) throw new Error('RxDocument.remove(): Document is already deleted');

            yield _this3.collection._runHooks('pre', 'remove', _this3);

            yield _this3.collection.pouch.remove(_this3.getPrimary(), _this3._data._rev);

            _this3.$emit(RxChangeEvent.create('REMOVE', _this3.collection.database, _this3.collection, _this3, _this3._data));

            yield _this3.collection._runHooks('post', 'remove', _this3);
            yield util.promiseWait(0);
            return;
        })();
    }

    destroy() {}
}

export function create(collection, jsonData) {
    if (jsonData[collection.schema.primaryPath].startsWith('_design')) return null;

    const doc = new RxDocument(collection, jsonData);
    doc.prepare();
    return doc;
}

export function createAr(collection, jsonDataAr) {
    return jsonDataAr.map(jsonData => create(collection, jsonData)).filter(doc => doc != null);
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