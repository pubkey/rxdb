---
title: Best IndexedDB Wrapper - Compare Dexie, idb, localForage, PouchDB and RxDB
slug: best-indexeddb-wrapper.html
description: Compare the best IndexedDB wrappers for JavaScript. Features, performance, and a feature table for Dexie, idb, localForage, PouchDB, LokiJS and RxDB.
image: /headers/best-indexeddb-wrapper.jpg
---

import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_DATA_BROWSER, PERFORMANCE_METRICS } from '@site/src/components/performance-data';
import {Faq, FaqItem} from '@site/src/components/faq';

# Best IndexedDB Wrapper

[IndexedDB](../../rx-storage-indexeddb.md) is the standard [browser storage](../browser-storage.md) API for structured data. Every modern browser ships it, it can store megabytes to gigabytes of JSON and binary data, and it works offline. But the native API is low-level and verbose. It relies on event callbacks, forces you to open a transaction for every read and write, and gives you nothing to query with beyond simple key ranges.

That is why almost nobody uses raw IndexedDB directly. Instead you pick an **IndexedDB wrapper**: a library that hides the callbacks, adds promises, and often layers queries, schemas, and reactivity on top.

This page lists the most used IndexedDB wrappers, compares their features and performance, and ends with a feature table so you can pick the right one for your app.

<RxdbLogo alt="JavaScript IndexedDB wrapper" />

## Why You Need a Wrapper

The native IndexedDB API was designed as a building block for library authors, not for application code. Writing directly against it bites back quickly:

- **Callback based**: You handle `onsuccess` and `onerror` on every request, which nests control flow and makes error handling hard.
- **Manual transactions**: Every operation needs an explicit transaction and object store lookup, which is repetitive boilerplate.
- **No real queries**: You can only match by key or key range. Anything like "find users older than 18 sorted by name" means iterating a cursor by hand. See [Slow IndexedDB](../../slow-indexeddb.md) for why this also hurts performance.
- **No schema**: IndexedDB stores anything. That sounds flexible until inconsistent documents crash your app at runtime.
- **No change events**: There is no way to subscribe to data changes, so you build your own event bus to keep the UI in sync.

A wrapper solves some or all of these. The wrappers below sit on a spectrum. On one end are thin promise shims that only remove the callback pain. On the other end are full databases that happen to use IndexedDB as one of several storage backends.

## The IndexedDB Wrappers

### Dexie.js

