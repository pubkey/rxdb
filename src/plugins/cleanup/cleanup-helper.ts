import type {
    RxCleanupPolicy
} from '../../types/index.d.ts';

export const DEFAULT_CLEANUP_POLICY: RxCleanupPolicy = {
    minimumDeletedTime: 1000 * 60 * 60 * 24 * 31, // one month
    minimumCollectionAge: 1000 * 60, // 60 seconds
    runEach: 1000 * 60 * 5, // 5 minutes
    awaitReplicationsInSync: true,
    waitForLeadership: true
};
