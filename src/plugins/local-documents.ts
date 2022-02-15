import objectPath from 'object-path';

import {
    createRxDocumentConstructor,
    basePrototype
} from '../rx-document';
import {
    createDocCache
} from '../doc-cache';
import {
    newRxError,
    newRxTypeError
} from '../rx-error';
import {
    flatClone,
    getFromObjectOrThrow
} from '../util';

import type {
    RxChangeEvent,
    RxCollection,
    RxDatabase,
    RxDocument,
    RxDocumentWriteData,
    RxLocalDocumentData,
    RxPlugin,
    RxStorageKeyObjectInstance
} from '../types';

import {
    isRxDatabase
} from '../rx-database';
import {
    isRxCollection
} from '../rx-collection';

import {
    filter,
    map,
    distinctUntilChanged,
    startWith,
    mergeMap
} from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
    findLocalDocument,
    writeSingleLocal
} from '../rx-storage-helper';

import {
    overwritable
} from '../overwritable';

const DOC_CACHE_BY_PARENT = new WeakMap();
const _getDocCache = (parent: any) => {
    if (!DOC_CACHE_BY_PARENT.has(parent)) {
        DOC_CACHE_BY_PARENT.set(
            parent,
            createDocCache()
        );
    }
    return DOC_CACHE_BY_PARENT.get(parent);
};
const CHANGE_SUB_BY_PARENT = new WeakMap();
const _getChangeSub = (parent: any) => {
    if (!CHANGE_SUB_BY_PARENT.has(parent)) {
        const sub = parent.$
            .pipe(
                filter(cE => (cE as RxChangeEvent<any>).isLocal)
            )
            .subscribe((cE: RxChangeEvent<any>) => {
                const docCache = _getDocCache(parent);
                const doc = docCache.get(cE.documentId);

                if (doc) {
                    doc._handleChangeEvent(cE);
                }
            });
        parent._subs.push(sub);
        CHANGE_SUB_BY_PARENT.set(
            parent,
            sub
        );
    }
    return CHANGE_SUB_BY_PARENT.get(parent);
};

const RxDocumentParent = createRxDocumentConstructor() as any;
export class RxLocalDocument extends RxDocumentParent {
    constructor(
        public readonly id: string,
        jsonData: any,
        public readonly parent: RxCollection | RxDatabase
    ) {
        super(null, jsonData);
    }
}

function _getKeyObjectStorageInstanceByParent(parent: any): RxStorageKeyObjectInstance<any, any> {
    if (isRxDatabase(parent)) {
        return (parent as RxDatabase<{}>).localDocumentsStore; // database
    } else {
        return (parent as RxCollection).localDocumentsStore; // collection
    }
}

const RxLocalDocumentPrototype: any = {
    get isLocal() {
        return true;
    },

    //
    // overwrites
    //

    _handleChangeEvent(
        this: any,
        changeEvent: RxChangeEvent<RxLocalDocumentData>
    ) {
        if (changeEvent.documentId !== this.primary) {
            return;
        }
        switch (changeEvent.operation) {
            case 'UPDATE':
                const newData = changeEvent.documentData;
                this._dataSync$.next(newData);
                break;
            case 'DELETE':
                // remove from docCache to assure new upserted RxDocuments will be a new instance
                const docCache = _getDocCache(this.parent);
                docCache.delete(this.primary);
                this._isDeleted$.next(true);
                break;
        }
    },

    get allAttachments$() {
        // this is overwritten here because we cannot re-set getters on the prototype
        throw newRxError('LD1', {
            document: this
        });
    },
    get primaryPath() {
        return 'id';
    },
    get primary() {
        return this.id;
    },
    get $() {
        return (this as RxDocument)._dataSync$.asObservable();
    },
    $emit(this: any, changeEvent: RxChangeEvent<RxLocalDocumentData>) {
        return this.parent.$emit(changeEvent);
    },
    get(this: RxDocument, objPath: string) {
        if (!this._data) {
            return undefined;
        }
        if (typeof objPath !== 'string') {
            throw newRxTypeError('LD2', {
                objPath
            });
        }

        let valueObj = objectPath.get(this._data, objPath);
        valueObj = overwritable.deepFreezeWhenDevMode(valueObj);
        return valueObj;
    },
    get$(this: RxDocument, path: string) {
        if (path.includes('.item.')) {
            throw newRxError('LD3', {
                path
            });
        }
        if (path === this.primaryPath)
            throw newRxError('LD4');

        return this._dataSync$
            .pipe(
                map(data => objectPath.get(data, path)),
                distinctUntilChanged()
            );
    },
    set(this: RxDocument, objPath: string, value: any) {
        if (!value) {
            // object path not set, overwrite whole data
            const data: any = flatClone(objPath);
            data._rev = this._data._rev;
            this._data = data;
            return this;
        }
        if (objPath === '_id') {
            throw newRxError('LD5', {
                objPath,
                value
            });
        }
        if (Object.is(this.get(objPath), value)) {
            return;
        }
        objectPath.set(this._data, objPath, value);
        return this;
    },
    _saveData(this: RxLocalDocument, newData: RxLocalDocumentData) {
        const oldData = this._dataSync$.getValue();
        const storageInstance = _getKeyObjectStorageInstanceByParent(this.parent);
        newData._id = this.id;

        return storageInstance.bulkWrite([{
            previous: oldData,
            document: newData
        }])
            .then((res) => {
                const docResult = res.success[newData._id];
                if (!docResult) {
                    throw getFromObjectOrThrow(res.error, newData._id);
                }
                newData = flatClone(newData);
                newData._rev = docResult._rev;
            });
    },

    remove(this: any): Promise<void> {
        const storageInstance = _getKeyObjectStorageInstanceByParent(this.parent);
        const writeData: RxDocumentWriteData<{ _id: string }> = {
            _id: this.id,
            _deleted: true,
            _attachments: {}
        };
        return writeSingleLocal(storageInstance, {
            previous: this._data,
            document: writeData
        })
            .then(() => {
                _getDocCache(this.parent).delete(this.id);
            });
    }
};


