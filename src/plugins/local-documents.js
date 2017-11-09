/**
 * This plugin adds the local-documents-support
 * Local documents behave equal then with pouchdb
 * @link https://pouchdb.com/guides/local-documents.html
 */

import RxDocument from '../rx-document';
import RxDatabase from '../rx-database';
import RxCollection from '../rx-collection';
import DocCache from '../doc-cache';

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

export class RxLocalDocument extends RxDocument.RxDocument {
    /**
     * @constructor
     * @param  {string} id
     * @param  {Object} jsonData
     * @param  {RxCollection|RxDatabase} parent
     */
    constructor(id, jsonData, parent) {
        this.id = id;
        this.jsonData = jsonData;
        this.parent = parent;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new util.Rx.BehaviorSubject(clone(jsonData));

        // current doc-data, changes when setting values etc
        this._data = clone(jsonData);
    }

    toPouchJson() {
        const data = clone(this._data);
        data._id = 'local/' + this.id;
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
        await this.parentPouch.remove(this.toPouchJson());
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
        'allAttachments',
        'allAttachments$',
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
 * overwrites the old one if exists
 * @return {RxLocalDocument}
 */
const setLocalDocument = async function(id, data) {
    const existing = await this.getLocalDocument(id);

    // create new one
    if (!existing) {
        const pouch = _getPouchByParent(this);
        const saveData = clone(data);
        saveData._id = 'local/' + id;
        await pouch.put(saveData);
        existing = data;
    }

    const newDoc = RxLocalDocument.create(id, data, this);
    return newDoc;
};

const getLocalDocument = async function(id) {
    const pouch = _getPouchByParent(this);
    const docCache = _getDocCache(this);

    // check in doc-cache
    let found = docCache.get(id);

    // check in pouch
    if (!found) {
        found = await pouch.get('local/' + id);
    }
    return found;
};

export const rxdb = true;
export const prototypes = {
    RxCollection: proto => {
        proto.setLocalDocument = setLocalDocument;
        proto.getLocalDocument = getLocalDocument;
    },
    RxDatabase: proto => {
        proto.setLocalDocument = setLocalDocument;
        proto.getLocalDocument = getLocalDocument;
    }
};
export const overwritable = {};

export default {
    rxdb,
    prototypes,
    overwritable
};