[Dexie.js](https://dexie.org/) is the most popular minimalist wrapper. It gives you a clean promise based API, a fluent query builder (`db.users.where('age').above(18).toArray()`), and a schema declaration for indexes. It is small, well documented, and battle-tested in production.

Keep in mind that Dexie's queries are indexed range queries, not full NoSQL-style queries. The `where()` builder works on fields you declared as indexes, with operators like `above()`, `below()`, `between()`, `anyOf()`, and `startsWith()`. Anything beyond an indexed field falls back to `.filter()`, which runs a linear in-memory scan over the matched rows. There is no Mango-style selector language with `$or`, `$gt` on arbitrary fields, or nested field conditions like RxDB has. So Dexie is ergonomic for index-driven lookups, not for rich ad-hoc queries.

Dexie stays close to IndexedDB. It does not add its own document format on top, so writes go almost straight through to the store. It also offers `liveQuery()` for reactive results and a paid add-on for server sync.

**Good for**: apps that want ergonomic IndexedDB access with indexed range queries and a small footprint.

**Falls short when**: you need rich NoSQL queries, built-in replication, conflict handling, or schema validation beyond index declarations.

### idb

[idb](https://github.com/jakearchibald/idb) by Jake Archibald is the thinnest wrapper of all. It is a tiny promise based mirror of the raw IndexedDB API, under 1 KB. It does not add queries, schemas, or reactivity. It only replaces the callback style with promises and async iterators.

**Good for**: library authors and developers who want full control over IndexedDB with almost no abstraction and no bundle cost.

**Falls short when**: you want queries, indexes as a first-class concept, or any database feature. You still write low-level store and transaction code.

### localForage

[localForage](https://localForage.github.io/localForage/) is a key-value wrapper with automatic fallbacks. It picks IndexedDB when available and falls back to WebSQL or localStorage. The API is `getItem`, `setItem`, `removeItem`, so it feels like localStorage but async and with larger limits.

**Good for**: caching blobs or JSON values by key when you do not need queries.

**Falls short when**: you need to query by anything other than the key. There are no indexes, no filtering, and no sorting. We wrote a dedicated [localForage alternative](../alternatives/localforage-alternative.md) comparison.

### PouchDB

[PouchDB](https://pouchdb.com/) is a full document database that runs in the browser on top of IndexedDB and syncs with [CouchDB](../alternatives/couchdb-alternative.md). It brings a document model, map/reduce views, and a proven replication protocol.

PouchDB is capable but heavy. The revision tree it keeps for conflict handling grows the storage size, and its performance on large datasets in IndexedDB is a known pain point. See the [PouchDB alternative](../alternatives/pouchdb-alternative.md) page for details.

**Good for**: apps that sync with a CouchDB backend and want offline replication out of the box.

**Falls short when**: you care about bundle size and write performance, or you do not use CouchDB on the server.

### JsStore

[JsStore](https://jsstore.net/) wraps IndexedDB with an SQL-like query API and runs the work inside a Web Worker so heavy queries do not block the main thread. You write queries as JSON objects that resemble SQL statements.

**Good for**: teams that prefer an SQL mental model and want queries off the main thread.

**Falls short when**: you want a promise-native document API or a large ecosystem. The community is smaller than Dexie's.

### LokiJS

[LokiJS](https://github.com/techfort/LokiJS) is an in-memory document store with an optional IndexedDB persistence adapter. Because it queries in memory, reads are fast once loaded, but the whole dataset must fit in RAM and gets serialized to IndexedDB in bulk.

LokiJS is no longer actively maintained, which matters for a dependency at the core of your app.

**Good for**: small datasets that fit in memory and need fast in-memory filtering.

**Falls short when**: your data grows past what fits in RAM, or you need an actively maintained library. See the [LokiJS alternative](../alternatives/lokijs-alternative.md) page.

### RxDB

[RxDB](https://rxdb.info/) (Reactive Database) is a local-first, NoSQL database for JavaScript applications. It runs in the browser, Node.js, Electron, React Native, Capacitor, Deno, and Bun. It uses IndexedDB (or faster storages like [OPFS](../../rx-storage-opfs.md)) under the hood through its [RxStorage](../../rx-storage.md) layer, and adds a full database on top.

RxDB is not only a wrapper. It gives you [JSON Schema](../../rx-schema.md) validation, MongoDB-style (Mango) [queries](../../rx-query.md) with indexes, [reactive queries](../../reactivity.md) that re-emit when data changes, [multi-tab](../../rx-storage-indexeddb.md) coordination, schema [migrations](../../migration-schema.md), [encryption](./indexeddb-encryption.md), and a [Sync Engine](../../replication.md) for realtime replication with many backends.

The important part for performance is the storage abstraction. RxDB does not lock you to IndexedDB. Switching storages is a configuration change, not a rewrite, so you can start on IndexedDB and move to OPFS when you need more speed.

**Good for**: apps that need a real client-side database with queries, reactivity, and sync, on any JavaScript runtime.

**Falls short when**: you only want to store a handful of key-value flags. For that a thin wrapper like idb or localForage is enough.

## Performance Comparison

Raw IndexedDB is slow, and a thin wrapper cannot make the underlying store faster. It only removes the callback overhead. So for the thin wrappers (idb, Dexie, localForage) the performance is close to native IndexedDB, plus the small cost of the abstraction.

The chart below compares native IndexedDB, Dexie.js, and RxDB storages (IndexedDB-based and the OPFS storage) across common operations. Lower is better.

<PerformanceChart title="Browser Storages" data={PERFORMANCE_DATA_BROWSER} metrics={PERFORMANCE_METRICS} />

Two things stand out. First, Dexie's bulk insert is slower than writing straight to IndexedDB because of the extra work it does per document. Second, the [OPFS storage](../../rx-storage-opfs.md) that RxDB can use beats plain IndexedDB by a wide margin on most operations, which is impossible with an IndexedDB-only wrapper. You can reproduce all of these tests in the [RxStorage performance](../../rx-storage-performance.md) repo.

The takeaway: if your bottleneck is IndexedDB itself, no wrapper that only wraps IndexedDB will help. You need a library that can swap the storage engine.

## How to Choose

- Pick **idb** when you want the smallest possible promise shim and will write store logic yourself.
- Pick **Dexie.js** when you want ergonomic indexed queries with a small footprint and no sync.
- Pick **localForage** when you only store values by key and want localStorage-style code.
- Pick **PouchDB** when you sync with a CouchDB backend and accept the size and speed cost.
- Pick **JsStore** when you prefer SQL-style queries running in a Web Worker.
- Pick **RxDB** when you need a real database: schemas, reactive queries, multi-tab, migrations, and [replication](../../replication.md), with the option to run faster storages than IndexedDB.

## FAQ

<Faq>
<FaqItem question="What is the best IndexedDB wrapper?">

It depends on the job. For a thin promise layer, **[idb](https://github.com/jakearchibald/idb)** is the smallest. For indexed queries with a small footprint, **[Dexie.js](https://dexie.org/)** is the popular choice. For a full client-side database with reactivity and sync, **[RxDB](../../rx-database.md)** does more than wrap IndexedDB and can run faster storages like OPFS underneath.

</FaqItem>
<FaqItem question="Is Dexie.js faster than raw IndexedDB?">

No. Dexie sits on top of IndexedDB and adds a small overhead per operation, so bulk writes are slower than writing straight to the store. It buys you a cleaner API and query builder, not more speed. To go faster than IndexedDB you need a different storage engine such as the **[OPFS storage](../../rx-storage-opfs.md)**.

</FaqItem>
<FaqItem question="Do I need a wrapper or can I use IndexedDB directly?">

You can use it directly, but the native API is callback based, needs a transaction per operation, and has no real query support. Most teams pick a wrapper to avoid that boilerplate. See the [IndexedDB alternative](../indexeddb-alternative.md) page for a full breakdown of the raw API's problems.

</FaqItem>
<FaqItem question="Which wrapper supports offline sync with a server?">

**PouchDB** syncs with CouchDB, and **[RxDB](../../replication.md)** ships a Sync Engine that replicates with many backends including CouchDB, GraphQL, HTTP, Supabase, Firestore, and its own replication server. Thin wrappers like idb, Dexie, and localForage do not include replication.

</FaqItem>
<FaqItem question="Can RxDB replace IndexedDB entirely?">

Yes. RxDB uses IndexedDB as one storage backend but abstracts it behind [RxStorage](../../rx-storage.md). You can switch to OPFS, in-memory, SQLite, or other storages without changing your application code, which is why RxDB is not tied to IndexedDB performance.

</FaqItem>
</Faq>

## Comparison Table

| Feature | RxDB | idb | Dexie.js | localForage | PouchDB | LokiJS |
| --- | --- | --- | --- | --- | --- | --- |
| Data model | Documents in collections | Raw stores | Tables + indexes | Key-value | Documents | Documents (in-memory) |
| Promise API | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ callback |
| Queries | ✅ Mango + indexes | ❌ | ⚠️ indexed range + `filter()` | ❌ | ✅ map/reduce | ✅ in-memory |
| Schema validation | ✅ JSON Schema | ❌ | ⚠️ indexes only | ❌ | ❌ | ❌ |
| Reactivity | ✅ observable queries | ❌ | ⚠️ liveQuery | ❌ | ⚠️ changes feed | ⚠️ events |
| Multi-tab sync | ✅ built in | ❌ | ⚠️ manual | ❌ | ❌ | ❌ |
| Replication | ✅ many backends | ❌ | ⚠️ paid add-on | ❌ | ✅ CouchDB | ❌ |
| Migrations | ✅ strategies | ❌ | ✅ versioned | ❌ | ⚠️ manual | ❌ |
| Encryption | ✅ plugin | ❌ | ⚠️ add-on | ❌ | ⚠️ plugin | ❌ |
| Storage backends | IndexedDB, OPFS, SQLite, memory, more | IndexedDB | IndexedDB | IndexedDB, WebSQL, localStorage | IndexedDB | IndexedDB, memory, files |
| Bundle size | Medium | Tiny | Small | Small | Large | Small |
| Active development | Active | Low | Active | Low | Moderate | Inactive |

## Follow Up

- Start with the [RxDB Quickstart](../../quickstart.md)
- Read why [IndexedDB is slow](../../slow-indexeddb.md) and how to work around it
- Compare browser storage APIs in [LocalStorage vs. IndexedDB vs. OPFS](../localstorage-indexeddb-cookies-opfs-sqlite-wasm.md)
- Learn about the [RxStorage](../../rx-storage.md) layer and the [OPFS storage](../../rx-storage-opfs.md)
- Check the [RxDB code on GitHub](/code/) and leave a star ⭐
