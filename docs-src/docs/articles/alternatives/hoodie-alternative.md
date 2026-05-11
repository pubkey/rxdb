---
title: RxDB as a Hoodie Alternative for Offline-First JavaScript Apps
slug: hoodie-alternative.html
description: Replace unmaintained Hoodie with RxDB. Keep CouchDB sync, gain TypeScript, reactive queries, multi-tab support, and modern offline-first JavaScript tooling.
---

# RxDB as a Hoodie Alternative for Offline-First JavaScript Apps

If you built a project on **Hoodie**, you chose it for a clear reason: ship an [offline-first](../../offline-first.md) JavaScript application without writing a backend. The "noBackend" promise meant a single API call to store and sync data, with CouchDB and PouchDB doing the heavy lifting underneath. That promise still matters today, but the Hoodie project itself has been inactive for years, the `hood.ie` website is offline, and the GitHub repository has not received a meaningful commit in a long time.

Teams maintaining Hoodie applications now face a hard question: how do you keep the offline-first developer experience while moving to a stack that is actively maintained, typed, and supported across modern JavaScript runtimes? **RxDB** is a direct answer to that question. It keeps the local-first model, supports CouchDB replication out of the box, and adds reactive queries, multi-tab synchronization, and conflict handling that Hoodie never offered.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## A Short History of Hoodie

Hoodie started around 2012, founded by Caolan McMahon and a small team behind the **noBackend** movement. The idea was simple: frontend developers should not have to assemble servers, authentication systems, and databases just to store user data. Instead, a single client-side library would expose a small API (`hoodie.store.add(...)`, `hoodie.account.signUp(...)`) and handle persistence, sync, and accounts behind the scenes.

The technical foundation was:

- **PouchDB** in the browser as the local store.
- **CouchDB** on the server as the sync target.
- A small Node.js server wrapping CouchDB and providing account management.

For a few years Hoodie was a popular choice for offline-first prototypes, hackathons, and progressive web apps. Around 2018 to 2019 development slowed to near zero. The website at `hood.ie` is no longer reachable, and the GitHub organization shows the project as effectively unmaintained. Anyone running Hoodie in production today is running on frozen dependencies, including older versions of PouchDB and CouchDB clients that no longer receive security or performance updates.

## What is RxDB?

RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript. It runs in browsers, Node.js, Electron, React Native, and any other JavaScript runtime. Data is stored locally through a pluggable storage layer (IndexedDB, OPFS, SQLite, in-memory, and more) and can be replicated to any backend through the [RxDB Sync Engine](../../replication.md).

Compared to a raw PouchDB setup, RxDB adds:

- A schema layer with JSON Schema validation and migrations.
- [Reactive queries](../../rx-query.md) that emit new results whenever the underlying data changes.
- [Multi-tab support](../../reactivity.md) so several browser tabs share a single consistent state.
- A pluggable [conflict handler](../../transactions-conflicts-revisions.md) instead of a fixed last-write-wins rule.
- First-class TypeScript types for collections, documents, and queries.

## Where Hoodie Falls Short Today

Hoodie's design was solid for its time, but the gap between Hoodie and a modern JavaScript stack has grown wide.

### 1. The Project is Unmaintained

The clearest issue is also the most important. Hoodie does not get bug fixes, security patches, or compatibility updates. New Node.js versions, new browsers, and new build tools can break a Hoodie setup with no upstream fix in sight.

### 2. CouchDB-Only Backend

Hoodie was tightly coupled to CouchDB. If your team wants to sync to PostgreSQL, a custom REST API, GraphQL, Firestore, or a peer-to-peer mesh, Hoodie does not help. RxDB treats the backend as a plugin choice and ships replication adapters for [CouchDB](../../replication-couchdb.md), [HTTP](../../replication-http.md), and several other targets.

### 3. Dated APIs and No TypeScript

