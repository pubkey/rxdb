---
title: RxDB - Firestore Alternative to Sync with Your Own Backend
slug: firestore-alternative.html
description: Looking for a Firestore alternative? RxDB is a local-first, NoSQL database that syncs seamlessly with any backend, offers rich offline capabilities, advanced conflict resolution, and reduces vendor lock-in.
---

# RxDB - The Firestore Alternative That Can Sync with Your Own Backend

If you're seeking a **Firestore alternative**, you're likely looking for a way to:
- **Avoid vendor lock-in** while still enjoying real-time replication.
- **Reduce cloud usage costs** by reading data locally instead of constantly fetching from the server.
- **Customize** how you store, query, and secure your data.
- **Implement advanced conflict resolution** strategies beyond Firestore's last-write-wins approach.

Enter **RxDB** (Reactive Database) - a [local-first](./local-first-future.md), NoSQL database for JavaScript applications that can sync in real time with **any** backend of your choice. Whether you're tired of the limitations and fees associated with Firebase Cloud Firestore or simply need more flexibility, RxDB might be the Firestore alternative you've been searching for.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>


## What Makes RxDB a Great Firestore Alternative?

Firestore is convenient for many projects, but it does lock you into Google's ecosystem. Below are some of the key advantages you gain by choosing RxDB:

### 1. Fully Offline-First
RxDB runs directly in your client application ([browser](./browser-database.md), [Node.js](../nodejs-database.md), [Electron](../electron-database.md), [React Native](../react-native-database.md), etc.). Data is stored locally, so your application **remains fully functional even when offline**. When the device returns online, RxDB's flexible replication protocol synchronizes your local changes with any remote endpoint.

### 2. Freedom to Use Any Backend
Unlike Firestore, RxDB doesn't require a proprietary hosting service. You can:
- Host your data on your own server (Node.js, Go, Python, etc.).
- Use existing databases like [PostgreSQL](../replication-http.md), [CouchDB](../replication-couchdb.md), or [MongoDB with custom endpoints](../replication.md).
- Implement a [custom GraphQL](../replication-graphql.md) or [REST-based](../replication-http.md) API for syncing.

This **backend-agnostic** approach protects you from vendor lock-in. Your application's client-side data storage remains consistent; only your replication logic (or plugin) changes if you switch servers.

