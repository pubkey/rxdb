import {
    Observable,
    Subject,
    defer,
    distinctUntilChanged,
    filter,
    map,
    merge,
    shareReplay,
    startWith,
    tap
} from 'rxjs';
import { overwritable } from '../../overwritable.ts';
import { getChangedDocumentsSince } from '../../rx-storage-helper.ts';
import type {
    RxChangeEventBulk,
    RxCollection,
    RxDatabase,
    RxQuery,
    RxDocument,
    RxDocumentData,
    RxError,
    RxStorageWriteErrorConflict,
    Paths
} from '../../types';
import {
    RXJS_SHARE_REPLAY_DEFAULTS,
    getProperty,
    setProperty,
    deleteProperty,
    PROMISE_RESOLVE_VOID,
    clone,
    randomToken,
    deepEqual,
    getFromMapOrCreate
} from '../utils/index.ts';
import {
    RX_STATE_COLLECTION_SCHEMA,
    isValidWeakMapKey,
    nextRxStateId
} from './helpers.ts';
import {
    RxStateDocument,
    RxStateOperation,
    RxStateModifier
} from './types.ts';
import { runPluginHooks } from '../../hooks.ts';


let debugId = 0;


const deepFrozenCache = new WeakMap<any, any>();

/**
 * RxDB internally used properties are
 * prefixed with lodash _ to make them less
 * likely to clash with actual state properties
 * from the user.
 */
export class RxStateBase<T, Reactivity = unknown> {
    // used for debugging
    public _id: number = debugId++;
    public _state: T | any = {};
    public $: Observable<T>;
    public _lastIdQuery: RxQuery<RxStateDocument, RxDocument<RxStateDocument, {}> | null>;
    public _nonPersisted: {
        path: string;
        modifier: RxStateModifier;
        resolve: () => void;
        reject: (err: any) => void;
    }[] = [];
    public _writeQueue = PROMISE_RESOLVE_VOID;
    public _initDone = false;
    /**
     * True when an event bulk arrived while
     * the initial state was loaded from the storage.
     */
    public _eventDuringInit = false;
    public _instanceId = randomToken(RX_STATE_COLLECTION_SCHEMA.properties.sId.maxLength);
    public _ownEmits$ = new Subject<T>();
    /**
     * Id of the newest operations document that is merged into _state.
     * All operations documents with a lower id are merged too.
     */
    public _lastMergedId = '';
    /**
     * Ids of the operations documents that were merged from the storage
     * before their INSERT event has arrived. A rebuild of the state replaces
     * the content with the ids it has read above the previous _lastMergedId.
     */
    public _mergedAhead = new Set<string>();

    constructor(
        public readonly prefix: string,
        public readonly collection: RxCollection<RxStateDocument>
    ) {
        this.collection.onClose.push(() => this._writeQueue);
        this._lastIdQuery = this.collection.findOne({
            sort: [
                { id: 'desc' }
            ]
        });
        // make it "hot" for better write performance
        this._lastIdQuery.$.subscribe();

        this.$ = merge(
            this._ownEmits$,
            this.collection.eventBulks$.pipe(
                /**
                 * Only INSERT events from OTHER instances are merged
                 * into the state. Own-instance INSERTs are
                 * already handled via _ownEmits$.
                 * A replication can also overwrite, delete, or insert documents
                 * with an id that is already merged. The state cannot be corrected
                 * from these events, so it is built again from the storage.
                 * An INSERT of a document that was merged from the storage before is skipped.
                 */
                filter((eventBulk: RxChangeEventBulk<RxStateDocument>) => {
                    if (!this._initDone) {
                        this._eventDuringInit = true;
                        return false;
                    }
                    const events = eventBulk.events;
                    const fromOther = events.filter(event => event.documentData.sId !== this._instanceId);
                    const hasNonInsert = events.some(event => event.operation !== 'INSERT');
                    const unknown = fromOther.filter(event => event.documentData.id <= this._lastMergedId &&
                        !this._mergedAhead.delete(event.documentData.id));
                    if (hasNonInsert || unknown.length > 0) {
                        this._rebuildState();
                    }
                    return !hasNonInsert && fromOther.length > 0;
                }),
                tap((eventBulk: RxChangeEventBulk<RxStateDocument>) => {
                    const events = eventBulk.events;
                    for (let index = 0; index < events.length; index++) {
                        const event = events[index];
                        if (
                            event.operation !== 'INSERT' ||
                            event.documentData.sId === this._instanceId ||
                            event.documentData.id <= this._lastMergedId
                        ) {
                            continue;
                        }
                        if (event.documentData.id === nextRxStateId(this._lastMergedId || undefined)) {
                            this._lastMergedId = event.documentData.id;
                            this.mergeOperationsIntoState(event.documentData.ops);
                        } else {
                            /**
                             * The events of the operations between the last merged
                             * one and this one did not arrive yet. Merging this one
                             * now would apply the operations in the wrong order.
                             */
                            this._mergeMissingOperations()
                                .then(() => {
                                    this._mergedAhead.delete(event.documentData.id);
                                    this._ownEmits$.next(this._state);
                                })
                                .catch(() => { });
                        }
                    }
                })
            )
        ).pipe(
            shareReplay(RXJS_SHARE_REPLAY_DEFAULTS),
            map(() => this._state)
        );
        // directly subscribe because of the tap() side effect
        this.$.subscribe();
    }

