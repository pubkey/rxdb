# Memory Synced RxStorage

The memory synced [RxStorage](./rx-storage.md) is a wrapper around any other RxStorage. The wrapper creates an in-memory storage that is used for query and write operations. This memory instance is replicated with the underlying storage for persistence.
The main reason to use this is to improve initial page load and query/write times. This is mostly useful in browser based applications.

## Pros

- Improves read/write performance because these operations run against the in-memory storage.
- Decreases initial page load because it load all data in a single bulk request. It even detects if the database is used for the first time and then it does not have to await the creation of the persistent storage.


## Cons

- It does not support attachments.
- When the JavaScript process is killed ungracefully like when the browser crashes or the power of the PC is terminated, it might happen that some memory writes are not persisted to the parent storage.
- This can only be used if all data fits into the memory of the JavaScript process. This is normally not a problem because a browser has much memory these days and plain json document data is not that big.
- Because it has to await an initial replication from the parent storage into the memory, initial page load time can increase when much data is already stored. This is likely not a problem when you store less then `10k` documents.


**NOTICE:** The `memory-synced` plugin is part of [RxDB premium](https://rxdb.info/premium.html). It is not part of the default RxDB module.

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

// wrap the persistend storage with the memory synced one.
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

Some options can be provided to fine tune the performance.

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
     * 
     * (optional)
     */
    keepIndexesOnParent: true,

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


## Comparison with the LokiJS RxStorage

The [LokiJS RxStorage](./rx-storage-lokijs.md) also loads the whole database state into the memory to improve operation time.
In comparison to LokiJS, the `Memory Synced` RxStorage has many improvements and performance optimizations to reduce initial load time. Also it uses replication instead of the leader election to handle multi-tab usage. This alone decreases the initial page load by about 200 milliseconds.

