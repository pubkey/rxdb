import { useSyncExternalStore } from 'react';
import type { ViewerStore } from './store.ts';

/**
 * The store is a mutable object that bumps a version on every change, which
 * is a far better fit for the recorded feeds than copying a 500 entry array
 * on every write event. React only needs to know that something moved.
 */
export function useStoreVersion(store: ViewerStore): number {
    return useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
}
