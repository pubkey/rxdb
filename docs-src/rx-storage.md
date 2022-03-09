# RxStorage

RxDB is not a self contained database. Instead the data is stored in an implementation of the RxStorage interface. This allows you to switch out the underlaying data layer, depending on the JavaScript environment and performance requirements. For example you can use the PouchDB storage with the SQLite adapter for a capacitor app. Or you can use the LokiJS RxStorage with the IndexedDB adapter for a browser based application. For Node.js, there are filesystem based adapters.

## Implementations

### PouchDB

The PouchDB RxStorage is based on the [PouchDB](https://github.com/pouchdb/pouchdb) database. It is the most battle proven RxStorage and has a big ecosystem of adapters. It is the only RxStorage that allows to do replication with a CouchDB endpoint. PouchDB does a lot of overhead to enable CouchDB replication which makes the PouchDB RxStorage one of the slowest. [Read more](./rx-storage-pouchdb.md)

### LokiJS

The LokiJS based storage is based on the [LokiJS](https://github.com/techfort/LokiJS) database.
It has the special behavior of loading all data into memory at app start and therefore has the best performance when running operations over a small to mid sized dataset. [Read more](./rx-storage-lokijs.md)

### Dexie.js

The LokiJS based storage is based on the [Dexie.js](https://github.com/dexie/Dexie.js) IndexedDB wrapper.
It stores the data inside of a browsers IndexedDB database and has a very small bundle size. Compared to the LokiJS storage, it has a better initial load time even on big datasets. [Read more](./rx-storage-dexie.md)


### Worker

The worker RxStorage is a wrapper around any other RxStorage which allows to run the storage in a WebWorker (in browsers) or a Worker Thread (in node.js). By doing so, you can take CPU load from the main process and move it into the worker's process which can improve the percieved performance of your application. [Read more](./rx-storage-worker.md)




--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./rx-storage-pouchdb.md)