Hoodie's client API predates modern JavaScript patterns. There is no first-class TypeScript support, no observable query API, and no integration with frameworks like React, Vue, Svelte, or Angular beyond plain callbacks. RxDB ships full type definitions and integrates cleanly with reactive UI frameworks through RxJS.

### 4. PouchDB Performance Limits

Hoodie depends on PouchDB for local storage. PouchDB works, but its IndexedDB adapter has well-known performance issues with large datasets, range queries, and bulk writes. RxDB lets you pick the storage that fits your workload, including the OPFS storage for high-throughput browser apps and the SQLite storage for native runtimes.

### 5. No Built-In Conflict Strategy Beyond CouchDB Defaults

Hoodie inherits CouchDB's conflict model, which surfaces conflicts but leaves resolution entirely to the application. RxDB lets you supply a [custom conflict handler](../../transactions-conflicts-revisions.md) per collection, so merges happen automatically and consistently across clients.

## Why RxDB is a Strong Hoodie Replacement

### Actively Maintained
RxDB sees regular releases, security updates, and an active community. Bugs get fixed and new platforms (React Native New Architecture, OPFS, modern Node versions) are supported as they appear.

### Keep CouchDB if You Want
If you already run a CouchDB cluster for your Hoodie deployment, you do not have to throw it away. The [CouchDB replication plugin](../../replication-couchdb.md) lets RxDB sync directly with CouchDB or any CouchDB-compatible server.

### Modern TypeScript and Reactive APIs
Every collection, document, and query is fully typed. Queries return RxJS observables, so your UI updates automatically when data changes locally or arrives from the server.

### Multi-Tab and Cross-Process Coordination
RxDB coordinates state across browser tabs, web workers, and Electron processes through a leader election and event broadcast system. Hoodie has no equivalent.

### Pluggable Storage and Backends
Pick the storage that fits each runtime, and pick the replication target that fits your infrastructure. Switching from CouchDB to a custom REST endpoint is a configuration change, not a rewrite.

## Code Sample: RxDB Collection with CouchDB Replication

This is the closest match to a Hoodie setup. A local collection backed by IndexedDB, replicating with a CouchDB server.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';

const db = await createRxDatabase({
    name: 'hoodie_migration',
    storage: getRxStorageDexie(),
    multiInstance: true,
    eventReduce: true
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
                title: { type: 'string' },
                done: { type: 'boolean' },
                updatedAt: { type: 'string', format: 'date-time' }
            },
            required: ['id', 'title', 'done']
        }
    }
});

const replicationState = replicateCouchDB({
    replicationIdentifier: 'todos-couchdb-replication',
    collection: db.todos,
    url: 'http://localhost:5984/todos/',
    fetch: (url, options) => fetch(url, {
        ...options,
        credentials: 'include'
    }),
    live: true,
    pull: {},
    push: {}
});

replicationState.error$.subscribe(err => console.error('Sync error', err));
```

## Code Sample: Reactive Query

Where Hoodie returned plain promises, RxDB returns observables that re-emit whenever the result set changes. This works for local writes and for documents pulled from the server.

```ts
import { Subscription } from 'rxjs';

const query = db.todos.find({
    selector: { done: false },
    sort: [{ updatedAt: 'desc' }]
});

const sub: Subscription = query.$.subscribe(openTodos => {
    renderTodoList(openTodos);
});