let INIT_DONE = false;
const _init = () => {
    if (INIT_DONE) return;
    else INIT_DONE = true;

    // add functions of RxDocument
    const docBaseProto = basePrototype;
    const props = Object.getOwnPropertyNames(docBaseProto);
    props.forEach(key => {
        const exists = Object.getOwnPropertyDescriptor(RxLocalDocumentPrototype, key);
        if (exists) return;
        const desc: any = Object.getOwnPropertyDescriptor(docBaseProto, key);
        Object.defineProperty(RxLocalDocumentPrototype, key, desc);
    });


    /**
     * overwrite things that not work on local documents
     * with throwing function
     */
    const getThrowingFun = (k: string) => () => {
        throw newRxError('LD6', {
            functionName: k
        });
    };
    [
        'populate',
        'update',
        'putAttachment',
        'getAttachment',
        'allAttachments'
    ].forEach((k: string) => RxLocalDocumentPrototype[k] = getThrowingFun(k));
};

RxLocalDocument.create = (id: string, data: any, parent: any) => {
    _init();
    _getChangeSub(parent);

    const newDoc = new RxLocalDocument(id, data, parent);
    newDoc.__proto__ = RxLocalDocumentPrototype;
    _getDocCache(parent).set(id, newDoc);
    return newDoc;
};

/**
 * save the local-document-data
 * throws if already exists
 */
function insertLocal(
    this: RxDatabase | RxCollection,
    id: string,
    docData: any
): Promise<RxLocalDocument> {
    return (this as any).getLocal(id)
        .then((existing: any) => {

            if (existing) {
                throw newRxError('LD7', {
                    id,
                    data: docData
                });
            }

            // create new one
            docData = flatClone(docData);
            docData._id = id;

            return writeSingleLocal(
                _getKeyObjectStorageInstanceByParent(this),
                {
                    document: docData
                }
            ).then(res => {
                docData = flatClone(docData);
                docData._rev = res._rev;
                const newDoc = RxLocalDocument.create(id, docData, this);
                return newDoc;
            });
        });
}

/**
 * save the local-document-data
 * overwrites existing if exists
 */
function upsertLocal(this: any, id: string, data: any): Promise<RxLocalDocument> {
    return this.getLocal(id)
        .then((existing: RxDocument) => {
            if (!existing) {
                // create new one
                const docPromise = this.insertLocal(id, data);
                return docPromise;
            } else {
                // update existing
                data._rev = existing._data._rev;
                return existing.atomicUpdate(() => data).then(() => existing);
            }
        });
}

function getLocal(this: any, id: string): Promise<RxLocalDocument | null> {
    const storageInstance = _getKeyObjectStorageInstanceByParent(this);
    const docCache = _getDocCache(this);

    // check in doc-cache
    const found = docCache.get(id);
    if (found) {
        return Promise.resolve(found);
    }

    // if not found, check in storage instance
    return findLocalDocument(storageInstance, id, false)
        .then((docData) => {
            if (!docData) {
                return null;
            }
            const doc = RxLocalDocument.create(id, docData, this);
            return doc;
        })
        .catch(() => null);
}

function getLocal$(this: RxCollection, id: string): Observable<RxLocalDocument | null> {
    return this.$.pipe(
        startWith(null),
        mergeMap(async (cE: RxChangeEvent<RxLocalDocumentData> | null) => {
            if (cE) {
                return {
                    changeEvent: cE
                };
            } else {
                const doc = await this.getLocal(id);
                return {
                    doc: doc
                };
            }
        }),
        mergeMap(async (changeEventOrDoc) => {
            if (changeEventOrDoc.changeEvent) {
                const cE = changeEventOrDoc.changeEvent;
                if (!cE.isLocal || cE.documentId !== id) {
                    return {
                        use: false
                    };
                } else {
                    const doc = await this.getLocal(id);
                    return {
                        use: true,
                        doc: doc
                    };
                }
            } else {
                return {
                    use: true,
                    doc: changeEventOrDoc.doc
                };
            }
        }),
        filter(filterFlagged => filterFlagged.use),
        map(filterFlagged => {
            return filterFlagged.doc;
        })
    );
}

export const RxDBLocalDocumentsPlugin: RxPlugin = {
    name: 'local-documents',
    rxdb: true,
    prototypes: {
        RxCollection: (proto: any) => {
            proto.insertLocal = insertLocal;
            proto.upsertLocal = upsertLocal;
            proto.getLocal = getLocal;
            proto.getLocal$ = getLocal$;
        },
        RxDatabase: (proto: any) => {
            proto.insertLocal = insertLocal;
            proto.upsertLocal = upsertLocal;
            proto.getLocal = getLocal;
            proto.getLocal$ = getLocal$;
        }
    },
    overwritable: {}
};
