# RxStorage

RxDB is not a self contained database. Instead the data is stored in an implementation of the [RxStorage interface](https://github.com/pubkey/rxdb/blob/master/src/types/rx-storage.interface.d.ts). This allows you to switch out the underlaying data layer, depending on the JavaScript environment and performance requirements. For example you can use the PouchDB storage with the SQLite adapter for a capacitor app. Or you can use the LokiJS RxStorage with the IndexedDB adapter for a browser based application. For Node.js, there are filesystem based adapters.

## Implementations

### PouchDB

The PouchDB RxStorage is based on the [PouchDB](https://github.com/pouchdb/pouchdb) database. It is the most battle proven RxStorage and has a big ecosystem of adapters. It is the only RxStorage that allows to do replication with a CouchDB endpoint. PouchDB does a lot of overhead to enable CouchDB replication which makes the PouchDB RxStorage one of the slowest. [Read more](./rx-storage-pouchdb.md)

### LokiJS

The LokiJS based storage is based on the [LokiJS](https://github.com/techfort/LokiJS) database.
It has the special behavior of loading all data into memory at app start and therefore has the best performance when running operations over a small to mid sized dataset. [Read more](./rx-storage-lokijs.md)

### Dexie.js

The LokiJS based storage is based on the [Dexie.js](https://github.com/dexie/Dexie.js) IndexedDB wrapper.
It stores the data inside of a browsers IndexedDB database and has a very small bundle size. Compared to the LokiJS storage, it has a better initial load time even on big datasets. [Read more](./rx-storage-dexie.md)

### Memory

A storage that stores the data in as plain data in the memory of the JavaScript process. Really fast and can be used in all environments. [Read more](./rx-storage-memory.md)

### IndexedDB

The IndexedDB `RxStorage` is based on plain IndexedDB. This has the best performance of all other non-in-memory storage, when RxDB is used inside of a browser. [Read more](./rx-storage-indexeddb.md)

### SQLite

The SQLite storage has the best performance when RxDB is used on **Node.js**, **Electron**, **React Native**, **Cordova** or **Capacitor**. [Read more](./rx-storage-sqlite.md)

### Worker

The worker RxStorage is a wrapper around any other RxStorage which allows to run the storage in a WebWorker (in browsers) or a Worker Thread (in node.js). By doing so, you can take CPU load from the main process and move it into the worker's process which can improve the percieved performance of your application. [Read more](./rx-storage-worker.md)

### Sharding

On some `RxStorage` implementations (like IndexedDB), a huge performance improvement can be done by sharding the documents into multiple database instances. With the sharding plugin you can wrap any other `RxStorage` into a sharded storage. [Read more](./rx-storage-sharding.md)

### Memory Synced

The memory synced [RxStorage](./rx-storage.md) is a wrapper around any other RxStorage. The wrapper creates an in-memory storage that is used for query and write operations. This memory instance is replicated with the underlaying storage for persistence.
The main reason to use this is to improve initial page load and query/write times. This is mostly usefull in browser based applications. [Read more](./rx-storage-memory-synced.md)



## Performance comparison

A big difference in the RxStorage implementations is the performance. In difference to a server side database, RxDB is bound to the limits of the JavaScript runtime. For example in the browser it is only possible to store data in a [slow IndexedDB](./slow-indexeddb.md) instead of a filesystem.

**LokiJS** stores all data in memory and only saves to disc occasionally (or on exit). Therefore it has a very fast read/write performance, but loading all data into memory on the first page load can take longer for big amounts of documents. Also this storage can only be used when all data fits into the memory at least once.

The Premium **sharding** RxStorage is only usefull when big amounts of documents have to be stored or queries. In the CI performance test, we only insert 300 documents so that the performance actually decreases when sharding is used.

The **PouchDB** RxStorage is slow because it has to handle all revisions of a document on writes and queries. This makes PouchDB the only storage where it is possible to replicate with a CouchDB compatible endpoint.

Many storages run lazy, so it makes no sense to compare the time which is required to create a database with collections. Instead we measure the **time-to-first-insert** which is the whole timespan from database creation until the first single document write is done.

<p align="center">
  <img src="./files/rx-storage-performance-browser.png" alt="RxStorage performance - browser" width="700" />
</p>

<p align="center">
  <img src="./files/rx-storage-performance-node.png" alt="RxStorage performance - Node.js" width="700" />
</p>



--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./rx-storage-pouchdb.md)
