---
title: RxDB as a Minimongo Alternative - Persistent, Observable, Offline-First
slug: alternatives/minimongo-alternative.html
description: Compare RxDB and Minimongo for client-side JavaScript databases. Learn why RxDB is a better alternative for offline-first apps with persistent storage, reactive queries, conflict handling, and multi-tab support.
---

# RxDB as a Minimongo Alternative

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

Minimongo started as a component inside Meteor.js in 2012 and introduced many developers to the idea of a client-side, MongoDB-compatible data layer. If you have used Minimongo outside of Meteor or are evaluating it for a new project, this page explains what Minimongo does well, where it falls short, and why RxDB is a strong alternative for building offline-first, reactive JavaScript applications.

---

## What is Minimongo?

Minimongo is a client-side, in-memory implementation of the MongoDB query interface written in JavaScript. It was created as part of the Meteor.js framework to enable a programming model called **latency compensation**: when a user performs an action, the client applies the change immediately to its local Minimongo collection, the UI updates instantly, and a corresponding write is sent to the server in the background. If the server rejects the write, the local state is rolled back.

The main strength of Minimongo is its familiar MongoDB-like API. Developers who know MongoDB can use `find`, `insert`, `update`, and `remove` on the client with the same selector syntax they use on the server.

The standalone `mWater/minimongo` package (forked from Meteor in January 2014) added support for persistent storage backends such as IndexedDB, WebSQL, and LocalStorage. This gave Minimongo a life outside the Meteor ecosystem, but this standalone package has not received active maintenance for years and should not be used in new projects.

### A Brief Timeline

- **2012** - Minimongo is introduced as a core module in Meteor.js, enabling the DDP (Distributed Data Protocol) data sync layer.
- **2014** - The `mWater/minimongo` project forks the Meteor code to make it usable as an npm package outside of Meteor. It adds geospatial query support and storage adapters.
- **2016-2020** - Minimongo within Meteor continues to receive updates as part of the larger framework. The standalone fork sees decreasing maintenance activity.
- **2024-2025** - Within Meteor 3.x, Minimongo is still shipped as the client-side cache layer. Outside of Meteor, the standalone fork is effectively unmaintained. New projects that need a client-side MongoDB-like database generally reach for more capable tools.

### Where Minimongo Is Used Today

Minimongo is still in active use, but only as part of the Meteor framework stack. As a standalone library independent of Meteor, it is rarely a recommended choice. The project's GitHub repository for the standalone fork shows no recent releases and accumulating open issues with no responses.

For developers not using Meteor, Minimongo provides a familiar query syntax but lacks the infrastructure needed for production offline-first applications: no persistent storage by default, no observable queries, no revision-based conflict handling, and no built-in replication protocol.

---

## How Minimongo Works

In the Meteor stack, Minimongo acts as a local mirror of data published from the server. The server defines **publications**, which are filtered subsets of MongoDB collections. The client **subscribes** to these publications, and Meteor's DDP protocol streams the documents to the client's Minimongo collection over a WebSocket connection.

```javascript
// Server-side: a Meteor publication
Meteor.publish('recentPosts', function () {
    return Posts.find({}, { sort: { createdAt: -1 }, limit: 50 });
});

// Client-side: subscribing and querying Minimongo
Meteor.subscribe('recentPosts');

const posts = Posts.find({ category: 'news' }).fetch();
```

On the client, the `Posts` variable points to a Minimongo collection. Operations like `find()` run entirely in memory against the local cache. Writes go to Minimongo first for an optimistic result, then propagate to the server.

When you use Minimongo outside of Meteor, you lose the DDP layer. You are left with an in-memory store that you must populate and sync manually. There is no standard protocol or built-in mechanism to keep that store synchronized with any backend.

---

## Key Limitations of Minimongo

### No Persistent Storage by Default

The core Minimongo implementation stores all documents in memory. If the user closes or refreshes the browser tab, all data is gone. The application must reconnect to the server and re-fetch all data before it can function again.

Some storage adapters (IndexedDB, LocalStorage) exist in the standalone `mWater` fork, but the implementation of these adapters is not well-maintained. For production applications, relying on them introduces risk.

