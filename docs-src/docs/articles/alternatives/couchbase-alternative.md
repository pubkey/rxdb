---
title: RxDB as a Couchbase Alternative - Local-First, Backend-Agnostic, and Framework-Ready
slug: alternatives/couchbase-alternative.html
description: Compare RxDB and Couchbase for JavaScript applications. Learn why RxDB is a practical alternative to Couchbase and Couchbase Lite for offline-first web, mobile, and desktop apps without the enterprise infrastructure overhead.
---

# RxDB as a Couchbase Alternative

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

Developers building offline-capable JavaScript applications often evaluate Couchbase Mobile as a data layer because of its embedded Couchbase Lite client and its Sync Gateway component for backend replication. In practice, the stack introduces significant infrastructure requirements, a proprietary synchronization protocol, and a tight coupling to the Couchbase Server ecosystem. [RxDB](https://rxdb.info) is a local-first JavaScript database that handles offline storage, reactive queries, and replication without any of that infrastructure dependency.

This page covers what Couchbase is, how its mobile and web stack works, where it creates friction for JavaScript developers, and how RxDB provides a simpler path to the same offline-first goals.

---

## What is Couchbase?

Couchbase has a long history in the NoSQL space. The company was formed in February 2011 through the merger of **Membase** (a key-value store derived from NorthScale, founded 2009) and **CouchOne** (a company built around Apache CouchDB development). The merger combined the high-performance, memcached-compatible architecture of Membase with the document-model concepts from CouchDB, producing a platform aimed at enterprise-scale, low-latency applications.

Over the years, Couchbase has expanded from a pure document database into a multi-model platform. The key additions:

- **N1QL (SQL++ query language)**: A SQL-like query language added to make Couchbase more approachable for developers familiar with relational databases.
- **Full-text search**: Integrated search engine for text queries within the document store.
- **Analytics**: Columnar analytics via the Couchbase Analytics Service.
- **Couchbase Capella**: The managed cloud Database-as-a-Service launched in 2020.
- **Vector search**: Added as part of Couchbase 8.0 (2025) for AI workloads.
- **Couchbase Lite**: An embeddable, lightweight client-side database for mobile and edge devices.
- **Sync Gateway**: The server-side component that handles synchronization between Couchbase Lite clients and Couchbase Server.

In 2025, the company was acquired by Haveli Investments in a deal valued at approximately $1.5 billion, shifting it further toward enterprise and AI-focused positioning.

### Couchbase Mobile: The Client-Side Stack

For developers building offline-capable applications, the relevant part of Couchbase is the mobile stack:

- **Couchbase Lite**: An embedded NoSQL JSON database that runs locally on iOS, Android, Windows, Linux, macOS, and (as of 2025) in browser-based JavaScript applications. It supports CRUD operations and SQL++ queries.
- **Sync Gateway**: A backend server process that sits between Couchbase Lite clients and Couchbase Server. It manages bidirectional replication, access control via "channels", conflict resolution, and authentication.
- **Capella App Services**: The managed cloud version of Sync Gateway, provided as part of the Couchbase Capella offering.

This is a capable stack for native mobile applications. For JavaScript and web development, however, it introduces a set of constraints that make it a poor fit compared to purpose-built JavaScript-native databases like RxDB.

---

## The Infrastructure Requirements of Couchbase Mobile

### The Three-Tier Dependency Chain

Using Couchbase Mobile for a JavaScript application requires:

1. **Couchbase Server** (or Couchbase Capella): The primary backend database, a cluster-based system requiring significant infrastructure and operational knowledge.
2. **Sync Gateway** (or Capella App Services): A separate server process that must be deployed, configured, versioned, and maintained alongside Couchbase Server.
3. **Couchbase Lite** (client): The embedded client library on the device.

All three tiers must be version-compatible with each other. Updating any tier requires checking compatibility matrices across the stack. Sync Gateway alone requires configuration of JSON config files, RBAC roles in Couchbase Server, network port management, TLS configuration, and a custom sync function written in JavaScript that governs how documents are routed to users.

RxDB requires none of this. It runs in the browser or in Node.js directly, stores data locally, and replicates with any backend that exposes a minimal HTTP, GraphQL, or WebSocket interface. You do not need to deploy or maintain any Couchbase-specific infrastructure.

### Sync Gateway Configuration Overhead

The Sync Gateway sync function is a JavaScript function that runs on the server and determines which documents each user can access. While flexible, it requires careful design and testing. An incorrect sync function can expose data to the wrong users or block replication entirely, and debugging it requires server-side log analysis.

A typical Sync Gateway configuration involves:

- Defining database bucket mappings between Couchbase Server and Sync Gateway
- Creating RBAC roles and users in Couchbase Server with specific permissions
- Writing a sync function that maps documents to channels and assigns channel access to users
- Configuring CORS if browser clients need to connect
- Setting up TLS and load balancing for production deployments

None of this is unreasonable for a dedicated native mobile team, but for a JavaScript application team that wants to add offline support to a web app, this is a substantial operational investment before writing a single line of application code.

---

## Couchbase Lite for JavaScript: Capabilities and Limitations

Couchbase added JavaScript/browser support to Couchbase Lite in 2025. The library stores data locally using the browser's IndexedDB and can synchronize with Sync Gateway or Capella App Services. This is a meaningful addition for web developers, but several constraints remain:

### No Multi-Tab Support

Couchbase Lite for JavaScript does not support running the same database across multiple browser tabs simultaneously. If a user opens the application in two tabs, the behavior is undefined and may produce data inconsistencies. There is no cross-tab synchronization or locking mechanism.

RxDB handles this natively with its [SharedWorker storage](../../rx-storage-shared-worker.md). All tabs share a single database instance running in a Web Worker. A write in one tab propagates to reactive queries in all other tabs automatically:

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

### No Full-Text Search in the Browser

The SQL++ `MATCH()` function for full-text search is not available in Couchbase Lite for JavaScript. Applications that require in-browser text search must implement their own solution outside of the database.

### No Peer-to-Peer Sync

Couchbase Lite for JavaScript requires a Sync Gateway or Capella App Services backend for replication. There is no peer-to-peer synchronization between browser tabs or devices without going through the server.

RxDB supports [WebRTC replication](../../replication-webrtc.md) for direct peer-to-peer sync between browser clients:

```ts
import { replicateWebRTC, getConnectionHandlerSimplePeer } from 'rxdb/plugins/replication-webrtc';

const replicationPool = await replicateWebRTC({
    collection: db.items,
    topic: 'my-collaboration-room',
    connectionHandlerCreator: getConnectionHandlerSimplePeer({ signalingServerUrl: 'wss://signaling.example.com' }),
    pull: {},
    push: {}
});
```

### Requires Sync Gateway Even for Simple Use Cases

There is no lightweight path to synchronization. Even a simple two-user application that needs to share a handful of documents must deploy and operate a Sync Gateway instance. The Couchbase Lite protocol is proprietary, so there is no way to write a compatible backend yourself without using Couchbase's own infrastructure.

RxDB's [HTTP replication](../../replication-http.md) works with any backend that supports two endpoints: one to fetch changed documents since a checkpoint, and one to accept pushed documents. You can implement this in any language on any infrastructure:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    replicationIdentifier: 'my-http-replication',
    collection: db.items,
    pull: {
        async handler(checkpointOrNull, batchSize) {
            const since = checkpointOrNull ? checkpointOrNull.updatedAt : 0;
            const response = await fetch(`/api/items?since=${since}&limit=${batchSize}`);
            const data = await response.json();
            return {
                documents: data.items,
                checkpoint: data.checkpoint
            };
        }
    },
    push: {
        async handler(rows) {
            const response = await fetch('/api/items/bulk', {
                method: 'POST',
                body: JSON.stringify(rows)
            });
            return response.json(); // conflicts
        }
    },
    live: true,
    retryTime: 5000
});
```

---

## How RxDB Approaches the Same Problems

### Local-First Storage Without Infrastructure Dependencies

[RxDB](https://rxdb.info) is a local-first JavaScript database. All reads and writes go to local storage on the device. Replication is optional and does not affect the basic functionality of the database. An application built on RxDB works fully offline without any server connection. Sync runs in the background and applies changes when connectivity is available.

This model is identical in intent to what Couchbase Mobile aims for with Couchbase Lite. The difference is the implementation path. RxDB is a JavaScript-native library that integrates directly with the JavaScript ecosystem without requiring any server-side Couchbase components.

### Pluggable Storage Backends

RxDB separates its query engine from the storage layer via the [RxStorage interface](../../rx-storage.md). You choose the storage backend that fits your platform:

| Environment | RxDB Storage Option |
|---|---|
| Browser (general use) | [IndexedDB](../../rx-storage-indexeddb.md) |
| Browser (high throughput) | [OPFS](../../rx-storage-opfs.md) |
| React Native | [SQLite via expo-sqlite or op-sqlite](../../rx-storage-sqlite.md) |
| Node.js / Electron | [SQLite (better-sqlite3)](../../rx-storage-sqlite.md) |
| Multiple browser tabs | [SharedWorker](../../rx-storage-shared-worker.md) |
| Testing | [Memory](../../rx-storage-memory.md) |

Switching storage is a single-line change in the database creation call. The rest of the application code remains identical:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';
// swap for any other storage without changing application code:
// import { getRxStorageOPFS } from 'rxdb/plugins/storage-opfs';
// import { getRxStorageSQLite } from 'rxdb/plugins/storage-sqlite';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});
```

