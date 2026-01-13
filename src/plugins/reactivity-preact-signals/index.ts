import { signal, Signal } from "@preact/signals-core";
import type {
    Observable,
    Subscription
} from 'rxjs';
import type {
    WeakRef,
    FinalizationRegistry,
    RxReactivityFactory
} from '../../types/index.d.ts';

export type PreactSignal<T = any> = Signal<T>;

/**
 * Exported to debug and test
 * the behavior
 */
export const PREACT_SIGNAL_STATE = {
    subscribeCount: 0,
    signalBySubscription: new WeakMap<Subscription, PreactSignal>(),
    aliveSubscription: new Set<Subscription>(),
};


function removeSubscription(sub: Subscription) {
    const isAlive = PREACT_SIGNAL_STATE.aliveSubscription.has(sub);
    if (isAlive) {
        PREACT_SIGNAL_STATE.aliveSubscription.delete(sub);
        PREACT_SIGNAL_STATE.signalBySubscription.delete(sub);
        PREACT_SIGNAL_STATE.subscribeCount = PREACT_SIGNAL_STATE.subscribeCount - 1;
        sub.unsubscribe();
    }
}

function cleanupCallback(sub: Subscription) {
    // called when a signal becomes garbage collected
    removeSubscription(sub);
}

const cleanupRegistry: FinalizationRegistry<Subscription> = new FinalizationRegistry(cleanupCallback) as any;

export const PreactSignalsRxReactivityFactory: RxReactivityFactory<PreactSignal> = {
    fromObservable<Data, InitData>(
        obs: Observable<Data>,
        initialValue: InitData
    ): PreactSignal<Data | InitData> {
        const mySignal = signal<Data | InitData>(initialValue);
        const sigRef: WeakRef = new WeakRef(mySignal);
        const sub = obs.subscribe(value => {
            const sig = PREACT_SIGNAL_STATE.signalBySubscription.get(sub);
            if (sig && sigRef.deref()) {
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
        PREACT_SIGNAL_STATE.signalBySubscription.set(sub, mySignal);
        PREACT_SIGNAL_STATE.subscribeCount = PREACT_SIGNAL_STATE.subscribeCount + 1;

        cleanupRegistry.register({}, sub);
        return mySignal;
    }
}; 