This is the most critical limitation for any use case that requires offline-first behavior. An offline-first application must be able to start, read data, and accept writes when the user has no internet connection at all, including after a browser refresh. Minimongo cannot guarantee this without significant additional work.

### No Observable Queries

Minimongo does not expose a native observable or reactive query interface. Within Meteor, reactivity is provided by **Tracker**, Meteor's own dependency-tracking system. A Tracker reactive computation re-runs when its reactive data sources change. This reactivity is entirely specific to the Meteor ecosystem and is not compatible with RxJS, Vue's reactivity, React, or any other standard JavaScript reactive primitive.

If you are using Minimongo standalone, you have no automatic notification when data in a collection changes. You must poll or implement a custom event system yourself.

### No Document Revisions or Conflict Handling

Minimongo stores the current state of each document indexed by its `_id`. There is no concept of a document revision, no version vector, and no mechanism for detecting write conflicts. If two clients modify the same document while one of them is offline, the Minimongo data model has no way to represent both versions or to help the application choose between them.

In Meteor's DDP model, the server always wins. When the client comes back online and the server applies a conflicting state, the local document is silently overwritten. This works for simple collaborative use cases but fails for applications where users work offline for extended periods and need their changes preserved.

### Partial MongoDB Query Support

Minimongo implements a subset of the MongoDB query language. Several operators and features available in MongoDB are missing or only partially supported in Minimongo:

- No aggregation pipeline (`$lookup`, `$group`, `$facet`, `$unwind`)
- No multi-document transactions
- Limited secondary index support
- Some query operators behave differently from their server-side equivalents

This means that query code written against Minimongo cannot always be used directly with MongoDB on the server, and vice versa.

### No Multi-Tab Support

Each browser tab running a Minimongo-based application maintains its own in-memory store. There is no coordination between tabs. A write made in tab A is not visible in tab B until both tabs re-fetch from the server. For applications where users might have multiple tabs open simultaneously, this leads to inconsistent data views.

---

## How RxDB Solves These Problems

[RxDB](https://rxdb.info) is a local-first JavaScript database that treats the local store as the primary data source. Every read and write happens locally first, and replication with a backend server runs in the background. The database persists to the chosen storage engine, so data survives page refreshes and browser restarts without any network connection.

### Persistent Storage Across Environments

RxDB has a pluggable storage system. You choose the storage engine that matches your deployment:

| Environment | Storage Option |
|---|---|
| Browser | [IndexedDB](../../rx-storage-indexeddb.md) |
| Browser (high-throughput) | [OPFS (Origin Private File System)](../../rx-storage-opfs.md) |
| React Native / Expo | [SQLite](../../rx-storage-sqlite.md) |
| Node.js / Electron | [Filesystem / SQLite](../../rx-storage-sqlite.md) |
| Tests | [Memory](../../rx-storage-memory.md) |
| Multi-tab browsers | [SharedWorker](../../rx-storage-shared-worker.md) |

Switching storage engines requires changing only the `storage` parameter when creating the database. All application code above that layer remains the same:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    posts: {
        schema: {
            title: 'post schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                title: { type: 'string' },
                category: { type: 'string' },
                createdAt: { type: 'number' }
            },
            required: ['id', 'title', 'category', 'createdAt'],
            indexes: ['createdAt', 'category']
        }
    }
});
```

After this setup, all data written to `db.posts` is stored persistently in IndexedDB. If the user goes offline, refreshes the browser, or restarts the device, the data is available immediately on the next load with no server round-trip required.

### Observable Queries with RxJS

RxDB builds its reactive layer on [RxJS](https://rxjs.dev), which is one of the most widely adopted reactive programming libraries in the JavaScript ecosystem. Every query in RxDB exposes an Observable via the `$` property. The Observable emits the current result set immediately on subscription and re-emits whenever the underlying data changes.

```ts
// Subscribe to all posts in the 'news' category, ordered by date
const newsPosts$ = db.posts
    .find({
        selector: { category: 'news' },
        sort: [{ createdAt: 'desc' }]
    })
    .$;