// Adding a document anywhere triggers the subscription above
await db.todos.insert({
    id: 't-1',
    title: 'Migrate from Hoodie',
    done: false,
    updatedAt: new Date().toISOString()
});
```

The same query updates when a remote replication pulls in a new document, when another tab writes to the database, or when a peer pushes a change over WebRTC.

## Migration Notes from Hoodie and PouchDB to RxDB

A typical Hoodie migration follows these steps:

1. **Inventory your stores.** Each Hoodie store maps to an [RxCollection](../../rx-collection.md). Define a JSON Schema for each one, including the primary key.
2. **Keep CouchDB during the transition.** Point RxDB at the existing CouchDB databases using the [CouchDB replication plugin](../../replication-couchdb.md). Existing documents flow into the local RxDB store on first sync.
3. **Translate Hoodie queries.** `hoodie.store.findAll(...)` and filter callbacks become [RxQuery](../../rx-query.md) selectors with proper indexes.
4. **Replace event listeners.** `store.on('add', ...)` becomes a subscription to `collection.$` or to a query's `.$` observable. See [Reactivity](../../reactivity.md).
5. **Plan account migration.** Hoodie shipped its own account system. With RxDB you choose your auth provider and pass credentials into the replication `fetch` function.
6. **Decide on a long-term backend.** Many teams keep CouchDB. Others move to a custom HTTP endpoint using the [generic replication](../../replication-http.md) plugin so they can drop CouchDB entirely.

If you currently use PouchDB directly (with or without Hoodie), the migration is even smaller: replace the PouchDB instance with an RxDB collection, keep the same CouchDB server, and gain schemas, observables, and conflict handling on top.

## FAQ

<details>
<summary>Is Hoodie still maintained?</summary>

No. The Hoodie project has not seen meaningful commits for several years, the `hood.ie` website is offline, and the GitHub organization is effectively dormant. Running Hoodie today means relying on frozen dependencies with no security or compatibility updates.

</details>

<details>
<summary>Can I keep using CouchDB if I move to RxDB?</summary>

Yes. RxDB ships a [CouchDB replication plugin](../../replication-couchdb.md) that syncs directly with any CouchDB-compatible server. You can migrate the client without touching the server, then decide later whether to keep CouchDB or switch to a different backend.

</details>

<details>
<summary>Does RxDB give me a noBackend experience?</summary>

RxDB gives you a local-first experience where the client is the source of truth. You still need a sync target, but it can be an existing CouchDB cluster, a managed service, a small custom HTTP endpoint, or even peer-to-peer WebRTC sync. The frontend code stays focused on data, queries, and UI, much like Hoodie's noBackend ideal. See [Local-First](../../articles/local-first-future.md) for the broader pattern.

</details>

<details>
<summary>How do I migrate Hoodie data?</summary>

Point RxDB at your existing CouchDB databases through the [CouchDB replication plugin](../../replication-couchdb.md). On first run, RxDB pulls documents into the local store, validates them against your new JSON Schema, and keeps syncing on every change. For Hoodie account data, export the relevant `_users` and per-user databases the same way you would back up any CouchDB instance.

</details>

## Hoodie vs RxDB Comparison Table

| Feature | Hoodie | RxDB |
| --- | --- | --- |
| Project status | Unmaintained since around 2018 to 2019 | Actively maintained |
| Local storage | PouchDB only | Pluggable: IndexedDB, OPFS, SQLite, in-memory, and more |
| Backend | CouchDB only | CouchDB, HTTP, GraphQL, Firestore, WebRTC, custom |
| Schema validation | Optional, manual | Built-in JSON Schema with migrations |
| Reactive queries | No | Yes, RxJS observables |
| TypeScript support | Limited | First-class types |
| Multi-tab coordination | No | Yes, leader election and broadcast |
| Conflict handling | CouchDB default surface only | Custom conflict handler per collection |
| Mobile runtimes | Browser focused | Browser, Node.js, Electron, React Native |
| Account system | Built-in | Bring your own auth |
| Website / domain | `hood.ie` offline | `rxdb.info` active |

## Follow Up

If you maintain a Hoodie application and want a path forward that keeps the offline-first model, RxDB is the closest direct replacement. You can keep CouchDB during the transition, gain reactive queries and TypeScript on day one, and choose a long-term backend that fits your infrastructure.

More resources:

- [RxDB Sync Engine](../../replication.md)
- [CouchDB Replication](../../replication-couchdb.md)
- [HTTP Replication](../../replication-http.md)
- [Reactive Queries](../../rx-query.md)
- [Conflict Handling](../../transactions-conflicts-revisions.md)
- [Local-First Future](../../articles/local-first-future.md)
