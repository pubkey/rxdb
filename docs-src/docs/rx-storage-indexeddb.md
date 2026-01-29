---
title: Instant Performance with IndexedDB RxStorage
slug: rx-storage-indexeddb.html
description: Choose IndexedDB RxStorage for unmatched speed and minimal build size. Perfect for fast-performing apps that demand reliable, lightweight data solutions.
image: /headers/rx-storage-indexeddb.jpg
---

# IndexedDB RxStorage

The IndexedDB [RxStorage](./rx-storage.md) is based on plain IndexedDB and can be used in browsers, [electron](./electron-database.md) or [hybrid apps](./articles/mobile-database.md).
Compared to other [browser based storages](./articles/browser-database.md), the IndexedDB storage has the smallest write- and read latency, the fastest initial page load
and the smallest build size. Only for big datasets (more than 10k documents), the [OPFS storage](./rx-storage-opfs.md) is better suited.

While the IndexedDB API itself can be very slow, the IndexedDB storage uses many tricks and performance optimizations, some of which are described [here](./slow-indexeddb.md). For example it uses custom index strings instead of the native IndexedDB indexes, batches cursors for faster bulk reads and many other improvements. The IndexedDB storage also operates on [Write-ahead logging](https://en.wikipedia.org/wiki/Write-ahead_logging) similar to SQLite, to improve write latency while still ensuring consistency on writes.


## IndexedDB performance comparison

Here is some performance comparison with other storages. Compared to the non-memory storages like [OPFS](./rx-storage-opfs.md) and [WASM SQLite](./rx-storage-sqlite.md), IndexedDB has the smallest build size and fastest write speed. Only OPFS is faster on queries over big datasets. See [performance comparison](./rx-storage-performance.md) page for a comparison with all storages.

<p align="center">
  <img src="./files/rx-storage-performance-browser.png" alt="IndexedDB performance" width="700" />
</p>

## Using the IndexedDB RxStorage

To use the indexedDB storage you import it from the [RxDB Premium 👑](/premium/) npm module and use `getRxStorageIndexedDB()` when creating the [RxDatabase](./rx-database.md).

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageIndexedDB
} from 'rxdb-premium/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageIndexedDB({
        /**
         * For better performance, queries run with a batched cursor.
         * You can change the batchSize to optimize the query time
         * for specific queries.
         * You should only change this value when you are also doing performance measurements.
         * [default=300]
         */
        batchSize: 300
    })
});
```


## Overwrite/Polyfill the native IndexedDB

[Node.js](./nodejs-database.md) has no IndexedDB API. To still run the IndexedDB `RxStorage` in Node.js, for example to run unit tests, you have to polyfill it.
You can do that by using the [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) module and pass it to the `getRxStorageIndexedDB()` function.

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

//> npm install fake-indexeddb --save
const fakeIndexedDB = require('fake-indexeddb');
const fakeIDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageIndexedDB({
        indexedDB: fakeIndexedDB,
        IDBKeyRange: fakeIDBKeyRange
    })
});

```


## Storage Buckets

The [Storage Buckets API](https://wicg.github.io/storage-buckets/) provides a way for sites to organize locally stored data into groupings called "storage buckets". This allows the user agent or sites to manage and delete buckets independently rather than applying the same treatment to all the data from a single origin. [Read More](https://developer.chrome.com/docs/web-platform/storage-buckets?hl=en)

To use different storage buckets with the RxDB IndexedDB Storage, you can use a function instead of a plain object when providing the  `indexedDB` attribute:

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageIndexedDB({
        indexedDB: async(params) => {
            const myStorageBucket = await navigator.storageBuckets.open('myApp-' + params.databaseName);
            return myStorageBucket.indexedDB;
        },
        IDBKeyRange
    })
});
```



## Limitations of the IndexedDB RxStorage

- It is part of the [RxDB Premium 👑](/premium/) plugin that must be purchased. If you just need a storage that works in the browser and you do not have to care about performance, you can use the [LocalStorage storage](./rx-storage-localstorage.md) instead.
- The IndexedDB storage requires support for [IndexedDB v2](https://caniuse.com/indexeddb2), it does not work on Internet Explorer. 

