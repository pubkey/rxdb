---
title: RxDB as a Dexie.js Alternative with Mango Queries and Replication
slug: dexie-alternative.html
description: Compare Dexie.js with RxDB. Get MongoDB-style queries, JSON Schema validation, observable results and full replication on top of IndexedDB.
image: /headers/dexie-alternative.jpg
---

# RxDB as a Dexie.js Alternative with Mango Queries and Replication

Teams reach for [Dexie.js](https://dexie.org/) when they want a friendlier API on top of IndexedDB without giving up the speed of a native browser store. Dexie does a fine job at that single goal. The trouble starts when an app outgrows simple key range lookups and needs MongoDB-style queries, [strict schemas](../../rx-schema.md), [reactive results](../../reactivity.md) across tabs, or [replication with a backend](../../replication.md). At that point, most projects either build those features from scratch on top of Dexie or move to a database that already provides them. RxDB sits in the second category and can even run on top of Dexie internally through the [Dexie RxStorage](../../rx-storage-dexie.md).

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## A Short History of Dexie.js

Dexie.js was started in 2014 by David Fahlander as a thin wrapper around IndexedDB. The IndexedDB API itself is verbose, callback-heavy, and easy to misuse, so a higher level library filled an obvious gap. Over the years Dexie grew batched transactions, a query builder, hooks, and a small reactivity layer. It became the de-facto IndexedDB library in the JavaScript ecosystem and is used in production by WhatsApp Web, Microsoft To Do, and GitHub Desktop, among many others.

Later, the maintainers added Dexie Cloud, a paid service that provides sync, authentication, and access control on top of Dexie databases. Dexie Cloud filled a real need, since IndexedDB has no built-in replication, but it ties the sync layer to a single hosted backend. For apps that want to own their server, use an existing API, or sync peer-to-peer, Dexie Cloud is not always a good fit.

## What is RxDB

RxDB (Reactive Database) is a [local-first](../../articles/local-first-future.md) NoSQL database for JavaScript. It runs in the browser, in Node.js, in React Native, in Electron, and in any other JavaScript runtime. Data is stored locally first and then replicated to one or many backends through a generic [replication protocol](../../replication.md). Queries return [observables](../../reactivity.md) that update whenever the underlying data changes, including changes made in other browser tabs.

RxDB is storage-agnostic. It can run on [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), in-memory, SQLite, and on top of [Dexie.js](../../rx-storage-dexie.md) itself. Picking the Dexie storage means you keep all the work Dexie does inside IndexedDB while gaining schemas, queries, replication, and reactivity from RxDB on top.

## Where Dexie.js Stops Short

Dexie is a small library with a clear scope. That scope leaves a few gaps once an application becomes non-trivial.

### Queries Limited to Index Ranges

Dexie queries are built around IndexedDB cursors and key ranges. Filtering by anything other than an indexed field requires a full scan with `.filter(fn)`, which loads documents into memory and runs a JavaScript predicate on each one. Multi-field conditions, `$or` branches, and nested property matches need manual composition or hand-written index keys. Anyone who has tried to express a query like "all open tasks assigned to user X with priority above 3, sorted by due date" against Dexie knows how much glue code is involved.

### No MongoDB-Style Operators

Operators such as `$gt`, `$in`, `$elemMatch`, `$regex`, and `$or` are not part of Dexie. The query builder covers `equals`, `above`, `below`, `between`, `startsWith`, and a handful of variants. For richer matching the application has to fall back to in-memory filtering, which throws away the index advantage.

### Loose Schemas

Dexie stores arbitrary JavaScript objects. Field types, required keys, and value ranges are not validated. A typo in a field name or a wrong type from an external API silently lands in the database and surfaces later as a runtime bug. There is no built-in migration framework either, so schema changes are handled with version callbacks that the developer writes by hand.

### Replication Is a Paid Add-On

Plain Dexie has no replication. The official answer is Dexie Cloud, a hosted service with its own pricing and its own server. There is no built-in HTTP, GraphQL, CouchDB, or WebRTC replication. Bringing your own backend means writing the sync engine yourself, including change tracking, checkpointing, retry logic, and conflict detection.

### No Built-In CRDT or Conflict Handler

When two tabs or two devices write to the same document, Dexie itself does not resolve the conflict. The application code has to detect it, decide which write wins, and apply the result. There is no [CRDT plugin](../../crdt.md) and no pluggable [conflict handler](../../transactions-conflicts-revisions.md). For a single-user, single-device app this rarely matters. For collaborative or multi-device apps it becomes the central problem.

## What RxDB Adds on Top

RxDB was designed around the gaps above.

### MongoDB-Style Queries

[RxQuery](../../rx-query.md) accepts the full Mango query syntax. Operators like `$gt`, `$lt`, `$in`, `$or`, `$and`, `$regex`, and `$elemMatch` are first-class. The query planner picks an index automatically and falls back to a scan only when no index fits.

### JSON Schema Validation

Every [RxCollection](../../rx-collection.md) is defined by a [JSON Schema](../../rx-schema.md). Inserts and updates are validated against the schema, primary keys are enforced, and indexes are declared once in the schema instead of being scattered across migration callbacks. Schema versions and migration strategies are part of the API.

### Observable Queries and Multi-Tab Sync

Query results are RxJS observables. When a document changes, every subscriber receives the new result set. The same mechanism works across browser tabs through a leader election protocol, so a write in tab A immediately updates a list rendered in tab B without extra code.

### Replication Primitives for Any Backend

RxDB ships replication plugins for [HTTP](../../replication-http.md), [GraphQL](../../replication-graphql.md), [CouchDB](../../replication-couchdb.md), WebRTC, Firestore, NATS, and more. All of them are built on the same generic [replication protocol](../../replication.md), so a custom backend only needs to implement a pull and a push handler. There is no required hosted service and no per-document fee.

### CRDT and Custom Conflict Handlers

For collaborative workloads RxDB provides a [CRDT plugin](../../crdt.md) and a pluggable [conflict handler](../../transactions-conflicts-revisions.md) per collection. Conflicts are detected by revision, passed to the handler, and resolved deterministically on every device.

## Code Sample: Dexie Query vs RxDB Query

A query like "open tasks with priority above 3 or tagged as urgent" is awkward in Dexie because it mixes a range condition with an `$or` branch on a different field.

Dexie:

```ts
import Dexie from 'dexie';

const db = new Dexie('tasks-db');
db.version(1).stores({
  tasks: '++id, done, priority, tag'
});

const result = await db.tasks
  .where('done').equals(0)
  .and(task => task.priority > 3 || task.tag === 'urgent')
  .toArray();
```

The `and(fn)` part runs in JavaScript over every non-done task, so the `priority` index is not used.

RxDB:

```ts
const result = await db.tasks.find({
  selector: {
    done: false,
    $or: [
      { priority: { $gt: 3 } },
      { tag: 'urgent' }
    ]
  }
}).exec();
```

The query planner inspects the selector, picks an index, and returns the matching documents. The same query can be observed:

```ts
db.tasks.find({
  selector: {
    done: false,
    $or: [{ priority: { $gt: 3 } }, { tag: 'urgent' }]
  }
}).$.subscribe(docs => render(docs));
```

## Code Sample: RxDB on Dexie Storage with HTTP Replication

The Dexie [RxStorage](../../rx-storage-dexie.md) lets RxDB use Dexie under the hood. The application code stays on the RxDB API and gains queries, schemas, and replication.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { replicateRxCollection } from 'rxdb/plugins/replication';

const db = await createRxDatabase({
  name: 'tasksdb',
  storage: getRxStorageDexie(),
  multiInstance: true,
  eventReduce: true
});

await db.addCollections({
  tasks: {
    schema: {
      title: 'task schema',
      version: 0,
      type: 'object',
      primaryKey: 'id',
      properties: {
        id: { type: 'string', maxLength: 100 },
        title: { type: 'string' },
        done: { type: 'boolean' },
        priority: { type: 'number' },
        tag: { type: 'string', maxLength: 50 },
        updatedAt: { type: 'number' }
      },
      required: ['id', 'title', 'done', 'updatedAt'],
      indexes: ['priority', 'tag', 'updatedAt']
    }
  }
});

replicateRxCollection({
  collection: db.tasks,
  replicationIdentifier: 'tasks-http',
  live: true,
  pull: {
    handler: async (checkpoint, batchSize) => {
      const checkpointQuery = encodeURIComponent(
        JSON.stringify(checkpoint || {})
      );
      const url =
        `https://api.example.com/tasks/pull?checkpoint=${checkpointQuery}` +
        `&limit=${batchSize}`;
      const res = await fetch(url);
      return await res.json();
    }
  },
  push: {
    handler: async (changeRows) => {
      const res = await fetch('https://api.example.com/tasks/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(changeRows)
      });
      return await res.json();
    }
  }
});
```

This setup keeps Dexie as the storage engine, so writes still hit IndexedDB through Dexie. RxDB adds the schema, the Mango query layer, the observables, the multi-tab support, and the HTTP replication.

## Use Dexie Inside RxDB

The [Dexie RxStorage](../../rx-storage-dexie.md) wraps Dexie as a storage backend for RxDB. It is a good pick when:

- The team already trusts Dexie and wants to keep it as the IndexedDB layer.
- The browser is the main target and IndexedDB is the most compatible option.
- The app needs schemas, observable queries, and replication that Dexie alone does not provide.

The migration path is small. Documents stored by Dexie use the same IndexedDB databases that the Dexie RxStorage reads, but the RxDB layer adds its own metadata for revisions and replication checkpoints. Most projects copy the data from the legacy Dexie database into a new RxCollection on first start. For larger datasets see the notes on [slow IndexedDB writes](../../slow-indexeddb.md) which apply to both Dexie and the Dexie RxStorage.

## FAQ

<details>
<summary>Can I use Dexie under RxDB?</summary>

Yes. RxDB ships the [Dexie RxStorage](../../rx-storage-dexie.md) which uses Dexie.js as the underlying engine. Pass `getRxStorageDexie()` as the `storage` option when creating the database and Dexie handles the IndexedDB calls while RxDB provides schemas, queries, reactivity, and replication on top.

</details>

<details>
<summary>Does RxDB cost money?</summary>

The core RxDB library and the open source storages, including the Dexie RxStorage, are free under the Apache 2.0 license. Some advanced plugins are part of the [Premium](/premium/) package for commercial projects. The [replication protocol](../../replication.md) itself is open source, so syncing with your own backend never requires a paid service.

</details>

<details>
<summary>How do I do MongoDB-style queries against IndexedDB?</summary>

Use RxDB on top of an IndexedDB-based storage like the [Dexie RxStorage](../../rx-storage-dexie.md), the [IndexedDB RxStorage](../../rx-storage-indexeddb.md), or [OPFS](../../rx-storage-opfs.md). RxDB exposes a Mango query API with operators like `$gt`, `$in`, `$or`, and `$elemMatch`, plans the query against the declared indexes, and returns either a snapshot or a live observable.

</details>

<details>
<summary>Is RxDB faster than Dexie?</summary>

RxDB on the Dexie storage adds a thin layer over Dexie, so raw single-document reads are close to plain Dexie. For multi-condition queries RxDB is often faster because the query planner uses indexes that a hand-written Dexie query would skip. For very large bulk inserts the underlying IndexedDB is the bottleneck for both libraries, see [slow IndexedDB](../../slow-indexeddb.md).

</details>

<details>
<summary>Can I migrate from Dexie to RxDB?</summary>

Yes. The common pattern is to keep the existing Dexie database read-only on first start, create an RxCollection with a matching schema, and copy the documents over in batches. After the copy step the app talks to RxDB only. Because the Dexie RxStorage also uses IndexedDB, the data stays inside the same browser storage area.

</details>

## Comparison Table

| Feature | Dexie.js | RxDB |
| --- | --- | --- |
| Underlying storage | IndexedDB only | Dexie, IndexedDB, OPFS, SQLite, memory, more |
| Query language | Index ranges plus JS filter | MongoDB-style Mango queries |
| Operators like `$gt`, `$or`, `$in` | Manual JS filter | Built in |
| Schema validation | None | JSON Schema per collection |
| Schema migrations | Manual version callbacks | Declarative migration strategies |
| Observable queries | Limited via liveQuery | First-class RxJS observables |
| Multi-tab sync | Manual | Leader election built in |
| Replication with custom backend | Not included | HTTP, GraphQL, CouchDB, WebRTC, more |
| Hosted sync option | Dexie Cloud (paid) | Optional, any backend works |
| CRDT support | None | [CRDT plugin](../../crdt.md) |
| Conflict handler | Application code | Pluggable per collection |
| Runtime targets | Browser only | Browser, Node.js, React Native, Electron |
| License | Apache 2.0 | Apache 2.0 (Premium plugins separate) |

## Follow Up

If Dexie covers the current requirements, it is a solid choice for IndexedDB access. Once the app needs Mango queries, JSON Schema, replication with an arbitrary backend, or deterministic conflict resolution, RxDB fills those gaps and can still keep Dexie as the storage engine through the [Dexie RxStorage](../../rx-storage-dexie.md).

More resources:

- [RxDB Replication Engine](../../replication.md)
- [RxQuery and Mango Selectors](../../rx-query.md)
- [Reactivity in RxDB](../../reactivity.md)
- [Dexie RxStorage](../../rx-storage-dexie.md)
- [Local-First Future](../../articles/local-first-future.md)
- [RxDB GitHub Repository](/code/)
