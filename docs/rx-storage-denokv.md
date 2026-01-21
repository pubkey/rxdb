# DenoKV RxStorage

> With the DenoKV [RxStorage](./rx-storage.md) layer for [RxDB](https://rxdb.info), you can run a fully featured **NoSQL database** on top of the [DenoKV API](https://docs.deno.com/kv/manual).
This gives you the benefits and features of the RxDB JavaScript Database, combined with the global availability and distribution features of the DenoKV.

# RxDB Database on top of Deno Key Value Store

With the DenoKV [RxStorage](./rx-storage.md) layer for [RxDB](https://rxdb.info), you can run a fully featured **NoSQL database** on top of the [DenoKV API](https://docs.deno.com/kv/manual).
This gives you the benefits and features of the RxDB JavaScript Database, combined with the global availability and distribution features of the DenoKV.

  

## What is DenoKV

[DenoKV](https://deno.com/kv) is a strongly consistent key-value storage, globally replicated for low-latency reads across 35 worldwide regions via [Deno Deploy](https://deno.com/deploy).
When you release your Deno application on Deno Deploy, it will start a instance on each of the [35 worldwide regions](https://docs.deno.com/deploy/manual/regions). This edge deployment guarantees minimal latency when serving requests to end users devices around the world. DenoKV is a shared storage which shares its state across all instances.
But, because DenoKV is "only" a **Key-Value storage**, it only supports basic CRUD operations on datasets and indexes. Complex features like queries, encryption, compression or client-server replication, are missing. Using RxDB on top of DenoKV fills this gap and makes it easy to build realtime [offline-first](./offline-first.md) application on top of Deno backend.

## Use cases

Using RxDB-DenoKV instead of plain DenoKV, can have a wide range of benefits depending on your use case.

- **Reduce vendor lock-in**: RxDB has a swappable [storage layer](./rx-storage.md) which allows you to swap out the underlying storage of your database. If you ever decide to move away from DenoDeploy or Deno at all, you do not have to refactor your whole application and instead just **swap the storage plugin**. For example if you decide migrate to Node.js, you can use the [FoundationDB RxStorage](./rx-storage-foundationdb.md) and store your data there. DenoKV is also implemented on top of FoundationDB so you can get similar performance. Alternatively RxDB supports a wide range of [storage plugins](./rx-storage.md) you can decide from.

- **Add reactiveness**: DenoKV is a plain request-response datastore. While it supports observation of single rows by id, it does not allow to observe row-ranges or events. This makes it hard to impossible to build realtime applications with it because polling would be the only way to watch ranges of key-value pairs. With RxDB on top of DenoKV, changes to the database are **shared between DenoDeploy instances** so when you **observe a [query](./rx-query.md)** you can be sure that it is always up to date, no matter which instance has changed the document. Internally RxDB uses the [Deno BroadcastChannel API](https://docs.deno.com/deploy/api/runtime-broadcast-channel) to share events between instances.

- **Reuse Client and Server Code**: When you use RxDB on the server and on the client side, many parts of your code can be reused on both sides which decreases development time significantly.

- **Replicate from DenoKV to a local RxDB state**: Instead of running all operations against the global DenoKV, you can run a [realtime-replication](./replication.md) between a DenoKV-RxDatabase and a [locally stored dataset](./rx-storage-filesystem-node.md) or maybe even an [in-memory](./rx-storage-memory.md) stored one. This improves **query performance** and can **reduce your Deno Deploy cloud costs** because less operations run against the DenoKV, they only locally instead.

- **Replicate with other backends**: The RxDB [Sync Engine](./replication.md) is pretty simple and allows you to easily build a replication with any backend architecture. For example if you already have your data stored in a self-hosted MySQL server, you can use RxDB to do a realtime replication of that data into a DenoKV RxDatabase instance. RxDB also has many plugins for replication with backend/protocols like [GraphQL](./replication-graphql.md), [Websocket](./replication-websocket.md), [CouchDB](./replication-couchdb.md), [WebRTC](./replication-webrtc.md), [Firestore](./replication-firestore.md) and [NATS](./replication-nats.md).

  

## Using the DenoKV RxStorage

To use the DenoKV RxStorage with RxDB, you import the `getRxStorageDenoKV` function from the plugin and set it as storage when calling [createRxDatabase](./rx-database.md#creation)

```ts

import { createRxDatabase } from 'rxdb';
import { getRxStorageDenoKV } from 'rxdb/plugins/storage-denokv';

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageDenoKV({
      /**
       * Consistency level, either 'strong' or 'eventual'
       * (Optional) default='strong'
       */
      consistencyLevel: 'strong',
      /**
       * Path which is used in the first argument of Deno.openKv(settings.openKvPath)
       * (Optional) default=''
       */
      openKvPath: './foobar',
      /**
       * Some operations have to run in batches,
       * you can test different batch sizes to improve performance.
       * (Optional) default=100
       */
      batchSize: number
    })
});

```

On top of that [RxDatabase](./rx-database.md) you can then create your collections and run operations. Follow the [quickstart](./quickstart.md) to learn more about how to use RxDB.

## Using non-DenoKV storages in Deno

When you use other storages than the DenoKV storage inside of a Deno app, make sure you set `multiInstance: false` when creating the database. Also you should only run one process per Deno-Deploy instance. This ensures your events are not mixed up by the [BroadcastChannel](https://docs.deno.com/deploy/api/runtime-broadcast-channel) across instances which would lead to wrong behavior.

```ts
// DenoKV based database
const db = await createRxDatabase({
  name: 'denokvdatabase',
  storage: getRxStorageDenoKV(),
  /**
   * Use multiInstance: true so that the Deno Broadcast Channel
   * emits event across DenoDeploy instances
   * (true is also the default, so you can skip this setting)
   */
  multiInstance: true
});

// Non-DenoKV based database
const db = await createRxDatabase({
  name: 'denokvdatabase',
  storage: getRxStorageFilesystemNode(),
  /**
   * Use multiInstance: false so that it does not share events
   * across instances because the stored data is anyway not shared
   * between them.
   */
  multiInstance: false
});
```
