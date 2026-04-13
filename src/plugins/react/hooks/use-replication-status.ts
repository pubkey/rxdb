import { useState, useEffect } from 'react';

import type {
    RxError,
    RxTypeError
} from '../../../types/index.d.ts';
import type { RxReplicationState } from '../../replication/index.ts';

export type UseReplicationStatusResult = {
    /**
     * Whether the replication is currently active (syncing).
     */
    syncing: boolean;
    /**
     * The most recent replication error, or null if no error.
     */
    error: RxError | RxTypeError | null;
    /**
     * Timestamp (ms) of the last successful sync event, or null if never synced.
     */
    lastSyncedAt: number | null;
    /**
     * Whether the replication has been canceled.
     */
    canceled: boolean;
};

/**
 * React hook that subscribes to an RxReplicationState and exposes
 * its status as React state. Provides syncing, error, lastSyncedAt,
 * and canceled fields.
 *
 * @param replicationState - The RxReplicationState to observe, or null/undefined.
 * @returns The current replication status.
 */
export function useReplicationStatus(
    replicationState: RxReplicationState<any, any> | null | undefined
): UseReplicationStatusResult {
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<RxError | RxTypeError | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
    const [canceled, setCanceled] = useState(false);

    useEffect(() => {
        if (!replicationState) {
            return;
        }

        const subs = [
            replicationState.active$.subscribe((active: boolean) => {
                setSyncing(active);
            }),
            replicationState.error$.subscribe((err: RxError | RxTypeError) => {
                setError(err);
            }),
            replicationState.canceled$.subscribe((isCanceled: boolean) => {
                setCanceled(isCanceled);
            }),
            replicationState.received$.subscribe(() => {
                setLastSyncedAt(Date.now());
            }),
            replicationState.sent$.subscribe(() => {
                setLastSyncedAt(Date.now());
            })
        ];

        return () => {
            subs.forEach(sub => sub.unsubscribe());
        };
    }, [replicationState]);

    return { syncing, error, lastSyncedAt, canceled };
}
