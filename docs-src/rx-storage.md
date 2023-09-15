# RxStorage

RxDB is not a self contained database. Instead the data is stored in an implementation of the [RxStorage interface](https://github.com/pubkey/rxdb/blob/master/src/types/rx-storage.interface.d.ts). This allows you to **switch out** the underlying data layer, depending on the JavaScript environment and performance requirements. For example you can use the SQLite storage for a capacitor app or you can use the Dexie.js RxStorage to store data in IndexedDB in a browser based application. There are also storages for other JavaScript runtimes like Node.js, React-Native, NativeScript and more.


### Quick Recommendations

- In the Browser: Use the [OPFS RxStorage](./rx-storage-opfs.md) if you have [premium access](https://rxdb.info/premium.html), otherwise use the [Dexie.js](./rx-storage-dexie.md) storage.
- In Electron and ReactNative: Use the [SQLite RxStorage](./rx-storage-sqlite.md) if you have [premium access](https://rxdb.info/premium.html), otherwise use the [LokiJS](./rx-storage-lokijs.md) storage.
- In Capactior: Use the [SQLite RxStorage](./rx-storage-sqlite.md) if you have [premium access](https://rxdb.info/premium.html), otherwise use the [Dexie.js](./rx-storage-dexie.md) storage.


## Implementations

### Dexie.js

The Dexie.js based storage is based on the [Dexie.js](https://github.com/dexie/Dexie.js) IndexedDB wrapper.
It stores the data inside of a browsers IndexedDB database and has a very small bundle size. **If you are new to RxDB, you should start with the Dexie.js RxStorage**. [Read more](./rx-storage-dexie.md)

### LokiJS

The LokiJS based storage is based on the [LokiJS](https://github.com/techfort/LokiJS) database.
It has the special behavior of loading all data into memory at app start and therefore has the best performance when running operations over a small to mid sized dataset. [Read more](./rx-storage-lokijs.md)


### Memory

A storage that stores the data in as plain data in the memory of the JavaScript process. Really fast and can be used in all environments. [Read more](./rx-storage-memory.md)

### IndexedDB [[premium](https://rxdb.info/premium.html)]

The IndexedDB `RxStorage` is based on plain IndexedDB. This has a better performance than the Dexie.js storage, but it is slower compared to the OPFS storage. [Read more](./rx-storage-indexeddb.md)

### OPFS [[premium](https://rxdb.info/premium.html)]

The OPFS `RxStorage` is based on the File System Access API. This has the best performance of all other non-in-memory storage, when RxDB is used inside of a browser. [Read more](./rx-storage-opfs.md)


### SQLite [[premium](https://rxdb.info/premium.html)]

The SQLite storage has great performance when RxDB is used on **Node.js**, **Electron**, **React Native**, **Cordova** or **Capacitor**. [Read more](./rx-storage-sqlite.md)

### Filesystem Node [[premium](https://rxdb.info/premium.html)]

The Filesystem Node storage is best suited when you use RxDB in a Node.js process or with [electron.js](./electron.md). [Read more](./rx-storage-filesystem-node.md)


### MongoDB

To use RxDB on the server side, the MongoDB RxStorage provides a way of having a secure, scaleable and performant storage based on the popular MongoDB NoSQL database [Read more](./rx-storage-mongodb.md)

### FoundationDB

To use RxDB on the server side, the FoundationDB RxStorage provides a way of having a secure, fault-tolerant and performant storage. [Read more](./rx-storage-foundationdb.md)


### Worker [[premium](https://rxdb.info/premium.html)]

The worker RxStorage is a wrapper around any other RxStorage which allows to run the storage in a WebWorker (in browsers) or a Worker Thread (in Node.js). By doing so, you can take CPU load from the main process and move it into the worker's process which can improve the perceived performance of your application. [Read more](./rx-storage-worker.md)

### SharedWorker [[premium](https://rxdb.info/premium.html)]

The worker RxStorage is a wrapper around any other RxStorage which allows to run the storage in a SharedWorker (only in browsers). By doing so, you can take CPU load from the main process and move it into the worker's process which can improve the perceived performance of your application. [Read more](./rx-storage-shared-worker.md)


### Remote
The Remote RxStorage is made to use a remote storage and communicate with it over an asynchronous message channel. The remote part could be on another JavaScript process or even on a different host machine. [Read more](./rx-storage-remote.md)

### Sharding [[premium](https://rxdb.info/premium.html)]

On some `RxStorage` implementations (like IndexedDB), a huge performance improvement can be done by sharding the documents into multiple database instances. With the sharding plugin you can wrap any other `RxStorage` into a sharded storage. [Read more](./rx-storage-sharding.md)

### Memory Synced [[premium](https://rxdb.info/premium.html)]

The memory synced [RxStorage](./rx-storage.md) is a wrapper around any other RxStorage. The wrapper creates an in-memory storage that is used for query and write operations. This memory instance is replicated with the underlying storage for persistence.
The main reason to use this is to improve initial page load and query/write times. This is mostly useful in browser based applications. [Read more](./rx-storage-memory-synced.md)

### Localstorage Meta Optimizer [[premium](https://rxdb.info/premium.html)]

The [RxStorage](./rx-storage.md) Localstorage Meta Optimizer is a wrapper around any other RxStorage. The wrapper uses the original RxStorage for normal collection documents. But to optimize the initial page load time, it uses `localstorage` to store the plain key-value metadata that RxDB needs to create databases and collections. This plugin can only be used in browsers. [Read more](./rx-storage-localstorage-meta-optimizer.md)

### Electron IpcRenderer & IpcMain

To use RxDB in [electron](./electron-database.md), it is recommended to run the RxStorage in the main process and the RxDatabase in the renderer processes. With the rxdb electron plugin you can create a remote RxStorage and consume it from the renderer process. [Read more](./electron.md)


