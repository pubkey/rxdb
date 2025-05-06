---
title: Supercharged OPFS Database with RxDB
slug: rx-storage-opfs.html
description: Discover how to harness the Origin Private File System with RxDB's OPFS RxStorage for unrivaled performance and security in client-side data storage.
---

# Origin Private File System (OPFS) Database with the RxDB OPFS-RxStorage

With the [RxDB](https://rxdb.info/) OPFS storage you can build a fully featured database on top of the [Origin Private File System](https://web.dev/opfs) (OPFS) browser API. Compared to other storage solutions, it has a way better performance.

## What is OPFS

The **Origin Private File System (OPFS)** is a native browser storage API that allows web applications to manage files in a private, sandboxed, **origin-specific virtual filesystem**. Unlike [IndexedDB](./rx-storage-indexeddb.md) and [LocalStorage](./articles/localstorage.md), which are optimized as object/key-value storage, OPFS provides more granular control for file operations, enabling byte-by-byte access, file streaming, and even low-level manipulations. 
OPFS is ideal for applications requiring **high-performance** file operations (**3x-4x faster compared to IndexedDB**) inside of a client-side application, offering advantages like improved speed, more efficient use of resources, and enhanced security and privacy features.

### OPFS limitations

From the beginning of 2023, the Origin Private File System API is supported by [all modern browsers](https://caniuse.com/native-filesystem-api) like Safari, Chrome, Edge and Firefox. Only Internet Explorer is not supported and likely will never get support.

It is important to know that the most performant synchronous methods like [`read()`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/read) and [`write()`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/write) of the OPFS API are **only available inside of a [WebWorker](./rx-storage-worker.md)**.
They cannot be used in the main thread, an iFrame or even a [SharedWorker](./rx-storage-shared-worker.md).
The OPFS [`createSyncAccessHandle()`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle) method that gives you access to the synchronous methods is not exposed in the main thread, only in a Worker.

While there is no concrete **data size limit** defined by the API, browsers will refuse to store more [data at some point](./articles/indexeddb-max-storage-limit.md).
If no more data can be written, a `QuotaExceededError` is thrown which should be handled by the application, like showing an error message to the user.

## How the OPFS API works

The OPFS API is pretty straightforward to use. First you get the root filesystem. Then you can create files and directories on that. Notice that whenever you _synchronously_ write to, or read from a file, an `ArrayBuffer` must be used that contains the data. It is not possible to synchronously write plain strings or objects into the file. Therefore the `TextEncoder` and `TextDecoder` API must be used.

Also notice that some of the methods of `FileSystemSyncAccessHandle` [have been asynchronous](https://developer.chrome.com/blog/sync-methods-for-accesshandles) in the past, but are synchronous since Chromium 108. To make it less confusing, we just use `await` in front of them, so it will work in both cases.


```ts
// Access the root directory of the origin's private file system.
const root = await navigator.storage.getDirectory();

// Create a subdirectory.
const diaryDirectory = await root.getDirectoryHandle('subfolder', {
  create: true,
});

// Create a new file named 'example.txt'.
const fileHandle = await diaryDirectory.getFileHandle('example.txt', {
  create: true,
});

// Create a FileSystemSyncAccessHandle on the file.
const accessHandle = await fileHandle.createSyncAccessHandle();

// Write a sentence to the file.
let writeBuffer = new TextEncoder().encode('Hello from RxDB');
const writeSize = accessHandle.write(writeBuffer);

// Read file and transform data to string.
const readBuffer = new Uint8Array(writeSize);
const readSize = accessHandle.read(readBuffer, { at: 0 });
const contentAsString = new TextDecoder().decode(readBuffer);

// Write an exclamation mark to the end of the file.
writeBuffer = new TextEncoder().encode('!');
accessHandle.write(writeBuffer, { at: readSize });

// Truncate file to 10 bytes.
await accessHandle.truncate(10);

// Get the new size of the file.
const fileSize = await accessHandle.getSize();

// Persist changes to disk.
await accessHandle.flush();

// Always close FileSystemSyncAccessHandle if done, so others can open the file again.
await accessHandle.close();
```

A more detailed description of the OPFS API can be found [on MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system).

## OPFS performance

Because the Origin Private File System API provides low-level access to binary files, it is much faster compared to [IndexedDB](./slow-indexeddb.md) or [localStorage](./articles/localstorage.md). According to the [storage performance test](https://pubkey.github.io/client-side-databases/database-comparison/index.html), OPFS is up to 2x times faster on plain inserts when a new file is created on each write. Reads are even faster.

A good comparison about real world scenarios, are the [performance results](./rx-storage-performance.md) of the various RxDB storages. Here it shows that reads are up to 4x faster compared to IndexedDB, even with complex queries:

<p align="center">
  <img src="./files/rx-storage-performance-browser.png" alt="RxStorage performance - browser" width="700" />
</p>

## Using OPFS as RxStorage in RxDB

The OPFS [RxStorage](./rx-storage.md) itself must run inside a WebWorker. Therefore we use the [Worker RxStorage](./rx-storage-worker.md) and let it point to the prebuild `opfs.worker.js` file that comes shipped with RxDB Premium 👑.

Notice that the OPFS RxStorage is part of the [RxDB Premium 👑](/premium/) plugin that must be purchased.

```ts
import {
    createRxDatabase
} from 'rxdb';
import { getRxStorageWorker } from 'rxdb-premium/plugins/storage-worker';

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageWorker(
        {
            /**
             * This file must be statically served from a webserver.
             * You might want to first copy it somewhere outside of
             * your node_modules folder.
             */
            workerInput: 'node_modules/rxdb-premium/dist/workers/opfs.worker.js'
        }
    )
});
```

## Using OPFS in the main thread instead of a worker

The `createSyncAccessHandle` method from the Filesystem API is only available inside of a Webworker. Therefore you cannot use `getRxStorageOPFS()` in the main thread. But there is a slightly slower way to access the virtual filesystem from the main thread. RxDB support the `getRxStorageOPFSMainThread()` for that. Notice that this uses the [createWritable](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable) function which is not supported in safari.

Using OPFS from the main thread can have benefits because not having to cross the worker bridge can reduce latence in reads and writes.

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageOPFSMainThread } from 'rxdb-premium/plugins/storage-opfs';

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageOPFSMainThread()
});
```

## Building a custom `worker.js`

When you want to run additional plugins like storage wrappers or replication **inside** of the worker, you have to build your own `worker.js` file. You can do that similar to other workers by calling `exposeWorkerRxStorage` like described in the [worker storage plugin](./rx-storage-worker.md).

```ts
// inside of the worker.js file
import { getRxStorageOPFS } from 'rxdb-premium/plugins/storage-opfs';
import { exposeWorkerRxStorage } from 'rxdb-premium/plugins/storage-worker';

const storage = getRxStorageOPFS();
exposeWorkerRxStorage({
    storage
});
```

## Setting `usesRxDatabaseInWorker` when a RxDatabase is also used inside of the worker

When you use the OPFS inside of a worker, it will internally use strings to represent operation results. This has the benefit that transferring strings from the worker to the main thread, is way faster compared to complex json objects. The `getRxStorageWorker()` will automatically decode these strings on the main thread so that the data can be used by the RxDatabase.

But using a RxDatabase **inside** of your worker can make sense for example when you want to move the [replication](./replication.md) with a server. To enable this, you have to set `usesRxDatabaseInWorker` to `true`:

```ts
// inside of the worker.js file
import { getRxStorageOPFS } from 'rxdb-premium/plugins/storage-opfs';
const storage = getRxStorageOPFS({
  usesRxDatabaseInWorker: true
});
```

If you forget to set this and still create and use a [RxDatabase](./rx-database.md) inside of the worker, you might get the error message` or `Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'length')`.

## OPFS in Electron, React-Native or Capacitor.js

Origin Private File System is a browser API that is only accessible in browsers. Other JavaScript like React-Native or Node.js, do not support it.

**Electron** has two JavaScript contexts: the browser (chromium) context and the Node.js context. While you could use the OPFS API in the browser context, it is not recommended. Instead you should use the Filesystem API of Node.js and then only transfer the relevant data with the [ipcRenderer](https://www.electronjs.org/de/docs/latest/api/ipc-renderer). With RxDB that is pretty easy to configure:
- In the `main.js`, expose the [Node Filesystem](./rx-storage-filesystem-node.md) storage with the `exposeIpcMainRxStorage()` that comes with the [electron plugin](./electron.md)
- In the browser context, access the main storage with the `getRxStorageIpcRenderer()` method.

**React Native** (and Expo) does not have an OPFS API. You could use the ReactNative Filesystem to directly write data. But to get a fully featured database like RxDB it is easier to use the [SQLite RxStorage](./rx-storage-sqlite.md) which starts an SQLite database inside of the ReactNative app and uses that to do the database operations.

**Capacitor.js** is able to access the OPFS API.

## Difference between `File System Access API` and `Origin Private File System (OPFS)`

Often developers are confused with the differences between the `File System Access API` and the `Origin Private File System (OPFS)`.

- The `File System Access API` provides access to the files on the device file system, like the ones shown in the file explorer of the operating system. To use the File System API, the user has to actively select the files from a filepicker.
- `Origin Private File System (OPFS)` is a sub-part of the `File System Standard` and it only describes the things you can do with the filesystem root from `navigator.storage.getDirectory()`. OPFS writes to a **sandboxed** filesystem, not visible to the user. Therefore the user does not have to actively select or allow the data access. 

## Learn more about OPFS:

- [WebKit: The File System API with Origin Private File System](https://webkit.org/blog/12257/the-file-system-access-api-with-origin-private-file-system/)
- [Browser Support](https://caniuse.com/native-filesystem-api)
- [Performance Test Tool](https://pubkey.github.io/client-side-databases/database-comparison/index.html)
