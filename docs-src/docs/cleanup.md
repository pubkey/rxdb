---
title: Cleanup
slug: cleanup.html
description: Optimize storage and speed up queries with RxDB's Cleanup Plugin, automatically removing old deleted docs while preserving replication states.
---



# 🧹 Cleanup

To make the [replication](./replication.md) work, and for other reasons, RxDB has to keep deleted documents in storage so that it can replicate their deletion state.
This ensures that when a client is [offline](./offline-first.md), the deletion state is still known and can be replicated with the backend when the client goes online again.

Keeping too many deleted documents in the storage, can slow down queries or fill up too much disc space.
With the cleanup plugin, RxDB will run cleanup cycles that clean up deleted documents when it can be done safely.


## Installation

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
addRxPlugin(RxDBCleanupPlugin);
```

## Create a database with cleanup options

You can set a specific cleanup policy when a [RxDatabase](./rx-database.md) is created. For most use cases, the defaults should be ok.

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
const db = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageLocalstorage(),
  cleanupPolicy: {
      /**
       * The minimum time in milliseconds for how long
       * a document has to be deleted before it is
       * purged by the cleanup.
       * [default=one month]
       */
      minimumDeletedTime: 1000 * 60 * 60 * 24 * 31, // one month,
      /**
       * The minimum amount of that that the RxCollection must have existed.
       * This ensures that at the initial page load, more important
       * tasks are not slowed down because a cleanup process is running.
       * [default=60 seconds]
       */
      minimumCollectionAge: 1000 * 60, // 60 seconds
      /**
       * After the initial cleanup is done,
       * a new cleanup is started after [runEach] milliseconds 
       * [default=5 minutes]
       */
      runEach: 1000 * 60 * 5, // 5 minutes
      /**
       * If set to true,
       * RxDB will await all running replications
       * to not have a replication cycle running.
       * This ensures we do not remove deleted documents
       * when they might not have already been replicated.
       * [default=true]
       */
      awaitReplicationsInSync: true,
      /**
       * If true, it will only start the cleanup
       * when the current instance is also the leader.
       * This ensures that when RxDB is used in multiInstance mode,
       * only one instance will start the cleanup.
       * [default=true]
       */
      waitForLeadership: true
  }
});
```


## Calling cleanup manually

You can manually run a cleanup per collection by calling [RxCollection](./rx-collection.md).cleanup().

```ts

/**
 * Manually run the cleanup with the
 * minimumDeletedTime from the cleanupPolicy.
 */
await myRxCollection.cleanup();


/**
 * Overwrite the minimumDeletedTime
 * be setting it explicitly (time in milliseconds)
 */
await myRxCollection.cleanup(1000);

/**
 * Purge all deleted documents no
 * matter when they where deleted
 * by setting minimumDeletedTime to zero.
 */
await myRxCollection.cleanup(0);
```

## Using the cleanup plugin to empty a collection

When you have a collection with documents and you want to empty it by purging all documents, the recommended way is to call `myRxCollection.remove()`. However, this will destroy the JavaScript class of the collection and stop all listeners and observables.
Sometimes the better option might be to manually delete all documents and then use the cleanup plugin to purge the deleted documents:

```ts
// delete all documents
await myRxCollection.find().remove();
// purge all deleted documents
await myRxCollection.cleanup(0);
```


## FAQ

<details>
    <summary>When does the cleanup run</summary>
<div>
  The cleanup cycles are optimized to run only when the database is idle and it is unlikely that another database interaction performance will be decreased in the meantime. For example, by default, the cleanup does not run in the first 60 seconds of the creation of a collection to ensure the initial page load of your website does not slow down. Also, we use mechanisms like the `requestIdleCallback()` API to improve the correct timing of the cleanup cycle.
</div>
</details>
