# RxDB as a CouchDB Alternative - Client-Side, Offline-First, Reactive Queries

> Compare RxDB and CouchDB for local-first JavaScript applications. Learn why CouchDB is a server-side database, how RxDB provides client-side offline-first storage with reactive queries, and how the two can work together through the RxDB CouchDB replication plugin.

# RxDB as a CouchDB Alternative

<center>
    
        
    
</center>

Apache CouchDB is a well-known, server-side document database recognized for its multi-master replication protocol and HTTP-based API. Many developers searching for a "CouchDB alternative" are not looking for a different server-side database. They want something that runs on the client, inside a browser or a mobile application, with offline support and reactive queries. That is what [RxDB](https://rxdb.info) is designed to do.

This page explains what CouchDB is, what its limitations are when it comes to client-side application development, and how RxDB solves those problems while optionally using CouchDB as a backend.

---

## What is CouchDB?

  

Apache CouchDB is a server-side, document-oriented NoSQL database that has been in active development since 2005. It was created by Damien Katz, who published the initial design in a blog post in 2005 and open-sourced the code in 2008. The Apache Software Foundation adopted CouchDB as a top-level project in 2008.

CouchDB stores data as JSON documents inside named databases. It exposes a full HTTP REST API, meaning every operation (reads, writes, queries, replication) is performed via standard HTTP requests. Documents have a revision field (`_rev`) that tracks changes and forms the basis of its conflict detection system.

The most widely known feature of CouchDB is its **Couch Replication Protocol**: a bidirectional, incremental sync protocol that allows any number of CouchDB servers to replicate with each other, including over unreliable networks. This "multi-master" replication is designed to handle cases where nodes go offline and come back later, making it a natural fit for distributed applications.

CouchDB also provides a **changes feed** (`/_changes` endpoint) that streams a log of all document modifications. This is used by replication clients and by real-time notification systems.

### A Brief Timeline

- **2005** - Damien Katz begins development and publishes initial concepts
- **2008** - CouchDB open-sourced; joins the Apache Software Foundation
- **2010** - Version 1.0 released; widespread adoption begins
- **2012** - Cloudant (a hosted CouchDB service) grows significantly; IBM later acquires it in 2014
- **2013** - BigCouch clustering code merged into Apache CouchDB 2.0 development
- **2016** - CouchDB 2.0 released with native clustering support
- **2017** - CouchDB 2.1 released with Mango query improvements
- **2022** - CouchDB 3.x branch brings performance improvements and security updates
- **2025** - CouchDB 3.5.1 released; the project remains maintained under the Apache Software Foundation

CouchDB has a stable, dedicated user base, particularly in humanitarian and academic contexts where reliable data synchronization across disconnected field locations is critical. It is not a fast-growing technology in terms of raw market share, but it is not abandoned either. It occupies a specific niche: server-side distributed document storage with built-in replication.

### How CouchDB Replication Works

CouchDB replication is a sequence-based protocol. Each database maintains a sequence counter that increments with every document change. When two CouchDB instances replicate, the replication process reads the source's changes feed since the last known sequence, fetches each changed document, and writes it to the target. Conflicts are detected via the revision tree (`_rev` field) and stored as alternate branches. Applications must read and resolve conflicts explicitly.

The protocol was designed for server-to-server replication where both sides are CouchDB instances. This design choice has significant implications for client-side use.

---

## Why CouchDB Is Not a Client-Side Database

The most fundamental limitation of CouchDB for modern web and mobile development is that it is a **server process**. It cannot run inside a browser tab or natively inside a React Native application. To build an offline-first app using CouchDB, developers historically paired it with PouchDB, a JavaScript library that implements the Couch Replication Protocol in the browser.

This pairing introduced its own set of problems, described in detail below.

### The PouchDB Overhead Problem

PouchDB was created to bring the CouchDB protocol to the browser. To stay compatible with CouchDB replication, PouchDB must store the **entire revision tree** of every document on the client. In CouchDB, a document's revision history is a tree structure that records every version ever written, including conflicting branches. This tree is required for the protocol to detect which revisions the other side already has.

Storing the revision tree for every document causes two problems:

1. **Storage bloat**: The client stores far more data than the current document state requires.
2. **Slow queries**: IndexedDB queries must navigate around the revision storage layout, which is optimized for replication correctness, not for read performance.

RxDB was originally built on top of PouchDB. As the project grew, these limitations became clear. In [RxDB version 10.0.0](../../releases/10.0.0.md), the storage layer was fully abstracted away. RxDB no longer uses PouchDB internally. Instead, it uses a pluggable [RxStorage](../../rx-storage.md) interface that can be backed by IndexedDB, OPFS, SQLite, or any other storage engine, without the revision-tree overhead required by the CouchDB protocol.

### No Reactive Query System

CouchDB provides a changes feed at the server level, but there is no client-side reactive query system built around CouchDB. When a document changes on the server, the client receives a change event from the changes feed. It is up to the application to determine which queries are affected, re-run them, and update the UI.

Implementing this correctly requires significant custom code. Race conditions between incoming change events and in-flight queries are common sources of bugs.

### MapReduce Queries Are Predefined

CouchDB uses design documents with MapReduce views for indexed queries. These views must be defined in advance and stored on the server. Ad-hoc queries against large datasets are slow because they run against the raw document storage without an index. The Mango query interface (added in CouchDB 2.x) provides a more familiar query syntax, but it still requires explicit index creation and has significant limitations compared to the MongoDB-style query language supported by RxDB.

### No JavaScript Query Language on the Client

When using CouchDB from a browser, queries go over the network to the server. There is no local query engine. For every read, the browser sends an HTTP request and waits for a response. This means:

- Reads are subject to network latency
- The application breaks entirely when the user is offline
- There is no way to cache query results reactively

---

## How RxDB Solves These Problems

[RxDB](https://rxdb.info) is a local-first JavaScript database designed to run on the client. All reads and writes go to local storage. Network replication happens in the background. RxDB includes a [CouchDB replication plugin](../../replication-couchdb.md) so you can use CouchDB as a backend while gaining all the client-side benefits of RxDB.

### Local-First Architecture

With RxDB, the client has a full database instance. Every query runs against local storage, so reads are fast and the application works offline by design:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    todos: {
        schema: {
            title: 'todo schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                title:     { type: 'string' },
                done:      { type: 'boolean' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'title', 'done', 'updatedAt'],
            indexes: ['updatedAt']
        }
    }
});