newsPosts$.subscribe(posts => {
    console.log('News posts updated:', posts.length);
    renderPostList(posts);
});
```

Every time a post is inserted, updated, or deleted, this subscription fires automatically. There is no polling, no manual cache invalidation, and no framework-specific wiring required. The same subscription works in React, Vue, Angular, Svelte, SolidJS, or plain JavaScript.

RxDB also exposes observables at the document and field level:

```ts
// Watch a single document's title field
const doc = await db.posts.findOne('post-001').exec();
doc.get$('title').subscribe(newTitle => {
    console.log('Title changed to:', newTitle);
});

// Watch the entire collection for any change
db.posts.$.subscribe(changeEvent => {
    console.log('Change event:', changeEvent.operation, changeEvent.documentId);
});
```

This granular reactivity makes it straightforward to build UIs that reflect the current data state without writing any manual refresh logic.

RxDB also optimizes query re-execution using the [event-reduce](https://github.com/pubkey/event-reduce) algorithm. When a document is inserted, updated, or deleted, RxDB checks whether the result set of existing queries can be updated from the change event alone, without re-running the full query against the storage engine. This reduces the number of storage reads significantly in write-heavy scenarios.

### Document Revisions and Conflict Handling

RxDB tracks every document's revision history. Each write operation attaches a revision identifier to the document, and the replication layer uses these revisions to detect and resolve conflicts between the local database and the server.

When two versions of the same document exist (one local, one from the server), RxDB calls a configurable **conflict handler** to decide what happens:

```ts
await db.addCollections({
    posts: {
        schema: postSchema,
        conflictHandler: async (input) => {
            const { newDocumentState, realMasterState } = input;

            // Strategy: keep the version with the most recent updatedAt timestamp
            if (newDocumentState.updatedAt >= realMasterState.updatedAt) {
                return { documentData: newDocumentState };
            }
            return { documentData: realMasterState };
        }
    }
});
```

You can implement any conflict resolution strategy your application requires: last-write-wins, field-level merging, user-prompted resolution, or automatic reconciliation via CRDTs. RxDB natively supports [CRDTs (Conflict-free Replicated Data Types)](../../crdt.md), which resolve conflicts automatically and deterministically without requiring custom handler logic:

```ts
import { getCRDTSchemaPart, RxDBcrdtPlugin } from 'rxdb/plugins/crdt';
import { addRxPlugin } from 'rxdb/plugins/core';

addRxPlugin(RxDBcrdtPlugin);

const counterSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        // The CRDT field stores the operation log for automatic merging
        crdts: getCRDTSchemaPart()
    },
    crdt: { field: 'crdts' }
};
```

With CRDT support, RxDB can merge concurrent edits from multiple clients automatically, making it well-suited for collaborative editing use cases that Minimongo cannot handle without significant custom code.

### Replication with Any Backend

Minimongo's replication is tied to Meteor's DDP protocol, which requires a Meteor server with a MongoDB backend. Standalone Minimongo has no built-in replication at all.

RxDB's replication is backend-agnostic. The replication system uses a simple pull/push interface that you implement against any server:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = await replicateRxCollection({
    collection: db.posts,
    replicationIdentifier: 'posts-replication-v1',
    pull: {
        handler: async (checkpoint, batchSize) => {
            const response = await fetch(
                `/api/posts/pull?since=${checkpoint?.updatedAt ?? 0}&limit=${batchSize}`
            );
            return response.json(); // { documents: [...], checkpoint: {...} }
        }
    },
    push: {
        handler: async (rows) => {
            const response = await fetch('/api/posts/push', {
                method: 'POST',
                body: JSON.stringify(rows),
                headers: { 'Content-Type': 'application/json' }
            });
            return response.json(); // return conflicting documents if any
        }
    },
    live: true,
    retryTime: 5000
});

replicationState.error$.subscribe(err => {
    console.error('Replication error:', err);
});
```

If the network goes down, the replication state retries automatically at the configured interval. Local writes always succeed immediately and are queued for the next successful sync cycle. No data is lost during offline periods.

In addition to custom HTTP replication, RxDB provides ready-made plugins for common backends:

