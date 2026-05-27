---
title: RxDB as a Meteor Alternative - Offline-First Without Framework Lock-In
slug: alternatives/meteor-alternative.html
description: Compare RxDB and Meteor for local-first JavaScript applications. Learn why RxDB is a strong alternative for offline-first, reactive, framework-agnostic database needs.
image: /files/alternatives/meteor_text.svg
---

# RxDB as a Meteor Alternative

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

Meteor launched in 2012 and introduced many developers to the concept of full-stack JavaScript with real-time data. For a long time, it stood out as one of the few platforms that offered seamless data synchronization between client and server out of the box. Over a decade later, the JavaScript ecosystem has matured, and the requirements for offline-capable, framework-agnostic applications have grown. RxDB offers a different approach: a dedicated local-first database that works with any backend, any frontend framework, and any storage engine, without requiring a full platform.

This page compares Meteor and RxDB in detail so you can decide which tool fits your use case.

---

## What is Meteor?

<p align="center">
  <img src="/files/alternatives/meteor_text.svg" alt="Meteor JS alternative" className="img-padding" height="80" />
</p>

Meteor is a full-stack JavaScript platform first released by Meteor Development Group in 2012. It was acquired by Tiny Capital in 2019 and remains under active development. The framework provides an integrated solution covering a server runtime (Node.js), a build system, a package manager (Atmosphere), and a data synchronization layer built around MongoDB.

Meteor's central idea is "data on the wire": instead of sending rendered HTML from the server, only data is transmitted, and the client re-renders reactively. On the server, Meteor uses MongoDB. On the client, it uses a library called Minimongo, which is an in-memory JavaScript implementation of the MongoDB query interface. A WebSocket-based protocol called DDP (Distributed Data Protocol) keeps the two sides synchronized in real time.

When a user writes to the client-side Minimongo database, the change is immediately applied locally for a fast, optimistic UI response ("latency compensation"), and a corresponding method call is sent to the server simultaneously. If the server rejects the change, the local state is rolled back.

### A Brief History

- **2012** - Meteor is introduced and quickly attracts attention due to its developer-friendly, real-time-by-default model.
- **2014-2016** - Peak popularity; Meteor raised $31.2 million in funding. The community grew rapidly.
- **2016** - Funding from the VC company runs out. The team pivots toward the Galaxy cloud hosting product.
- **2019** - Tiny Capital acquires Meteor. Development continues under new ownership.
- **2024** - Meteor 3.0 is released, removing the long-standing dependency on Fibers (a synchronous async abstraction) in favor of native `async/await`. Build tooling is modernized with support for Vite and Rspack.
- **2025-2026** - Meteor 3.x continues to receive updates. The project is maintained but occupies a much smaller share of the JavaScript ecosystem compared to its peak.

Meteor's GitHub star count reflects this history. It accumulated a large following during the 2014-2016 era, but new stars and activity have slowed significantly compared to other tools in the space. The framework is not abandoned, but it is also not seeing the level of adoption growth it once did. Most new JavaScript projects choose React or Vue with a separate API layer, rather than reaching for an integrated full-stack framework like Meteor.

---

## How Meteor Handles Data and Offline Use

Meteor's data model is designed around the assumption that the server is always the primary source of truth. Minimongo on the client is a cache and an optimistic layer, not a standalone database.

When a user goes offline in a Meteor app, the following happens:

1. The DDP WebSocket connection is lost.
2. Meteor queues method calls and attempts to reconnect automatically.
3. The in-memory Minimongo data that was already loaded remains available for display.
4. No new data can be fetched from the server.
5. If the user refreshes the browser or closes the tab, all in-memory state is lost.

Step 5 is the critical limitation. By default, Meteor applications lose their local data on a page reload because Minimongo stores everything in memory. The app must reconnect and re-fetch data from the MongoDB server before it can render again.

Community packages like `GroundDB` and `meteor-persistent-minimongo2` attempted to solve this by persisting Minimongo to IndexedDB. However, these packages are no longer maintained. The official Meteor ecosystem provides limited first-party support for persistent offline storage, and the workarounds require significant custom development.

Meteor 3.x introduced a community package for offline support (`jam:offline`), which provides IndexedDB persistence for Minimongo. It is an improvement, but it is not built into the core framework and adds complexity to the setup.

---

## How RxDB Handles Data and Offline Use

RxDB takes the opposite approach: the local database is the primary data store, and server synchronization is a background operation. Every read and write goes through the local database first.

