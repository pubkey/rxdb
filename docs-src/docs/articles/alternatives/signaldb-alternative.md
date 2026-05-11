---
title: RxDB as a SignalDB Alternative for Local-First JavaScript Apps
slug: signaldb-alternative.html
description: Compare SignalDB and RxDB for local-first JavaScript apps. See how RxDB adds durable storage, replication, and conflict handling beyond in-memory signals.
---

# RxDB as a SignalDB Alternative for Local-First JavaScript Apps

Teams that adopt [SignalDB](https://signaldb.js.org/) usually want a tiny, reactive store that plays well with framework signals in Vue, Solid, or React. The MongoDB-style API feels familiar, the in-memory engine is fast, and reactive queries plug straight into component re-renders. The trade-offs show up later: persistence is opt-in, replication is left to the developer, and the storage layer has fewer adapters than long-running local-first databases.

This page compares SignalDB with **RxDB** and shows when each tool fits. It also covers a hybrid setup where SignalDB handles the reactive UI layer while RxDB takes over persistence, multi-tab coordination, and backend sync.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## A Short History of SignalDB

SignalDB appeared in 2023 and matured through 2024 with contributions from Maximilian Stoiber and a small open-source community. The project targets developers who already think in **signals**: fine-grained reactive primitives popularized by Solid, Vue's `ref`, Preact signals, and Angular signals. SignalDB exposes a MongoDB-style query API (`find`, `findOne`, `insert`, `updateOne`) and returns reactive cursors that re-evaluate when signal dependencies change.

By default SignalDB stores data **in memory**. Persistence is added through adapters (localStorage, OPFS, custom). Sync is also pluggable: SignalDB ships a sync manager interface and expects the application to bring its own transport, conflict policy, and server. This minimalism keeps the bundle small and the API approachable, but it pushes a lot of work onto the integrator once an app needs offline guarantees, multi-device sync, or large datasets.

## What Is RxDB?

[RxDB](https://rxdb.info/) is a [local-first](../../offline-first.md), NoSQL JavaScript database that has been developed since 2016. It runs in browsers, Node.js, Electron, React Native, Deno, Bun, and Capacitor. Data is stored through a swappable [RxStorage](../../rx-storage-dexie.md) layer, queried with a Mongo-style selector engine, and observed through RxJS. The [Sync Engine](../../replication.md) provides a battle-tested protocol for [HTTP](../../replication-http.md), WebSocket, GraphQL, CouchDB, Firestore, NATS, and custom backends.

RxDB treats storage, queries, and replication as first-class primitives rather than optional add-ons. That maturity is the main reason teams move to it after outgrowing a smaller library.

## Where SignalDB Hits Its Limits

SignalDB is well designed for what it covers, but several gaps appear in production workloads:

- **In-memory by default.** Data lives in RAM. A page reload wipes the collection unless you wire up a persistence adapter. Large datasets compete with the rest of the JS heap.
- **Bring-your-own sync.** The sync manager is an interface, not a protocol. You implement pull, push, checkpoints, retry, and conflict handling. Real-world sync is harder than it looks once partial offline writes and reconnects enter the picture.
- **Fewer storage adapters.** The list of supported backends is short compared to RxDB's storage matrix that covers IndexedDB, OPFS, Dexie, SQLite, Memory, MongoDB, DenoKV, FoundationDB, and more.
- **Limited multi-client guarantees.** SignalDB does not include built-in [multi-tab coordination](../../rx-storage-indexeddb.md) or leader election. Two open tabs can drift unless you build that yourself.
- **Smaller ecosystem.** Community plugins, examples, and long-term issue history are thinner. For business apps that ship for years, ecosystem depth matters.
- **No schema-driven migrations.** SignalDB collections are loosely typed at runtime. RxDB enforces JSON Schema and runs versioned migrations on schema changes.

## Why Teams Pick RxDB Instead

### Durable storage with a swappable engine

RxDB writes through an [RxStorage](../../rx-storage-dexie.md) interface. Pick the storage that fits the runtime:

- [IndexedDB](../../rx-storage-indexeddb.md) for broad browser support.
- [OPFS](../../rx-storage-opfs.md) for high-throughput browser writes via the Origin Private File System.
- [Dexie](../../rx-storage-dexie.md) for a lightweight IndexedDB wrapper.
- [Memory](../../rx-storage-memory.md) for tests and ephemeral state.
- SQLite, MongoDB, DenoKV, and FoundationDB on the server side.

Switching engines is a one-line change. The query, replication, and reactivity layers stay identical.

### A real replication protocol

The [RxDB Sync Engine](../../replication.md) defines pull, push, checkpoint, and conflict semantics so applications do not reinvent them. Plugins exist for [HTTP](../../replication-http.md), WebSocket, GraphQL, CouchDB, Firestore, Supabase, NATS, and P2P. Conflict handlers are explicit functions you control per collection.

### MongoDB-style queries with reactivity

Both libraries expose a Mongo-like API. RxDB extends it with [observable queries](../../rx-query.md) that emit through RxJS, plus [framework hooks](../../reactivity.md) for React, Vue, Svelte, Solid, and Angular signals.

### Multi-tab and conflict resolution out of the box

Open the same app in three tabs. RxDB elects a leader, broadcasts changes, and keeps queries in sync across tabs without extra code. Custom conflict handlers run on every replication round and decide how concurrent edits merge.

### Mature ecosystem since 2016

RxDB has a decade of releases, paid support options, and production deployments at scale. The [local-first](../../articles/local-first-future.md) movement has grown around projects like RxDB precisely because long-running data layers need this kind of stability.

## Code Sample: Collection and Reactive Query in RxDB

```ts
import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const db = await createRxDatabase({
    name: 'tasksdb',
    storage: getRxStorageDexie()
});

await db.addCollections({
    tasks: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 40 },
                title: { type: 'string' },
                done: { type: 'boolean' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'title', 'done', 'updatedAt']
        }
    }
});

// Reactive query: emits whenever the result set changes,
// across tabs and after replication updates.
const openTasks$ = db.tasks
    .find({ selector: { done: false } })
    .sort({ updatedAt: 'desc' })
    .$;

openTasks$.subscribe(tasks => {
    console.log('Open tasks:', tasks.length);
});

await db.tasks.insert({
    id: 't1',
    title: 'Write SignalDB comparison',
    done: false,
    updatedAt: Date.now()
});
```

See [RxCollection](../../rx-collection.md) and [RxQuery](../../rx-query.md) for the full surface.

## Code Sample: HTTP Replication

The [HTTP replication plugin](../../replication-http.md) syncs an RxDB collection with any REST endpoint that exposes pull and push routes.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    collection: db.tasks,
    replicationIdentifier: 'tasks-http-replication',
    pull: {
        async handler(checkpoint, batchSize) {
            const url = `/api/tasks/pull?since=${checkpoint?.updatedAt ?? 0}&limit=${batchSize}`;
            const response = await fetch(url);
            const data = await response.json();
            return {
                documents: data.documents,
                checkpoint: data.checkpoint
            };
        }
    },
    push: {
        async handler(changeRows) {
            const response = await fetch('/api/tasks/push', {
                method: 'POST',
                body: JSON.stringify(changeRows)
            });
            return await response.json(); // conflicts, if any
        }
    },
    live: true,
    retryTime: 5000
});

