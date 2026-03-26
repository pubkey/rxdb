# Lightning-Fast Memory Storage for RxDB

> Use Memory RxStorage for a high-performance, JavaScript in-memory database. Built for speed, making it perfect for unit tests and rapid prototyping.

# Memory RxStorage

<!-- keywords:
javascript in-memory database
in memory db
node js in memory database
in memory storage
Nestjs in-memory database

-->

The Memory [RxStorage](./rx-storage.md) is based on plain in-memory arrays and objects. It can be used in all environments and is made for performance. By storing data directly in RAM, it eliminates disk I/O bottlenecks and operates faster than traditional disk-based databases. 

You should use this storage when you need a fast database configuration, such as in unit tests, server-side rendering, or high-throughput data processing.

## How it achieves maximum speed

- **No Disk I/O**: Operations happen entirely in RAM. There is no waiting for disk reads or writes.
- **No Serialization Overhead**: Data remains as JavaScript objects and arrays. It skips the expensive JSON serialization and deserialization steps required by index-based or file-based storages.
- **Binary Search**: It uses pure JavaScript arrays and binary search algorithms on all database operations, ensuring fast queries and index traversals.
- **Small Build Size**: The plugin contains minimal code, keeping your bundle size small.

## Use Cases

### 1. Unit Testing and CI/CD

The Memory storage is the recommended storage for testing RxDB applications. It provides two major benefits: speed and isolation. Because it keeps data only in memory, each test run can start with a clean state without needing to clean up leftover filesystem states or deleting IndexedDB databases. 

You can also simulate multi-tab behavior inside a single Node.js process by creating multiple `RxDatabase` instances with the same name and the `ignoreDuplicate: true` setting. They will share the memory state and communicate with each other naturally.

### 2. Server-Side Rendering (SSR)

When rendering React, Vue, or Angular applications on the server, you often need to fetch data, populate a database state, and render the UI. Using the Memory storage ensures your server handles these requests quickly without touching the file system, reducing latency and avoiding disk write locks.

### 3. Caching and Real-Time Processing

For applications handling thousands of events per second, such as real-time analytics dashboards or temporary chat state, the Memory storage acts as a fast data layer. You achieve instantaneous data access for aggregations and queries.

### 4. Memory-Mapped Performance Upgrades

RxDB provides a [Memory-Mapped RxStorage](./rx-storage-memory-mapped.md) which uses the Memory storage as a fast, primary layer and replicates data to a slower persistence storage in the background. This improves initial page load and query times while still keeping data safe on disk.

## Implementation

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageMemory
} from 'rxdb/plugins/storage-memory';

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageMemory()
});
```

### Constraints

- **No Persistence**: All data is lost when the JavaScript process exits or the browser tab is closed.
- **Memory Limits**: The dataset is constrained by the available RAM in the JavaScript runtime environment.
