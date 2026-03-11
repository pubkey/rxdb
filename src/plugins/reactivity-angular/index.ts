import { Signal, untracked, Injector } from '@angular/core';
import type { RxReactivityFactory, ReactivityLambda } from '../../types';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * Type-level function (ReactivityLambda) for Angular signals.
 * Use this as the Reactivity type parameter for properly typed signals.
 *
 * @example
 * const db = await createRxDatabase<MyCollections, any, any, AngularSignalReactivityLambda>({
 *     reactivity: createReactivityFactory(injector)
 * });
 * const signal = doc.age$$; // Signal<number>
 */
export interface AngularSignalReactivityLambda extends ReactivityLambda {
    readonly _result: Signal<this['_data']>;
}

export function createReactivityFactory(
    injector: Injector
): RxReactivityFactory<AngularSignalReactivityLambda> {
    return {
        fromObservable(observable$: any, initialValue: any): any {
            return untracked(() =>
                toSignal(observable$, {
                    initialValue,
                    injector
                })
            );
        }
    };
}
