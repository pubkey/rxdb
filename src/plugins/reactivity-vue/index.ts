import {
    shallowRef,
    triggerRef,
    onScopeDispose,
    Ref
} from 'vue';
import type {
    Observable
} from 'rxjs';
import type { RxReactivityFactory, ReactivityLambda } from '../../types';

/**
 * Type-level function (ReactivityLambda) for Vue refs.
 * Use this as the Reactivity type parameter for properly typed refs.
 *
 * @example
 * const db = await createRxDatabase<MyCollections, any, any, VueRefReactivityLambda>({
 *     reactivity: VueRxReactivityFactory
 * });
 * const ref = doc.age$$; // Ref<number>
 */
export interface VueRefReactivityLambda extends ReactivityLambda {
    readonly _result: Ref<this['_data']>;
}

export type VueRef<T = any> = Ref<T>;

export const VueRxReactivityFactory: RxReactivityFactory<VueRefReactivityLambda> = {
    fromObservable<Data, InitData>(
        obs: Observable<Data>,
        initialValue: InitData
    ): VueRef<Data | InitData> {
        const ref = shallowRef(initialValue);
        const sub = obs.subscribe((value: Data) => {
            ref.value = value;
            triggerRef(ref);
        });
        onScopeDispose(() => {
            sub.unsubscribe();
        });
        return ref;
    }
}; 
