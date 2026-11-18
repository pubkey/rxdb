import { filter, firstValueFrom } from 'rxjs';
import type {
    RxCleanupPolicy
} from '../../types/index.d.ts';
import type { RxReplicationState } from '../replication/index.ts';

export const DEFAULT_CLEANUP_POLICY: RxCleanupPolicy = {
    minimumDeletedTime: 1000 * 60 * 60 * 24 * 31, // one month
    minimumCollectionAge: 1000 * 60, // 60 seconds
    runEach: 1000 * 60 * 5, // 5 minutes
    awaitReplicationsInSync: true,
    waitForLeadership: true
};

/**
 * Resolves when the replication is in sync or when it gets canceled.
 * awaitInSync() of a replication that is canceled before its
 * first sync never resolves, and a canceled replication
 * does not have to block the cleanup.
 */
export function awaitReplicationInSyncOrCanceled(
    replicationState: RxReplicationState<any, any>
): Promise<any> {
    return Promise.race([
        replicationState.awaitInSync(),
        firstValueFrom(
            replicationState.canceled$.pipe(filter(canceled => !!canceled)),
            { defaultValue: true }
        )
    ]);
}
