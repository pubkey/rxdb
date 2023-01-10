# Cleanup (beta)

To make the replication work, and for other reasons, RxDB has to keep deleted documents in the storage.
This ensures that when a client is offline, the deletion state is still known and can be replicated with the backend when the client goes online again.

Keeping too many deleted documents in the storage, can slow down queries or fill up too much disc space.
With the cleanup plugin, RxDB will run cleanup cycles that clean up deleted documents when it can be done safely.


## Add the cleanup plugin

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
addRxPlugin(RxDBCleanupPlugin);
```

## Create a database with cleanup options

You can set a specific cleanup policy when a `RxDatabase` is created. For most use cases, the defaults should be ok.

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
const db = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageDexie(),
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
