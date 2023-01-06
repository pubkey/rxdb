import { Observable } from 'rxjs';
import {
    distinctUntilChanged,
    filter,
    map,
    shareReplay,
    startWith
} from 'rxjs/operators';
import { overwritable } from '../../overwritable';
import { getDocumentDataOfRxChangeEvent } from '../../rx-change-event';
import {
    basePrototype,
    createRxDocumentConstructor
} from '../../rx-document';
import {
    newRxError,
    newRxTypeError
} from '../../rx-error';
import { writeSingle } from '../../rx-storage-helper';
import type {
    LocalDocumentModifyFunction,
    RxCollection,
    RxDatabase,
    RxDocument,
    RxDocumentData,
    RxDocumentWriteData,
    RxLocalDocument,
    RxLocalDocumentData
} from '../../types';
import {
    flatClone,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    getFromMapOrThrow,
    getFromObjectOrThrow,
    getProperty,
    RXJS_SHARE_REPLAY_DEFAULTS
} from '../../plugins/utils';
import { getLocalDocStateByParent, LOCAL_DOC_STATE_BY_PARENT_RESOLVED } from './local-documents-helper';

const RxDocumentParent = createRxDocumentConstructor() as any;

class RxLocalDocumentClass<DocData = any> extends RxDocumentParent {
    constructor(
        public readonly id: string,
        jsonData: DocData,
        public readonly parent: RxCollection | RxDatabase
    ) {
        super(null, jsonData);
    }
}



const RxLocalDocumentPrototype: any = {
    get isLocal() {
        return true;
    },

    //
    // overwrites
    //
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
    get $(): Observable<RxDocumentData<RxLocalDocumentData>> {
        const _this: RxLocalDocumentClass = this as any;
        return _this.parent.$.pipe(
            filter(changeEvent => changeEvent.isLocal),
            filter(changeEvent => changeEvent.documentId === this.primary),
            map(changeEvent => getDocumentDataOfRxChangeEvent(changeEvent)),
            startWith(this._data),
            distinctUntilChanged((prev, curr) => prev._rev === curr._rev),
            shareReplay(RXJS_SHARE_REPLAY_DEFAULTS)
        );
    },
    getLatest(this: RxLocalDocument<any>): RxLocalDocument<any> {
        const state = getFromMapOrThrow(LOCAL_DOC_STATE_BY_PARENT_RESOLVED, this.parent);
        const latestDocData = state.docCache.getLatestDocumentData(this.primary);
        return state.docCache.getCachedRxDocument(latestDocData) as any;
    },
    get(this: RxDocument, objPath: string) {
        objPath = 'data.' + objPath;

        if (!this._data) {
            return undefined;
        }
        if (typeof objPath !== 'string') {
            throw newRxTypeError('LD2', {
                objPath
            });
        }

        let valueObj = getProperty(this._data, objPath);
        valueObj = overwritable.deepFreezeWhenDevMode(valueObj);
        return valueObj;
    },
    get$(this: RxDocument, objPath: string) {
        objPath = 'data.' + objPath;

        if (overwritable.isDevMode()) {
            if (objPath.includes('.item.')) {
                throw newRxError('LD3', {
                    objPath
                });
            }
            if (objPath === this.primaryPath) {
                throw newRxError('LD4');
            }
        }
        return this.$
            .pipe(
                map(data => getProperty(data, objPath)),
                distinctUntilChanged()
            );
    },
    async incrementalModify<DocData>(
        this: RxLocalDocument<any, DocData>,
        mutationFunction: LocalDocumentModifyFunction<any>
    ) {
        const state = await getLocalDocStateByParent(this.parent);

        return state.incrementalWriteQueue.addWrite(
            this._data as any,
            async (docData) => {
                docData.data = await mutationFunction(docData.data, this);
                return docData;
            }
        ).then(result => state.docCache.getCachedRxDocument(result as any));
    },
    incrementalPatch(patch: Partial<any>) {
        return this.incrementalModify((docData: any) => {
            Object
                .entries(patch)
                .forEach(([k, v]) => {
                    docData[k] = v;
                });
            return docData;
        });
    },
    async _saveData(this: RxLocalDocument<any>, newData: RxDocumentData<RxLocalDocumentData>) {
        const state = await getLocalDocStateByParent(this.parent);
        const oldData: RxDocumentData<RxLocalDocumentData> = this._data;
        newData.id = (this as any).id;
        return state.storageInstance.bulkWrite([{
            previous: oldData,
            document: newData
        }], 'local-document-save-data')
            .then((res) => {
                const docResult = res.success[newData.id];
                if (!docResult) {
                    throw getFromObjectOrThrow(res.error, newData.id);
                }
                newData = flatClone(newData);
                newData._rev = docResult._rev;
            });
    },

    async remove(this: RxLocalDocument<any>): Promise<RxLocalDocument<any>> {
        const state = await getLocalDocStateByParent(this.parent);
        const writeData: RxDocumentWriteData<RxLocalDocumentData> = {
            id: this._data.id,
            data: {},
            _deleted: true,
            _meta: getDefaultRxDocumentMeta(),
            _rev: getDefaultRevision(),
            _attachments: {}
        };
        return writeSingle(state.storageInstance, {
            previous: this._data,
            document: writeData
        }, 'local-document-remove')
            .then((writeResult) => state.docCache.getCachedRxDocument(writeResult) as any);
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
     * Overwrite things that do not work on local documents
     * with a throwing function.
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



export function createRxLocalDocument<DocData>(
    data: RxDocumentData<RxLocalDocumentData<DocData>>,
    parent: any
): RxLocalDocument<DocData> {
    _init();
    const newDoc = new RxLocalDocumentClass(data.id, data, parent);
    Object.setPrototypeOf(newDoc, RxLocalDocumentPrototype);
    newDoc.prototype = RxLocalDocumentPrototype;
    return newDoc as any;
}