// This runs against local IndexedDB. No network required.
const openTodos = await db.todos.find({
    selector: { done: false },
    sort: [{ updatedAt: 'desc' }]
}).exec();
```

Writes made while offline are stored locally and automatically pushed to CouchDB when the connection returns.

### Replication with CouchDB

RxDB provides a dedicated [CouchDB replication plugin](../../replication-couchdb.md). This plugin does **not** use the official CouchDB replication protocol. Instead, it uses RxDB's own sync engine on top of the CouchDB HTTP API. This design choice avoids the revision-tree overhead while still replicating correctly.

```ts
import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';

const replicationState = replicateCouchDB({
    replicationIdentifier: 'my-couchdb-replication',
    collection: db.todos,
    url: 'http://example.com/db/todos',
    live: true,
    pull: {
        batchSize: 60
    },
    push: {
        batchSize: 60
    }
});

// Wait for the first sync to complete
await replicationState.awaitInitialReplication();

// Monitor errors
replicationState.error$.subscribe(err => {
    console.error('Replication error:', err);
});
```

When authentication is required, you can provide a custom `fetch` method:

```ts
import {
    replicateCouchDB,
    getFetchWithCouchDBAuthorization
} from 'rxdb/plugins/replication-couchdb';

const replicationState = replicateCouchDB({
    replicationIdentifier: 'my-couchdb-replication',
    collection: db.todos,
    url: 'http://example.com/db/todos',
    fetch: getFetchWithCouchDBAuthorization('myUsername', 'myPassword'),
    live: true,
    pull: { batchSize: 60 },
    push: { batchSize: 60 }
});
```

The token can also be updated dynamically while the replication is running:

```ts
replicationState.fetch = getFetchWithCouchDBAuthorization(
    'myUsername',
    'newPassword'
);
```

### Benefits Over the Traditional CouchDB + PouchDB Approach

| Aspect | CouchDB + PouchDB | RxDB + CouchDB |
|---|---|---|
| **Revision tree storage** | Full tree stored on client | Only current revision stored |
| **Initial replication speed** | Slow (one HTTP request per document) | Fast (batched pull) |
| **Storage engines** | IndexedDB only (in browser) | IndexedDB, OPFS, SQLite, Memory |
| **Query language** | CouchDB map/reduce or Mango | MongoDB-style with indexes |
| **Reactive queries** | Not built-in | RxJS Observables, auto-updating |
| **TypeScript support** | Limited | Full inference from JSON Schema |
| **Multi-tab support** | Not built-in | SharedWorker storage available |

### Reactive Observable Queries

One of RxDB's most significant advantages over CouchDB (and PouchDB) is its reactive query system. Every query can be subscribed to as an RxJS Observable. The query result re-emits automatically whenever the matching documents change, whether the change came from a local write or from a remote sync:

```ts
// Subscribe to open todos, sorted by most recently updated
db.todos.find({
    selector: { done: false },
    sort: [{ updatedAt: 'desc' }]
}).$.subscribe(todos => {
    console.log('Open todos:', todos.length);
    renderTodoList(todos);
});
```

When the CouchDB replication plugin pulls a new document from the server, the observable emits the updated results automatically. No polling, no manual re-fetch, no separate state management.

RxDB uses the [event-reduce algorithm](https://github.com/pubkey/event-reduce) to determine whether a document change affects the current query result. For most changes, the updated result can be computed without re-running the query against storage. This makes reactive queries fast even when many subscriptions are active.

You can also subscribe to individual documents or specific document fields:

```ts
const doc = await db.todos.findOne('todo-001').exec();