    set(
        path: Paths<T> | '',
        modifier: RxStateModifier
    ): Promise<void> {
        const promise = new Promise<void>((resolve, reject) => {
            this._nonPersisted.push({
                path,
                modifier,
                resolve,
                reject
            });
        });
        this._triggerWrite();
        return promise;
    }

    /**
     * To have deterministic writes,
     * and to ensure that multiple js realms do not overwrite
     * each other, the write happens with incremental ids
     * that would throw conflict errors and trigger a retry.
     *
     * All set() calls that are queued at the same time are persisted
     * in a single write. Each call has its own resolve/reject, so a
     * throwing modifier only rejects and drops its own call.
     * The returned promise never rejects.
     */
    _triggerWrite() {
        const next = this._writeQueue.then(async () => {
            if (this._nonPersisted.length === 0) {
                return;
            }
            let useWrites: typeof this._nonPersisted = [];
            let done = false;
            while (!done) {
                try {
                    const lastIdDoc = await this._lastIdQuery.exec();
                    /**
                     * The query can return an operations document
                     * before its change event has been merged into the state.
                     * The modifiers must run on a state that
                     * contains all operations with a lower id.
                     */
                    if (lastIdDoc && lastIdDoc.id > this._lastMergedId) {
                        await this._mergeMissingOperations();
                    }
                } catch (err) {
                    /**
                     * Without the latest operations no write can be done,
                     * so all waiting calls are rejected.
                     */
                    useWrites = useWrites.concat(this._nonPersisted);
                    this._nonPersisted = [];
                    useWrites.forEach(writeRow => writeRow.reject(err));
                    return;
                }
                useWrites = useWrites.concat(this._nonPersisted);
                this._nonPersisted = [];
                const nextId = nextRxStateId(this._lastMergedId || undefined);
                try {
                    /**
                     * TODO instead of a deep-clone we should
                     * only clone the parts where we know that they
                     * will be changed. This would improve performance.
                     */
                    let newState = clone(this._state);
                    const ops: RxStateOperation[] = [];
                    const validWrites: typeof this._nonPersisted = [];
                    for (let index = 0; index < useWrites.length; index++) {
                        const writeRow = useWrites[index];
                        const value = writeRow.path === '' ? newState : getProperty(newState, writeRow.path);
                        let newValue: any;
                        try {
                            newValue = writeRow.modifier(value);
                        } catch (err) {
                            writeRow.reject(err);
                            continue;
                        }
                        validWrites.push(writeRow);
                        if (newValue === undefined) {
                            /**
                             * An operation cannot contain undefined as value
                             * because it is not valid JSON.
                             * So the key is removed from the state and
                             * the resulting state is stored as operation.
                             */
                            if (writeRow.path === '') {
                                newState = {};
                            } else {
                                deleteProperty(newState, writeRow.path);
                            }
                            ops.push({
                                k: '',
                                v: clone(newState)
                            });
                            continue;
                        }
                        /**
                         * Here we have to clone the value because
                         * some storages like the memory storage
                         * make input data deep-frozen in dev-mode.
                         */
                        if (writeRow.path === '') {
                            newState = clone(newValue);
                        } else {
                            setProperty(newState, writeRow.path, clone(newValue));
                        }
                        ops.push({
                            k: writeRow.path,
                            /**
                             * Here we have to clone the value because
                             * some storages like the memory storage
                             * make input data deep-frozen in dev-mode.
                             */
                            v: clone(newValue)
                        });
                    }
                    useWrites = validWrites;
                    if (ops.length > 0) {
                        await this.collection.insert({
                            id: nextId,
                            sId: this._instanceId,
                            ops
                        });
                        /**
                         * A merge that ran during the insert can have read
                         * the own document from the storage. Own events
                         * never remove it from the set.
                         */
                        this._mergedAhead.delete(nextId);
                        /**
                         * When a newer operation was merged during the insert,
                         * the state already contains this write
                         * and must not be replaced with the older newState.
                         */
                        if (this._lastMergedId < nextId) {
                            this._lastMergedId = nextId;
                            this._state = newState;
                        }
                        this._ownEmits$.next(this._state);
                    }
                    useWrites.forEach(writeRow => writeRow.resolve());
                    done = true;
                } catch (err) {
                    if ((err as RxError).code !== 'CONFLICT') {
                        useWrites.forEach(writeRow => writeRow.reject(err));
                        return;
                    }
                    /**
                     * The conflict error contains the operations document
                     * that another instance has stored with the same id.
                     * Merging it here makes the next run use a higher id
                     * even when the change event of that document never arrives,
                     * like when the database is closing.
                     */
                    const writeError = (err as RxError).parameters.writeError as RxStorageWriteErrorConflict<RxStateDocument>;
                    const documentInDb = writeError.documentInDb;
                    if (this._lastMergedId < documentInDb.id) {
                        this._lastMergedId = documentInDb.id;
                        this._mergedAhead.add(documentInDb.id);
                        this.mergeOperationsIntoState(documentInDb.ops);
                        this._ownEmits$.next(this._state);
                    }
                }
            }
        });
        this._writeQueue = next;
        return next;
    }

