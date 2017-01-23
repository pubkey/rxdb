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

    constructor(collection, jsonData, query) {
        this.collection = collection;
        this.query = query;

        this._data = clone(jsonData);

        this.deleted = false;
        this._deleted$;
        this.changed = false;

        this._observable$;
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
        if (!this._observable$) {
            this._observable$ = this.collection.$
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
        return this._observable$;
    }

    get deleted$() {
        if (!this._deleted$) {
            this._deleted$ = this.$
                .filter(docData => docData == null);
        }
        return this._deleted$;
    }

    /**
     * returns observable of the value of the given path
     * @param {string} path
     * @return {Observable}
     */
    get$(path) {
        const schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        if (!schemaObj) throw new Error(`cannot observe a non-existed field (${path})`);

        return this.$
            .map(data => objectPath.get(data, path))
            .distinctUntilChanged()
            .startWith(this.get(path));
    }


    $emit = changeEvent => this.collection.$emit(changeEvent);

    /**
     * get data by objectPath
     * @param {string} objPath
     * @return {object} value
     */
    get(objPath) {
        if (!this._data) return undefined;

        if (typeof objPath !== 'string')
            throw new TypeError('RxDocument.get(): objPath must be a string');

        return objectPath.get(this._data, objPath);
    }

    toJSON() {
        return clone(this._data);
    }

    /**
     * get the proxy-version of an nested object of this documents data
     * used to get observables like myfield.nestedfield$
     * @param {string} path
     * @param {object} obj
     */
    proxyfy(path, obj) {
        return new Proxy(obj, {
            get: (target, name) => {
                const value = obj[name];

                if (!obj.hasOwnProperty(name) && !obj.hasOwnProperty([name.slice(0, -1)]))
                    return undefined;

                // return observable if field ends with $
                if (name.slice(-1) == '$')
                    return this.get$(path + '.' + name.slice(0, -1));

                // return value if no object or is array
                if (typeof value !== 'object' || Array.isArray(value)) return value;

                // return proxy if object again
                const newPath = path + '.' + name;
                return this.proxyfy(newPath, this.get(newPath));
            },
            set: (doc, name, value) => {
                this.set(path + '.' + name, value);
                return true;
            }
        });
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


export function create(collection, jsonData, query) {
    if (jsonData[collection.schema.primaryPath].startsWith('_design'))
        return null;

    const doc = new RxDocument(collection, jsonData, query);
    return new Proxy(doc, {
        get: (doc, name) => {

            // return document-property if exists
            if (doc[name]) return doc[name];

            if (typeof name != 'string') return doc[name];

            // return observable if field ends with $
            if (name.slice && name.slice(-1) == '$')
                return doc.get$(name.slice(0, -1));

            const value = doc.get(name);
            if (typeof value == 'object' && !Array.isArray(value)) return doc.proxyfy(name, value);
            else return value;
        },

        set: (doc, name, value) => {
            if (doc.hasOwnProperty(name)) {
                doc[name] = value;
                return true;
            }
            if (!doc.get(name)) throw new Error('can not set unknown field ' + name);
            doc.set(name, value);
            return true;
        }
    });
}


export function createAr(collection, jsonDataAr, query) {
    return jsonDataAr
        .map(jsonData => create(collection, jsonData, query))
        .filter(doc => doc != null);
}

const pseudoRxDocument = new RxDocument({
    schema: {
        getEncryptedPaths: () => []
    },
    $: {
        filter: () => false
    }
}, {}, {});

/**
 * returns all possible properties of a RxDocument
 * @return {string[]} property-names
 */
export function properties() {
    const ownProperties = Object.getOwnPropertyNames(pseudoRxDocument);
    const prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoRxDocument));
    const properties = [...ownProperties, ...prototypeProperties];
    return properties;
}
