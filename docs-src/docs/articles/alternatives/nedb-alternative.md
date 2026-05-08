---
title: RxDB as a NeDB Alternative for Node.js, Electron, and the Browser
slug: nedb-alternative.html
description: Replace unmaintained NeDB with RxDB. Get schema validation, MongoDB-style queries, observable results, multi-tab support, and replication on Node, Electron, and browsers.
---

# RxDB as a NeDB Alternative for Node.js, Electron, and the Browser

If you arrived here, you are likely running a project that depends on **NeDB** and you are looking for a maintained replacement. NeDB served many Node.js, Electron, and browser applications well during its active years, but the project has been frozen since 2016. Modern apps need schema validation, observable queries, multi-tab coordination, and replication, and a database that still receives security updates. **RxDB** fills that gap while keeping the embedded, document-oriented model that NeDB users are familiar with.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="RxDB JavaScript Database" width="220" />
    </a>
</center>

## A Short History of NeDB

NeDB (Node Embedded Database) was created around 2013 by Louis Chatriot. It became widely adopted because it offered a familiar **MongoDB-like API** without requiring a server process. A NeDB database was just a file, and the library appended each operation as a new line, then compacted the file in the background. That design made NeDB attractive for:

- **Node.js scripts and small servers** that wanted a local store without setting up MongoDB.
- **Electron and nw.js desktop apps** that needed to persist user data between sessions.
- **Browser-based applications** through storage adapters that wrote to IndexedDB or localStorage.

The query language mirrored MongoDB, so developers could use operators like `$gt`, `$in`, and `$regex` against documents, build indexes on fields, and project results. The last commit to the original repository landed in 2016, and the project was eventually marked as unmaintained. Several community forks exist, but none have grown into a widely supported successor.

## What is RxDB?

[RxDB](https://rxdb.info/) is a reactive, NoSQL, [offline-first](../../offline-first.md) database for JavaScript. It runs in the browser, in [Node.js](../../nodejs-database.md), in [Electron](../../electron-database.md), in React Native, and in any other JavaScript runtime. Documents are stored locally through a swappable storage layer, queries return observables that emit on every change, and an open [replication](../../replication.md) protocol keeps clients in sync with any backend.

RxDB has been under continuous development for nearly a decade and ships regular releases, security fixes, and new features. It treats the local database as the primary source of truth, which matches how teams build [local-first applications](../../articles/local-first-future.md) today.

## Where NeDB Falls Short

NeDB still works for trivial use cases, but production apps tend to hit hard limits:

### 1. Unmaintained for Nearly a Decade
The repository has had no updates since 2016. Reported issues sit open, dependency vulnerabilities are not patched, and the codebase predates many features of modern Node.js such as worker threads and async iterators.

### 2. Single-File Persistence Risks Corruption
NeDB writes operations as appended lines and rewrites the entire file during compaction. A crash during compaction can leave the database in a damaged state, and there is no built-in recovery beyond manual file inspection. Larger datasets also slow startup, because NeDB reloads the whole file into memory.

### 3. No Replication
NeDB has no sync layer. Sharing data between two devices, between a desktop client and a server, or between two browser tabs requires a custom solution that the developer has to build, test, and maintain.

### 4. No Observable Queries
Queries return promises or callbacks. To keep a UI in sync with the data, the application has to re-run queries manually after every write. That coupling between writes and reads quickly becomes the source of bugs in any non-trivial UI.

### 5. No Multi-Tab Coordination
A NeDB database opened in two browser tabs has no concept of shared state. Writes from one tab are invisible to the other unless the tabs communicate themselves through a `BroadcastChannel` or similar primitive.

### 6. No Schema Validation
NeDB is schemaless. Every document can have any shape, which sounds flexible at first but quickly leads to runtime errors when fields drift over time. There is no migration system either, so changing data shape has to be handled by the application.

## How RxDB Solves These Problems

RxDB keeps the document-oriented model that NeDB users like, and adds the features missing from NeDB:

- **Active maintenance**: continuous releases with security and feature updates.
- **Schema validation**: every collection is defined by an [RxSchema](../../rx-schema.md) based on JSON Schema, with versioning and migrations.
- **MongoDB-style queries**: the [RxQuery](../../rx-query.md) API supports the same operators NeDB users are accustomed to, including `$gt`, `$in`, `$regex`, `$elemMatch`, sorting, and skip/limit.
- **Observable queries**: queries expose RxJS observables, and the UI updates automatically when results change. See [Reactivity](../../reactivity.md).
- **Multi-tab support**: writes in one tab are streamed to all other tabs through `BroadcastChannel`, with conflict-safe storage handling under the hood.
- **Replication**: the [Sync Engine](../../replication.md) connects to any HTTP, GraphQL, CouchDB, WebRTC, or custom backend.
- **Durable storages**: RxDB ships with battle-tested storage adapters. Use SQLite or the filesystem on [Node.js](../../nodejs-database.md) and [Electron](../../electron-database.md), use [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [Dexie](../../rx-storage-dexie.md), or [SQLite-WASM](../../rx-storage-sqlite.md) in the browser.

## Code Sample: From NeDB to RxDB

A typical NeDB workflow looks like this:

```js
const Datastore = require('nedb');
const db = new Datastore({ filename: 'tasks.db', autoload: true });

db.insert({ _id: 't1', title: 'Write report', done: false }, (err, doc) => {
    // ...
});

db.find({ done: false }).sort({ title: 1 }).exec((err, docs) => {
    // ...
});
```

The same workflow in RxDB looks like this:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'tasks',
    storage: getRxStorageLocalstorage()
});

