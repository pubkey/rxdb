---
title: Seamless Electron Storage with RxDB
slug: electron.html
description: Use the RxDB Electron Plugin to share data between main and renderer processes. Enjoy quick queries, real-time sync, and robust offline support.
---



# Electron Plugin


## RxStorage Electron IpcRenderer & IpcMain


To use RxDB in [electron](./electron-database.md), it is recommended to run the RxStorage in the main process and the RxDatabase in the renderer processes. With the rxdb electron plugin you can create a remote RxStorage and consume it from the renderer process.

To do this in a convenient way, the RxDB electron plugin provides the helper functions `exposeIpcMainRxStorage` and `getRxStorageIpcRenderer`.
Similar to the [Worker RxStorage](./rx-storage-worker.md), these wrap any other [RxStorage](./rx-storage.md) once in the main process and once in each renderer process. In the renderer you can then use the storage to create a [RxDatabase](./rx-database.md) which communicates with the storage of the main process to store and query data.

```ts
//  main.js
const { exposeIpcMainRxStorage } = require('rxdb/plugins/electron');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');
app.on('ready', async function () {
    exposeIpcMainRxStorage({
        key: 'main-storage',
        storage: getRxStorageMemory(),
        ipcMain: electron.ipcMain
    });
});
```


```ts
//  renderer.js
const { getRxStorageIpcRenderer } = require('rxdb/plugins/electron');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');

const db = await createRxDatabase({
    name,
    storage: getRxStorageIpcRenderer({
        key: 'main-storage',
        ipcRenderer: electron.ipcRenderer
    })
});
/* ... */
```


## Related

- [Comparison of Electron Databases](./electron-database.md)
