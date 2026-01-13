import {
    shallowRef,
    triggerRef,
    onScopeDispose,
    Ref
} from 'vue';
import { RxReactivityFactory } from 'rxdb/plugins/core';
import type {
    Observable
} from 'rxjs';

export type VueRef<T = any> = Ref<T>;

export const VueRxReactivityFactory: RxReactivityFactory<VueRef> = {
    fromObservable<Data, InitData>(
        obs: Observable<Data>,
        initialValue: InitData
    ): VueRef<Data | InitData> {
        const ref = shallowRef(initialValue);
        const sub = obs.subscribe(value => {
            ref.value = value;
            triggerRef(ref);
        });
        onScopeDispose(() => {
            sub.unsubscribe();
        });
        return ref;
    }
}; 
