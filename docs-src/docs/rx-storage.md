---
title: ⚙️ Rxstorage Layer
slug: rx-storage.html
---

# RxStorage

RxDB is not a self contained database. Instead the data is stored in an implementation of the [RxStorage interface](https://github.com/pubkey/rxdb/blob/master/src/types/rx-storage.interface.d.ts). This allows you to **switch out** the underlying data layer, depending on the JavaScript environment and performance requirements. For example you can use the SQLite storage for a capacitor app or you can use the Dexie.js RxStorage to store data in IndexedDB in a browser based application. There are also storages for other JavaScript runtimes like Node.js, React-Native, NativeScript and more.


## Quick Recommendations

- In the Browser: Use the [IndexedDB RxStorage](./rx-storage-indexeddb.md) if you have [👑 premium access](/premium), otherwise use the [Dexie.js](./rx-storage-dexie.md) storage.
- In [Electron](./electron-database.md) and [ReactNative](./react-native-database.md): Use the [SQLite RxStorage](./rx-storage-sqlite.md) if you have [👑 premium access](/premium), otherwise use the [LokiJS](./rx-storage-lokijs.md) storage.
- In Capacitor: Use the [SQLite RxStorage](./rx-storage-sqlite.md) if you have [👑 premium access](/premium), otherwise use the [Dexie.js](./rx-storage-dexie.md) storage.


## Configuration Examples

The RxStorage layer of RxDB is very flexible. Here are some examples on how to configure more complex settings:

### Storing much data in a browser securely

Lets say you build a browser app that needs to store a big amount of data as secure as possible. Here we can use a combination of the storages (encryption, IndexedDB, compression, schema-checks) that increase security and reduce the stored data size.

We use the schema-validation on the top level to ensure schema-errors are clearly readable and do not contain encrypted/compressed data. The encryption is used inside of the compression because encryption of compressed data is more efficient.

```ts
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { wrappedKeyCompressionStorage } from 'rxdb/plugins/key-compression';
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

const myDatabase = await createRxDatabase({
    storage: wrappedValidateAjvStorage({
        storage: wrappedKeyCompressionStorage({
            storage: wrappedKeyEncryptionCryptoJsStorage({
                storage: getRxStorageIndexedDB()
            })
        })
    })
});
```


### High query Load

Also we can utilize a combination of storages to create a database that is optimized to run complex queries on the data really fast. Here we use the shardingstorage together with the worker storage. This allows to run queries in parallel multithreading instead of a single JavaScript process. Because the worker initialization can slow down the initial page load, we also use the localstorage-meta-optimizer to improve initialization time.

```ts
import { getRxStorageSharding } from 'rxdb-premium/plugins/storage-sharding';
import { getRxStorageWorker } from 'rxdb-premium/plugins/storage-worker';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';
import { getLocalstorageMetaOptimizerRxStorage } from 'rxdb-premium/plugins/storage-localstorage-meta-optimizer';

const myDatabase = await createRxDatabase({
    storage: getLocalstorageMetaOptimizerRxStorage({
        storage: getRxStorageSharding({
            storage: getRxStorageWorker({
                workerInput: 'path/to/worker.js',
                storage: getRxStorageIndexedDB()
            })
        })
    })
});
```

### Low Latency on Writes and Simple Reads

Here we create a storage configuration that is optimized to have a low latency on simple reads and writes. It uses the memory-synced storage to fetch and store data in memory. For persistence the OPFS storage is used in the main thread which has lower latency for fetching big chunks of data when at initialization the data is loaded from disc into memory. We do not use workers because sending data from the main thread to workers and backwards would increase the latency.

```ts
import { getLocalstorageMetaOptimizerRxStorage } from 'rxdb-premium/plugins/storage-localstorage-meta-optimizer';
import { getMemorySyncedRxStorage } from 'rxdb-premium/plugins/storage-memory-synced';
import { getRxStorageOPFSMainThread } from 'rxdb-premium/plugins/storage-worker';


const myDatabase = await createRxDatabase({
    storage: getLocalstorageMetaOptimizerRxStorage({
        storage: getMemorySyncedRxStorage({
            storage: getRxStorageOPFSMainThread()
        })
    })
});
```


## All RxStorage Implementations List

### Dexie.js

The Dexie.js based storage is based on the [Dexie.js](https://github.com/dexie/Dexie.js) IndexedDB wrapper.
It stores the data inside of a browsers IndexedDB database and has a very small bundle size. **If you are new to RxDB, you should start with the Dexie.js RxStorage**. [Read more](./rx-storage-dexie.md)


### Memory

A storage that stores the data in as plain data in the memory of the JavaScript process. Really fast and can be used in all environments. [Read more](./rx-storage-memory.md)

### 👑 IndexedDB

The IndexedDB `RxStorage` is based on plain IndexedDB. This has a better performance than the Dexie.js storage, but it is slower compared to the OPFS storage. [Read more](./rx-storage-indexeddb.md)

### 👑 OPFS

The OPFS `RxStorage` is based on the File System Access API. This has the best performance of all other non-in-memory storage, when RxDB is used inside of a browser. [Read more](./rx-storage-opfs.md)


### 👑 SQLite

The SQLite storage has great performance when RxDB is used on **Node.js**, **Electron**, **React Native**, **Cordova** or **Capacitor**. [Read more](./rx-storage-sqlite.md)

### 👑 Filesystem Node

The Filesystem Node storage is best suited when you use RxDB in a Node.js process or with [electron.js](./electron.md). [Read more](./rx-storage-filesystem-node.md)


### MongoDB

To use RxDB on the server side, the MongoDB RxStorage provides a way of having a secure, scalable and performant storage based on the popular MongoDB NoSQL database [Read more](./rx-storage-mongodb.md)

### DenoKV

To use RxDB in Deno. The DenoKV RxStorage provides a way of having a secure, scalable and performant storage based on the Deno Key Value Store. [Read more](./rx-storage-denokv.md)

### FoundationDB

To use RxDB on the server side, the FoundationDB RxStorage provides a way of having a secure, fault-tolerant and performant storage. [Read more](./rx-storage-foundationdb.md)

### LokiJS (deprecated)

The LokiJS based storage is based on the [LokiJS](https://github.com/techfort/LokiJS) database.
It has the special behavior of loading all data into memory at app start and therefore has a good performance when running operations over a small dataset where loading all data upfront is not a problem. [Read more](./rx-storage-lokijs.md)

### 👑 Worker

The worker RxStorage is a wrapper around any other RxStorage which allows to run the storage in a WebWorker (in browsers) or a Worker Thread (in Node.js). By doing so, you can take CPU load from the main process and move it into the worker's process which can improve the perceived performance of your application. [Read more](./rx-storage-worker.md)

### 👑 SharedWorker

The worker RxStorage is a wrapper around any other RxStorage which allows to run the storage in a SharedWorker (only in browsers). By doing so, you can take CPU load from the main process and move it into the worker's process which can improve the perceived performance of your application. [Read more](./rx-storage-shared-worker.md)


### Remote
The Remote RxStorage is made to use a remote storage and communicate with it over an asynchronous message channel. The remote part could be on another JavaScript process or even on a different host machine. Mostly used internally in other storages like Worker or Electron-ipc. [Read more](./rx-storage-remote.md)

### 👑 Sharding

On some `RxStorage` implementations (like IndexedDB), a huge performance improvement can be done by sharding the documents into multiple database instances. With the sharding plugin you can wrap any other `RxStorage` into a sharded storage. [Read more](./rx-storage-sharding.md)

### 👑 Memory Synced

The memory synced [RxStorage](./rx-storage.md) is a wrapper around any other RxStorage. The wrapper creates an in-memory storage that is used for query and write operations. This memory instance is replicated with the underlying storage for persistence.
The main reason to use this is to improve initial page load and query/write times. This is mostly useful in browser based applications. [Read more](./rx-storage-memory-synced.md)

### 👑 Localstorage Meta Optimizer

The [RxStorage](./rx-storage.md) Localstorage Meta Optimizer is a wrapper around any other RxStorage. The wrapper uses the original RxStorage for normal collection documents. But to optimize the initial page load time, it uses `localstorage` to store the plain key-value metadata that RxDB needs to create databases and collections. This plugin can only be used in browsers. [Read more](./rx-storage-localstorage-meta-optimizer.md)

### Electron IpcRenderer & IpcMain

To use RxDB in [electron](./electron-database.md), it is recommended to run the RxStorage in the main process and the RxDatabase in the renderer processes. With the rxdb electron plugin you can create a remote RxStorage and consume it from the renderer process. [Read more](./electron.md)


