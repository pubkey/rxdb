import { signal, Signal } from "@preact/signals-core";
import type {
    Observable,
    Subscription
} from 'rxjs';
import type {
    WeakRef,
    FinalizationRegistry,
    RxReactivityFactory,
    ReactivityLambda
} from '../../types/index.d.ts';

/**
 * Type-level function (ReactivityLambda) for Preact signals.
 * Use this as the Reactivity type parameter for properly typed signals.
 *
 * @example
 * const db = await createRxDatabase<MyCollections, any, any, PreactSignalReactivityLambda>({
 *     reactivity: PreactSignalsRxReactivityFactory
 * });
 * const signal = doc.age$$; // Signal<number>
 */
export interface PreactSignalReactivityLambda extends ReactivityLambda {
    readonly _result: Signal<this['_data']>;
}

export type PreactSignal<T = any> = Signal<T>;

/**
 * Exported to debug and test
 * the behavior
 */
export const PREACT_SIGNAL_STATE = {
    subscribeCount: 0,
    aliveSubscription: new Set<Subscription>(),
};


function removeSubscription(sub: Subscription) {
    const isAlive = PREACT_SIGNAL_STATE.aliveSubscription.has(sub);
    if (isAlive) {
        PREACT_SIGNAL_STATE.aliveSubscription.delete(sub);
        PREACT_SIGNAL_STATE.subscribeCount = PREACT_SIGNAL_STATE.subscribeCount - 1;
        sub.unsubscribe();
    }
}

function cleanupCallback(sub: Subscription) {
    // called when a signal becomes garbage collected
    removeSubscription(sub);
}

const cleanupRegistry: FinalizationRegistry<Subscription> = new FinalizationRegistry(cleanupCallback) as any;

export const PreactSignalsRxReactivityFactory: RxReactivityFactory<PreactSignalReactivityLambda> = {
    fromObservable<Data, InitData>(
        obs: Observable<Data>,
        initialValue: InitData
    ): PreactSignal<Data | InitData> {
        const mySignal = signal<Data | InitData>(initialValue);
        /**
         * Only a WeakRef to the signal is kept here so that the subscription
         * does not prevent the signal from being garbage collected.
         */
        const sigRef: WeakRef<PreactSignal<Data | InitData>> = new WeakRef(mySignal);
        const sub = obs.subscribe((value: Data) => {
            const sig = sigRef.deref();
            if (sig) {
                sig.value = value;
            } else {
                /**
                 * The callback of FinalizationRegistry is not reliable by definition
                 * so we have this fallback to still clean unused signals subscriptions
                 * when they emit but the signal is already not used anymore.
                 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry#notes_on_cleanup_callbacks
                 */
                removeSubscription(sub);
            }
        });
        PREACT_SIGNAL_STATE.aliveSubscription.add(sub);
        PREACT_SIGNAL_STATE.subscribeCount = PREACT_SIGNAL_STATE.subscribeCount + 1;

        /**
         * The signal itself must be registered so that the cleanup
         * runs when the signal is garbage collected and not earlier.
         */
        cleanupRegistry.register(mySignal, sub);
        return mySignal;
    }
}; 
