import {
    default as clone
} from 'clone';

import {
    default as objectPath
} from 'object-path';

import * as util from './util';
import * as RxChangeEvent from './RxChangeEvent';

class RxDocument {

    get[Symbol.toStringTag]() {
        return 'RxDocument';
    }

    constructor(collection, jsonData) {
        this.collection = collection;

        this._data = clone(jsonData);
        this._$;

        this.changed = false;
        this.deleted = false;
        this._deleted$;

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


    /**
     * returns the observable which emits the plain-data of this document
     * @return {Observable}
     */
    get $() {
        if (!this._$) {
            this._$ = this.collection.$
                .filter(event => (
                    event.data.doc == this.getPrimary() ||
                    event.data.doc == '*'
                ))
                .mergeMap(async(ev) => {
                    if (ev.data.op == 'RxDocument.remove') {
                        this.deleted = true;
                        return null;
                    }
                    if (ev.data.v) return ev.data.v;
                    const newData = await this.collection._pouchGet(this.getPrimary());
                    return newData;
                })
                .do(docData => this._data = docData);
        }
        return this._$;
    }

    get deleted$() {
        if (!this._deleted$) {
            this._deleted$ = this.$
                .filter(docData => docData == null);
        }
        return this._deleted$;
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

        return this.$
            .map(data => objectPath.get(data, path))
            .distinctUntilChanged()
            .startWith(this.get(path));
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
        else this.changed = true;

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

    async save() {
        if (!this.changed) return;

        if (this.deleted)
            throw new Error('RxDocument.save(): cant save deleted document');

        const emitValue = clone(this._data);

        await this.collection._runHooks('pre', 'save', this);


        // handle encrypted data
        // // TODO handle data
        /*        const encPaths = this.collection.schema.getEncryptedPaths();
                Object.keys(encPaths).map(path => {
                    let value = objectPath.get(this.rawData, path);
                    let encrypted = this.collection.database._encrypt(value);
                    objectPath.set(this.rawData, path, encrypted);
                });*/

        const ret = await this.collection._pouchPut(clone(this._data));
        if (!ret.ok)
            throw new Error('RxDocument.save(): error ' + JSON.stringify(ret));
        this._data._rev = ret.rev;

        await this.collection._runHooks('post', 'save', this);

        // event
        const changeEvent = RxChangeEvent.create(
            'RxDocument.save',
            this.collection.database,
            this.collection,
            this,
            emitValue
        );
        this.$emit(changeEvent);

        this.changed = false;
    }


    async remove() {
        if (this.deleted)
            throw new Error('RxDocument.remove(): Document is already deleted');

        await this.collection._runHooks('pre', 'remove', this);

        this.deleted = true;
        await this.collection.pouch.remove(this.getPrimary(), this._data._rev);

        await this.collection._runHooks('post', 'remove', this);

        this.$emit(RxChangeEvent.create(
            'RxDocument.remove',
            this.collection.database,
            this.collection,
            this,
            null
        ));
    }

    destroy() {}

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
        const pseudoRxDocument = new RxDocument();
        const ownProperties = Object.getOwnPropertyNames(pseudoRxDocument);
        const prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoRxDocument));
        _properties = [...ownProperties, ...prototypeProperties];
    }
    return _properties;
}
