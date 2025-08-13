---
title: MongoDB Realtime Sync Engine for Local-First Apps
slug: replication-mongodb.html
description: Build real-time, offline-capable apps with RxDB + MongoDB replication. Push/pull changes, use change streams, and keep data in sync across devices.
---

import {Tabs} from '@site/src/components/tabs';
import {Steps} from '@site/src/components/steps';
import {YouTubeVideoBox} from '@site/src/components/youtube-video-box';
import {RxdbMongoDiagramPlain} from '@site/src/components/mongodb-sync';

# MongoDB Replication Plugin for RxDB — Real-Time, Offline-First Sync


<p align="center">
  <img src="./files/icons/mongodb.svg" alt="MongoDB Sync" height="60" class="img-padding img-in-text-right" />
</p>


The [MongoDB](https://www.mongodb.com/) Replication Plugin for RxDB delivers seamless, two-way synchronization between MongoDB and RxDB, enabling [real-time](./articles/realtime-database.md) updates and [offline-first](./offline-first.md) functionality for your applications. Built on **MongoDB Change Streams**, it supports both Atlas and self-hosted deployments, ensuring your data stays consistent across every device and service.


Behind the scenes, the plugin is powered by the RxDB [Sync Engine](./replication.md), which manages the complexities of real-world data replication for you. It automatically handles [conflict detection and resolution](./transactions-conflicts-revisions.md), maintains precise checkpoints for incremental updates, and gracefully manages transitions between offline and online states. This means you don't need to manually implement retry logic, reconcile divergent changes, or worry about data loss during connectivity drops, the Sync Engine ensures consistency and reliability in every sync cycle.


## Key Features

- **Two-way replication** between MongoDB and RxDB collections
- **Offline-first support** with automatic incremental re-sync
- **Incremental updates** via MongoDB Change Streams
- **Conflict resolution** handled by the RxDB Sync Engine
- **Atlas and self-hosted support** for replica sets and sharded clusters


## Architecture Overview

The plugin operates in a three-tier architecture: Clients connect to [RxServer](./rx-server.md), which in turn connects to MongoDB. RxServer streams changes from MongoDB to connected clients and pushes client-side updates back to MongoDB.

For the client side, RxServer exposes a [replication endpoint](./rx-server.md#replication-endpoint) over WebSocket or HTTP, which your RxDB-powered applications can consume.

The following diagram illustrates the flow of updates between clients, RxServer, and MongoDB in a live synchronization setup:

<RxdbMongoDiagramPlain />
<br />
<br />


:::note
The MongoDB Replication Plugin is optimized for Node.js environments (e.g., when RxDB runs within RxServer or other backend services). Direct connections from browsers or mobile apps to MongoDB are not supported because MongoDB does not use HTTP as its wire protocol and requires a driver-level connection to a replica set or sharded cluster.
:::



## Setting up the Client-RxServer-MongoDB Sync


<Steps>


### Install the Client Dependencies

In your JavaScript project, install the RxDB libraries and the MongoDB node.js driver:

```npm install rxdb rxdb-server mongodb --save```



### Set up a MongoDB Server

As first step, you need access to a running MongoDB Server. This can be done by either running a server locally or using the Atlas Cloud. Notice that we need to have a [replica set](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set/) because only on these, the MongoDB changestream can be used.

<Tabs>

### Shell

If you have installed MongoDB locally, you can start the server with this command:

```mongod --replSet rs0 --bind_ip_all```

### Docker

If you have docker installed, you can start a container that runs the MongoDB server:

```docker run -p 27017:27017 -p 27018:27018 -p 27019:27019 --rm --name rxdb-mongodb mongo:8.0.4 mongod --replSet rs0 --bind_ip_all```

### MongoDB Atlas

Learn here how to create a MongoDB atlas account and how to start a MongoDB cluster that runs in the cloud: 

<br />
<center>
    <YouTubeVideoBox videoId="bBA9rUdqmgY" title="Create MongoDB Atlas Server" duration="19:55" />
</center>


</Tabs>
<br />

After this step you should have a valid connection string that points to a running MongoDB Server like `mongodb://localhost:27017/`.

### Create a MongoDB Database and Collection

On your MongoDB server, make sure to create a database and a collection.

```ts
//> server.ts

import { MongoClient } from 'mongodb';
const mongoClient = new MongoClient('mongodb://localhost:27017/?directConnection=true');
const mongoDatabase = mongoClient.db('my-database');
await mongoDatabase.createCollection('my-collection', {
  changeStreamPreAndPostImages: { enabled: true }
});
```

:::note
To observe document deletions on the changestream, `changeStreamPreAndPostImages` must be enabled. This is not required if you have an insert/update-only collection where no documents are deleted ever.
:::


### Create a RxDB Database and Collection

Now we create an RxDB [database](./rx-database.md) and a [collection](./rx-collection.md). In this example the [memory storage](./rx-storage-memory.md), in production you would use a [persistend storage](./rx-storage.md) instead.

```ts
//> server.ts

import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';

// Create server-side RxDB instance
const db = await createRxDatabase({
  name: 'serverdb',
  storage: getRxStorageMemory()
});

// Add your collection schema
await db.addCollections({
  humans: {
    schema: {
      version: 0,
      primaryKey: 'passportId',
      type: 'object',
      properties: {
        passportId: { type: 'string', maxLength: 100 },
        firstName: { type: 'string' },
        lastName: { type: 'string' }
      },
      required: ['passportId', 'firstName', 'lastName']
    }
  }
});
```

### Sync the Collection with the MongoDB Server

Now we can start a [replication](./replication.md) that does a two-way replication between the RxDB Collection and the MongoDB Collection.

```ts
//> server.ts

import { replicateMongoDB } from 'rxdb/plugins/replication-mongodb';

const replicationState = replicateMongoDB({
  mongodb: {
    collectionName: 'my-collection',
    connection: 'mongodb://localhost:27017',
    databaseName: 'my-database'
  },
  collection: db.humans,
  replicationIdentifier: 'humans-mongodb-sync',
  pull: { batchSize: 50 },
  push: { batchSize: 50 },
  live: true
});

```

:::note You can do many things with the replication state
The `RxMongoDBReplicationState` which is returned from `replicateMongoDB()` allows you to run all functionality of the normal [RxReplicationState](./replication.md) like observing errors or doing start/stop operations.
:::


### Start a RxServer

Now that we have a RxDatabase and Collection that is replicated with MongoDB, we can spawn a [RxServer](./rx-server.md) on top of it. This server can then be used by client devices to connect.

```ts
//> server.ts

import { createRxServer } from 'rxdb-server/plugins/server';
import { RxServerAdapterExpress } from 'rxdb-server/plugins/adapter-express';

const server = await createRxServer({
  database: db,
  adapter: RxServerAdapterExpress,
  port: 8080,
  cors: '*'
});

const endpoint = server.addReplicationEndpoint({
    name: 'humans',
    collection: db.humans
});
console.log('Replication endpoint:', `http://localhost:8080/${endpoint.urlPath}`);

// do not forget to start the server!
await server.start();
```


### Sync a Client with the RxServer

On the client-side we create the exact same RxDatabase and collection and then replicate it with the replication endpoint of the RxServer.

```ts
//> client.ts

import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { replicateRxServer } from 'rxdb/plugins/replication-rxserver';

const db = await createRxDatabase({
  name: 'mydb-client',
  storage: getRxStorageDexie()
});

await db.addCollections({
  humans: {
    schema: {
      version: 0,  
      primaryKey: 'passportId',
      type: 'object',
      properties: {
        passportId: { type: 'string', maxLength: 100 },
        firstName: { type: 'string' },
        lastName: { type: 'string' }
      },
      required: ['passportId', 'firstName', 'lastName']
    }
  }
});

// Start replication to the RxServer endpoint printed by the server:
// e.g. http://localhost:8080/humans/0
const replicationState = replicateRxServer({
  replicationIdentifier: 'humans-rxserver',
  collection: db.humans,
  url: 'http://localhost:8080/humans/0',
  live: true,
  pull: { batchSize: 50 },
  push: { batchSize: 50 }
});

```


</Steps>


:::note Beta
The MongoDB Replication Plugin for RxDB is currently in **beta**.  
While it is production-capable, the API and internal behavior may change before the stable release. We recommend thoroughly testing your integration and reviewing the changelog when upgrading to newer versions.
:::


## Follow Up

- [Replication API Reference](./replication.md)
- [RxServer Documentation](./rx-server.md)
- Join our [Discord Forum](./chat) for questions and feedback
