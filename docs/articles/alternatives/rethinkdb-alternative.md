# RxDB as a RethinkDB Alternative - Offline-First, Client-Side Reactive Database

> Compare RxDB and RethinkDB for realtime JavaScript applications. Learn why RxDB is a strong alternative with true offline-first support, client-side reactive queries, flexible backends, and active long-term maintenance.

# RxDB as a RethinkDB Alternative

<center>
    
        
    
</center>

RethinkDB introduced a compelling idea: instead of polling a database for changes, let the database push updates to your application the moment data changes. That capability, called changefeeds, attracted developers building realtime dashboards, chat applications, and collaborative tools. But the company behind RethinkDB shut down in 2016, and while the project continues as a community effort, the fundamental architecture of RethinkDB is a poor fit for modern offline-first applications. RethinkDB lives on the server and streams data to connected clients, which means your application stops working the moment a user loses network access.

This page explains what RethinkDB is, where it falls short for client-side and offline-first use cases, and why [RxDB](https://rxdb.info) covers the same reactive programming model while also working entirely on the client.

---

## What is RethinkDB?

RethinkDB is a distributed, document-oriented database built for realtime applications. It was founded in 2009 and launched publicly in 2012. Its defining feature is the **changefeed**: a persistent connection from a client to the database server that delivers change events (inserts, updates, deletes) as they happen, without the client needing to poll.

RethinkDB used its own query language called **ReQL**, which is chainable and embedded directly in the host language (JavaScript, Python, Ruby). A basic query with a changefeed looks like this:

```javascript
// RethinkDB: subscribe to all changes in the 'messages' table
r.table('messages')
 .changes()
 .run(connection, (err, cursor) => {
     cursor.each((err, change) => {
         console.log('Old value:', change.old_val);
         console.log('New value:', change.new_val);
     });
 });
```

The changefeed approach was genuinely novel. Before RethinkDB, building a realtime app typically required polling, WebSocket infrastructure built on top of a regular database, or a specialized pub/sub system layered on top of storage. RethinkDB baked this directly into the query layer.

### RethinkDB's Timeline

- **2009** - RethinkDB Inc. is founded. The project begins as a storage engine optimized for SSDs.
- **2012** - Public launch of RethinkDB 1.0 as a realtime document database with ReQL and changefeeds.
- **2013-2015** - Active development, growing community, and strong interest from teams building realtime applications.
- **October 2016** - RethinkDB Inc. shuts down. The founders publish a post-mortem explaining they failed to build a sustainable business model competing against MongoDB and cloud-managed databases.
- **February 2017** - The Linux Foundation (via the Cloud Native Computing Foundation) acquires RethinkDB and relicenses it under the Apache License 2.0. Community maintenance continues.
- **2018-present** - RethinkDB receives occasional bug fixes and maintenance releases from community contributors, but no significant new feature development. The project is functionally stable but not actively evolving.

The post-mortem published by the founders is candid: the market for databases rewarded operational simplicity and managed services, and RethinkDB was difficult to operate compared to hosted alternatives like Firebase or later Supabase. Teams already running MongoDB had little reason to migrate just for changefeeds, especially as MongoDB added its own change streams feature.

### What RethinkDB Does Well

For server-to-client data streaming in a connected environment, RethinkDB's architecture works cleanly. Its ReQL query language is expressive, changefeeds are deeply integrated into the query model, and its distributed architecture handles sharding and replication across nodes. For a dashboard that monitors sensor data or a chat application where all users are assumed to be online, RethinkDB solved a real problem elegantly.

---

## Where RethinkDB Falls Short

### No Offline Support

RethinkDB is a server-side database. Your application queries data by sending a network request to the RethinkDB cluster. If a user loses network connectivity, every read and write fails immediately.

This is not a configuration problem or a missing plugin. The architecture does not include client-side storage. There is no local cache that can serve queries when offline. All changefeeds disconnect when the network drops, and the driver raises an error. Any changes occurring while the client is offline are simply lost to that client; RethinkDB does not buffer per-client missed events.

The companion client library Horizon, which provided authentication and subscription helpers for RethinkDB, explicitly never implemented offline support. An [open GitHub issue from 2016](https://github.com/rethinkdb/horizon/issues/58) requested offline support, and the thread was closed without resolution when the company shut down.

For modern web and mobile applications, offline support is not an edge case. Users open applications on trains, in buildings with poor signal, and in situations where the network is intermittent. An application that throws errors when the network drops creates a poor experience.

### Changefeeds Do Not Survive Disconnection

When a changefeed client disconnects and reconnects, it does not automatically receive the changes that occurred while it was offline. The application must re-establish the connection, re-run the query, and perform its own reconciliation between the last known state and the current server state.

The server buffers changes in memory up to `changefeed_queue_size` (default: 100,000 events). If the client is offline long enough that the buffer fills, the server drops events and notifies the client with an error. At that point, the application has an incomplete picture of what changed and must perform a full re-read.

This architecture shifts significant complexity onto application code. Every feature that uses a changefeed needs reconnection logic, backfill logic, and buffer overflow handling.

### Server-Side Architecture Requires Infrastructure Management

Running RethinkDB in production means managing a cluster. Sharding, replication factor, and server topology are configured manually. Compared to managed cloud databases like Firebase or Supabase, RethinkDB places operational responsibility on the team running it.

This was one of the reasons cited in the founders' post-mortem for why RethinkDB lost to MongoDB in the market: developers preferred managed services where operational concerns are abstracted away. Since the company closed, there is no official support contract or managed hosting service for RethinkDB.

### Community Maintenance, Not Active Development

RethinkDB is maintained by volunteers. It receives bug fixes but not new features. Driver support for newer JavaScript runtimes (Deno, Bun) and modern ecosystem tooling is limited compared to actively developed databases.

For a new project starting in 2025 or 2026, building on a database with no commercial backer, no managed hosting, and no active feature roadmap carries risk. If a security vulnerability is discovered or an incompatibility with a new Node.js version appears, the fix depends on community volunteers with no obligation to respond.

### ReQL Is Not Portable

ReQL is specific to RethinkDB. Knowledge of ReQL does not transfer to other databases, and ReQL queries cannot be reused if you switch storage backends. Compared to MongoDB-style query syntax (which RxDB, among others, implements), ReQL has a much smaller community knowledge base.

---

## How RxDB Approaches the Same Problems

[RxDB](https://rxdb.info) is a local-first JavaScript database built for client-side environments: browsers, React Native, Electron, and Node.js. It shares the reactive programming goal of RethinkDB (data changes should automatically propagate to the UI) but implements it on the client side rather than relying on a persistent server connection.

### Reactive Queries Without a Server Connection

In RxDB, every query is observable. When you subscribe to a query result, you receive the current result set immediately, and the observable re-emits whenever the underlying data changes, whether that change came from a local write or from a replication event.

```typescript
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    messages: {
        schema: {
            title: 'message schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                text:      { type: 'string' },
                roomId:    { type: 'string' },
                createdAt: { type: 'number' }
            },
            required: ['id', 'text', 'roomId', 'createdAt'],
            indexes: ['roomId', 'createdAt']
        }
    }
});

// Subscribe to all messages in a specific room, sorted by creation time
db.messages.find({
    selector: { roomId: 'room-42' },
    sort: [{ createdAt: 'asc' }]
}).$.subscribe(messages => {
    renderChatUI(messages); // called immediately and on every change
});
```

This works entirely offline. The query runs against IndexedDB (or any other configured storage), not against a remote server. There is no connection to establish and no disconnection to handle.

RxDB uses the [event-reduce](https://github.com/pubkey/event-reduce) algorithm to make reactive updates efficient. When a document write occurs, RxDB checks whether the existing query result can be updated by applying the change directly without re-executing the full query. This means reactive UI updates remain fast even in write-heavy workloads.

### True Offline-First Operation

When a user opens an RxDB application without network access, every feature works normally. Writes go to local storage. Queries return from local storage. The UI renders without any loading spinner or error state.

When network connectivity becomes available, RxDB's replication plugins synchronize local changes with the remote backend in the background. When the user goes offline again, the local database continues working. This is the [offline-first architecture](../../offline-first.md) pattern.

<center>
    
</center>

RethinkDB's architecture cannot deliver this. Data lives on the server, so offline means no data. There is no path to genuine offline-first operation without adding a separate local storage layer and writing the reconciliation logic yourself, at which point RethinkDB is just a backend, not a realtime client database.

### Flexible Storage Backends

RxDB has a pluggable storage layer. The same application code works with different storage engines depending on the environment:

| Environment | Storage Option |
|---|---|
| Browser (standard) | [IndexedDB](../../rx-storage-indexeddb.md) |
| Browser (high-throughput) | [OPFS (Origin Private File System)](../../rx-storage-opfs.md) |
| React Native / Expo | [SQLite via expo-sqlite or op-sqlite](../../rx-storage-sqlite.md) |
| Node.js / Electron | [SQLite (better-sqlite3)](../../rx-storage-sqlite.md) |
| Multi-tab browsers | [SharedWorker](../../rx-storage-shared-worker.md) |
| Testing / CI | [Memory](../../rx-storage-memory.md) |

Switching storage requires changing one parameter when creating the database:

```typescript
import { getRxStorageOpfs } from 'rxdb/plugins/storage-opfs';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageOpfs() // use OPFS for better browser performance
});
```

### Flexible Replication to Any Backend

RethinkDB is both the storage layer and the realtime transport. RxDB separates these concerns. RxDB stores data locally, and replication to a backend is a separate, configurable plugin.

The [HTTP replication plugin](../../replication-http.md) works with any REST or HTTP endpoint. The [GraphQL replication plugin](../../replication-graphql.md) connects to GraphQL APIs including AWS AppSync. The [WebSocket replication plugin](../../replication-websocket.md) provides low-latency push from a server. The [CouchDB replication plugin](../../replication-couchdb.md) uses CouchDB's multi-master protocol. You can also implement a [custom replication handler](../../replication.md) for any proprietary API.

```typescript
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = await replicateRxCollection({
    collection: db.messages,
    replicationIdentifier: 'messages-http-v1',
    pull: {
        handler: async (checkpoint, batchSize) => {
            const url =
                `/api/messages/changes?since=${checkpoint?.updatedAt ?? 0}` +
                `&limit=${batchSize}`;
            const response = await fetch(url);
            const data = await response.json();
            return {
                documents: data.documents,
                checkpoint: data.checkpoint
            };
        }
    },
    push: {
        handler: async (rows) => {
            const response = await fetch('/api/messages/push', {
                method: 'POST',
                body: JSON.stringify(rows),
                headers: { 'Content-Type': 'application/json' }
            });
            return response.json(); // returns conflicting docs or []
        }
    },
    live: true,
    retryTime: 5000
});

// Observable replication state
replicationState.active$.subscribe(active => console.log('Syncing:', active));
replicationState.error$.subscribe(err => console.error('Sync error:', err));
```

The replication state is fully observable. You know exactly when replication is active, when it errors, and what documents were sent or received. Nothing is hidden.

### Multi-Tab Support in the Browser

RethinkDB is a server process; it does not have a concept of browser tabs. On the client side, running multiple browser tabs with independent in-memory state is a common source of consistency problems.

RxDB solves this with the [SharedWorker storage](../../rx-storage-shared-worker.md). All tabs share a single database instance running in a SharedWorker, so a write from any tab is immediately reflected in reactive queries in all other tabs:

```typescript
import { getRxStorageSharedWorker } from 'rxdb/plugins/storage-shared-worker';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageSharedWorker({
        workerInput: new SharedWorker(
            new URL('rxdb/plugins/storage-shared-worker/worker.js', import.meta.url),
            { type: 'module' }
        )
    })
});
```

For tab coordination in scenarios that require exactly one tab to do background work (like running replication), RxDB includes a [leader election plugin](../../leader-election.md). One tab is elected leader and performs background tasks, while others wait. If the leader tab closes, another takes over automatically.

```typescript
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { addRxPlugin } from 'rxdb/plugins/core';

addRxPlugin(RxDBLeaderElectionPlugin);

// Wait until this tab is the leader before starting replication
await db.waitForLeadership();
startReplication(db);
```

### Observable Change Events

RxDB exposes a [changestream](../../rx-database.md) on both the database and collection level. You can subscribe to all document changes, similar to RethinkDB's table changefeeds, but the events come from the local database rather than a server:

```typescript
// Subscribe to all changes in the messages collection
db.messages.$.subscribe(changeEvent => {
    console.log('Operation:', changeEvent.operation); // INSERT, UPDATE, DELETE
    console.log('Document ID:', changeEvent.documentId);
    console.log('Document data:', changeEvent.documentData);
});

// Subscribe to changes on a specific document
const doc = await db.messages.findOne('message-001').exec();
doc.$.subscribe(updatedDoc => {
    console.log('Document updated:', updatedDoc?.text);
});
```

This is the client-side equivalent of a RethinkDB point changefeed. The difference is that these events originate locally, so they fire even when the user is offline.

### Conflict Resolution

In a realtime multi-user system, two users can edit the same document concurrently. RethinkDB's conflict model relied on the server having a single authoritative view, which worked because every write went through the server immediately.

RxDB operates on a local-first model: users can edit locally while offline, and those edits sync when connectivity returns. If two clients edited the same document while disconnected, both versions must be reconciled when they sync.

RxDB handles this with a configurable [conflict handler](../../replication.md):

```typescript
await db.addCollections({
    messages: {
        schema: messageSchema,
        conflictHandler: async ({ newDocumentState, realMasterState }) => {
            // Keep whichever version was updated more recently
            if (newDocumentState.updatedAt >= realMasterState.updatedAt) {
                return { documentData: newDocumentState };
            }
            return { documentData: realMasterState };
        }
    }
});
```

For collaborative editing scenarios where merge semantics matter (text that two users edited in different places), RxDB supports [CRDT-based conflict resolution](../../crdt.md). CRDTs merge concurrent edits deterministically without requiring a central authority:

```typescript
import { getCRDTSchemaPart, RxDBcrdtPlugin } from 'rxdb/plugins/crdt';
import { addRxPlugin } from 'rxdb/plugins/core';

addRxPlugin(RxDBcrdtPlugin);

const messageSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:     { type: 'string', maxLength: 100 },
        text:   { type: 'string' },
        roomId: { type: 'string' },
        crdts:  getCRDTSchemaPart()
    },
    crdt: { field: 'crdts' }
};
```

### Schema Validation and TypeScript Support

RxDB validates every document against a [JSON Schema](../../rx-schema.md) before writing it to storage. Documents that do not match the schema are rejected at the database level, preventing corrupted data from entering the local store.

```typescript
try {
    await db.messages.insert({
        id: 'msg-001',
        // 'text' field is required but missing
        roomId: 'room-42',
        createdAt: Date.now()
    });
} catch (err) {
    console.error(err); // Schema validation error: missing 'text'
}
```

RxDB generates TypeScript types automatically from the schema, giving you IDE autocompletion and compile-time type safety for all collection operations.

### Schema Migration

As an application evolves, data models change. RxDB has a built-in [schema migration system](../../migration-schema.md). When the local database opens with a higher schema version than the stored data, RxDB runs the migration automatically:

```typescript
await db.addCollections({
    messages: {
        schema: messageSchemaV2, // version: 1
        migrationStrategies: {
            1: (oldDoc) => {
                // Migrate from version 0: add a 'roomId' field with a default
                return {
                    ...oldDoc,
                    roomId: oldDoc.roomId ?? 'general'
                };
            }
        }
    }
});
```

Migrations run locally on each client's data independently. They do not require a coordinated backend deployment.

### Encryption at Rest

RxDB includes a built-in [encryption plugin](../../encryption.md) that encrypts individual document fields before writing them to the local storage. This is useful for applications that store sensitive user data locally:

```typescript
import {
    wrappedKeyEncryptionCryptoJsStorage
} from 'rxdb/plugins/encryption-crypto-js';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'myapp',
    storage: wrappedKeyEncryptionCryptoJsStorage({
        storage: getRxStorageIndexedDB()
    }),
    password: 'your-encryption-passphrase'
});

const schema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:      { type: 'string', maxLength: 100 },
        text:    { type: 'string' },
        private: { type: 'string' }
    },
    encrypted: ['private'] // stored as ciphertext in IndexedDB
};
```

---

## Getting Started with RxDB

Install RxDB and RxJS:

```bash
npm install rxdb rxjs
```

Create a database, insert some documents, and subscribe to reactive queries:

```typescript
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

addRxPlugin(RxDBDevModePlugin);

const db = await createRxDatabase({
    name: 'chatapp',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    messages: {
        schema: {
            title: 'message schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                text:      { type: 'string' },
                roomId:    { type: 'string' },
                createdAt: { type: 'number' }
            },
            required: ['id', 'text', 'roomId', 'createdAt'],
            indexes: ['roomId', 'createdAt']
        }
    }
});

// Write a message
await db.messages.insert({
    id: 'msg-001',
    text: 'Hello from RxDB!',
    roomId: 'room-42',
    createdAt: Date.now()
});

// Reactive query: always reflects the current state
db.messages.find({
    selector: { roomId: 'room-42' },
    sort: [{ createdAt: 'asc' }]
}).$.subscribe(messages => {
    console.log('Current messages:', messages.map(m => m.text));
});
```

All of this works offline. Connect a replication plugin when you need server sync.

---

## Comparison Summary

| Aspect | RethinkDB | RxDB |
|---|---|---|
| **Where it runs** | Server-side cluster | Client-side (browser, mobile, desktop) |
| **Offline support** | None (network required) | Full offline-first operation |
| **Reactive queries** | Server pushes changefeed events | Client-side observable queries via RxJS |
| **Data location** | Remote server only | Local storage (IndexedDB, OPFS, SQLite) |
| **Disconnection handling** | Changefeed drops; missed events are lost | Local database continues working |
| **Query language** | ReQL (RethinkDB-specific) | Mango (MongoDB-compatible JSON) |
| **Backend dependency** | Must run a RethinkDB cluster | Any backend or no backend |
| **Conflict resolution** | Server-authoritative (last write wins) | Configurable client-side handler or CRDTs |
| **Multi-tab support** | N/A (server concept) | SharedWorker (shared state across tabs) |
| **Schema validation** | None | JSON Schema enforced on every write |
| **Schema migration** | Manual | Built-in versioned migration strategies |
| **Encryption at rest** | None built-in | Built-in field-level encryption plugin |
| **TypeScript** | Community-maintained typings | Auto-generated from schema |
| **Current status** | Community-maintained since 2017 | Actively maintained since 2016 |
| **Commercial support** | None (company closed 2016) | Premium plugins and active development |
| **License** | Apache 2.0 | Apache 2.0 |

---

## FAQ

<details>
<summary>Can RxDB replicate to a RethinkDB backend?</summary>

RxDB does not have a native RethinkDB replication plugin. If you run RethinkDB on the server, you can build a custom HTTP or WebSocket API in front of it and use RxDB's [custom replication](../../replication.md) or [WebSocket replication](../../replication-websocket.md) plugin to sync. RxDB's replication protocol only requires that the backend can serve document changes since a given checkpoint and accept pushed documents. Any server-side language with a RethinkDB driver can expose this interface.

</details>

<details>
<summary>How does RxDB's reactivity compare to RethinkDB changefeeds?</summary>

RethinkDB changefeeds push individual change events (old value and new value) from the server to the client. The client receives raw events and must maintain its own state from them.

RxDB reactive queries emit the complete, current result set after every relevant change. When a query matches ten documents and one is updated, the subscriber receives all ten current documents. This maps directly to UI rendering: you always have the full state, not a stream of deltas to apply. The [event-reduce](https://github.com/pubkey/event-reduce) algorithm makes this efficient by computing result set updates from change events without re-running the full query against storage.

</details>

<details>
<summary>Is RxDB suitable for realtime collaborative applications?</summary>

Yes. RxDB is used in production for collaborative applications. The local database ensures the UI is always responsive. Replication keeps all clients synchronized. For concurrent edits by multiple users on the same document, RxDB supports both custom [conflict handlers](../../replication.md) and [CRDT-based merging](../../crdt.md). The SharedWorker storage mode handles the case of multiple browser tabs in the same session sharing state without duplication.

</details>

<details>
<summary>How does RxDB handle reconnection after the user comes back online?</summary>

RxDB's replication plugins run continuously with automatic retry. When the network is unavailable, the pull and push handlers fail, and RxDB waits for `retryTime` milliseconds before trying again. When the network returns, replication resumes automatically from the last successful checkpoint. No changes are lost: writes made while offline are stored locally and pushed to the server as soon as the connection is re-established.

</details>

<details>
<summary>Does RxDB need a login or user account to work?</summary>

No. The local database works without any authentication. Only the replication handlers need credentials, and those are plain async functions where you include whatever headers or tokens your backend requires. If authentication expires while the app is running, replication pauses, and you can re-supply credentials and resume without restarting the database.

</details>