- [CouchDB replication](../../replication-couchdb.md)
- [GraphQL replication](../../replication-graphql.md)
- [Firestore replication](../../replication-firestore.md)
- [WebSocket replication](../../replication-websocket.md)
- [WebRTC peer-to-peer replication](../../replication-webrtc.md)

### Multi-Tab Coordination

RxDB handles multi-tab browser applications with its [SharedWorker storage](../../rx-storage-shared-worker.md). When multiple tabs of the same application are open, they all connect to a single shared database instance running in a SharedWorker. All writes and subscriptions go through this shared instance, so a change made in one tab is immediately visible in all other tabs:

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

After this setup, subscriptions in any tab observe the same unified data stream. No additional code is required to keep tabs in sync.

For environments where SharedWorker is not available, RxDB falls back to using the [BroadcastChannel API](../../rx-storage-indexeddb.md) to propagate change events across tabs, so all open tabs see updates even when using the standard IndexedDB storage.

### Query Capabilities and Indexing

RxDB uses a MongoDB-compatible query syntax for its `find` operations, so developers familiar with Minimongo's query interface can use similar selectors and sort expressions. Unlike Minimongo, RxDB enforces index definitions at schema level, which means the storage engine can use efficient B-tree lookups rather than full collection scans:

```ts
// Schema with compound and single-field indexes
const postSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        category: { type: 'string', maxLength: 50 },
        authorId: { type: 'string', maxLength: 100 },
        createdAt: { type: 'number' }
    },
    required: ['id', 'category', 'authorId', 'createdAt'],
    indexes: [
        'createdAt',
        'category',
        ['category', 'createdAt'] // compound index for category + time queries
    ]
};

// This query uses the compound index
const results = await db.posts.find({
    selector: { category: 'news' },
    sort: [{ createdAt: 'desc' }],
    limit: 20
}).exec();
```

Minimongo always performs a linear scan over all documents in memory for each query, because it has no index infrastructure. For collections with a few hundred documents this is acceptable, but performance degrades noticeably at thousands of documents.

### Schema Validation and Type Safety

RxDB validates every document against a [JSON Schema](../../rx-schema.md) before it is written to storage. This means data integrity is enforced at the database level, not only in application code:

```ts
// Invalid documents are rejected at insert time
try {
    await db.posts.insert({
        id: 'post-002',
        // 'title' is missing, which is required
        category: 'news',
        createdAt: Date.now()
    });
} catch (err) {
    console.error('Validation error:', err.message);
}
```

Minimongo has no built-in schema validation. It stores whatever object you pass to `insert` or `update`. This makes it easier to write incorrect data into the collection, which can cause subtle bugs that are hard to track down.

RxDB also generates TypeScript types automatically from the schema definition, so you get full IDE autocompletion and compile-time type checking for all collection operations.

---

## Positioning: Who Should Switch?

Minimongo is a reasonable choice if you are building a standard Meteor application that does not require long-term offline capability. Within that narrow context, it does exactly what it is designed to do: provide a fast, optimistic client-side cache that mirrors a MongoDB publication.

If you are building anything outside of the Meteor ecosystem, or if your Meteor application needs:

- Data persistence across page reloads without a server connection
- Reactive queries that work with React, Vue, Angular, or plain JavaScript
- Conflict resolution for concurrent offline edits
- Replication with backends other than MongoDB
- Multi-tab state coordination
- Type-safe schemas with validation

...then Minimongo is not the right tool and RxDB covers all of these requirements out of the box.

---

## Getting Started with RxDB

Install RxDB and RxJS:

```bash
npm install rxdb rxjs
```

Create a database, add a collection, and subscribe to reactive queries:

```ts
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

// Add the dev mode plugin for schema validation errors during development
addRxPlugin(RxDBDevModePlugin);

const db = await createRxDatabase({
    name: 'blogapp',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    posts: {
        schema: {
            title: 'post schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                title: { type: 'string' },
                category: { type: 'string' },
                authorId: { type: 'string' },
                createdAt: { type: 'number' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'title', 'category', 'authorId', 'createdAt', 'updatedAt'],
            indexes: ['createdAt', 'category']
        }
    }
});

// Insert a document
await db.posts.insert({
    id: 'post-001',
    title: 'Getting Started with Local-First Apps',
    category: 'tutorial',
    authorId: 'user-42',
    createdAt: Date.now(),
    updatedAt: Date.now()
});

// Subscribe reactively to all tutorial posts
db.posts.find({
    selector: { category: 'tutorial' },
    sort: [{ createdAt: 'desc' }]
}).$.subscribe(posts => {
    console.log('Tutorial posts:', posts.map(p => p.title));
});
```