await db.addCollections({
    tasks: {
        schema: {
            title: 'task schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                title: { type: 'string' },
                done: { type: 'boolean' }
            },
            required: ['id', 'title', 'done']
        }
    }
});

await db.tasks.insert({ id: 't1', title: 'Write report', done: false });

const openTasks = await db.tasks
    .find({ selector: { done: false }, sort: [{ title: 'asc' }] })
    .exec();
```

The query syntax stays close to MongoDB, so most NeDB selectors translate directly. See the full [RxQuery documentation](../../rx-query.md) for supported operators.

## Code Sample: Subscribing to a Query

NeDB has no equivalent for the snippet below. With RxDB, the result list updates automatically whenever a matching document changes:

```ts
db.tasks
    .find({ selector: { done: false } })
    .$.subscribe(tasks => {
        renderTaskList(tasks);
    });

// Inserting a new task elsewhere in the app
await db.tasks.insert({ id: 't2', title: 'Send invoice', done: false });
// The subscriber above receives the updated array immediately.
```

This pattern removes the boilerplate of re-running queries after each write and keeps your UI consistent with the database state.

## Migration Notes

Most NeDB projects can move to RxDB in a few steps:

1. **Define a schema** for every NeDB datastore. Inspect a sample of existing documents to derive the field types and required properties. The schema is required by [RxCollection](../../rx-collection.md) and unlocks validation and migrations.
2. **Pick a storage**. On Node.js or Electron, use a durable storage like SQLite (see [Node.js Database](../../nodejs-database.md) and [Electron Database](../../electron-database.md)). In the browser, [IndexedDB](../../rx-storage-indexeddb.md) or [OPFS](../../rx-storage-opfs.md) are good defaults.
3. **Import data**. Read the existing NeDB file with the legacy library, normalize each document so it matches the new schema, and call `bulkInsert` on the corresponding RxDB collection. NeDB uses `_id` as the primary key, while RxDB lets you choose any field, so a small rename is often required.
4. **Translate queries**. Most selectors port over with no changes. Replace callback APIs with async/await, and replace manual re-runs with `.$` observables where you want reactive updates.
5. **Add replication if needed**. If your old setup synced data through a custom mechanism, replace it with the official [RxDB replication](../../replication.md).

A migration script that runs once on first launch is often enough. After a successful import, the legacy NeDB file can be deleted.

## FAQ

<details>
<summary>Is NeDB maintained?</summary>

No. The original NeDB repository has not received commits since 2016 and is archived. Issues remain open, and dependency security advisories are not addressed. Community forks exist, but none provide the long-term support that an active project like RxDB offers.

</details>

<details>
<summary>Can I keep MongoDB-style queries in RxDB?</summary>

Yes. RxDB queries use the same selector format as MongoDB and NeDB, including operators like `$gt`, `$lt`, `$in`, `$nin`, `$regex`, and `$elemMatch`, plus `sort`, `skip`, and `limit`. See the [RxQuery documentation](../../rx-query.md) for the full list.

</details>

<details>
<summary>Is RxDB safe to use in Electron?</summary>

Yes. RxDB ships official guidance and storage options for Electron, including SQLite-backed storages that store data on the local filesystem. The [Electron Database](../../electron-database.md) page covers configuration in both the main and renderer processes, including multi-window setups.

</details>

<details>
<summary>How do I migrate data from NeDB to RxDB?</summary>

Read the existing NeDB file with the legacy library, define an RxDB schema that matches the documents, and call `bulkInsert` on the new collection. Rename `_id` to your chosen primary key while you copy the data. After verifying the import, the old NeDB file can be removed.

</details>

## Comparison Table

| Feature | NeDB | RxDB |
| --- | --- | --- |
| Maintenance status | Last commit 2016, archived | Active, regular releases |
| Query language | MongoDB-like | MongoDB-like ([RxQuery](../../rx-query.md)) |
| Schema validation | None | JSON Schema based ([RxSchema](../../rx-schema.md)) |
| Observable queries | No | Yes, via RxJS ([Reactivity](../../reactivity.md)) |
| Multi-tab support | No | Yes |
| Replication | None | Built-in ([Sync Engine](../../replication.md)) |
| Browser storage | IndexedDB adapter | [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [Dexie](../../rx-storage-dexie.md), [SQLite-WASM](../../rx-storage-sqlite.md) |
| Node.js storage | Single-file append log | SQLite, filesystem, memory ([Node.js Database](../../nodejs-database.md)) |
| Electron storage | Single-file append log | Durable storages ([Electron Database](../../electron-database.md)) |
| Migrations | Manual | Built-in schema migrations |
| TypeScript support | Community typings | First-class TypeScript |
| Encryption | None | Optional plugin |
| Compression | None | Optional plugin |

## Follow Up

RxDB gives NeDB users a maintained, document-oriented database with the same MongoDB-style query language, plus the features modern apps require: schemas, observable queries, multi-tab coordination, and [replication](../../replication.md). Read the [Quickstart](../../quickstart.md), pick a storage that fits your runtime, and port your collections over with a short migration script.

More resources:

- [RxDB on GitHub](/code/)
- [Local-First Future](../../articles/local-first-future.md)
- [Offline-First Guide](../../offline-first.md)
- [RxDB Sync Engine](../../replication.md)