```ts
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
                id: { type: 'string', maxLength: 100 },
                text: { type: 'string' },
                author: { type: 'string' },
                createdAt: { type: 'number' }
            },
            required: ['id', 'text', 'author', 'createdAt'],
            indexes: ['createdAt']
        }
    }
});
```

When this database is created, data is stored in IndexedDB on the user's device. If the user closes the browser and reopens the app with no internet connection, the app can read all locally stored data immediately. No server round-trip is required to render the interface.

Replication with a backend server happens separately and in the background:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = await replicateRxCollection({
    collection: db.messages,
    replicationIdentifier: 'my-messages-replication',
    pull: {
        handler: async (checkpointOrNull, batchSize) => {
            const response = await fetch(
                `/api/messages/pull?checkpoint=${JSON.stringify(checkpointOrNull)}` +
                `&limit=${batchSize}`
            );
            return response.json();
        }
    },
    push: {
        handler: async (docs) => {
            const response = await fetch('/api/messages/push', {
                method: 'POST',
                body: JSON.stringify(docs),
                headers: { 'Content-Type': 'application/json' }
            });
            return response.json(); // return conflicting documents if any
        }
    },
    live: true
});

replicationState.error$.subscribe(err => console.error('Replication error:', err));
```

If the network is unavailable, the replication state waits and retries automatically. All local writes succeed immediately and are queued for the next successful sync cycle.

---

## Framework Integration

Meteor was designed as an all-in-one platform. Integrating it with non-Meteor frontend frameworks has historically been difficult. Community projects like `angular-meteor` and `vue-meteor` provided bridges, but they required keeping up with two separate ecosystems simultaneously, and many of these integrations fell behind as their respective frameworks evolved.

React became the officially supported frontend in Meteor over time, but using Meteor with Vue 3, Svelte, SolidJS, or other modern frameworks still requires significant manual integration work.

RxDB is a library, not a platform. It runs wherever JavaScript runs and has no opinion about the frontend layer. You can use it with any framework:

**React example using RxDB observables:**

```tsx
import { useRxData } from 'rxdb-hooks';

function MessageList() {
    const { result: messages, isFetching } = useRxData('messages', collection =>
        collection.find().sort({ createdAt: 'asc' })
    );

    if (isFetching) return <p>Loading...</p>;

    return (
        <ul>
            {messages.map(msg => (
                <li key={msg.id}>{msg.author}: {msg.text}</li>
            ))}
        </ul>
    );
}
```

**Vanilla JavaScript with RxJS observables:**

```ts
const subscription = db.messages
    .find()
    .sort({ createdAt: 'asc' })
    .$
    .subscribe(messages => {
        renderMessages(messages);
    });
```

The `$` property on any RxDB query returns an RxJS Observable that emits a new result set whenever the underlying data changes. This reactive model works with React, Vue, Angular, Svelte, SolidJS, or plain JavaScript without needing framework-specific plugins.

---

## Backend Flexibility

Meteor is tightly coupled to MongoDB. While there are community projects for connecting Meteor to other databases, MongoDB is the officially supported and recommended backend. The DDP protocol was designed specifically to work with MongoDB's document model and Minimongo on the client side.

This means if your backend uses PostgreSQL, MySQL, or a custom API, you will need to either introduce MongoDB into your stack or accept significant workarounds.

RxDB is backend-agnostic. The replication protocol is based on a simple pull/push interface that you implement yourself or with one of the provided plugins:

- [CouchDB replication](../../replication-couchdb.md) for syncing with CouchDB or compatible servers
- [GraphQL replication](../../replication-graphql.md) for syncing via GraphQL endpoints
- [HTTP replication](../../replication-http.md) for custom REST APIs
- [WebSocket replication](../../replication-websocket.md) for server-push patterns
- [Firestore replication](../../replication-firestore.md) for Google Firestore backends
- [WebRTC replication](../../replication-webrtc.md) for peer-to-peer sync without a central server

You can also implement a [custom replication handler](../../replication.md) that communicates with any protocol your existing backend speaks. If you have a legacy PostgreSQL database with a REST API, RxDB can sync with it without requiring any changes to your backend schema.

---

## Storage Engine Choices

Meteor's client storage is Minimongo, which is in-memory by default. The underlying persistence story for Minimongo requires additional packages and does not support switching between storage backends without significant code changes.

RxDB has a modular storage system. You choose the storage engine that fits your deployment target:

| Environment | Recommended Storage |
|---|---|
| Browser (general) | [IndexedDB](../../rx-storage-indexeddb.md) |
| Browser (high performance) | [OPFS](../../rx-storage-opfs.md) |
| React Native | [SQLite](../../rx-storage-sqlite.md) |
| Node.js / Electron | [Filesystem / SQLite](../../rx-storage-sqlite.md) |
| Memory (testing) | [Memory](../../rx-storage-memory.md) |
| Multi-tab browser apps | [SharedWorker](../../rx-storage-shared-worker.md) |

Switching storage engines typically requires only changing the `storage` parameter when creating the database:

```ts
// Browser with IndexedDB
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';
const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});

