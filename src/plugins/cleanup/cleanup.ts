/**
 * Contains all stuff to clean up deleted documents
 * and to free up disc space.
 */

import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import type { RxCleanupPolicy, RxCollection } from '../../types';
import { promiseWaitCancelable, PROMISE_RESOLVE_TRUE, SET_TIMEOUT_MAX } from '../../util';

export const DEFAULT_CLEANUP_POLICY: RxCleanupPolicy = {
    minimumDeletedTime: 1000 * 60 * 60 * 24 * 31, // one month
    minimumDatabaseInstanceAge: 1000 * 60, // 60 seconds
    awaitAllInitialReplications: true,
    waitForLeadership: true
}

/**
 * Even on multiple databases,
 * the calls to RxStorage().cleanup()
 * must never run in parallel.
 * The cleanup is a background task which should
 * not affect the performance of other, more important tasks.
 */
let RXSOTRAGE_CLEANUP_QUEUE: Promise<boolean> = PROMISE_RESOLVE_TRUE;


export async function startCleanupForRxCollection(
    rxCollection: RxCollection
) {
    const rxDatabase = rxCollection.database;
    const cleanupPolicy = Object.assign(
        {},
        DEFAULT_CLEANUP_POLICY,
        rxDatabase.cleanupPolicy
    );

    await cleanupPolicy.waitForLeadership ? rxDatabase.waitForLeadership() : PROMISE_RESOLVE_TRUE;

    /**
    * Wait until minimumDatabaseInstanceAge is reached
    * or collection is destroyed.
    */
    const waitMinimumDatabaseInstanceAge = promiseWaitCancelable(cleanupPolicy.minimumDatabaseInstanceAge);
    await Promise.race([
        rxCollection.onDestroy.then(() => waitMinimumDatabaseInstanceAge.cancel()),
        waitMinimumDatabaseInstanceAge.promise
    ]);
    if (rxCollection.destroyed) {
        return;
    }

    // initially cleanup the collection
    await cleanupRxCollection(rxCollection, cleanupPolicy);

    /**
     * Afterwards we listen to deletes
     * and only re-run the cleanup after
     * minimumDeletedTime is reached.
     */
    await runCleanupAfterDelete(rxCollection, cleanupPolicy);
}

/**
 * Runs the cleanup for a single RxCollection
 */
export async function cleanupRxCollection(
    rxCollection: RxCollection,
    cleanupPolicy: RxCleanupPolicy
) {
    const rxDatabase = rxCollection.database;
    const storageInstances = [
        rxCollection.storageInstance,
        rxCollection.localDocumentsStore
    ];
    // run cleanup() until it returns false
    for (const storageInstance of storageInstances) {
        let hasMore = true;
        while (hasMore && !rxCollection.destroyed) {
            await rxDatabase.requestIdlePromise();
            if (rxCollection.destroyed) {
                return;
            }
            RXSOTRAGE_CLEANUP_QUEUE = RXSOTRAGE_CLEANUP_QUEUE.then(() => storageInstance.cleanup(cleanupPolicy));
            hasMore = await RXSOTRAGE_CLEANUP_QUEUE;
        }
    }
}

export async function runCleanupAfterDelete(
    rxCollection: RxCollection,
    cleanupPolicy: RxCleanupPolicy
) {
    while (!rxCollection.destroyed) {
        // wait for the first deleted
        await firstValueFrom(rxCollection.$.pipe(
            filter(changeEvent => changeEvent.operation === 'DELETE')
        ));

        const waitTime = cleanupPolicy.minimumDeletedTime > SET_TIMEOUT_MAX ? SET_TIMEOUT_MAX : cleanupPolicy.minimumDeletedTime;
        const waitMinimumDeletedTime = promiseWaitCancelable(waitTime);
        await Promise.race([
            waitMinimumDeletedTime,
            rxCollection.onDestroy.then(() => waitMinimumDeletedTime.cancel())
        ]);
        await cleanupRxCollection(rxCollection, cleanupPolicy);
    }
}
