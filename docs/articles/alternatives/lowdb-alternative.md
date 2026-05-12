# RxDB as a LowDB Alternative for Node.js and Beyond

> Compare RxDB and LowDB. See where the JSON-file approach stops scaling and how RxDB adds reactivity, schema validation, and replication for Node.js apps.

# RxDB as a LowDB Alternative for Node.js and Beyond

[LowDB](https://github.com/typicode/lowdb) is a small JSON file database that fits a specific niche: tiny CLIs, prototypes, configuration stores, and demo servers. The API is straightforward, the data sits in a single `db.json` file, and the whole library is a few kilobytes. For projects where the data set stays small and the access pattern is single-process and synchronous-feeling, LowDB does the job.

Teams tend to outgrow LowDB once the application requires any of the following:

- Reactive UI updates when data changes.
- Replication between clients, servers, or peers.
- Schema validation enforced at write time.
- Concurrent access from multiple processes or threads.
- Storage that scales past a JSON blob loaded fully into memory.

This page walks through where LowDB fits, where it does not, and how [RxDB](https://rxdb.info/) covers the same ground while adding the features needed for production-sized Node.js, Electron, and web applications.

<center>
    
        
    
</center>

## A Short History of LowDB

LowDB was created by Typicode, the author of the popular `json-server` project. It was released in 2014 as a way to give Node.js scripts a database-like API without running a separate process. The original versions used [Lodash](https://lodash.com/) chains as the query language: developers wrote `db.get('posts').find({ id: 1 }).value()` and Lodash handled the filtering against an in-memory copy of the JSON file.

Over the years LowDB picked up adapters for browsers, atomic file writes, and TypeScript types. Version 5 dropped CommonJS support and shipped as ESM only, which aligned the project with modern Node.js but cut off some legacy users. The data model stayed the same: load a JSON document into memory, mutate it through a JavaScript proxy, and write it back to disk on save.

That model is the source of both LowDB's appeal and its limits. It is easy to read and easy to debug because the database is a plain file. It is also bound by the size of process memory, the cost of full-file writes, and the absence of any change feed.

## What is RxDB?

[RxDB](https://rxdb.info/) is a [local-first](../../articles/local-first-future.md) database for JavaScript. It runs in browsers, Node.js, Electron, React Native, and Deno, and stores data through a pluggable storage layer that can sit on top of IndexedDB, OPFS, SQLite, MongoDB, or in-memory engines. Queries are reactive by default: a query observable emits a new result set whenever a matching document changes, no matter which tab, process, or remote peer wrote the change.

The feature set centers on three ideas:

- A typed [collection](../../rx-collection.md) backed by a [JSON schema](../../rx-schema.md).
- A [reactive query](../../rx-query.md) layer powered by [RxJS](../../reactivity.md).
- A pluggable [replication](../../replication.md) protocol that can sync with HTTP, GraphQL, WebRTC, CouchDB, Firestore, and custom servers.

That combination matches the points where LowDB users tend to hit a wall.

## Where LowDB Falls Short

### One JSON File Does Not Scale

LowDB reads the entire database into memory and rewrites the full JSON file on save. A few hundred records work fine. A few hundred thousand records produce slow startup, slow writes, and high memory use. There are no indexes; every query is a linear scan over JavaScript arrays.

### No Change Observability

LowDB has no event bus and no change feed. If a CLI writes a record, a connected UI cannot find out unless it polls the file. RxDB exposes [observable queries and document streams](../../reactivity.md), so any subscriber sees the new state without polling.

### No Replication

LowDB is a single-node store. Sharing data across two devices, two processes, or a server and a browser requires building a transport on top. RxDB ships with a [replication protocol](../../replication.md) and adapters for HTTP, GraphQL, WebSocket, WebRTC, CouchDB, and Firestore.

### No Schema Validation

LowDB types come from the TypeScript generic the developer provides at construction time. There is no runtime check, so a malformed write reaches the file. RxDB validates every write against the [collection schema](../../rx-schema.md), which catches bad data before it lands on disk.

### No Multi-Process Safety

Two Node.js processes opening the same LowDB file race on read and write. The last writer wins and silently overwrites the other process's changes. RxDB storages such as the SQLite or IndexedDB adapters coordinate writes, and the [multi-instance support](../../rx-collection.md) broadcasts changes between tabs and workers.

## What RxDB Adds

- **Scalable storages on Node.js.** Pick from SQLite, MongoDB, in-memory, or filesystem-backed engines. See [Node.js database options](../../nodejs-database.md).
- **Schema validation.** Enforce types, ranges, and required fields with [JSON Schema](../../rx-schema.md).
- **Reactive queries.** Subscribe with `.$` and receive new results whenever the underlying data changes. See [RxQuery](../../rx-query.md) and [reactivity](../../reactivity.md).
- **Replication.** Sync to your own backend or a peer with the [replication protocol](../../replication.md).
- **MongoDB-style query operators.** Use `$gt`, `$in`, `$regex`, and the rest of the Mango query set.
- **Offline-first behavior.** Reads and writes work without a network. See [offline-first](../../offline-first.md).
- **Observable changes.** Every collection exposes an event stream of inserts, updates, and deletes.

## Code Sample: A LowDB Lodash Chain in RxDB

A typical LowDB read against a `posts` array filters by author and sorts by date:

```ts
// LowDB
import { JSONFilePreset } from 'lowdb/node';

const db = await JSONFilePreset('db.json', { posts: [] });
const recentByAuthor = db.data.posts
    .filter(p => p.author === 'alice')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);
```

The same query in RxDB uses the [RxQuery](../../rx-query.md) API:

```ts
// RxDB
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'blog',
    storage: getRxStorageLocalstorage()
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
                author: { type: 'string', maxLength: 100 },
                title: { type: 'string' },
                createdAt: { type: 'number' }
            },
            required: ['id', 'author', 'createdAt'],
            indexes: ['author', 'createdAt']
        }
    }
});

const recentByAuthor = await db.posts.find({
    selector: { author: 'alice' },
    sort: [{ createdAt: 'desc' }],
    limit: 10
}).exec();
```

The schema enforces field types, the index makes the author and date filter fast, and the query result is identical in shape to the LowDB output.

## Code Sample: Subscribing to Live Query Results

LowDB has no equivalent for this. In RxDB the same query becomes a stream:

```ts
const query = db.posts.find({
    selector: { author: 'alice' },
    sort: [{ createdAt: 'desc' }],
    limit: 10
});

query.$.subscribe(results => {
    console.log('latest posts by alice:', results.map(r => r.title));
});

// Any insert, update, or delete that affects the result set
// triggers a new emission, even from another tab or process.
await db.posts.insert({
    id: 'p1',
    author: 'alice',
    title: 'Hello',
    createdAt: Date.now()
});
```

A CLI dashboard, an Electron window, or a React component can bind directly to `query.$` and stay in sync with the database without manual reload logic.

## When LowDB is Still the Right Pick

LowDB stays a sensible choice when the project meets all of these conditions:

- The data set is small, in the order of a few thousand records or less.
- One process owns the file at a time.
- No client other than the writing process needs to react to changes.
- No replication, sync, or multi-device support is on the roadmap.
- The team values a zero-configuration, single-file database for prototyping or a tiny CLI config store.

For a `git`-style config file, a personal todo CLI, or a fixture file used in tests, LowDB stays lean and pleasant to use. For anything that grows past one process or one screen, RxDB is built for the next step.

## FAQ

<details>
<summary>Is RxDB overkill for prototyping?</summary>

No. RxDB runs in a single file with the in-memory storage and adds about a minute of setup. The schema and reactive query features pay off as soon as a UI binds to the data, which usually happens early in a prototype. Teams that start with RxDB avoid rewriting the data layer once the prototype turns into a product.

</details>

<details>
<summary>Can RxDB read and write a JSON file?</summary>

RxDB does not store one big JSON document, but the [import and export helpers](../../rx-database.md) serialize a database to JSON for backup or seeding. For a `db.json` style fixture used in tests, the export output is a drop-in equivalent. For runtime storage, an indexed engine like SQLite or IndexedDB performs better than re-writing a JSON file on every change.

</details>

<details>
<summary>Does RxDB run server-side?</summary>

Yes. RxDB runs in [Node.js](../../nodejs-database.md) with adapters for SQLite, MongoDB, filesystem, and in-memory storage. A Node.js process can act as a server, a CLI, or a worker, and replicate with browser clients through HTTP, GraphQL, or WebSocket transports.

</details>

<details>
<summary>How does RxDB compare on bundle size?</summary>

LowDB's core is a couple of kilobytes because it does very little. RxDB's core ships around 50 KB gzipped with reactive queries, schema validation, and the replication protocol included. Plugins are tree-shakeable, so an app only pays for the storages and replication adapters it imports.

</details>

## Comparison Table

| Feature | LowDB | RxDB |
| --- | --- | --- |
| Storage model | Single JSON file in memory | Pluggable: IndexedDB, OPFS, SQLite, MongoDB, in-memory, filesystem |
| Query language | Lodash chains and array methods | MongoDB-style selectors with `$gt`, `$in`, `$regex`, sort, limit |
| Indexes | None | Declared in schema, used by the query planner |
| Schema validation | TypeScript generics only | Runtime [JSON Schema](../../rx-schema.md) validation |
| Reactivity | None | [Observable queries and documents](../../reactivity.md) |
| Replication | None | HTTP, GraphQL, WebSocket, WebRTC, CouchDB, Firestore |
| Multi-process safety | Last writer wins | Coordinated through the storage layer and event bus |
| Offline-first | Yes, by default file-based | Yes, designed for [offline-first](../../offline-first.md) |
| Runtimes | Node.js, browser (with adapters) | Node.js, browser, Electron, React Native, Deno, Bun |
| Bundle size | A few KB | About 50 KB gzipped core, tree-shakeable plugins |
| Best fit | CLI configs, prototypes, tiny demos | Production apps that need reactivity, sync, or scale |

For a deeper look at the building blocks, see the [RxCollection guide](../../rx-collection.md), the [RxSchema reference](../../rx-schema.md), and the [replication overview](../../replication.md). For Node.js specific choices, the [Node.js database page](../../nodejs-database.md) covers the available storages.
