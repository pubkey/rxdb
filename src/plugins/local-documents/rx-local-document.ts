import { Observable } from 'rxjs';
import {
    distinctUntilChanged,
    filter,
    map,
    shareReplay,
    startWith
} from 'rxjs';
import { overwritable } from '../../overwritable.ts';
import { getDocumentDataOfRxChangeEvent } from '../../rx-change-event.ts';
import {
    basePrototype,
    createRxDocumentConstructor
} from '../../rx-document.ts';
import {
    newRxError,
    newRxTypeError
} from '../../rx-error.ts';
import {
    getWrappedStorageInstance,
    getWrittenDocumentsFromBulkWriteResponse,
    writeSingle
} from '../../rx-storage-helper.ts';
import type {
    LocalDocumentModifyFunction,
    LocalDocumentParent,
    RxChangeEventBulk,
    RxCollection,
    RxDatabase,
    RxDocument,
    RxDocumentData,
    RxLocalDocument,
    RxLocalDocumentData
} from '../../types/';
import {
    ensureNotFalsy,
    flatClone,
    getFromMapOrThrow,
    getProperty,
    RXJS_SHARE_REPLAY_DEFAULTS
} from '../../plugins/utils/index.ts';
import {
    createLocalDocumentStorageInstance,
    getLocalDocStateByParent,
    LOCAL_DOC_STATE_BY_PARENT,
    LOCAL_DOC_STATE_BY_PARENT_RESOLVED,
    RX_LOCAL_DOCUMENT_SCHEMA
} from './local-documents-helper.ts';
import { isRxDatabase } from '../../rx-database.ts';
import { DocumentCache } from '../../doc-cache.ts';
import { IncrementalWriteQueue } from '../../incremental-write.ts';

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
    get $(): Observable<RxLocalDocument<any, any>> {
        const _this: RxLocalDocumentClass = this as any;
        const state = getFromMapOrThrow(LOCAL_DOC_STATE_BY_PARENT_RESOLVED, this.parent);

        const id = this.primary;
        return _this.parent.eventBulks$.pipe(
            filter(bulk => !!bulk.isLocal),
            map(bulk => bulk.events.find(ev => ev.documentId === id)),
            filter(event => !!event),
            map(changeEvent => getDocumentDataOfRxChangeEvent(ensureNotFalsy(changeEvent))),
            startWith(state.docCache.getLatestDocumentData(this.primary)),
            distinctUntilChanged((prev, curr) => prev._rev === curr._rev),
            map(docData => state.docCache.getCachedRxDocument(docData)),
            shareReplay(RXJS_SHARE_REPLAY_DEFAULTS)
        ) as Observable<any>;;
    },
    get $$(): any {
        const _this: RxLocalDocumentClass = this as any;
        const db = getRxDatabaseFromLocalDocument(_this);
        const reactivity = db.getReactivityFactory();
        return reactivity.fromObservable(
            _this.$,
            _this.getLatest()._data,
            db
        );
    },
    get deleted$$() {
        const _this: RxLocalDocumentClass = this as any;
        const db = getRxDatabaseFromLocalDocument(_this);
        const reactivity = db.getReactivityFactory();
        return reactivity.fromObservable(
            _this.deleted$,
            _this.getLatest().deleted,
            db
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
                map(localDocument => localDocument._data),
                map(data => getProperty(data, objPath)),
                distinctUntilChanged()
            );
    },
    get$$(this: RxDocument, objPath: string) {
        const db = getRxDatabaseFromLocalDocument(this as any);
        const reactivity = db.getReactivityFactory();
        return reactivity.fromObservable(
            this.get$(objPath),
            this.getLatest().get(objPath),
            db
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
        const writeRows = [{
            previous: oldData,
            document: newData
        }];
        return state.storageInstance.bulkWrite(writeRows, 'local-document-save-data')
            .then((res) => {
                if (res.error[0]) {
                    throw res.error[0];
                }
                const success = getWrittenDocumentsFromBulkWriteResponse(this.collection.schema.primaryPath, writeRows, res)[0];
                newData = flatClone(newData);
                newData._rev = success._rev;
            });
    },

    async remove(this: RxLocalDocument<any>): Promise<RxLocalDocument<any>> {
        const state = await getLocalDocStateByParent(this.parent);
        const writeData = flatClone(this._data);
        writeData._deleted = true;
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
        'putAttachmentBase64',
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


export function getRxDatabaseFromLocalDocument(doc: RxLocalDocument<any> | RxLocalDocumentClass) {
    const parent = doc.parent;
    if (isRxDatabase(parent)) {
        return parent;
    } else {
        return (parent as RxCollection).database;
    }
}

export function createLocalDocStateByParent(parent: LocalDocumentParent): void {
    const database: RxDatabase = parent.database ? parent.database : parent as any;
    const collectionName = parent.database ? parent.name : '';
    const statePromise = (async () => {
        let storageInstance = await createLocalDocumentStorageInstance(
            database.token,
            database.storage,
            database.name,
            collectionName,
            database.instanceCreationOptions,
            database.multiInstance
        );
        storageInstance = getWrappedStorageInstance(
            database,
            storageInstance,
            RX_LOCAL_DOCUMENT_SCHEMA
        );

        const docCache = new DocumentCache<RxLocalDocumentData, {}>(
            'id',
            database.eventBulks$.pipe(
                filter(changeEventBulk => {
                    let ret = false;
                    if (
                        // parent is database
                        (
                            collectionName === '' &&
                            !changeEventBulk.collectionName
                        ) ||
                        // parent is collection
                        (
                            collectionName !== '' &&
                            changeEventBulk.collectionName === collectionName
                        )
                    ) {
                        ret = true;
                    }
                    return ret && changeEventBulk.isLocal;
                }),
                map(b => b.events)
            ),
            docData => createRxLocalDocument(docData, parent) as any
        );

        const incrementalWriteQueue = new IncrementalWriteQueue(
            storageInstance,
            'id',
            () => { },
            () => { }
        );

        /**
         * Emit the changestream into the collections change stream
         */
        const databaseStorageToken = await database.storageToken;
        const subLocalDocs = storageInstance.changeStream().subscribe(eventBulk => {
            const events = new Array(eventBulk.events.length);
            const rawEvents = eventBulk.events;
            const collectionName = parent.database ? parent.name : undefined;
            for (let index = 0; index < rawEvents.length; index++) {
                const event = rawEvents[index];
                events[index] = {
                    documentId: event.documentId,
                    collectionName,
                    isLocal: true,
                    operation: event.operation,
                    documentData: overwritable.deepFreezeWhenDevMode(event.documentData) as any,
                    previousDocumentData: overwritable.deepFreezeWhenDevMode(event.previousDocumentData) as any
                };
            }
            const changeEventBulk: RxChangeEventBulk<RxLocalDocumentData> = {
                id: eventBulk.id,
                isLocal: true,
                internal: false,
                collectionName: parent.database ? parent.name : undefined,
                storageToken: databaseStorageToken,
                events,
                databaseToken: database.token,
                checkpoint: eventBulk.checkpoint,
                context: eventBulk.context
            };
            database.$emit(changeEventBulk);
        });
        parent._subs.push(subLocalDocs);

        const state = {
            database,
            parent,
            storageInstance,
            docCache,
            incrementalWriteQueue
        };
        LOCAL_DOC_STATE_BY_PARENT_RESOLVED.set(parent, state);
        return state;
    })();
    LOCAL_DOC_STATE_BY_PARENT.set(parent, statePromise);
}

