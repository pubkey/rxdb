import { Observable, Subject } from 'rxjs';
import type { RxCollection, RxDatabase, RxQuery, RxDocument, Paths } from '../../types';
import { RxStateDocument, RxStateOperation, RxStateModifier } from './types.ts';
/**
 * RxDB internally used properties are
 * prefixed with lodash _ to make them less
 * likely to clash with actual state properties
 * from the user.
 */
export declare class RxStateBase<T, Reactivity = unknown> {
    readonly prefix: string;
    readonly collection: RxCollection<RxStateDocument>;
    _id: number;
    _state: T | any;
    $: Observable<T>;
    _lastIdQuery: RxQuery<RxStateDocument, RxDocument<RxStateDocument, {}> | null>;
    _nonPersisted: {
        path: string;
        modifier: RxStateModifier;
    }[];
    _writeQueue: Promise<void>;
    _initDone: boolean;
    _instanceId: string;
    _ownEmits$: Subject<T>;
    constructor(prefix: string, collection: RxCollection<RxStateDocument>);
    set(path: Paths<T> | '', modifier: RxStateModifier): Promise<void>;
    /**
     * To have deterministic writes,
     * and to ensure that multiple js realms do not overwrite
     * each other, the write happens with incremental ids
     * that would throw conflict errors and trigger a retry.
     */
    _triggerWrite(): Promise<void>;
    mergeOperationsIntoState(operations: RxStateOperation[]): void;
    get(path?: Paths<T>): any;
    get$(path?: Paths<T>): Observable<any>;
    get$$(path?: Paths<T>): Reactivity;
    /**
     * Merges the state operations into a single write row
     * to store space and make recreating the state from
     * disc faster.
     */
    _cleanup(): Promise<void>;
}
export declare function createRxState<T>(database: RxDatabase, prefix: string): Promise<RxStateBase<T>>;
export declare function mergeOperationsIntoState<T>(state: T, operations: RxStateOperation[]): void;