replicationState.error$.subscribe(err => console.error(err));
```

The same protocol scales to multi-device sync, partial replication by user or tenant, and resumable transfers after the device goes offline.

## Running SignalDB on Top of RxDB Persistence

A pattern that has emerged in the local-first community is to use SignalDB for **front-end reactivity** while delegating storage and sync to RxDB. SignalDB exposes a persistence adapter interface, so an RxDB-backed adapter can:

1. Read from an [RxCollection](../../rx-collection.md) on startup and feed the documents into the SignalDB collection.
2. Forward SignalDB writes to RxDB so they hit durable storage.
3. Subscribe to RxDB's change stream and push remote updates back into SignalDB so signals re-emit.

The result keeps the signal-friendly API that Vue, Solid, and React components consume, while RxDB handles IndexedDB or OPFS persistence, multi-tab coordination, schema migrations, and backend replication. This hybrid is a pragmatic upgrade path for teams already invested in SignalDB but hitting its persistence or sync limits.

## FAQ

<details>
<summary>Does RxDB integrate with framework signals?</summary>

Yes. RxDB ships a [reactivity adapter API](../../reactivity.md) that maps observable queries to Vue refs, Angular signals, Solid signals, Svelte stores, and Preact signals. Component code reads collections through the framework's native primitive while RxDB drives updates underneath.

</details>

<details>
<summary>Can SignalDB persist with RxDB?</summary>

Yes. SignalDB's persistence interface accepts a custom adapter. An RxDB-backed adapter stores documents in an [RxCollection](../../rx-collection.md), which gives SignalDB durable storage on IndexedDB, OPFS, SQLite, or any other RxStorage, plus the full [RxDB sync engine](../../replication.md) for backend replication.

</details>

<details>
<summary>How mature is each project?</summary>

RxDB has been developed since 2016, ships regular releases, and runs in production across browsers, Node.js, Electron, React Native, Deno, and Bun. SignalDB started in 2023 and is still expanding its adapter and sync surface. For long-lived applications, RxDB's release history and ecosystem are the safer bet.

</details>

<details>
<summary>How does query syntax compare?</summary>

Both libraries use a MongoDB-style selector. RxDB queries return [RxQuery](../../rx-query.md) objects with `.exec()` for one-shot reads and `.$` for an observable that emits on every change, including changes from other tabs and replication. SignalDB returns reactive cursors tied to its signal runtime. Migrating selectors between the two is mostly mechanical.

</details>

## Comparison Table

| Feature | SignalDB | RxDB |
| --- | --- | --- |
| First release | 2023 | 2016 |
| Default storage | In memory | Durable via RxStorage |
| Storage adapters | localStorage, OPFS, custom | IndexedDB, OPFS, Dexie, Memory, SQLite, MongoDB, DenoKV, FoundationDB, more |
| Query API | MongoDB-style, reactive cursors | MongoDB-style, [observable queries](../../rx-query.md) |
| Reactivity | Framework signals | RxJS plus [framework adapters](../../reactivity.md) for React, Vue, Svelte, Solid, Angular |
| Schema and migrations | Loose typing | JSON Schema with versioned migrations |
| Replication | Bring-your-own sync interface | Built-in [Sync Engine](../../replication.md) with [HTTP](../../replication-http.md), WebSocket, GraphQL, CouchDB, Firestore, NATS, P2P |
| Conflict resolution | Application-defined | Per-collection conflict handlers |
| Multi-tab support | Manual | Built-in leader election and broadcast |
| Runtimes | Browser, Node.js | Browser, Node.js, Electron, React Native, Deno, Bun, Capacitor |
| Ecosystem age | New | Decade of releases and plugins |

For more on the broader shift toward client-side data ownership, see [The Future of Local-First Apps](../../articles/local-first-future.md) and the [offline-first guide](../../offline-first.md).
