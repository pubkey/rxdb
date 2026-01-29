---
title: RxDB In-Memory NoSQL - Supercharge Real-Time Apps
slug: in-memory-nosql-database.html
description: Discover how RxDB's in-memory NoSQL engine delivers blazing speed for real-time apps, ensuring responsive experiences and seamless data sync.
image: /headers/in-memory-nosql-database.jpg
---

# RxDB as In-memory NoSQL Database: Empowering Real-Time Applications

Real-time applications have become increasingly popular in today's digital landscape. From instant messaging to collaborative editing tools, the demand for responsive and interactive software is on the rise. To meet these requirements, developers need powerful and efficient database solutions that can handle large amounts of data in real-time. [RxDB](https://rxdb.info/), an javascript NoSQL database, is revolutionizing the way developers build and scale their applications by offering exceptional speed, flexibility, and scalability.


<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="RxDB Flutter Database" width="220" />
    </a>
</center>




## Speed and Performance Benefits
One of the key advantages of using RxDB as an in-memory NoSQL database is its ability to leverage in-memory storage for faster database operations. By storing data directly in memory, database operations can be performed significantly faster compared to traditional disk-based databases. This is especially important for real-time applications where every millisecond counts. With RxDB, developers can achieve near-instantaneous data access and manipulation, enabling highly responsive user experiences.

Additionally, RxDB eliminates disk I/O bottlenecks that are typically associated with traditional databases. In traditional databases, disk reads and writes can become a bottleneck as the amount of data grows. In contrast, an in-memory database like RxDB keeps the entire dataset in RAM, eliminating disk access overhead. This makes it an excellent choice for applications dealing with real-time analytics, high-throughput data processing, and caching.



## Persistence Options
While RxDB offers an [in-memory](../rx-storage-memory.md) storage adapter, it also offers [persistence storages](../rx-storage.md). Adapters such as [IndexedDB](../rx-storage-indexeddb.md), [SQLite](../rx-storage-sqlite.md), and [OPFS](../rx-storage-opfs.md) enable developers to persist data locally in the browser, making applications accessible even when [offline](../offline-first.md). This hybrid approach combines the benefits of in-memory performance with data durability, providing the best of both worlds. Developers can choose the adapter that best suits their needs, balancing the speed of in-memory storage with the long-term data persistence required for certain applications.

```javascript
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


Also the [memory mapped RxStorage](../rx-storage-memory-mapped.md) exists as a wrapper around any other RxStorage. The wrapper creates an in-memory storage that is used for query and write operations. This memory instance is replicated with the underlying storage for persistence. The main reason to use this is to improve initial page load and query/write times. This is mostly useful in browser based applications.


## Use Cases for RxDB
RxDB's capabilities make it well-suited for various real-time applications. Some notable use cases include:

- Chat Applications and Real-Time Messaging: RxDB's in-memory performance and real-time synchronization capabilities make it an excellent choice for building chat applications and real-time messaging systems. Developers can ensure that messages are delivered and synchronized across multiple clients in real-time, providing a seamless and responsive chat experience.

- Collaborative Document Editors: RxDB's ability to handle data streams and propagate changes in real-time makes it ideal for collaborative document editing. Multiple users can simultaneously edit a document, and their changes are instantly synchronized, allowing for real-time collaboration and ensuring that everyone has the most up-to-date version of the document.

- Real-Time Analytics Dashboards: RxDB's speed and scalability make it a valuable tool for real-time analytics dashboards. It can handle high volumes of data and perform complex analytics operations in real-time, providing instant insights and visualizations to users.


In conclusion, RxDB serves as a powerful in-memory NoSQL database that empowers developers to build real-time applications with exceptional speed, flexibility, and scalability. Its ability to leverage in-memory storage, eliminate disk I/O bottlenecks, and provide persistence options make it an attractive choice for a wide range of real-time use cases. Whether it's chat applications, collaborative document editors, or real-time analytics dashboards, RxDB provides the foundation for building responsive and interactive software that meets the demands of today's users.
