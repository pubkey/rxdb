---
title: RxServer Scaling
slug: rx-server-scaling.html
---


# Scaling the RxServer

The [RxDB Server](./rx-server.md) run in JavaScript and JavaScript runs on a single process on the operating system. This can make the CPU performance limit to be the main bottleneck when serving requests to your users. To migitate that problem, there are a wide range of methods to scale up the server so that it can serve more requests at the same time faster.


## Vertical Scaling

Vertical Scaling aka "scaling up" has the goal to get more power out of a single server by utilizing more of the servers compute. Vertical scaling should be the first step when you decide it is time to scale.

### Run multiple JavaScript processes
To utilize more compute power of your server, the first step is to scale vertically by running the RxDB server on **multiple processes** in parallel.
RxDB itself is already build to support multiInstance-usage on the client, like when the user has openened multiple browser tabs at once. The same method works also on the server side in Node.js. You can spawn multiple JavaScript processes that use the same [RxDatabase](./rx-database.md) and the instances will automatically communicate with each other and distribute their data and events with the [BroadcastChannel](https://github.com/pubkey/broadcast-channel).
By default the [multiInstance param](./rx-database.md#multiinstance) is set to `true` when calling `createRxDatabase()`, so you do not have to change anything. To make all processes accessible through the same endpoint, you can put a load-balancer like [nginx](https://nginx.org/en/docs/http/load_balancing.html) in front of them.

### Use an in-memory storage at the user facing level

Another way to serve more requests to your end users, is to use an [in-memory](./rx-storage-memory.md) storage that has the [best](./rx-storage-performance.md) read- and write performance. It outperformance persistend storages by a factor of 10x.
So instead of directly serving requests from the persistence layer, you add an in-memory layer on top of that. You could either do a [replication](./replication.md) from your memory database to the persistend one, or you use the [memory synced](./rx-storage-memory-synced.md) storage which has this build in.

```ts
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { getRxStorageFilesystemNode } from 'rxdb-premium/plugins/storage-filesystem-node';
import { getMemorySyncedRxStorage } from 'rxdb-premium/plugins/storage-memory-synced';
const myRxDatabase = await createRxDatabase({
    name: 'mydb',
    storage: getMemorySyncedRxStorage({
        storage: getRxStorageFilesystemNode({
            basePath: path.join(__dirname, 'my-database-folder')
        })
    })
});
await myDatabase.addCollections({/* ... */});

const myServer = await startRxServer({
    database: myRxDatabase,
    port: 443
});
```

But notice that you have to check your persistence requirements. When a write happens to the memory layer and the server crashes while it has not persisted, in rare cases the write operation might get lost.

## Horizontal Scaling

To scale the RxDB Server above a single physical hardware unit, there different solutions where the decision depends on the exact use case.

### Single Datastore with multiple branches
For 

This is mostly usefull on read-heavy applications because reads will directly run on the branches without ever reaching the main datastore and you can always add more branches to **scale up**.

### Moving the branches to "the edge"


### Replicate Databases for Microservices

If your application is build with a [microservice architecture](https://en.wikipedia.org/wiki/Microservices) and your microservices are also build in Node.js, you can scale the database horizontally by moving the database into the microservices and use the [RxDB replication](./replication.md) to do a realtime sync between the microservices and a main "datastore" server.

The "datastore" server would then only handle the replication requests or do some additional things like logging or [backups](./backup.md). The compute for reads and writes will then mainly be done on the microservices themself.





### Use a self-scaling RxStorage