Couchbase Lite for JavaScript only supports IndexedDB as its browser storage backend. There is no way to switch to OPFS for better performance or to SQLite for native environments without switching to a different Couchbase Lite SDK entirely.

### Reactive Queries with RxJS Observables

A key architectural difference between RxDB and Couchbase Lite is how they expose data changes to the application.

Couchbase Lite provides a change listener API that fires a callback when documents change. The application must then re-query the database to get the current state and reconcile the changes with its local state.

RxDB builds on [RxJS](https://rxjs.dev) to provide reactive queries as a first-class feature. Every query result is a live observable. When documents matching the query change (from a local write or from an incoming replication), the observable emits the updated result automatically:

```ts
// This subscription remains live and re-emits whenever matching documents change
db.items.find({
    selector: { status: 'active' },
    sort: [{ createdAt: 'asc' }]
}).$.subscribe(activeItems => {
    // Called immediately with current results, then again on any relevant change
    renderList(activeItems);
});
```

You can also subscribe to individual documents or to specific fields within a document:

```ts
const item = await db.items.findOne('item-001').exec();

// Fires only when the 'status' field changes
item.get$('status').subscribe(newStatus => {
    updateStatusBadge(newStatus);
});
```

RxDB uses the [event-reduce algorithm](https://github.com/pubkey/event-reduce) to determine whether a document change affects a query's result set without re-running the full query against storage. For most write operations, the updated result is calculated from the change event itself, making reactive queries efficient even when many subscriptions are active simultaneously.

### Schema Validation and Full TypeScript Support

RxDB enforces a [JSON Schema](../../rx-schema.md) on every document before it is written to storage. Documents that do not match the schema are rejected with a typed error:

```ts
await db.addCollections({
    items: {
        schema: {
            title: 'item schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                title:     { type: 'string' },
                status:    { type: 'string', enum: ['active', 'done', 'archived'] },
                priority:  { type: 'number', minimum: 0, maximum: 10 },
                createdAt: { type: 'number' }
            },
            required: ['id', 'title', 'status', 'priority', 'createdAt'],
            indexes: ['createdAt', ['status', 'priority']]
        }
    }
});
```

RxDB also infers TypeScript types from the schema automatically. Accessing a document field gives you the exact TypeScript type without any manual type annotation:

```ts
const item = await db.items.findOne('item-001').exec();
if (item) {
    // TypeScript knows: title is string, status is 'active' | 'done' | 'archived'
    console.log(item.title);
    console.log(item.status);
    // Compile-time error if you access a field that is not in the schema
}
```

Couchbase Lite for JavaScript handles documents as untyped JSON objects. There is no schema declaration, no validation before writes, and no compile-time type checking on document access. All field access returns `any`, which removes TypeScript's ability to catch data model mismatches at development time.

### Replication with Any Backend

RxDB's replication system is built around a protocol-agnostic pull/push model. Any backend that supports a checkpoint-based sync API can work with RxDB. Built-in plugins cover the most common cases:

- **[HTTP replication](../../replication-http.md)**: Sync with any REST API via pull and push handlers
- **[GraphQL replication](../../replication-graphql.md)**: Sync with any GraphQL endpoint
- **[WebSocket replication](../../replication-websocket.md)**: Real-time bidirectional sync over WebSocket
- **[CouchDB replication](../../replication-couchdb.md)**: Sync with any CouchDB-compatible server
- **[Supabase replication](../../replication-supabase.md)**: Sync with a Supabase PostgreSQL backend
- **[Firestore replication](../../replication-firestore.md)**: Sync with Firebase Cloud Firestore
- **[WebRTC replication](../../replication-webrtc.md)**: Peer-to-peer sync between browser clients

This means that if your backend is already PostgreSQL, MongoDB, a REST API, or any other existing system, you can add RxDB on the client without changing the backend architecture. There is no requirement to deploy Couchbase infrastructure.

Couchbase Lite replicates exclusively using the Couchbase Lite replication protocol, which requires Sync Gateway (version 3.3.1+ or 4.0.1+) or Capella App Services on the server side. No custom backend implementation is possible. Migrating away from Couchbase on the backend means replacing the client-side database as well.

### Automatic Schema Migrations

When a data model changes, RxDB handles migration automatically. You increment the schema version and provide a migration strategy for each version step. The migration runs when the database opens with the new schema version:

```ts
await db.addCollections({
    items: {
        schema: {
            version: 1, // was 0
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                title:     { type: 'string' },
                status:    { type: 'string', enum: ['active', 'done', 'archived'] },
                priority:  { type: 'number', minimum: 0, maximum: 10 },
                tags:      { type: 'array', items: { type: 'string' } }, // new field
                createdAt: { type: 'number' }
            },
            required: ['id', 'title', 'status', 'priority', 'tags', 'createdAt']
        },
        migrationStrategies: {
            1: (oldDoc) => {
                // Existing documents get an empty tags array
                oldDoc.tags = [];
                return oldDoc;
            }
        }
    }
});
```

All locally stored documents from version 0 are automatically migrated to version 1 before the application starts using the collection. Couchbase Lite has no built-in migration system. Schema changes require manual update scripts executed in application code, with no guarantee that all client devices will run them in the correct order.

### Conflict Resolution

RxDB provides a configurable conflict handler per collection. When a local document and a remote document conflict during replication, the handler receives both versions and returns the winning state:

```ts
await db.addCollections({
    items: {
        schema: itemSchema,
        conflictHandler: async (input) => {
            const { newDocumentState, realMasterState } = input;
            // Last-write-wins based on updatedAt timestamp
            if (newDocumentState.updatedAt >= realMasterState.updatedAt) {
                return { documentData: newDocumentState };
            }
            return { documentData: realMasterState };
        }
    }
});
```

For collaborative applications where concurrent writes from multiple users should be merged automatically, RxDB supports [CRDTs (Conflict-free Replicated Data Types)](../../crdt.md):

```ts
import { getCRDTSchemaPart, RxDBcrdtPlugin } from 'rxdb/plugins/crdt';
import { addRxPlugin } from 'rxdb/plugins/core';

addRxPlugin(RxDBcrdtPlugin);

const itemSchema = {
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

With CRDTs enabled, concurrent writes are automatically merged when clients sync, with no manual conflict resolution code required for the common case.

### Encryption at Rest

RxDB includes a [field-level encryption plugin](../../encryption.md) that encrypts specific document fields before they are written to the local storage engine. The raw IndexedDB, OPFS, or SQLite contents contain ciphertext for encrypted fields:

```ts
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';

const db = await createRxDatabase({
    name: 'myapp',
    storage: wrappedKeyEncryptionCryptoJsStorage({
        storage: getRxStorageIndexedDB()
    }),
    password: 'user-provided-passphrase'
});

const schema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:              { type: 'string', maxLength: 100 },
        sensitiveField:  { type: 'string' }
    },
    encrypted: ['sensitiveField']
};
```

Without the passphrase, the raw storage contents are unreadable. This protects user data on shared or lost devices without requiring the application to implement custom encryption logic.

### Performance: OPFS Storage

For browser applications that need high write throughput, RxDB supports the [Origin Private File System (OPFS)](../../rx-storage-opfs.md) as a storage backend. OPFS gives JavaScript direct filesystem access within the browser's sandboxed origin, bypassing IndexedDB's transaction model entirely:

```ts
import { getRxStorageOPFS } from 'rxdb/plugins/storage-opfs';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageOPFS()
});
```

OPFS provides significantly higher write throughput than IndexedDB for bulk operations because it avoids the overhead of IndexedDB transactions. Couchbase Lite for JavaScript only supports IndexedDB as its browser storage layer.

---

## Vendor Lock-In and Backend Flexibility

One of the practical differences between Couchbase Mobile and RxDB is what happens when requirements change.

With Couchbase Mobile:
- Replication only works with Sync Gateway or Capella App Services.
- Sync Gateway only works with Couchbase Server or Capella.
- Migrating the backend to a different database (PostgreSQL, MongoDB, etc.) requires also replacing the client-side library and rewriting all sync logic.
- The replication protocol between Couchbase Lite and Sync Gateway is proprietary and not documented for third-party implementation.

With RxDB:
- Replication works with any backend that exposes a compatible HTTP, GraphQL, or WebSocket endpoint.
- Changing the backend database (from PostgreSQL to MongoDB, or from a REST API to GraphQL) requires only updating the replication plugin configuration on the client.
- The client-side schema, queries, and application code remain unchanged when the backend changes.
- You can replicate with Firebase, Supabase, CouchDB, a custom REST API, or any other system using the appropriate plugin.

This backend flexibility is meaningful for long-lived applications where requirements evolve. A team that starts with Supabase and later moves to a custom backend does not need to replace their entire offline-first stack.

---

## Positioning Against Couchbase: When RxDB Fits Better

Couchbase Mobile is designed for enterprise teams building native mobile applications where the full Couchbase stack (Couchbase Server, Sync Gateway, Couchbase Lite for iOS/Android) is already established or justified by organizational requirements. The JavaScript/web support for Couchbase Lite is recent and still has constraints around multi-tab access, full-text search, and peer-to-peer sync.

RxDB is the better fit when:

- The application is built primarily in JavaScript or TypeScript for web, React Native, Electron, or Node.js.
- The team does not have existing Couchbase infrastructure and does not want to adopt it.
- The backend is PostgreSQL, MongoDB, a REST API, GraphQL, Firebase, or any non-Couchbase system.
- Reactive queries are needed (UI components that update automatically when data changes).
- Multiple browser tabs must share the same database state.
- The team wants schema validation and TypeScript type inference from the data model.
- Budget or operational capacity does not support running Couchbase Server and Sync Gateway.

---

## Comparison Table

| Feature | Couchbase Lite (JS) | RxDB |
|---|---|---|
| **Offline-first** | Yes | Yes |
| **Local storage in browser** | IndexedDB only | IndexedDB, OPFS, Memory |
| **Local storage in React Native** | Native CBL SDK (separate) | SQLite via expo-sqlite or op-sqlite |
| **Reactive queries** | Change listener callbacks | RxJS Observables (live query subscriptions) |
| **Schema validation** | No | Yes (JSON Schema) |
| **TypeScript inference** | No (untyped documents) | Full (inferred from schema) |
| **Multi-tab browser support** | Not recommended | Yes (SharedWorker storage) |
| **Replication targets** | Sync Gateway / Capella App Services only | Any backend (HTTP, GraphQL, WebSocket, CouchDB, Supabase, Firestore, WebRTC) |
| **Backend infrastructure required** | Couchbase Server + Sync Gateway | None (any existing backend works) |
| **Replication protocol** | Proprietary (Couchbase Lite protocol) | Open (HTTP, WebSocket, GraphQL) |
| **Full-text search in browser** | Not supported | Via external index or RxDB plugin |
| **Peer-to-peer sync** | Not supported in browser | Yes (WebRTC replication plugin) |
| **Conflict resolution** | Automatic (last-write-wins) | Configurable handler or CRDT plugin |
| **Schema migrations** | Manual | Automatic via versioned strategies |
| **Encryption at rest** | Enterprise feature (Couchbase EE) | Built-in field-level encryption plugin |
| **Open source** | Community Edition only | Yes (core + premium plugins) |
| **Backend flexibility** | Couchbase ecosystem only | Any backend |
| **Vendor lock-in** | High (Couchbase protocol) | None |
| **Setup complexity** | High (Server + Sync Gateway + CORS + channels) | Low (npm install, no server-side Couchbase components) |
| **JavaScript-native** | Recent addition (2025), limited features | Yes, built from the start for JavaScript |
| **Active development** | Enterprise-focused, acquired 2025 | Active, independent, commercially supported |

---

## FAQ

<details>
<summary>Can RxDB replace Couchbase Server as a backend?</summary>

No. RxDB is a client-side database, not a server-side database. It runs in the browser, in React Native, in Electron, or in Node.js as an embedded database. It does not replace Couchbase Server or any other backend database. What it replaces is the client-side Couchbase Lite layer and the synchronization requirement for Sync Gateway. The backend can remain any system that exposes an API RxDB can replicate with.

</details>

<details>
<summary>Does RxDB require a backend to work offline?</summary>

No. RxDB stores all data locally and operates fully offline without any backend connection. Replication is optional and runs in the background when connectivity is available. An application can be built with RxDB that never replicates with any backend and still has full offline-first functionality.

</details>

<details>
<summary>How does RxDB handle replication conflicts?</summary>

RxDB uses a configurable conflict handler per collection. During replication, when a locally modified document conflicts with a version from the server, the conflict handler receives both document states and returns the winning state. Common strategies include last-write-wins (based on a timestamp field) and merge-based strategies (combining fields from both versions). For text or structured data that requires automatic merging, the [CRDT plugin](../../crdt.md) provides conflict-free replicated data types that merge concurrent changes without any custom handler code.

</details>

<details>
<summary>Can RxDB work in React Native like Couchbase Lite can?</summary>

Yes. RxDB works in React Native using the [SQLite storage plugin](../../rx-storage-sqlite.md), which wraps either `expo-sqlite` or `op-sqlite`. The same schema definitions, queries, reactive subscriptions, and replication configuration that work in a browser also work in React Native. There is no separate SDK or separate configuration required.

</details>

<details>
<summary>Is there a path to migrate from Couchbase Lite to RxDB?</summary>

Yes. Couchbase Lite stores data as JSON documents, and RxDB stores data as JSON documents. A migration involves reading documents from the Couchbase Lite database (using the Couchbase Lite query API), defining a matching schema in RxDB, and inserting the documents into RxDB. The primary work is defining the schema and setting up RxDB's replication to replace the Sync Gateway connection. If the backend is Couchbase Server, you would also add a new API layer (HTTP, GraphQL, or WebSocket) that RxDB can replicate with.

</details>

<details>
<summary>What is the licensing difference?</summary>

Couchbase has a Community Edition (open source) and an Enterprise Edition (commercial). Some features, including advanced encryption and certain enterprise security options, are only available in the Enterprise Edition. Sync Gateway has its own licensing terms. RxDB's core is open source. Advanced storage plugins like IndexedDB, OPFS, and SQLite are available under a commercial [premium license](https://rxdb.info/premium/). The premium license is a one-time purchase and does not require ongoing cloud service fees.

</details>
