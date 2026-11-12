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

const EMPTY_STATUS: UseReplicationStatusResult = {
    syncing: false,
    error: null,
    lastSyncedAt: null,
    canceled: false
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
    /**
     * The state remembers to which replicationState it belongs,
     * so that the status of one replication is never returned for another one.
     */
    const [state, setState] = useState<{
        replicationState: RxReplicationState<any, any>;
        status: UseReplicationStatusResult;
    } | null>(null);

    useEffect(() => {
        if (!replicationState) {
            setState(null);
            return;
        }
        const update = (
            modifier: (status: UseReplicationStatusResult) => Partial<UseReplicationStatusResult>
        ) => setState(previous => {
            const status = previous && previous.replicationState === replicationState
                ? previous.status
                : EMPTY_STATUS;
            return {
                replicationState,
                status: Object.assign({}, status, modifier(status))
            };
        });

        /**
         * An error of a failed handler call has the 'direction' parameter.
         * The handler is called again until it succeeds, so the replication
         * has recovered from that error when it becomes idle afterwards.
         * Errors without that parameter are kept until a later active phase
         * has run without such an error, because the hook cannot know
         * whether the failed operation was retried. This includes an RxError
         * that was rejected by the push handler, which is emitted unchanged.
         */
        let wasActive = false;
        let hadErrorWithoutRetry = false;

        const subs = [
            replicationState.active$.subscribe((active: boolean) => {
                if (active && !wasActive) {
                    hadErrorWithoutRetry = false;
                }
                const recovered = wasActive &&
                    !active &&
                    !hadErrorWithoutRetry &&
                    !replicationState.isStoppedOrPaused();
                wasActive = active;
                update(() => recovered ? { syncing: active, error: null } : { syncing: active });
            }),
            replicationState.error$.subscribe((err: RxError | RxTypeError) => {
                if (!err.parameters || !err.parameters.direction) {
                    hadErrorWithoutRetry = true;
                }
                update(() => ({ error: err }));
            }),
            replicationState.canceled$.subscribe((isCanceled: boolean) => {
                update(() => ({ canceled: isCanceled }));
            }),
            replicationState.received$.subscribe(() => {
                update(() => ({ lastSyncedAt: Date.now() }));
            }),
            replicationState.sent$.subscribe(() => {
                update(() => ({ lastSyncedAt: Date.now() }));
            })
        ];

        return () => {
            subs.forEach(sub => sub.unsubscribe());
        };
    }, [replicationState]);

    return state && state.replicationState === replicationState ? state.status : EMPTY_STATUS;
}
