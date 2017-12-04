/**
 * This plugin adds the local-documents-support
 * Local documents behave equal then with pouchdb
 * @link https://pouchdb.com/guides/local-documents.html
 */

import clone from 'clone';
import objectPath from 'object-path';
import deepEqual from 'deep-equal';

import RxDocument from '../rx-document';
import RxDatabase from '../rx-database';
import RxCollection from '../rx-collection';
import RxChangeEvent from '../rx-change-event';
import DocCache from '../doc-cache';
import RxError from '../rx-error';


import {
    filter
} from 'rxjs/operators/filter';

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
const CHANGE_SUB_BY_PARENT = new WeakMap();
const _getChangeSub = parent => {
    if (!CHANGE_SUB_BY_PARENT.has(parent)) {
        const sub = parent.$
            .pipe(
                filter(cE => cE.data.isLocal)
            )
            .subscribe(cE => {
                const docCache = _getDocCache(parent);
                const doc = docCache.get(cE.data.doc);
                if (doc) doc._handleChangeEvent(cE);
            });
        parent._subs.push(sub);
        CHANGE_SUB_BY_PARENT.set(
            parent,
            sub
        );
    }
    return CHANGE_SUB_BY_PARENT.get(parent);
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

    _handleChangeEvent(changeEvent) {
        if (changeEvent.data.doc !== this.primary) return;
        switch (changeEvent.data.op) {
            case 'UPDATE':
                const newData = clone(changeEvent.data.v);
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
                this._dataSync$.next(clone(newData));
                break;
            case 'REMOVE':
                // remove from docCache to assure new upserted RxDocuments will be a new instance
                const docCache = _getDocCache(this.parent);
                docCache.delete(this.primary);
                this._deleted$.next(true);
                break;
        }
    }

    get allAttachments$() {
        // this is overwritte here because we cannot re-set getters on the prototype
        throw RxError.newRxError('LD1', {
            document: this
        });
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
        return this.parent.$emit(changeEvent);
    }
    get(objPath) {
        if (!this._data) return undefined;
        if (typeof objPath !== 'string') {
            throw RxError.newRxTypeError('LD2', {
                objPath
            });
        }

        let valueObj = objectPath.get(this._data, objPath);
        valueObj = clone(valueObj);
        return valueObj;
    }
    get$(path) {
        if (path.includes('.item.')) {
            throw RxError.newRxError('LD3', {
                path
            });
        }
        if (path === this.primaryPath)
            throw RxError.newRxError('LD4');

        return this._dataSync$
            .map(data => objectPath.get(data, path))
            .distinctUntilChanged()
            .asObservable();
    }
    set(objPath, value) {
        if (!value) {
            // object path not set, overwrite whole data
            const data = clone(objPath);
            data._rev = this._data._rev;
            this._data = data;
            return this;
        }
        if (objPath === '_id') {
            throw RxError.newRxError('LD5', {
                objPath,
                value
            });
        }
        if (Object.is(this.get(objPath), value)) return;
        objectPath.set(this._data, objPath, value);
        return this;
    }
    async save() {
        const saveData = clone(this._data);
        saveData._id = LOCAL_PREFIX + this.id;
        const res = await this.parentPouch.put(saveData);
        this._data._rev = res.rev;

        const changeEvent = RxChangeEvent.create(
            'UPDATE',
            RxDatabase.isInstanceOf(this.parent) ? this.parent : this.parent.database,
            RxCollection.isInstanceOf(this.parent) ? this.parent : null,
            this,
            clone(this._data),
            true
        );
        this.$emit(changeEvent);
    }
    async remove() {
        const removeId = LOCAL_PREFIX + this.id;
        await this.parentPouch.remove(removeId, this._data._rev);
        _getDocCache(this.parent).delete(this.id);
        const changeEvent = RxChangeEvent.create(
            'REMOVE',
            RxDatabase.isInstanceOf(this.parent) ? this.parent : this.parent.database,
            RxCollection.isInstanceOf(this.parent) ? this.parent : null,
            this,
            clone(this._data),
            true
        );
        this.$emit(changeEvent);
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
        throw RxError.newRxError('LD6', {
            functionName: k
        });
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
    _getChangeSub(parent);
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
    if (RxCollection.isInstanceOf(this) && this._isInMemory)
        return this._parentCollection.insertLocal(id, data);

    data = clone(data);
    const existing = await this.getLocal(id);
    if (existing) {
        throw RxError.newRxError('LD7', {
            id,
            data
        });
    }

    // create new one
    const pouch = _getPouchByParent(this);
    const saveData = clone(data);
    saveData._id = LOCAL_PREFIX + id;

    const res = await pouch.put(saveData);

    data._rev = res.rev;
    const newDoc = RxLocalDocument.create(id, data, this);
    return newDoc;
};

/**
 * save the local-document-data
 * overwrites existing if exists
 * @return {RxLocalDocument}
 */
const upsertLocal = async function(id, data) {
    if (RxCollection.isInstanceOf(this) && this._isInMemory)
        return this._parentCollection.upsertLocal(id, data);

    const existing = await this.getLocal(id);

    if (!existing) {
        // create new one
        const doc = this.insertLocal(id, data);
        return doc;
    } else {
        // update existing
        data._rev = existing._data._rev;
        existing._data = data;
        await existing.save();
        return existing;
    }
};


const getLocal = async function(id) {
    if (RxCollection.isInstanceOf(this) && this._isInMemory)
        return this._parentCollection.getLocal(id);

    const pouch = _getPouchByParent(this);
    const docCache = _getDocCache(this);

    // check in doc-cache
    const found = docCache.get(id);

    // check in pouch
    if (!found) {
        try {
            const docData = await pouch.get(LOCAL_PREFIX + id);
            if (!docData) return null;
            const doc = RxLocalDocument.create(id, docData, this);
            return doc;
        } catch (err) {
            return null;
        }
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
