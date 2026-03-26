# Instant Performance with Memory Synced RxStorage

> Accelerate RxDB with in-memory storage replicated to disk. Enjoy instant queries, faster loads, and unstoppable performance for your web apps.

# Memory Synced RxStorage

The memory synced [RxStorage](./rx-storage.md) is a wrapper around any other RxStorage. The wrapper creates an in-memory storage that is used for query and write operations. This memory instance is replicated with the underlying storage for persistence.
The main reason to use this is to improve initial page load and query/write times. This is mostly useful in browser based applications.

## Pros

- Improves read/write performance because these operations run against the in-memory storage.
- Decreases initial page load because it load all data in a single bulk request. It even detects if the database is used for the first time and then it does not have to await the creation of the persistent storage.

## Cons

- It does not support attachments.
- When the JavaScript process is killed ungracefully like when the browser crashes or the power of the PC is terminated, it might happen that some memory writes are not persisted to the parent storage. This can be prevented with the `awaitWritePersistence` flag.
- This can only be used if all data fits into the memory of the JavaScript process. This is normally not a problem because a browser has much memory these days and plain json document data is not that big.
- Because it has to await an initial replication from the parent storage into the memory, initial page load time can increase when much data is already stored. This is likely not a problem when you store less than `10k` documents.
- The memory-synced storage itself does not support replication and migration. Instead you have to replicate the underlying parent storage.
- The `memory-synced` plugin is part of [RxDB Premium 👑](/premium/). It is not part of the default RxDB module.

:::note The memory-synced RxStorage was removed in RxDB version 16

The `memory-synced` was removed in RxDB version 16. Instead consider using the newer and better [memory-mapped RxStorage](./rx-storage-memory-mapped.md) which has better trade-offs and is easier to configure.
:::

## Usage

```ts

import {
    getRxStorageIndexedDB
} from 'rxdb-premium/plugins/storage-indexeddb';
import {
    getMemorySyncedRxStorage
} from 'rxdb-premium/plugins/storage-memory-synced';

/**
 * Here we use the IndexedDB RxStorage as persistence storage.
 * Any other RxStorage can also be used.
 */
const parentStorage = getRxStorageIndexedDB();

// wrap the persistent storage with the memory synced one.
const storage = getMemorySyncedRxStorage({
    storage: parentStorage
});

// create the RxDatabase like you would do with any other RxStorage
const db = await createRxDatabase({
    name: 'myDatabase,
    storage,
});
/** ... **/

```

## Options

Some options can be provided to fine tune the performance and behavior.

```ts

import {
    requestIdlePromise
} from 'rxdb';

const storage = getMemorySyncedRxStorage({
    storage: parentStorage,

    /**
     * Defines how many document
     * get replicated in a single batch.
     * [default=50]
     * 
     * (optional)
     */
    batchSize: 50,

    /**
     * By default, the parent storage will be created without indexes for a faster page load.
     * Indexes are not needed because the queries will anyway run on the memory storage.
     * You can disable this behavior by setting keepIndexesOnParent to true.
     * If you use the same parent storage for multiple RxDatabase instances where one is not
     * a asynced-memory storage, you will get the error: 'schema not equal to existing storage'
     * if you do not set keepIndexesOnParent to true.
     * 
     * (optional)
     */
    keepIndexesOnParent: true,

    /**
     * If set to true, all write operations will resolve AFTER the writes
     * have been persisted from the memory to the parentStorage.
     * This ensures writes are not lost even if the JavaScript process exits
     * between memory writes and the persistence interval.
     * default=false
     */
    awaitWritePersistence: true,

    /**
     * After a write, await until the return value of this method resolves
     * before replicating with the master storage.
     * 
     * By returning requestIdlePromise() we can ensure that the CPU is idle
     * and no other, more important operation is running. By doing so we can be sure
     * that the replication does not slow down any rendering of the browser process.
     * 
     * (optional)
     */
    waitBeforePersist: () => requestIdlePromise();
});
```

## Replication and Migration with the memory-synced storage

The memory-synced storage itself does not support replication and migration. Instead you have to replicate the underlying parent storage.
For example when you use it on top of an [IndexedDB storage](./rx-storage-indexeddb.md), you have to run replication on that storage instead by creating a different [RxDatabase](./rx-database.md).

```js
const parentStorage = getRxStorageIndexedDB();

const memorySyncedStorage = getMemorySyncedRxStorage({
    storage: parentStorage,
    keepIndexesOnParent: true
});

const databaseName = 'mydata';

/**
 * Create a parent database with the same name+collections
 * and use it for replication and migration.
 * The parent database must be created BEFORE the memory-synced database
 * to ensure migration has already been run.
 */
const parentDatabase = await createRxDatabase({
    name: databaseName,
    storage: parentStorage
});
await parentDatabase.addCollections(/* ... */);

replicateRxCollection({
    collection: parentDatabase.myCollection,
    /* ... */
});

/**
 * Create an equal memory-synced database with the same name+collections
 * and use it for writes and queries.
 */
const memoryDatabase = await createRxDatabase({
    name: databaseName,
    storage: memorySyncedStorage
});
await memoryDatabase.addCollections(/* ... */);
```