    /**
     * Loads the operations documents that are newer
     * than the last merged one from the storage
     * and merges them in id order.
     */
    async _mergeMissingOperations() {
        const docs = await this.collection.find({
            selector: {
                id: {
                    $gt: this._lastMergedId
                }
            },
            sort: [{ id: 'asc' }]
        }).exec();
        for (let index = 0; index < docs.length; index++) {
            const doc = docs[index];
            if (doc.id > this._lastMergedId) {
                this._lastMergedId = doc.id;
                this._mergedAhead.add(doc.id);
                this.mergeOperationsIntoState(doc.ops);
            }
        }
    }

    /**
     * Builds the state again from all operations documents of the storage.
     * Runs in the write queue so that pending set() calls
     * run their modifiers on the rebuilt state.
     */
    _rebuildState() {
        this._writeQueue = this._writeQueue.then(async () => {
            let docs: RxDocument<RxStateDocument>[] = [];
            let lastMergedId: string | undefined;
            // query again when an operations document was merged during the query
            while (lastMergedId !== this._lastMergedId) {
                lastMergedId = this._lastMergedId;
                docs = await this.collection.find({ sort: [{ id: 'asc' }] }).exec();
            }
            let state: any = {};
            this._mergedAhead.clear();
            docs.forEach(doc => {
                state = mergeOperationsIntoState(state, doc.ops);
                if (doc.id > this._lastMergedId) {
                    this._mergedAhead.add(doc.id);
                }
            });
            const lastDoc = docs[docs.length - 1];
            if (lastDoc && lastDoc.id > this._lastMergedId) {
                this._lastMergedId = lastDoc.id;
            }
            if (!deepEqual(state, this._state)) {
                this._state = state;
                this._ownEmits$.next(this._state);
            }
        }).catch(() => { });
    }

    mergeOperationsIntoState(
        operations: RxStateOperation[]
    ) {
        let state = clone(this._state);
        for (let index = 0; index < operations.length; index++) {
            const operation = operations[index];
            if (operation.k === '') {
                state = clone(operation.v);
            } else {
                setProperty(state, operation.k, clone(operation.v));
            }
        }
        this._state = state;
    }
    get(path?: Paths<T>) {
        let ret;
        if (!path) {
            ret = this._state;
        } else {
            ret = getProperty(this._state, path);
        }

        /**
         * In dev-mode we have to clone the value before deep-freezing
         * it to not have an immutable subobject in the state value.
         * But calling .get() with the same path multiple times,
         * should return exactly the same object instance
         * so it does not cause re-renders on react.
         * So in dev-mode we have to 
         */
        if (overwritable.isDevMode() && isValidWeakMapKey(ret)) {
            const frozen = getFromMapOrCreate(
                deepFrozenCache,
                ret,
                () => overwritable.deepFreezeWhenDevMode(clone(ret))
            );
            return frozen;
        }

        return ret;
    }
    get$(path?: Paths<T>): Observable<any> {
        /**
         * Use defer() so that the initial value passed to startWith()
         * is evaluated lazily at subscription time, not at the time
         * get$() is called. Otherwise, if the state changes between
         * the get$() call and the subscription, the subscriber would
         * first receive a stale value and only then the current one.
         */
        return defer(() => this.$.pipe(
            map(() => this.get(path)),
            startWith(this.get(path)),
            distinctUntilChanged(deepEqual),
        )).pipe(
            shareReplay(RXJS_SHARE_REPLAY_DEFAULTS),
        );
    }
    get$$(path?: Paths<T>): Reactivity {
        const obs = this.get$(path);
        const reactivity = this.collection.database.getReactivityFactory();
        return reactivity.fromObservable(
            obs,
            this.get(path),
            this.collection.database
        ) as any;
    }

