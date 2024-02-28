---
title: 📈 RxStorage Performance
slug: rx-storage-performance.html
---

## RxStorage Performance comparison

A big difference in the RxStorage implementations is the **performance**. In difference to a server side database, RxDB is bound to the limits of the JavaScript runtime and depending on the runtime, there are different possibilities to store and fetch data. For example in the browser it is only possible to store data in a [slow IndexedDB](./slow-indexeddb.md) or OPFS instead of a filesystem while on React-Native you can use the [SQLite storage](./rx-storage-sqlite.md).

Therefore the performance can be completely different depending on where you use RxDB and what you do with it. Here you can see some performance measurements and descriptions on how the different [storages](./rx-storage.md) work and how their performance is different.


## Persistend vs Semi-Persistend storages

The "normal" storages are always persistend. This means each RxDB write is directly written to disc and all queries run on the disc state. This means a good startup performance because nothing has to be done on startup.

In contrast, semi-persistend storages like [Memory-Synced](./rx-storage-memory-synced.md) and [LokiJS](./rx-storage-lokijs.md) store all data in memory on startup and only save to disc occasionally (or on exit). Therefore it has a very fast read/write performance, but loading all data into memory on the first page load can take longer for big amounts of documents. Also these storages can only be used when all data fits into the memory at least once. In general it is recommended to stay on the persistend storages and only use semi-persitend ones, when you know for sure that the dataset will stay small (less then 2k documents).


## Performance comparison

In the following you can find some performance measurements and comparisons. Notice that these are only a small set of possible RxDB operations. If performance is really relevant for your use case, you should do your own measurements with usage-patterns that are equal to how you use RxDB in production.

### Measurements

Here the following metrics are measured:

- time-to-first-insert: Many storages run lazy, so it makes no sense to compare the time which is required to create a database with collections. Instead we measure the **time-to-first-insert** which is the whole timespan from database creation until the first single document write is done.
- insert 200 documents: Insert 200 documents with a single bulk-insert operation.
- find 1200 documents by id: Here we fetch 100% of the stored documents with a single `findByIds()` call.
- find 12000 documents by query: Here we fetch 100% of the stored documents with a single `find()` call.
- find 300x4 documents by query: Here we fetch 100% of the stored documents with a 4 `find()` calls that run in parallel.
- count 1200 documents: Counts 100% of the stored documents with a single `count()` call.


## Browser based Storages Performance Comparison

The performance patterns of the browser based storages are very diverse. The [IndexedDB storage](./rx-storage-indexeddb.md) is recommended for mostly all use cases so you should start with that one. Later you can do performance testings and switch to another storage like [OPFS](./rx-storage-opfs.md) or [memory-synced](./rx-storage-memory-synced.md). If you do not want to purchase [RxDB Premium](/premium), you could use the slower [Dexie.js based RxStorage](./rx-storage-dexie.md) instead.

<p align="center">
  <img src="./files/rx-storage-performance-browser.png" alt="RxStorage performance - browser" width="700" />
</p>

## Node/Native based Storages Performance Comparison

For most client-side native applications (react-native, electron, capacitor), using the [SQLite RxStorage](./rx-storage-sqlite.md) is recommended. For non-client side applications like a server, use the [MongoDB storage](./rx-storage-mongodb.md) instead.

<p align="center">
  <img src="./files/rx-storage-performance-node.png" alt="RxStorage performance - Node.js" width="700" />
</p>