// React to a single field changing
doc.get$('title').subscribe(newTitle => {
    console.log('Title updated:', newTitle);
});

// Watch the raw change stream of the collection
db.todos.$.subscribe(changeEvent => {
    console.log(changeEvent.operation, changeEvent.documentId);
});
```

### Pluggable Storage Backends

Unlike PouchDB, which is tied to IndexedDB in the browser, RxDB separates the query engine from the storage layer. You choose the storage engine based on platform and performance requirements:

| Environment | Storage Option |
|---|---|
| Browser (general use) | [IndexedDB](../../rx-storage-indexeddb.md) |
| Browser (write-heavy workloads) | [OPFS (Origin Private File System)](../../rx-storage-opfs.md) |
| React Native / Expo | [SQLite via expo-sqlite or op-sqlite](../../rx-storage-sqlite.md) |
| Node.js / Electron | [SQLite (better-sqlite3)](../../rx-storage-sqlite.md) |
| Multiple browser tabs | [SharedWorker](../../rx-storage-shared-worker.md) |
| Tests | [Memory](../../rx-storage-memory.md) |

Switching storage is a one-line change in database creation. The rest of the application (queries, replication, schema) remains unchanged:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
// Swap this import to change storage
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';
// import { getRxStorageOPFS } from 'rxdb/plugins/storage-opfs';
// import { getRxStorageSQLite } from 'rxdb/plugins/storage-sqlite';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});
```

The [OPFS storage](../../rx-storage-opfs.md) option is particularly useful for write-heavy applications. OPFS gives browsers direct access to a private file system, bypassing the IndexedDB transaction overhead. Benchmarks show OPFS significantly outperforming IndexedDB for bulk write operations.

### Multi-Tab Consistency

When a user opens a web application in multiple browser tabs, each tab has its own JavaScript process. Without coordination, writes from one tab would not appear reactively in other tabs.

RxDB solves this with the [SharedWorker storage](../../rx-storage-shared-worker.md):

```ts
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

All tabs share a single database instance running in the SharedWorker. A write from tab A appears in tab B's reactive queries immediately, with no additional coordination code.

### Conflict Resolution

CouchDB stores conflicting revisions as alternate branches in the document revision tree. Resolving conflicts requires fetching the conflicting revisions, comparing them, and posting the winner as the current revision. This process is explicit and manual.

RxDB handles conflicts during replication using a configurable conflict handler on each collection:

```ts
await db.addCollections({
    todos: {
        schema: todoSchema,
        conflictHandler: async (input) => {
            const { newDocumentState, realMasterState } = input;

            // Last-write-wins by timestamp
            if (newDocumentState.updatedAt >= realMasterState.updatedAt) {
                return { documentData: newDocumentState };
            }
            return { documentData: realMasterState };
        }
    }
});
```

For collaborative applications where changes from multiple users should be merged rather than discarded, RxDB supports [CRDTs (Conflict-free Replicated Data Types)](../../crdt.md):

```ts
import { getCRDTSchemaPart, RxDBcrdtPlugin } from 'rxdb/plugins/crdt';
import { addRxPlugin } from 'rxdb/plugins/core';

addRxPlugin(RxDBcrdtPlugin);

const todoSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:    { type: 'string', maxLength: 100 },
        title: { type: 'string' },
        done:  { type: 'boolean' },
        crdts: getCRDTSchemaPart()
    },
    crdt: { field: 'crdts' }
};
```

With CRDTs, concurrent writes are merged deterministically when clients sync. The revision-tree approach that CouchDB uses requires manual conflict resolution code on every read path where conflicts can occur.

### Schema Validation and TypeScript

RxDB validates every document against a [JSON Schema](../../rx-schema.md) before writing it to storage. Invalid documents are rejected before they reach storage:

```ts
try {
    await db.todos.insert({
        id: 'todo-002',
        // 'title' is required but missing
        done: false,
        updatedAt: Date.now()
    });
} catch (err) {
    // Rejected: document does not match schema
    console.error(err.message);
}
```

RxDB also infers TypeScript types from the schema automatically, giving compile-time type checking and IDE autocompletion for all collection operations:

```ts
// TypeScript knows the shape of this document
const todo = await db.todos.findOne('todo-001').exec();
if (todo) {
    console.log(todo.title); // string
    console.log(todo.done);  // boolean
}
```

CouchDB has no client-side schema validation. Documents are freeform JSON. Enforcing a schema requires either a middleware layer on the server or manual validation code in the client application.

### Schema Migrations

When your data model changes, RxDB's [migration system](../../migration-schema.md) handles the transition automatically. You increment the version number and provide a migration strategy:

```ts
await db.addCollections({
    todos: {
        schema: {
            title: 'todo schema',
            version: 1, // incremented from 0
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:       { type: 'string', maxLength: 100 },
                title:    { type: 'string' },
                done:     { type: 'boolean' },
                priority: { type: 'number' }, // new field
                updatedAt: { type: 'number' }
            },
            required: ['id', 'title', 'done', 'priority', 'updatedAt']
        },
        migrationStrategies: {
            1: (oldDoc) => {
                // Set a default priority for all existing documents
                oldDoc.priority = 0;
                return oldDoc;
            }
        }
    }
});
```

When the database opens with the new schema version, RxDB migrates all existing local documents before the application starts. CouchDB has no client-side migration system; schema changes must be handled manually through update scripts.

### Encryption at Rest

RxDB includes a [built-in encryption plugin](../../encryption.md) for encrypting document fields before writing them to local storage:

```ts
import {
    wrappedKeyEncryptionCryptoJsStorage
} from 'rxdb/plugins/encryption-crypto-js';

const db = await createRxDatabase({
    name: 'myapp',
    storage: wrappedKeyEncryptionCryptoJsStorage({
        storage: getRxStorageIndexedDB()
    }),
    password: 'user-specific-passphrase'
});

const schema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:            { type: 'string', maxLength: 100 },
        sensitiveNote: { type: 'string' }
    },
    encrypted: ['sensitiveNote']
};
```

Fields marked as `encrypted` are stored as ciphertext in IndexedDB. Without the passphrase, the raw storage is unreadable.

---

## RxDB and CouchDB Together

RxDB and CouchDB are not mutually exclusive. CouchDB is a capable server-side database with robust replication features. RxDB is a capable client-side database with a reactive query system. They work well as a stack:

- **CouchDB** runs on the server: stores documents, exposes the changes feed, handles server-side replication between nodes
- **RxDB** runs on the client: stores documents locally, queries without network, syncs with CouchDB in the background

```
[User Device]
   RxDB (IndexedDB / SQLite)
      |
      | CouchDB Replication Plugin
      | (HTTP pull/push + changes feed)
      |
[Your Server]
   CouchDB
      |
      | CouchDB-to-CouchDB replication (optional)
      |
