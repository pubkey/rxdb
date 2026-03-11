import type { Observable } from 'rxjs';
import type { RxDatabase } from '../rx-database';

/**
 * Base interface for encoding Higher Kinded Types (HKT) in TypeScript.
 * Reactivity plugins extend this to define a type-level function
 * that maps a data type T to a reactive container (e.g. Signal<T>, Ref<T>).
 *
 * @example
 * // Preact signals plugin defines:
 * interface PreactSignalReactivityLambda extends ReactivityLambda {
 *     readonly _result: Signal<this['_data']>;
 * }
 */
export interface ReactivityLambda {
    readonly _data: unknown;
    readonly _result: unknown;
}

/**
 * Applies a reactivity type-level function to a data type.
 * Given a ReactivityLambda and a data type T, returns the concrete
 * reactive container type (e.g. Signal<T>, Ref<T>).
 *
 * For backwards compatibility, if the Reactivity parameter is not
 * a ReactivityLambda (e.g. it is `Signal<any>` directly), it is
 * returned as-is.
 */
export type Reactified<Reactivity, T> =
    Reactivity extends ReactivityLambda
        ? (Reactivity & { readonly _data: T })['_result']
        : Reactivity;

export interface RxReactivityFactory<Reactivity> {
    fromObservable<Data, InitData>(
        obs: Observable<Data>,
        initialValue: InitData,
        rxDatabase: RxDatabase<any, any, any, Reactivity>
    ): Reactified<Reactivity, Data | InitData>;
}
