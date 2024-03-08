import {
    Observable,
    Subject,
    distinctUntilChanged,
    filter,
    map,
    merge,
    shareReplay,
    startWith,
    tap,
    zip
} from 'rxjs';
import { overwritable } from '../../overwritable.ts';
import { getChangedDocumentsSince } from '../../rx-storage-helper.ts';
import type {
    RxChangeEvent,
    RxCollection,
    RxDatabase,
    RxQuery,
    RxDocument,
    RxError,
    Paths
} from '../../types';
import {
    RXJS_SHARE_REPLAY_DEFAULTS,
    getProperty,
    setProperty,
    PROMISE_RESOLVE_VOID,
    appendToArray,
    clone,
    randomCouchString,
    deepEqual
} from '../utils/index.ts';
import {
    RX_STATE_COLLECTION_SCHEMA,
    nextRxStateId
} from './helpers.ts';
import {
    RxStateDocument,
    RxStateOperation,
    RxStateModifier
} from './types.ts';
import { newRxError } from '../../rx-error.ts';

export class RxStateBase<T, Reactivity = unknown> {
    public state: T | any = {};
    public $: Observable<T>;
    public lastIdQuery: RxQuery<RxStateDocument, RxDocument<RxStateDocument, {}> | null>;
    public nonPersisted: {
        path: string;
        modifier: RxStateModifier;
    }[] = [];
    public writeQueue = PROMISE_RESOLVE_VOID;
    public initDone = false;
    public instanceId = randomCouchString(RX_STATE_COLLECTION_SCHEMA.properties.sId.maxLength);
    public ownEmits$ = new Subject<T>();

    constructor(
        public readonly prefix: string,
        public readonly collection: RxCollection<RxStateDocument>
    ) {
        this.collection.onDestroy.push(() => this.writeQueue);
        this.lastIdQuery = this.collection.findOne({
            sort: [
                { id: 'desc' }
            ]
        });
        // make it "hot" for better write performance
        this.lastIdQuery.$.subscribe();

        this.$ = zip([
            this.ownEmits$,
            this.collection.$.pipe(
                tap(event => {
                    if (
                        this.initDone &&
                        event.operation === 'INSERT' &&
                        event.documentData.sId !== this.instanceId
                    ) {
                        console.log('use event !');
                        console.dir(event.documentData.ops);
                        mergeOperationsIntoState(this.state, event.documentData.ops);
                    }
                }),
                map(() => this.state),
                shareReplay(RXJS_SHARE_REPLAY_DEFAULTS)
            )
        ]).pipe(
            map(() => this.state)
        );
        // directly subscribe because of the tap() side effect
        this.$.subscribe();
    }

    async set(
        path: Paths<T>,
        modifier: RxStateModifier
    ) {
        this.nonPersisted.push({
            path,
            modifier
        });
        return this._triggerWrite();
    }

    /**
     * To have deterministic writes,
     * and to ensure that multiple js realms do not overwrite
     * each other, the write happens with incremental ids
     * that would throw conflict errors and trigger a retry.
     */
    _triggerWrite() {
        console.log('_triggerWrite()');
        this.writeQueue = this.writeQueue.then(async () => {
            if (this.nonPersisted.length === 0) {
                return;
            }
            let useWrites: typeof this.nonPersisted = [];
            let done = false;
            while (!done) {
                const lastIdDoc = await this.lastIdQuery.exec();
                appendToArray(useWrites, this.nonPersisted);
                this.nonPersisted = [];
                const nextId = nextRxStateId(lastIdDoc ? lastIdDoc.id : undefined);
                try {
                    /**
                     * TODO instead of a deep-clone we should
                     * only clone the parts where we know that they
                     * will be changed. This would improve performance.
                     */
                    const newState = clone(this.state);
                    const ops: RxStateOperation[] = [];
                    for (let index = 0; index < useWrites.length; index++) {
                        const writeRow = useWrites[index];
                        const value = getProperty(newState, writeRow.path);
                        const newValue = writeRow.modifier(value);
                        setProperty(newState, writeRow.path, newValue);
                        ops.push({
                            k: writeRow.path,
                            v: newValue
                        });
                    }
                    console.log('insert to collection');
                    await this.collection.insert({
                        id: nextId,
                        sId: this.instanceId,
                        ops
                    });
                    console.log('insert to collection DONE');
                    console.dir(newState);
                    this.state = newState;
                    this.ownEmits$.next(this.state);
                    done = true;
                } catch (err) {
                    if ((err as RxError).code !== 'CONFLICT') {
                        throw err;
                    }
                }
            }
        }).catch(error => {
            throw newRxError('SNH', {
                name: 'RxState WRITE QUEUE ERROR',
                error
            });
        });
        return this.writeQueue;
    }

    get(path?: Paths<T>) {
        if (!path) {
            return overwritable.deepFreezeWhenDevMode(this.state);
        }
        return overwritable.deepFreezeWhenDevMode(
            getProperty(this.state, path)
        );
    }
    get$(path?: Paths<T>): Observable<any> {
        return this.$.pipe(
            map(() => this.get(path)),
            startWith(this.get(path)),
            distinctUntilChanged(deepEqual),
            shareReplay(RXJS_SHARE_REPLAY_DEFAULTS),
        );
    }
    get$$(path?: Paths<T>): Reactivity {
        const obs = this.get$(path);
        const reactivity = this.collection.database.getReactivityFactory();
        return reactivity.fromObservable(obs, this.get(path));
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
     * This ensures we can do non-async acesses to the
     * correct state.
     */
    let done = false;
    let checkpoint: any = undefined;
    while (!done) {
        const result = await getChangedDocumentsSince<RxStateDocument, any>(
            collection.storageInstance,
            1000,
            checkpoint
        );
        checkpoint = result.checkpoint;
        const documents = result.documents;
        if (documents.length === 0) {
            done = true;
        } else {
            for (let index = 0; index < documents.length; index++) {
                const document = documents[index];
                mergeOperationsIntoState(rxState.state, document.ops);
            }
        }
    }
    rxState.initDone = true;

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
            set(target, newValue, reciever) {
                throw new Error('Do not write to RxState');
            }
        }
    );

    return proxy;
}


export function mergeOperationsIntoState<T>(
    state: T,
    operations: RxStateOperation[]
) {
    for (let index = 0; index < operations.length; index++) {
        const operation = operations[index];
        console.log('merge op 1');
        console.dir(operation);
        setProperty(state, operation.k, clone(operation.v));
        console.log('merge op 2');
    }
}
