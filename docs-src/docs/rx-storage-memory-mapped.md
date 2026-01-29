---
title: Blazing-Fast Memory Mapped RxStorage
slug: rx-storage-memory-mapped.html
description: Boost your app's performance with Memory Mapped RxStorage. Query and write in-memory while seamlessly persisting data to your chosen storage.
image: /headers/rx-storage-memory-mapped.jpg
---


# Memory Mapped RxStorage

The memory mapped [RxStorage](./rx-storage.md) is a wrapper around any other RxStorage. The wrapper creates an in-memory storage that is used for query and write operations. This memory instance is kept persistent with a given underlying storage.

## Pros

- Improves read/write performance because these operations run against the in-memory storage.
- Decreases initial page load because it load all data in a single bulk request. It even detects if the database is used for the first time and then it does not have to await the creation of the persistent storage.
- Can store encrypted data on disc while still being able to run queries on the non-encrypted in-memory state.


## Cons

- It does not support attachments because storing big attachments data in-memory should not be done.
- When the JavaScript process is killed ungracefully like when the browser crashes or the power of the PC is terminated, it might happen that some memory writes are not persisted to the parent storage. This can be prevented with the `awaitWritePersistence` flag.
- The memory-mapped storage can only be used if all data fits into the memory of the JavaScript process. This is normally not a problem because a browser has much memory these days and plain JSON document data is not that big.
- Because it has to await an initial data loading from the parent storage into the memory, initial page load time can increase when much data is already stored. This is likely not a problem when you store less than `10k` documents.
- The `memory-mapped` storage is part of [RxDB Premium 👑](/premium/). It is not part of the default RxDB core module.

## Using the Memory-Mapped RxStorage

```ts

import {
    getRxStorageIndexedDB
} from 'rxdb-premium/plugins/storage-indexeddb';
import {
    getMemoryMappedRxStorage
} from 'rxdb-premium/plugins/storage-memory-mapped';

/**
 * Here we use the IndexedDB RxStorage as persistence storage.
 * Any other RxStorage can also be used.
 */
const parentStorage = getRxStorageIndexedDB();

// wrap the persistent storage with the memory-mapped storage.
const storage = getMemoryMappedRxStorage({
    storage: parentStorage
});

// create the [RxDatabase](./rx-database.md) like you would do with any other RxStorage
const db = await createRxDatabase({
    name: 'myDatabase,
    storage,
});
/** ... **/
```

## Multi-Tab Support

By how the memory-mapped storage works, it is not possible to have the same storage open in multiple JavaScript processes. So when you use this in a browser application, you can not open multiple databases when the app is used in multiple browser tabs.
To solve this, use the [SharedWorker Plugin](./rx-storage-shared-worker.md) so that the memory-mapped storage runs inside of a SharedWorker exactly once and is then reused for all browser tabs.

If you have a single JavaScript process, like in a React Native app, you do not have to care about this and can just use the memory-mapped storage in the main process.


## Encryption of the persistent data

Normally RxDB is not capable of running queries on encrypted fields. But when you use the memory-mapped RxStorage, you can store the document data encrypted on disc, while being able to run queries on the not encrypted in-memory state. Make sure you use the encryption storage wrapper around the persistent storage, **NOT** around the memory-mapped storage as a whole.

```ts

import {
    getRxStorageIndexedDB
} from 'rxdb-premium/plugins/storage-indexeddb';
import {
    getMemoryMappedRxStorage
} from 'rxdb-premium/plugins/storage-memory-mapped';
import { wrappedKeyEncryptionWebCryptoStorage } from 'rxdb-premium/plugins/encryption-web-crypto';

const storage = getMemoryMappedRxStorage({
    storage: wrappedKeyEncryptionWebCryptoStorage({
        storage: getRxStorageIndexedDB()
    })
});

const db = await createRxDatabase({
    name: 'myDatabase,
    storage,
});
/** ... **/
```


## Await Write Persistence
Running operations on the memory-mapped storage by default returns directly when the operation has run on the in-memory state and then persist changes in the background.
Sometimes you might want to ensure write operations is persisted, you can do this by setting `awaitWritePersistence: true`.

```ts
const storage = getMemoryMappedRxStorage({
    awaitWritePersistence: true,
    storage: getRxStorageIndexedDB()
});
```

## Block Size Limit

During cleanup, the memory-mapped storage will merge many small write-blocks into single big blocks for better initial load performance.
The `blockSizeLimit` defines the maximum of how many documents get stored in a single block. The default is `10000`.

```ts
const storage = getMemoryMappedRxStorage({
    blockSizeLimit: 1000,
    storage: getRxStorageIndexedDB()
});
```

## Migrating from other Storages

When you switch from a "normal" persistent storage (like [IndexedDB](./rx-storage-indexeddb.md) or [SQLite](./rx-storage-sqlite.md)) to the memory-mapped storage, you **must** migrate the data using the [Storage Migrator](./migration-storage.md).
You cannot simply switch the storage adapter on an existing database because the memory-mapped storage uses a different internal data structure.

To provide the fast initial page load and low write latency, the memory-mapped storage saves data in a "blockchain-like" structure. Writes are appended in blocks rather than modifying the state in place. These blocks are lazily cleaned up and processed later when the CPU is idle (see [Idle Functions](./rx-database.md#requestidlepromise)).