// React Native with SQLite
import { getRxStorageSQLite } from 'rxdb/plugins/storage-sqlite';
const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageSQLite({ sqliteBasics })
});
```

This abstraction means you can write application code once and run it across browser, mobile, and desktop without rewriting your database interactions.

---

## Observable Queries and Reactive UI

Meteor's reactive system is built around its own reactive computation model (Tracker). Tracker-based code runs inside reactive contexts, and Meteor automatically re-runs computations when their dependencies change. While powerful for Meteor's own ecosystem, Tracker is Meteor-specific and does not integrate with the broader JavaScript reactive ecosystem.

RxDB's reactive system is built on [RxJS](https://rxjs.dev), which is one of the most widely used reactive programming libraries in JavaScript. Every query, document, and field in RxDB exposes RxJS Observables:

```ts
// Subscribe to all messages from a specific author
const authorMessages$ = db.messages
    .find({ selector: { author: 'alice' } })
    .sort({ createdAt: 'asc' })
    .$;

authorMessages$.subscribe(messages => {
    console.log('Alice has', messages.length, 'messages');
});

// Subscribe to a single document and watch one field
const doc = await db.messages.findOne('msg-001').exec();
doc.get$('text').subscribe(newText => {
    console.log('Text changed to:', newText);
});
```

These observables integrate naturally with React hooks (`rxdb-hooks`), Angular's async pipe, Vue's reactivity system via `from()`, or any other tool that understands RxJS.

---

## Conflict Handling

In Meteor, the server is the authority. If a client-side Minimongo write conflicts with a server write, the server state wins and the client rolls back. Meteor does not provide mechanisms for merging concurrent changes or for handling conflicts that arise when users have been working offline for extended periods.

RxDB includes a configurable [conflict resolution system](../../transactions-conflicts-revisions.md). Every document has an associated revision, and when two versions of the same document arrive from different sources, RxDB calls your conflict handler to decide the outcome:

```ts
await db.addCollections({
    messages: {
        schema: messageSchema,
        conflictHandler: async (input) => {
            const { newDocumentState, realMasterState } = input;

            // Merge by taking the most recently updated version
            if (newDocumentState.updatedAt > realMasterState.updatedAt) {
                return { documentData: newDocumentState };
            }

            return { documentData: realMasterState };
        }
    }
});
```

You can implement any merge strategy, from simple last-write-wins to full three-way merges or even CRDT-based approaches. This is essential for applications where users might be offline for hours or days and need their changes reconciled safely when they reconnect.

RxDB also supports [CRDTs (Conflict-free Replicated Data Types)](../../crdt.md) natively, which provide automatic, deterministic conflict resolution for common data structures like counters and sets without requiring custom logic.

---

## Multi-Tab and Multi-Window Support

Meteor apps run one WebSocket connection per browser tab, with each tab having its own Minimongo instance. There is no built-in coordination between multiple tabs of the same app.

RxDB includes built-in [multi-tab support](../../rx-storage-shared-worker.md). When using the SharedWorker storage, all open tabs share a single database instance running in a shared worker. Changes made in one tab are immediately visible in all other open tabs without additional configuration:

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

All tabs observe the same data stream, so a change in tab A appears immediately in the subscriptions of tab B, C, and D.

---

## Performance

Meteor's Minimongo is an in-memory database. In-memory operations are fast, but the entire dataset must fit in RAM, and the data is lost on page reload. For large datasets (tens of thousands of documents), the memory overhead and startup cost of re-fetching everything from the server become significant.

RxDB stores data persistently and indexes it for fast lookups. Queries operate on locally indexed data rather than scanning in-memory arrays. With the [OPFS storage](../../rx-storage-opfs.md) (Origin Private File System), RxDB achieves particularly high read and write throughput in modern browsers without needing WebAssembly.

<p align="center">
  <img src="/files/logo/rxdb_javascript_database.svg" alt="RxDB JavaScript Database" width="160" />
</p>

RxDB also includes [event-reduce](https://github.com/pubkey/event-reduce) optimization, which reduces the number of re-queries by computing the new query result from the change event directly, without re-running the full query against the storage engine.

---

## Mobile Support

Meteor is primarily a web and Node.js framework. There is a Cordova integration for wrapping Meteor apps as mobile apps, but it is a wrapper rather than a native approach. React Native is not officially supported.

RxDB runs in React Native natively using the [SQLite storage plugin](../../rx-storage-sqlite.md) or the memory storage. The same database code runs on iOS and Android without any wrappers. This means you can share business logic, replication code, and schema definitions between your web and mobile apps.

---

## Summary: Key Differences

| Aspect | Meteor | RxDB |
|---|---|---|
| **Type** | Full-stack platform | Client-side database library |
| **Backend requirement** | MongoDB (required) | Any backend or none |
| **Offline persistence** | In-memory by default; persistence via add-on packages | IndexedDB/SQLite/OPFS natively |
| **Offline durability** | Data lost on page reload without extra packages | Data persists across reloads natively |
| **Replication protocol** | DDP (Meteor-specific) | HTTP, CouchDB, GraphQL, WebSocket, WebRTC, custom |
| **Conflict handling** | Server-wins; no merge support | Configurable conflict handlers, CRDT support |
| **Frontend frameworks** | React officially supported; others require wrappers | Any framework (React, Vue, Angular, Svelte, plain JS) |
| **Storage engines** | Minimongo (in-memory) | IndexedDB, OPFS, SQLite, Memory, SharedWorker |
| **Reactive model** | Meteor Tracker (proprietary) | RxJS Observables (ecosystem standard) |
| **Multi-tab coordination** | No built-in support | SharedWorker storage shares state across tabs |
| **Mobile (native)** | Cordova wrapper only | React Native with SQLite storage |
| **Open source** | Yes | Yes |
| **License** | MIT | Apache 2.0 |

---

## Getting Started with RxDB

Install RxDB and RxJS:

```bash
npm install rxdb rxjs
```

Create a database and a collection:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'my-local-app',
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
                id: { type: 'string', maxLength: 100 },
                text: { type: 'string' },
                done: { type: 'boolean' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'text', 'done', 'updatedAt'],
            indexes: ['updatedAt']
        }
    }
});

// Insert a document
await db.todos.insert({
    id: 'todo-1',
    text: 'Learn RxDB',
    done: false,
    updatedAt: Date.now()
});

// Subscribe to all todos reactively
db.todos.find().sort({ updatedAt: 'asc' }).$.subscribe(todos => {
    console.log('Current todos:', todos.map(t => t.text));
});
```

