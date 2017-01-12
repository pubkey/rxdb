import {
    default as clone
} from 'clone';

import {
    default as objectPath
} from 'object-path';

import * as util from './util';
import * as RxChangeEvent from './RxChangeEvent';

class RxDocument {

    constructor(collection, jsonData, query) {
        this.collection = collection;
        this.rawData = jsonData;
        this.query = query;

        this.data = clone(this.rawData);
        delete this.data._rev;
        delete this.data._id;

        // handle encrypted data
        const encPaths = this.collection.schema.getEncryptedPaths();
        let currentPath;
        Object.keys(encPaths)
            .map(path => currentPath = path)
            .map(path => objectPath.get(this.data, currentPath))
            .filter(enc => !!enc)
            .map(encrypted => this.collection.database._decrypt(encrypted))
            .forEach(decrypted => objectPath.set(this.data, currentPath, decrypted));

        this.deleted = false;
        this.changed = false;

        this.observable$ = this.collection.$
            .filter(event => (
                event.data.doc == this.rawData._id ||
                event.data.doc == '*'
            ));
    }



    get $() {
        return this.observable$;
    }

    /**
     * returns observable of the value of the given path
     * @param {string} path
     * @return {Observable} obs
     */
    get$(path) {
        const schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        if (!schemaObj) throw new Error(`cannot observe a non-existed field (${path})`);

        return this.$
            .map(cEvent => objectPath.get(cEvent.data.v, path))
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
        if (typeof objPath !== 'string')
            throw new TypeError('RxDocument.get(): objPath must be a string');

        if (objPath == this.collection.schema.primaryPath)
            return this.rawData._id;

        return objectPath.get(this.data, objPath);
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
        if (objPath == '_id')
            throw new Error('_id cannot be modified');
        if (objPath == this.collection.schema.primaryPath)
            throw new Error('primary-fields cannot be modified');

        // check if equal
        if (Object.is(this.get(objPath), value)) return;
        else this.changed = true;

        // check if nested without root-object
        let pathEls = objPath.split('.');
        pathEls.pop();
        const rootPath = pathEls.join('.');
        if (typeof objectPath.get(this.data, rootPath) === 'undefined') {
            throw new Error(
                `cannot set childpath ${objPath}
                 when rootPath ${rootPath} not selected`);
        }

        // check schema of changed field
        const schemaObj = this.collection.schema.getSchemaByObjectPath(objPath);
        this.collection.schema.validate(value, schemaObj);

        objectPath.set(this.data, objPath, value);
        objectPath.set(this.rawData, objPath, value);

        return this;
    };

    async save() {
        if (!this.changed) return;

        if (this.deleted)
            throw new Error('RxDocument.save(): cant save deleted document');

        // fill up data-object with non-select() fields
        if (this.query.fields) {
            const rootDoc = await this.collection.findOne(this.rawData._id).exec();
            this.rawData = Object.assign(rootDoc.rawData, this.rawData);
            this.data = Object.assign(rootDoc.data, this.data);
        }

        const emitValue = clone(this.rawData);

        await this.collection._runHooks('pre', 'save', this);


        // handle encrypted data
        const encPaths = this.collection.schema.getEncryptedPaths();
        Object.keys(encPaths).map(path => {
            let value = objectPath.get(this.rawData, path);
            let encrypted = this.collection.database._encrypt(value);
            objectPath.set(this.rawData, path, encrypted);
        });

        const ret = await this.collection.pouch.put(this.rawData);
        if (!ret.ok)
            throw new Error('RxDocument.save(): error ' + JSON.stringify(ret));
        this.rawData._rev = ret.rev;

        await this.collection._runHooks('post', 'save', this);

        // event
        this.$emit(RxChangeEvent.create(
            'RxDocument.save',
            this.collection.database,
            this.collection,
            this,
            emitValue
        ));

        this.changed = false;
    }


    async remove() {
        if (this.deleted)
            throw new Error('RxDocument.remove(): Document is already deleted');

        await this.collection._runHooks('pre', 'remove', this);

        this.deleted = true;
        await this.collection.pouch.remove(this.rawData._id, this.rawData._rev);

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
    if (jsonData._id.startsWith('_design')) return null;

    const doc = new RxDocument(collection, jsonData, query);
    return new Proxy(doc, {
        get: (doc, name) => {

            // return document-property if exists
            if (doc[name]) return doc[name];

            // return observable if field ends with $
            if (name.slice(-1) == '$')
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
        .filter(jsonData => !jsonData._id.startsWith('_design'))
        .map(jsonData => create(collection, jsonData, query));
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