After the initial setup, you can add [replication](../../replication.md) to sync with your existing backend, or deploy to React Native using the [SQLite storage plugin](../../rx-storage-sqlite.md) with the same collection schema.

---

## Comparison Summary

| Aspect | Minimongo | RxDB |
|---|---|---|
| **Type** | In-memory client-side cache | Persistent local-first database |
| **Persistence** | In-memory by default; lost on page reload | IndexedDB, OPFS, SQLite, Filesystem natively |
| **Reactive queries** | Only via Meteor Tracker (Meteor-specific) | RxJS Observables (ecosystem standard) |
| **Observable changestream** | Not available standalone | Available on collections, documents, and fields |
| **Conflict handling** | None; server overwrites client | Configurable conflict handlers, CRDT support |
| **Document revisions** | None | Built-in revision tracking for every document |
| **Replication protocol** | DDP (Meteor only) or none standalone | HTTP, CouchDB, GraphQL, WebSocket, WebRTC, custom |
| **Backend requirement** | MongoDB (via Meteor DDP) | Any backend or none |
| **Multi-tab support** | None; each tab has its own in-memory store | SharedWorker for unified cross-tab state |
| **Schema validation** | None built-in | JSON Schema validation on every write |
| **TypeScript support** | Partial | Full (auto-generated types from schema) |
| **Query indexing** | Full collection scan always | Defined indexes; efficient B-tree lookups |
| **Aggregation pipeline** | Not supported | Not built-in; custom computed fields possible |
| **Mobile (React Native)** | Not supported | SQLite storage plugin for iOS and Android |
| **Active maintenance (standalone)** | No (mWater fork unmaintained) | Yes (active development, premium plugin model) |
| **Framework agnostic** | Tied to Meteor ecosystem | Works with React, Vue, Angular, Svelte, plain JS |
| **License** | MIT | Apache 2.0 |

---

## FAQ

<details>
<summary>Can I use RxDB with a MongoDB backend?</summary>

Yes. RxDB's replication protocol can communicate with any HTTP server, including a Node.js API backed by MongoDB. You implement pull and push handlers that query your MongoDB API endpoints and return the document format RxDB expects. You do not need to replace your backend to use RxDB on the frontend.

</details>

<details>
<summary>Does RxDB support the same query syntax as Minimongo?</summary>

RxDB uses a [MongoDB-compatible query syntax](../../rx-query.md) for selectors, so many queries you have written for Minimongo will work with RxDB with little or no modification. The `selector` field in RxDB queries uses the same operators (`$eq`, `$gt`, `$in`, `$or`, `$and`, etc.) that Minimongo supports. RxDB does not support the full MongoDB aggregation pipeline, but it covers the query patterns needed for client-side filtering, sorting, and pagination.

</details>

<details>
<summary>Does RxDB work without any backend server?</summary>

Yes. RxDB works entirely as a local database with no server. You create a database, write documents, run queries, and subscribe to reactive changes without any network connection required. Replication is optional. You can start with a local-only setup and add a replication layer later when your application requirements grow.

</details>

<details>
<summary>How does RxDB handle data when the user has been offline for a long time?</summary>

When the device comes back online, RxDB runs a replication cycle. It pulls all documents changed on the server since the last successful checkpoint and pushes all local writes that accumulated while offline. If the same document was changed on both sides, RxDB calls your conflict handler to determine the final state. This process works correctly whether the offline period was five minutes or several weeks.

</details>

<details>
<summary>Is RxDB suitable for React Native?</summary>

Yes. RxDB runs on React Native using the [SQLite storage plugin](../../rx-storage-sqlite.md). The same schema definitions, query code, and replication setup you write for your web application can be shared with your React Native application. RxDB also supports [Expo](../../react-native-database.md) through dedicated storage plugins.

</details>
