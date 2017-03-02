import {
    default as clone
} from 'clone';
import {
    default as objectPath
} from 'object-path';

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
    get synced$() {
        return this._synced$.asObservable().distinctUntilChanged();
    }

    resync() {
        if (this._synced$.getValue())
            return;
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

        //TODO check if new _rev is higher then current

        switch (changeEvent.data.op) {
            case 'INSERT':
                break;
            case 'UPDATE':
                const newData = clone(changeEvent.data.v);
                delete newData._ext;
                const prevSyncData = this._dataSync$.getValue();
                const prevData = this._data;

                if (isDeepEqual(prevSyncData, prevData)) {
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
    $emit = changeEvent => this.collection.$emit(changeEvent);

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

        const doc = await refCollection.findOne(value).exec();
        return doc;
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
                // getter - value
                valueObj.__defineGetter__(key, () => {
                    return this.get(util.trimDots(objPath + '.' + key));
                });
                // getter - observable$
                valueObj.__defineGetter__(key + '$', () => {
                    return this.get$(util.trimDots(objPath + '.' + key));
                });
                // getter - populate_
                valueObj.__defineGetter__(key + '_', () => {
                    return this.populate(util.trimDots(objPath + '.' + key));
                });

                // setter - value
                valueObj.__defineSetter__(key, (val) => {
                    return this.set(util.trimDots(objPath + '.' + key), val);
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
        const schemaObj = this.collection.schema.getSchemaByObjectPath(objPath);
        this.collection.schema.validate(value, schemaObj);

        objectPath.set(this._data, objPath, value);

        return this;
    };

    /**
     * save document if its data has changed
     * @return {boolean} false if nothing to save
     */
    async save() {
        if (this._deleted$.getValue())
            throw new Error('RxDocument.save(): cant save deleted document');

        // check if different
        if (isDeepEqual(this._data, this._dataSync$.getValue())) {
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

    async remove() {
        if (this.deleted)
            throw new Error('RxDocument.remove(): Document is already deleted');

        await this.collection._runHooks('pre', 'remove', this);

        this.deleted = true;
        await this.collection.pouch.remove(this.getPrimary(), this._data._rev);


        await this.collection._runHooks('post', 'remove', this);

        this.$emit(RxChangeEvent.create(
            'REMOVE',
            this.collection.database,
            this.collection,
            this,
            null
        ));
    }

    destroy() {}
}

/**
 * performs a deep-equal without comparing internal getters and setter (observe$ and populate_ etc.)
 * @param  {object}  data1
 * @param  {object}  data2
 * @throws {Error} if given data not a plain js object
 * @return {Boolean} true if equal
 */
export function isDeepEqual(data1, data2) {
    if (typeof data1 !== typeof data2) return false;

    let ret = true;

    // array
    if (Array.isArray(data1)) {
        let k = 0;
        while (k < data1.length && ret == true) {
            if (!data2[k] || !isDeepEqual(data1[k], data2[k]))
                ret = false;
            k++;
        }
        return ret;
    }

    // object
    if (typeof data1 === 'object') {
        const entries = Object.entries(data1)
            .filter(entry => !entry[0].endsWith('$')) // observe
            .filter(entry => !entry[0].endsWith('_')); // populate;
        let k = 0;
        while (k < entries.length && ret) {
            const entry = entries[k];
            const name = entry[0];
            const value = entry[1];
            if (!isDeepEqual(data2[name], value))
                ret = false;
            k++;
        }
        return ret;
    }

    // other
    return data1 == data2;
}

export function create(collection, jsonData) {
    if (jsonData[collection.schema.primaryPath].startsWith('_design'))
        return null;

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
