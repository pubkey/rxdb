# Blazing-Fast Node Filesystem Storage

> Get up and running quickly with RxDB's Filesystem Node RxStorage. Store data in JSON, embrace multi-instance support, and enjoy a simpler database.

import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_DATA_NODE, PERFORMANCE_METRICS } from '@site/src/components/performance-data';
import {PremiumBlock} from '@site/src/components/premium-block';

# Filesystem Node RxStorage

The Filesystem Node [RxStorage](./rx-storage.md) for RxDB is built on top of the [Node.js Filesystem API](https://nodejs.org/api/fs.html).
It stores data in plain JSON/txt files like any "normal" database does. It is a bit faster compared to the [SQLite storage](./rx-storage-sqlite.md) and its setup is less complex.
Using the same database folder in parallel with multiple Node.js processes is supported when you set `multiInstance: true` while creating the [RxDatabase](./rx-database.md).

### Pros

- Easier setup compared to [SQLite](./rx-storage-sqlite.md)
- [Fast](./rx-storage-performance.md)

<PremiumBlock />

<PerformanceChart title="Node/Native Storages" data={PERFORMANCE_DATA_NODE} metrics={PERFORMANCE_METRICS} />

## Usage

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageFilesystemNode
} from 'rxdb-premium/plugins/storage-filesystem-node';
import path from 'path';

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageFilesystemNode({
        basePath: path.join(__dirname, 'my-database-folder'),
        /**
         * Set inWorker=true if you use this RxStorage
         * together with the WebWorker plugin.
         */
        inWorker: false
    })
});
/* ... */
```

## FAQ

<details>
<summary>Does RxDB support single-file storage architectures in Node environments?</summary>

The native `getRxStorageFilesystemNode` adapter does not compile documents into a single monolithic file (like SQLite), but instead serializes and persists document data as distinct JSON/text files directly representing the database tree on the disk. For strict single-file architectures in Node.js, you must mount the specialized **[SQLite RxStorage](./rx-storage-sqlite.md)** plugin, which wraps the entire database state into a single portable `.sqlite` file efficiently using Node's native `sqlite` bindings.
</details>