[Other Servers or Clients]
```

This architecture gives you offline-capable clients with reactive queries and the battle-tested CouchDB replication protocol at the server tier.

You can also switch away from CouchDB later without changing any application code. RxDB supports [HTTP replication](../../replication-http.md), [GraphQL replication](../../replication-graphql.md), [Supabase replication](../../replication-supabase.md), [WebSocket replication](../../replication-websocket.md), and [WebRTC peer-to-peer replication](../../replication-webrtc.md). The application logic that works against the local RxDB collection does not change when the backend changes.

---

## CouchDB Connection Limit in Browsers

One practical limitation of using CouchDB directly from a browser (via PouchDB or the CouchDB replication plugin) is that CouchDB uses HTTP long polling for its changes feed. Browsers limit the number of concurrent HTTP/1.1 connections to the same host to six. This means a maximum of six active CouchDB sync connections per tab.

If your application needs more than six synchronized collections, solutions include:

- Using a single CouchDB database with a `type` field per document to combine collections
- Using multiple subdomains with at most six active connections each
- Placing a proxy like nginx or HAProxy in front of CouchDB and enabling HTTP/2, which multiplexes requests over a single connection

Example nginx configuration:

```
server {
    http2 on;
    location /db {
        rewrite /db/(.*) /$1 break;
        proxy_pass http://127.0.0.1:5984;
        proxy_redirect off;
        proxy_buffering off;
        proxy_set_header Host            $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded;
        proxy_set_header Connection "keep_alive";
    }
}
```

---

## Comparison Summary

| Aspect | CouchDB (alone) | RxDB + CouchDB |
|---|---|---|
| **Runs on client** | No (server only) | Yes (browser, React Native, Electron) |
| **Offline-first** | No (server goes offline, clients break) | Yes (all reads/writes local) |
| **Reactive queries** | Not built-in | RxJS Observables, auto-updating |
| **Query language** | MapReduce views or Mango | MongoDB-style with indexes |
| **Storage on client** | IndexedDB via PouchDB (with revision tree overhead) | IndexedDB, OPFS, SQLite (no revision tree) |
| **Initial sync speed** | Slow (one request per document) | Fast (batched) |
| **Multi-tab consistency** | Not built-in | SharedWorker storage available |
| **Conflict handling** | Revision tree branches (manual resolution) | Configurable handler or CRDT plugin |
| **Schema validation** | None client-side | JSON Schema enforced on every write |
| **TypeScript support** | None built-in | Inferred types from JSON Schema |
| **Encryption at rest** | None client-side | Per-field encryption plugin |
| **Schema migrations** | Manual | Automatic via versioned strategies |
| **Backend flexibility** | CouchDB protocol only | CouchDB, Supabase, GraphQL, HTTP, WebRTC |

---

## FAQ

<details>
<summary>Does RxDB replace CouchDB?</summary>

No. RxDB is a client-side database. It runs in the browser or on a mobile device. CouchDB is a server-side database. They serve different roles. RxDB can sync with CouchDB using the [CouchDB replication plugin](../../replication-couchdb.md), making them complementary parts of an offline-first application stack.

</details>

<details>
<summary>Is using RxDB with CouchDB faster than PouchDB with CouchDB?</summary>

For initial replication and local queries, yes. PouchDB must store the full document revision tree on the client to stay compatible with the CouchDB replication protocol. RxDB's CouchDB plugin uses a different sync approach that only stores the current document version, reducing storage usage and speeding up reads and initial sync. RxDB also supports storage engines like OPFS that are significantly faster than IndexedDB for write-heavy workloads.

</details>

<details>
<summary>Can I use RxDB without CouchDB?</summary>

Yes. CouchDB is one of many backends RxDB can replicate with. You can use RxDB with a custom HTTP endpoint, a GraphQL server, Supabase, or no backend at all. The [replication protocol](../../replication.md) is designed to be backend-agnostic. If you already have a CouchDB server, the CouchDB replication plugin is a straightforward way to add offline-first capabilities to your client application.

</details>

<details>
<summary>How does conflict resolution differ between CouchDB and RxDB?</summary>

CouchDB stores all conflicting revisions as branches in the document revision tree. Reading a conflicted document requires fetching the winning and losing revisions, comparing them, and resolving the conflict by deleting the unwanted branch. This logic runs on the application side after the conflict is detected.

RxDB resolves conflicts during replication. When a push is rejected because the server has a newer version, the conflict handler on the collection is called. You define the resolution strategy (last-write-wins, field merge, server-wins, etc.) once per collection. For complex collaborative scenarios, the [CRDT plugin](../../crdt.md) can merge changes from multiple clients automatically.

</details>

<details>
<summary>Does RxDB work with a self-hosted CouchDB?</summary>

Yes. The CouchDB replication plugin takes a URL pointing to your CouchDB database. It works with any CouchDB-compatible endpoint, whether hosted on your own server, in a Docker container, or in the cloud. Authentication is handled via a custom `fetch` method that you can configure per-request.

</details>

<details>
<summary>Can I switch from CouchDB to a different backend later?</summary>

Yes. Your application code reads and writes against the local RxDB collection. The replication configuration is separate. If you replace CouchDB with a different backend, you change only the replication plugin configuration. The schema, queries, and UI code remain unchanged.

</details>