From here, you can add [replication](../../replication.md) to sync with any backend, connect a frontend framework, and deploy to web, desktop, or mobile using the same codebase.

---

## FAQ

<details>
<summary>Can I migrate a Meteor app to RxDB?</summary>

Migration is not a drop-in replacement because RxDB and Meteor have different data models and protocols. However, the general approach is:

1. Export your MongoDB collections to a format your backend REST or GraphQL API can serve.
2. Replace Minimongo usage in your frontend with RxDB collections and queries.
3. Implement a replication handler in RxDB that pulls from and pushes to your existing API.
4. Replace Meteor's Tracker reactive computations with RxJS subscriptions or the equivalent in your frontend framework.

The migration can be done incrementally if you wrap RxDB behind the same service layer that previously called Meteor methods.

</details>

<details>
<summary>Does RxDB need a server?</summary>

No. RxDB works entirely offline with no server. You create a local database, insert and query documents, and use subscriptions to react to changes. Adding replication is optional and requires you to provide pull and push handlers that connect to a server of your choice. Many applications start with a local-only setup and add replication later.

</details>

<details>
<summary>How does RxDB handle data when the user has been offline for a long time?</summary>

When the user reconnects, RxDB runs a full replication cycle. It pulls all documents changed on the server since the last successful checkpoint, and pushes all local changes that were written while offline. If a document was changed on both sides, RxDB calls your [conflict handler](../../transactions-conflicts-revisions.md) to resolve the discrepancy. This cycle works correctly whether the user was offline for five minutes or five weeks.

</details>

<details>
<summary>Is RxDB suitable for large datasets?</summary>

Yes. RxDB uses indexed storage engines rather than in-memory arrays, which means query performance does not degrade linearly with collection size. The OPFS storage backend, in particular, is designed for high read and write throughput. For very large datasets, you can define compound indexes on the fields you query most frequently to keep lookups fast.

</details>
