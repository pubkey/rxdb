import { Signal, untracked, Injector } from '@angular/core';
import type { RxReactivityFactory } from '../../types';

// @ts-ignore
import { toSignal } from '@angular/core/rxjs-interop';

export function createReactivityFactory(
    injector: Injector
): RxReactivityFactory<Signal<any>> {
    return {
        fromObservable(observable$: any, initialValue: any) {
            return untracked(() =>
                toSignal(observable$, {
                    initialValue,
                    injector,
                    rejectErrors: true
                })
            );
        }
    };
}
