/**
 * This plugin adds the local-documents-support
 * Local documents behave equal then with pouchdb
 * @link https://pouchdb.com/guides/local-documents.html
 */

import clone from 'clone';

import RxDocument from '../rx-document';
import RxDatabase from '../rx-database';
import RxCollection from '../rx-collection';
import DocCache from '../doc-cache';
import RxError from '../rx-error';

const DOC_CACHE_BY_PARENT = new WeakMap();
const _getDocCache = parent => {
    if (!DOC_CACHE_BY_PARENT.has(parent)) {
        DOC_CACHE_BY_PARENT.set(
            parent,
            DocCache.create()
        );
    }
    return DOC_CACHE_BY_PARENT.get(parent);
};
const LOCAL_PREFIX = '_local/';

export class RxLocalDocument extends RxDocument.RxDocument {
    /**
     * @constructor
     * @param  {string} id
     * @param  {Object} jsonData
     * @param  {RxCollection|RxDatabase} parent
     */
    constructor(id, jsonData, parent) {
        super(null, jsonData);
        this.id = id;
        this.parent = parent;
    }
    toPouchJson() {
        const data = clone(this._data);
        data._id = LOCAL_PREFIX + this.id;
    }
    get isLocal() {
        return true;
    }
    get parentPouch() {
        return _getPouchByParent(this.parent);
    }

    //
    // overwrites
    //

    get allAttachments$() {
        // this is overwritte here because we cannot re-set getters on the prototype
        throw new Error('cant use attachments on local documents');
    }

    get primaryPath() {
        return 'id';
    }
    get primary() {
        return this.id;
    }
    get $() {
        return this._dataSync$.asObservable();
    }
    $emit(changeEvent) {
        changeEvent.isLocal = true;
        return this.parent.$emit(changeEvent);
    }
    get$(path) {
        if (path.includes('.item.'))
            throw new Error(`cannot get observable of in-array fields because order cannot be guessed: ${path}`);
        if (path === this.primaryPath)
            throw RxError.newRxError('cannot observe primary path');

        return this._dataSync$
            .map(data => objectPath.get(data, path))
            .distinctUntilChanged()
            .asObservable();
    }
    set(objPath, value) {
        if (objPath === '_id')
            throw new Error('id cannot be modified');
        if (Object.is(this.get(objPath), value)) return;
        objectPath.set(this._data, objPath, value);
        return this;
    }
    async save() {

    }
    async remove() {
        const removeId = LOCAL_PREFIX + this.id;
        console.log('removeId:');
        console.dir(removeId);

        const d = this._data;
        d._id = removeId;
        console.dir(d);
        await this.parentPouch.remove(d);
    }
};


let INIT_DONE = false;
const _init = () => {
    if (INIT_DONE) return;
    else INIT_DONE = true;

    /**
     * overwrite things that not work on local documents
     * with throwing function
     */
    const getThrowingFun = k => () => {
        throw new Error('Function ' + k + ' is not useable on local documents');
    };
    [
        'populate',
        'update',
        'putAttachment',
        'getAttachment',
        'allAttachments'
    ].forEach(k => RxLocalDocument.prototype[k] = getThrowingFun(k));
};

RxLocalDocument.create = (id, data, parent) => {
    _init();
    const newDoc = new RxLocalDocument(id, data, parent);
    _getDocCache(parent).set(id, newDoc);
    return newDoc;
};

const _getPouchByParent = parent => {
    if (RxDatabase.isInstanceOf(parent))
        return parent._adminPouch; // database
    else return parent.pouch; // collection
};

/**
 * save the local-document-data
 * throws if already exists
 * @return {RxLocalDocument}
 */
const insertLocal = async function(id, data) {
    let existing = await this.getLocal(id);
    if (existing) {
        throw RxError.newRxError(
            'Local document already exists', {
                id,
                data
            }
        );
    }

    // create new one
    if (!existing) {
        const pouch = _getPouchByParent(this);
        const saveData = clone(data);
        saveData._id = LOCAL_PREFIX + id;

        console.log('save:data:');
        console.dir(saveData);

        await pouch.put(saveData);
        existing = data;
    }

    const newDoc = RxLocalDocument.create(id, data, this);
    return newDoc;
};

/**
 * save the local-document-data
 * overwrites existing if exists
 * @return {RxLocalDocument}
 */
const upsertLocal = async function(id, data) {
    const existing = await this.getLocal(id);

    if (!existing) {
        // create new one
        const doc = this.insertLocal(id, data);
        return doc;
    } else {
        // update existing
        existing._data = data;
        await existing.save();
        return existing;
    }
};


const getLocal = async function(id) {
    const pouch = _getPouchByParent(this);
    const docCache = _getDocCache(this);

    // check in doc-cache
    let found = docCache.get(id);

    // check in pouch
    if (!found) {
        console.log('1');
        try {
            found = await pouch.get(LOCAL_PREFIX + id);
        } catch (err) {}
        console.log('2');
    }
    return found;
};

export const rxdb = true;
export const prototypes = {
    RxCollection: proto => {
        proto.insertLocal = insertLocal;
        proto.upsertLocal = upsertLocal;
        proto.getLocal = getLocal;
    },
    RxDatabase: proto => {
        proto.insertLocal = insertLocal;
        proto.upsertLocal = upsertLocal;
        proto.getLocal = getLocal;
    }
};
export const overwritable = {};

export default {
    rxdb,
    prototypes,
    overwritable
};