    /**
     * Merges the state operations into a single write row
     * to store space and make recreating the state from
     * disc faster.
     */
    async _cleanup(): Promise<boolean> {
        const firstWrite = await this.collection.findOne({
            sort: [{ id: 'asc' }]
        }).exec();
        const lastWrite = await this._lastIdQuery.exec();

        if (!firstWrite || !lastWrite) {
            return true;
        }

        const firstNr = parseInt(firstWrite.id, 10);
        const lastNr = parseInt(lastWrite.id, 10);
        if ((lastNr - 5) < firstNr) {
            // only run if more than 5 write rows
            return true;
        }

        // update whole state object
        await this._writeQueue;
        await this.set('', state => state);

        // delete old ones
        await this.collection.find({
            selector: {
                id: {
                    $lte: lastWrite.id
                }
            }
        }).remove();
        return true;
    }
}


export async function createRxState<T>(
    database: RxDatabase,
    prefix: string
): Promise<RxStateBase<T>> {
    const collectionName = 'rx-state-' + prefix;
    await database.addCollections({
        [collectionName]: {
            schema: RX_STATE_COLLECTION_SCHEMA as any
        }
    });
    const collection: RxCollection<RxStateDocument> = database.collections[collectionName];

    const rxState = new RxStateBase<T>(
        prefix,
        collection
    );


    /**
     * Directly get the state and put it into memory.
     * This ensures we can do non-async accesses to the
     * correct state.
     */
    const stateDocuments: RxDocumentData<RxStateDocument>[] = [];
    let done = false;
    let checkpoint: any = undefined;
    while (!done) {
        rxState._eventDuringInit = false;
        const result = await getChangedDocumentsSince<RxStateDocument, any>(
            collection.storageInstance,
            1000,
            checkpoint
        );
        checkpoint = result.checkpoint;
        const documents = result.documents;
        if (documents.length === 0) {
            /**
             * The events that arrive during the load are not merged
             * into the state. A write that caused such an event might
             * not be part of the read result, so the storage
             * must be read again from the checkpoint.
             */
            done = !rxState._eventDuringInit;
        } else {
            for (let index = 0; index < documents.length; index++) {
                const document = documents[index];
                if (document.id > rxState._lastMergedId) {
                    rxState._lastMergedId = document.id;
                }
                /**
                 * The operations of a deleted document are already
                 * contained in the write of the cleanup that deleted it,
                 * so they must not be applied again.
                 */
                if (!document._deleted) {
                    stateDocuments.push(document);
                }
            }
        }
    }
    /**
     * The ids are incremental, so sorting by id
     * applies the operations in the order of the writes.
     * The time of the last write cannot be used for that
     * because it does not have to match the order of the ids.
     */
    stateDocuments.sort((a, b) => a.id < b.id ? -1 : 1);
    for (let index = 0; index < stateDocuments.length; index++) {
        rxState._state = mergeOperationsIntoState(rxState._state, stateDocuments[index].ops);
    }
    rxState._initDone = true;

    const proxy = new Proxy(
        rxState as any,
        {
            get(target, property: any) {
                if (typeof property !== 'string') {
                    return target[property];
                }
                if ((rxState as any)[property]) {
                    const ret = (rxState as any)[property];
                    if (typeof ret === 'function') {
                        return ret.bind(rxState);
                    } else {
                        return ret;
                    }
                }
                const lastChar = property.charAt(property.length - 1);
                if (property.endsWith('$$')) {
                    const key = property.slice(0, -2);
                    return rxState.get$$(key as any);
                } else if (lastChar === '$') {
                    const key = property.slice(0, -1);
                    return rxState.get$(key as any);
                } else {
                    return rxState.get(property as any);
                }
            },
            set(target, newValue, receiver) {
                throw new Error('Do not write to RxState');
            }
        }
    );

    runPluginHooks('createRxState', {
        collection,
        state: proxy
    });

    return proxy;
}


export function mergeOperationsIntoState<T>(
    state: T,
    operations: RxStateOperation[]
): T {
    for (let index = 0; index < operations.length; index++) {
        const operation = operations[index];
        if (operation.k === '') {
            state = clone(operation.v);
        } else {
            setProperty(state, operation.k, clone(operation.v));
        }
    }
    return state;
}
