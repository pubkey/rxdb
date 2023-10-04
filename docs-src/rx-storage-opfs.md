# Origin Private File System (OPFS) Database with the RxDB OPFS-RxStorage

With the [RxDB](https://rxdb.info/) OPFS storage you can build a fully featured database on top of the Origin Private File System (OPFS) browser API. Compared to other storage solutions, it has a way better performance.

## What is OPFS

The **Origin Private File System (OPFS)** is a native browser storage API that allows web applications to manage files in a private, sandboxed, **origin-specific virtual filesystem**. Unlike [IndexedDB](./rx-storage-indexeddb.md) and [LocalStorage](./articles/localstorage.md), which are optimized as object/key-value storage, OPFS provides more granular control for file operations, enabling byte-by-byte access, file streaming, and even low-level manipulations. 
OPFS is ideal for applications requiring **high-performance** file operations (**3x-4x faster compared to IndexedDB**) inside of a client-side application, offering advantages like improved speed, more efficient use of resources, and enhanced security and privacy features.

### OPFS limitations

From the beginning of 2023, the Origin Private File System API is supported by [all modern browsers](https://caniuse.com/native-filesystem-api) like Safari, Chrome, Edge and Firefox. Only Internet Explorer is not supported and likely will never get support.

It is important to know that the OPFS API is **only available inside of a [WebWorker](./rx-storage-worker.md)**.
It cannot be used in the main thread, an iFrame or even a [SharedWorker](./rx-storage-shared-worker.md).
If you call the OPFS `getFileHandle()` function in the main thread, it will throw the error `Uncaught DOMException: A requested file or directory could not be found at the time an operation was processed.`.

While there is no concrete **data size limit** defined by the API, browsers will refuse to store more data at some point.
If no more data can be written, a `QuotaExceededError` is thrown which should be handled by the application, like showing an error message to the user.

## How the OPFS API works

The OPFS API is pretty straightforward to use. First you get the root filesystem. Then you can create files and directory on that. Notice that whenever you writ to, or read from a file, an `ArrayBuffer` must be used that contains the data. It is not possible to write plain strings or objects into the file. Therefore the `TextEncoder` and `TextDecoder` API must be used.

Also notice that the methods of `FileSystemSyncAccessHandle` have been asynchronous in the past, but are synchronous since Chromium 108. To make it less confusing, we just use `await` in front of them, so it will work in both cases.


```ts
// Access the root directory of the origin's private file system
const root = await navigator.storage.getDirectory();

// create a subdirectory
const diaryDirectory = await root.getDirectoryHandle('subfolder', { create : true });

// Create a new file named 'example.txt'
const fileHandle = await diaryDirectory.getFileHandle('example.txt', { create: true });

// Create a FileSystemSyncAccessHandle on the file.
const accessHandle = await draftFile.createSyncAccessHandle();

// Get the size of the file.
const fileSize = accessHandle.getSize();

// read file and transform data to string
const fileSize = await accessHandle.getSize();
const readBuffer = new Uint8Array(fileSize);
await accessHandle.read(readBuffer, { at: 0 });
const contentAsString = new TextDecoder().decode(readBuffer);

// Write a sentence to the end of the file.
const writeBuffer = new TextEncoder().encode('Hello from RxDB');
const writeSize = await accessHandle.write(writeBuffer, { "at" : readSize });

// Truncate file to 10 bytes.
await accessHandle.truncate(10);

// Persist changes to disk.
await accessHandle.flush();

// Always close FileSystemSyncAccessHandle if done, so others can open the file again.
await accessHandle.close();
```

Are more detailed description of the OPFS API can be found on mdn [here](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system).

## OPFS performance

Because the Origin Private File System API provides low-level access to binary files, it is much faster compared to [IndexedDB](./slow-indexeddb.md) or [localStorage](./articles/localstorage.md). According to the [storage performance test](https://pubkey.github.io/client-side-databases/database-comparison/index.html), OPFS is up to 2x times faster on plain inserts when a new file is created on each write. Reads are even faster.

A good comparison about real world scenarios, are the [performance results](./rx-storage-performance.md) of the various RxDB storages. Here it shows that reads are up to 4x faster compared to IndexedDB, even with complex queries:

<p align="center">
  <img src="./files/rx-storage-performance-browser.png" alt="RxStorage performance - browser" width="700" />
</p>


## Using OPFS as RxStorage in RxDB

The OPFS [RxStorage](./rx-storage.md) itself must run inside a WebWorker. Therefore we use the [Worker RxStorage](./rx-storage-worker.md) and let it point to the prebuild `opfs.worker.js` file that comes shipped with RxDB Premium.

Notice that the OPFS RxStorage is part of the [RxDB Premium](https://rxdb.info/premium.html) plugin that must be purchased.
Also is in beta mode at the moment which means it can include breaking changes without a RxDB major version increment.

```ts
import {
    createRxDatabase
} from 'rxdb';
import { getRxStorageWorker } from 'rxdb-premium/plugins/storage-worker';
import { RxStorageOPFSStatics } from 'rxdb-premium/plugins/storage-opfs';

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageWorker(
        {
            statics: RxStorageOPFSStatics,
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
## Building a custom `worker.js`

When you want to run additional plugins like storage wrappers or replication **inside** of the worker, you have to build your own `worker.js` file. You can do that similar to other workers by calling `exposeWorkerRxStorage` like described in the [worker storage plugin](./rx-storage-worker.md).

```ts
// inside of worker.js
import { getRxStorageOPFS } from 'rxdb-premium/plugins/storage-opfs';
import { exposeWorkerRxStorage } from 'rxdb-premium/plugins/storage-worker';

const storage = getRxStorageOPFS();
exposeWorkerRxStorage({
    storage
});
```

## OPFS in Electron, React-Native or Capacitor.js

Origin Private File System is a browser API that is only accessible in browsers. Other JavaScript like React-Native or Node.js, do not support it.

**Electron** has two JavaScript contexts: the browser (chromium) context and the Node.js context. While you could use the OPFS API in the browser context, it is not recommended. Instead you should use the Filesystem API of Node.js and then only transfer the relevant data with the [ipcRenderer](https://www.electronjs.org/de/docs/latest/api/ipc-renderer). With RxDB that is pretty easy to configure:
- In the `main.js`, expose the [Node Filesystem](./rx-storage-filesystem-node.md) storage with the `exposeIpcMainRxStorage()` that comes with the [electron plugin](./electron.md)
- In the browser context, access the main storage with the `getRxStorageIpcRenderer()` method.

**React Native** (and Expo) does not have an OPFS API. You could use the ReactNative Filesystem to directly write data. But to get a fully featured database like RxDB it is easier to use the [SQLite RxStorage](./rx-storage-sqlite.md) which starts an SQLite database inside of the ReactNative app and uses that to do the database operations.

**Capacitor.js** is able to access the OPFS API.

## Difference between `File System Access API` and `Origin Private File System (OPFS)`

Often developers are confused with the differences between the `File System Access API` and the `Origin Private File System (OPFS)`.

- The `File System API` provides access to the files on the device file system, like the ones shown in the file explorer of the operating system. To use the ile System API, the user has to actively select the files from a filepicker.
- `Origin Private File System (OPFS)` is a sub-part of the `File System API` and it only describes the things you can do with the filesystem root from `navigator.storage.getDirectory()`. OPFS writes to a **sandboxed** filesystem, not visible to the user. Therefore the user does not have to actively select or allow the data access. 


## Learn more about OPFS:

- [WebKit: The File System API with Origin Private File System](https://webkit.org/blog/12257/the-file-system-access-api-with-origin-private-file-system/)
- [Browser Support](https://caniuse.com/native-filesystem-api)
- [Performance Test Tool](https://pubkey.github.io/client-side-databases/database-comparison/index.html)