### 3. Advanced Conflict Resolution
Firestore enforces a [last-write-wins](https://stackoverflow.com/a/47781502/3443137) conflict resolution strategy. This might cause issues if multiple users or devices update the same data in complex ways.

RxDB lets you:
- Implement **custom conflict resolution** via [revisions](../transactions-conflicts-revisions.md#custom-conflict-handler).
- Store partial merges, track versions, or preserve multiple user edits.
- Fine-tune how your data merges to ensure consistency across distributed systems.

### 4. Reduced Cloud Costs
Firestore queries often count as billable reads. With RxDB, queries run **locally** against your local state - no repeated network calls or extra charges. You pay only for the data actually synced, not every read. For **read-heavy** apps, using RxDB as a Firestore alternative can significantly reduce costs.

### 5. No Limits on Query Features
Firestore's query engine is limited by certain constraints (e.g., no advanced joins, limited indexing). With RxDB:
- **NoSQL** data is stored locally, and you can define any indexes you need.
- Perform [complex queries](../rx-query.md), run [full-text search](../fulltext-search.md), or do aggregated transformations or even [vector search](./javascript-vector-database.md).
- Use [RxDB's reactivity](../rx-query.md#observe) to subscribe to query results in real time.

### 6. True Offline-Start Support
While Firestore does have offline caching, it often requires an online check at app initialization for authentication. RxDB is [truly offline-first](../offline-first.md); you can launch the app and write data even if the device never goes online initially. It's ready whenever the user is.

### 7. Cross-Platform: Any JavaScript Runtime
RxDB is designed to run in **any environment** that can execute JavaScript. Whether you’re building a web app in the browser, an [Electron](../electron-database.md) desktop application, a [React Native](../react-native-database.md) mobile app, or a command-line tool with [Node.js](../nodejs-database.md), RxDB’s storage layer is swappable to fit your runtime’s capabilities.
- In the **browser**, store data in [IndexedDB](../rx-storage-indexeddb.md) or [OPFS](../rx-storage-opfs.md).
- In [Node.js](../nodejs-database.md), use LevelDB or other supported storages.
- In [React Native](../react-native-database.md), pick from a range of adapters suited for mobile devices.
- In [Electron](../electron-database.md), rely on fast local storage with zero changes to your application code.


---

## How Does RxDB's Sync Work?

RxDB replication is powered by its own [Sync Engine](../replication.md). This simple yet robust protocol enables:
1. **Pull**: Fetch new or updated documents from the server.
2. **Push**: Send local changes back to the server.
3. **Live Real-Time**: Once you're caught up, you can opt for event-based streaming instead of continuous polling.

Code Example: Sync RxDB with a Custom Backend

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { replicateRxCollection } from 'rxdb/plugins/replication';

async function initDB() {
  const db = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage(),
    multiInstance: true,
    eventReduce: true
  });

  await db.addCollections({
    tasks: {
      schema: {
        title: 'task schema',
        version: 0,
        type: 'object',
        primaryKey: 'id',
        properties: {
          id: { type: 'string', maxLength: 100 },
          title: { type: 'string' },
          done: { type: 'boolean' }
        }
      }
    }
  });

  // Start a custom REST-based replication
  replicateRxCollection({
    collection: db.tasks,
    replicationIdentifier: 'my-tasks-rest-api',
    push: {
      handler: async (documents) => {
        // Send docs to your REST endpoint
        const res = await fetch('https://myapi.com/push', {
          method: 'POST',
          body: JSON.stringify({ docs: documents })
        });
        // Return conflicts if any
        return await res.json();
      }
    },
    pull: {
      handler: async (lastCheckpoint, batchSize) => {
        // Fetch from your REST endpoint
        const res = await fetch(`https://myapi.com/pull?checkpoint=${JSON.stringify(lastCheckpoint)}&limit=${batchSize}`);
        return await res.json();
      }
    },
    live: true // keep watching for changes
  });

  return db;
}
```


By swapping out the handler implementations or using an official plugin (e.g., [GraphQL](../replication-graphql.md), [CouchDB](../replication-couchdb.md), [Firestore replication](../replication-firestore.md), etc.), you can adapt to any backend or data source. RxDB thus becomes a flexible alternative to Firestore while maintaining [real-time capabilities](./realtime-database.md).



## Getting Started with RxDB as a Firestore Alternative

### Install RxDB:
```bash
npm install rxdb rxjs
```

### Create a Database:
```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
  name: 'mydb',
  storage: getRxStorageLocalstorage()
});
```

### Define Collections:
```ts
await db.addCollections({
  items: {
    schema: {
      title: 'items schema',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string', maxLength: 100 },
        text: { type: 'string' }
      }
    }
  }
});
```

### Sync
Use a [Replication Plugin](../replication.md) to connect with a custom backend or existing database.

For a Firestore-specific approach, RxDB [Firestore Replication](../replication-firestore.md) also exists if you want to combine local indexing and advanced queries with a Cloud Firestore backend. But if you really want to replace Firestore entirely - just point RxDB to your new backend.


### Example: Start a WebRTC P2P Replication

In addition to syncing with a central server, RxDB also supports pure peer-to-peer replication using [WebRTC](../replication-webrtc.md). This can be invaluable for scenarios where clients need to sync data directly without a master server.

```ts
import {
  replicateWebRTC,
  getConnectionHandlerSimplePeer
} from 'rxdb/plugins/replication-webrtc';

const replicationPool = await replicateWebRTC({
  collection: db.tasks,
  topic: 'my-p2p-room', // Clients with the same topic will sync with each other.
  connectionHandlerCreator: getConnectionHandlerSimplePeer({
    // Use your own or the official RxDB signaling server
    signalingServerUrl: 'wss://signaling.rxdb.info/',

    // Node.js requires a polyfill for WebRTC & WebSocket
    wrtc: require('node-datachannel/polyfill'),
    webSocketConstructor: require('ws').WebSocket
  }),
  pull: {}, // optional pull config
  push: {}  // optional push config
});

// The replicationPool manages all connected peers
replicationPool.error$.subscribe(err => {
  console.error('P2P Sync Error:', err);
});
```

This example sets up a live **P2P replication** where any new peers joining the same topic automatically sync local data with each other, eliminating the need for a dedicated central server for the actual data exchange.

## Is RxDB Right for Your Project?

- **You want offline-first**: If you need an offline-first app that starts offline, RxDB's local database approach and sync protocol excel at this.
- **Your project is read-heavy**: Reading from Firestore for every query can get expensive. With RxDB, reads are free and local; you only pay for writes or sync overhead.
- **You need advanced queries**: Firestore's query constraints may not suit complex data. With RxDB, you can define your own indexing logic or run arbitrary queries locally.
- **You want no vendor lock-in**: Easily transition from Firestore to your own server or another vendor - just change the replication layer.


## Follow Up

If you've been searching for a Firestore alternative that gives you the freedom to sync your data with any backend, offers robust offline-first capabilities, and supports truly customizable conflict resolution and queries, RxDB is worth exploring. You can adopt it seamlessly, ensure local reads, reduce costs, and stay in complete control of your data layer.

Ready to dive in? Check out the RxDB Quickstart Guide, join our Discord community, and experience how RxDB can be the perfect local-first, real-time database solution for your next project.

More resources:
- [RxDB Sync Engine](../replication.md)
- [Firestore Replication Plugin](../replication-firestore.md)
- [Custom Conflict Resolution](../transactions-conflicts-revisions.md)
- [RxDB GitHub Repository](/code/)
