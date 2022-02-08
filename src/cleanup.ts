/**
 * Contains all stuff to clean up deleted documents
 * and to free up disc space.
 */

import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HOOKS } from './hooks';
import type { RxCleanupPolicy, RxCollection, RxDatabase } from './types';
import { promiseWaitCancelable, PROMISE_RESOLVE_TRUE } from './util';

export const DEFAULT_CLEANUP_POLICY: RxCleanupPolicy = {
    minimumDeletedTime: 1000 * 60 * 60 * 24 * 31, // one month
    minimumDatabaseInstanceAge: 1000 * 60, // 60 seconds
    awaitAllInitialReplications: true,
    waitForLeadership: true
}


export async function startCleanup(
    rxDatabase: RxDatabase
) {
    const cleanupPolicy = rxDatabase.cleanupPolicy;
    await cleanupPolicy.waitForLeadership ? rxDatabase.waitForLeadership() : PROMISE_RESOLVE_TRUE;

    /**
     * Wait until minimumDatabaseInstanceAge is reached
     * or database is destroyed.
     */
    const waitMinimumDatabaseInstanceAge = promiseWaitCancelable(cleanupPolicy.minimumDatabaseInstanceAge);
    await Promise.race([
        rxDatabase.onDestroy.then(() => waitMinimumDatabaseInstanceAge.cancel()),
        waitMinimumDatabaseInstanceAge.promise
    ]);
    if (rxDatabase.destroyed) {
        return;
    }

    /**
     * Initially clean up all collections.
     * Do not run in parallel
     * to not use many resources
     * because cleanup is a background process.
     */
    const collections = Object.values(rxDatabase.collections);
    for (const collection of collections) {
        await cleanupRxCollection(collection, cleanupPolicy);
    }

    /**
     * Afterwards we listen to deletes
     * and only re-run the cleanup after
     * minimumDeletedTime is reached.
     */
    collections.forEach(collection => runCleanupAfterDelete(collection, cleanupPolicy));
    // same goes for newly created collections
    HOOKS.createRxCollection.push((collection: RxCollection) => {
        if (collection.database === rxDatabase) {
            runCleanupAfterDelete(collection, cleanupPolicy)
        }
    });
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
            hasMore = await storageInstance.cleanup(cleanupPolicy);
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
        const waitMinimumDeletedTime = promiseWaitCancelable(cleanupPolicy.minimumDeletedTime);
        await Promise.race([
            waitMinimumDeletedTime,
            rxCollection.onDestroy.then(() => waitMinimumDeletedTime.cancel())
        ]);
        await cleanupRxCollection(rxCollection, cleanupPolicy);
    }
}
