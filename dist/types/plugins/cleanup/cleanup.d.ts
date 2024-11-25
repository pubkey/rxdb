import type { RxCleanupPolicy, RxCollection } from '../../types/index.d.ts';
export declare function startCleanupForRxCollection(rxCollection: RxCollection): Promise<void>;
export declare function initialCleanupWait(collection: RxCollection, cleanupPolicy: RxCleanupPolicy): Promise<void>;
/**
 * Runs the cleanup for a single RxCollection
 */
export declare function cleanupRxCollection(rxCollection: RxCollection, cleanupPolicy: RxCleanupPolicy): Promise<void>;
export declare function runCleanupAfterDelete(rxCollection: RxCollection, cleanupPolicy: RxCleanupPolicy): Promise<void>;
