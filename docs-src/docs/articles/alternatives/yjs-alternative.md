---
title: RxDB as a Yjs Alternative for Local-First Apps with Queries and Persistence
slug: yjs-alternative.html
description: Compare Yjs and RxDB for local-first apps. Learn when to use a CRDT runtime, when to pick a queryable database, and how to combine them.
image: /headers/yjs-alternative.jpg
---

# RxDB as a Yjs Alternative for Local-First Apps with Queries and Persistence

[Yjs](https://github.com/yjs/yjs) is a CRDT runtime that solves one problem well: merging concurrent edits to shared data structures without a central authority. It is the engine behind many collaborative editors built on TipTap, ProseMirror, Slate, and Monaco. When your application is mostly a shared text document, Yjs is an excellent fit.

The trouble starts when the application also has lists, settings, user profiles, attachments, search, and reporting. Those features need indexes, schemas, queries, durable storage, and a sync model that goes beyond merging characters into a rope. Yjs does not provide any of that on its own. You assemble it from third party providers, and you write the indexing and query layer yourself.

This page explains where Yjs ends, where [RxDB](https://rxdb.info/) begins, and how to combine the two when you need both rich-text collaboration and a structured local database.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## A Short History of Yjs

Yjs was started around 2014 by Kevin Jahns as a research project on operation-based CRDTs. Over the following years it grew into the de facto CRDT library for the JavaScript ecosystem. The shared types `Y.Doc`, `Y.Text`, `Y.Array`, and `Y.Map` became the foundation for collaborative editor bindings such as `y-prosemirror`, `y-tiptap`, `y-monaco`, and `y-codemirror`.

Around the core library, a set of providers handles transport and persistence:

- `y-websocket` for server-relayed sync.
- `y-webrtc` for peer-to-peer sync over WebRTC.
- `y-indexeddb` for browser persistence.
- `y-leveldb` for server-side persistence.

Each provider plugs into a `Y.Doc` and synchronizes its update stream. The model is simple and effective for documents, and it is the reason Yjs dominates the collaborative editor space.

## What RxDB Brings to the Table

[RxDB](https://rxdb.info/) is a [local-first](../../articles/local-first-future.md), reactive, NoSQL database for JavaScript. It stores JSON documents in a pluggable storage layer, exposes MongoDB-style queries, and supports several replication protocols out of the box. Queries and documents are observable, so any UI bound to them updates automatically when the underlying data changes. See the [reactivity guide](../../reactivity.md) for details.

RxDB also ships an optional [CRDT plugin](../../crdt.md) that adds operation-based merging on top of regular RxDB documents. If you want CRDT semantics for parts of your data without giving up schemas, queries, and indexes, you do not need a separate CRDT runtime.

## Where Yjs Falls Short as a General Database

Yjs was designed as a CRDT runtime, not a database. The following gaps appear once you try to model an entire application on top of it:

### No Query Engine

Yjs ships shared types like `Y.Map` and `Y.Array`, but there is no query language. Filtering, sorting, joining, or paginating data means iterating over shared types in JavaScript and building the result set by hand. There is no equivalent of `collection.find({ status: 'open' }).sort({ updatedAt: -1 })`.

### No Schema or Validation

A `Y.Map` accepts any key and any value. There is no schema, no required fields, no type checking, and no migration story. Application code is responsible for guarding every read and write. Schema drift between clients running different app versions is a recurring source of bugs.

### No Indexes

Lookups in Yjs are linear scans of the shared types. There is no secondary index, no compound index, and no way to ask the storage layer to keep one. For a thousand documents this is fine. For a hundred thousand, every list view becomes a full traversal.

### No Aggregation

Yjs has no `count`, no `group by`, no `sum`. If you need a dashboard or any derived view, you compute it in application code on every change.

### Persistence Is Provider by Provider

Persistence is delegated to providers like `y-indexeddb` or `y-leveldb`. Each provider has its own format, its own quirks, and its own lifecycle. Switching environments, for example moving from browser to React Native or Node.js, means swapping the provider and accepting whatever it offers.

### Sync Is Document Shaped

Yjs sync moves the entire update stream of a `Y.Doc`. That works for one shared document. For an app with thousands of independent records (orders, messages, contacts), you either pack everything into one giant `Y.Doc` and pay for it on every load, or you manage many small docs and write your own catalog, fan-out, and authorization layer.

## Where RxDB Fits

RxDB approaches the same problem from the database side:

- **Document database**: collections of JSON documents with a [JSON Schema](../../rx-collection.md) per collection.
- **MongoDB-style queries**: rich [`RxQuery`](../../rx-query.md) API with selectors, sort, skip, limit, and indexes.
- **Observable everything**: queries, documents, and fields emit on every change. See [reactivity](../../reactivity.md).
- **Pluggable storage**: IndexedDB, OPFS, SQLite, in-memory, and more. The same code runs in browser, Electron, React Native, and Node.js.
- **Replication primitives**: a generic [replication protocol](../../replication.md) plus ready-made adapters for HTTP, GraphQL, WebSocket, CouchDB, and [WebRTC](../../replication-webrtc.md).
- **Conflict handling**: per-collection [conflict handlers](../../transactions-conflicts-revisions.md) with revisions, so you can merge, prefer remote, prefer local, or fold in CRDT logic.
- **Optional CRDT plugin**: the [CRDT plugin](../../crdt.md) adds operation-based merging where you need it.

## Code Sample: Defining a Collection and Subscribing to a Query

A typical RxDB collection has a schema, supports queries, and emits updates over time:

```ts
import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const db = await createRxDatabase({
  name: 'app',
  storage: getRxStorageDexie()
});

await db.addCollections({
  tasks: {
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id:        { type: 'string', maxLength: 40 },
        title:     { type: 'string' },
        status:    { type: 'string', enum: ['open', 'done'] },
        updatedAt: { type: 'number' }
      },
      required: ['id', 'title', 'status', 'updatedAt'],
      indexes: ['status', 'updatedAt']
    }
  }
});

await db.tasks.insert({
  id: 't1',
  title: 'Write Yjs comparison',
  status: 'open',
  updatedAt: Date.now()
});

const openTasks$ = db.tasks
  .find({ selector: { status: 'open' } })
  .sort({ updatedAt: 'desc' })
  .$;

openTasks$.subscribe(tasks => {
  console.log('open tasks:', tasks.map(t => t.title));
});
```

Schemas, indexes, queries, and live results come from the database itself. Compare this to building the same view on top of a `Y.Array` of `Y.Map`.

## Code Sample: RxDB CRDT Plugin for Collaborative Fields

When a field needs CRDT semantics, the [CRDT plugin](../../crdt.md) lets you express updates as operations against a regular RxDB document:

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBcrdtPlugin } from 'rxdb/plugins/crdt';

addRxPlugin(RxDBcrdtPlugin);

await db.addCollections({
  shoppingLists: {
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      crdt: { field: 'crdts' },
      properties: {
        id:    { type: 'string', maxLength: 40 },
        items: { type: 'array', items: { type: 'string' } },
        crdts: { type: 'object' }
      },
      required: ['id']
    }
  }
});

const list = await db.shoppingLists.insert({ id: 'home', items: [] });

await list.updateCRDT({
  ifMatch: { $set: { items: ['milk'] } }
});

await list.updateCRDT({
  ifMatch: { $push: { items: 'bread' } }
});
```

Two clients running these operations in any order converge to the same result, with the same query, schema, and replication infrastructure as every other collection.

## Use Both: Yjs for Rich Text, RxDB for Everything Else

Yjs and RxDB are not mutually exclusive. A common pattern in production apps:

- **Yjs** handles the rich-text body of documents through a `Y.Doc` per document, edited via TipTap or ProseMirror, synced through `y-websocket` or `y-webrtc`.
- **RxDB** handles document metadata, the document list, comments, permissions, search indexes, attachments, user settings, and offline queues.

The serialized Yjs update (a `Uint8Array`) can be stored as a base64 string inside an RxDB document field. RxDB takes care of persistence, replication, and querying the metadata, while Yjs takes care of merging concurrent character edits.

For real-time fan-out between peers, RxDB's [WebRTC replication](../../replication-webrtc.md) and the standard [server replication](../../replication.md) cover the structured side, and the existing Yjs providers cover the document side. See also the [realtime database article](../../articles/realtime-database.md) for the broader pattern.

## FAQ

<details>
<summary>Is Yjs a database?</summary>

No. Yjs is a CRDT library. It defines shared data types and a merge algorithm, and it leaves persistence, networking, indexing, and queries to providers and to the application. A database stores, indexes, and queries data. Yjs does the merging part of that picture and nothing else.
</details>

<details>
<summary>Does RxDB have CRDTs?</summary>

Yes. The optional [CRDT plugin](../../crdt.md) adds operation-based merging on top of regular RxDB documents. You keep schemas, queries, indexes, and replication, and you opt in to CRDT semantics for the fields that need them. For most app data, the default [conflict handler](../../transactions-conflicts-revisions.md) is enough.
</details>

<details>
<summary>Can I store a Yjs document inside RxDB?</summary>

Yes. A `Y.Doc` can be encoded with `Y.encodeStateAsUpdate` and stored as a binary or base64 field inside an RxDB document. RxDB then handles persistence and replication of the encoded blob, while Yjs handles merging in memory when the document is opened.
</details>

<details>
<summary>How do RxDB conflict resolvers compare to Yjs CRDTs?</summary>

Yjs CRDTs guarantee deterministic convergence for the built-in shared types, with no application code involved. RxDB conflict resolvers are per-collection functions that take the local and remote versions and return the merged result. They are more general, since they can express last-write-wins, field-level merges, business rules, or full CRDT logic via the CRDT plugin. They require you to define the merge policy explicitly.
</details>

<details>
<summary>Which is better for collaborative text editing?</summary>

Yjs, paired with TipTap, ProseMirror, Slate, or Monaco. The bindings are mature and the merge semantics for text are exactly what editors need. RxDB is the better choice for the surrounding application: the document list, metadata, comments, permissions, offline queue, and search.
</details>

## Comparison Table

| Capability                         | Yjs                                  | RxDB                                                     |
| ---------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| Primary purpose                    | CRDT runtime                         | Local-first document database                            |
| Data model                         | Shared types (`Y.Map`, `Y.Array`, `Y.Text`) | JSON documents in typed collections               |
| Schema and validation              | None                                 | JSON Schema per collection                               |
| Query API                          | None, manual iteration               | MongoDB-style [`RxQuery`](../../rx-query.md)                |
| Indexes                            | None                                 | Single and compound indexes                              |
| Reactive results                   | Per shared type observers            | Observable [queries and documents](../../reactivity.md)     |
| Persistence                        | Provider based (`y-indexeddb`, etc.) | Pluggable storages (IndexedDB, OPFS, SQLite, memory)     |
| Replication                        | Provider based, per `Y.Doc`          | Generic [replication protocol](../../replication.md), HTTP, GraphQL, WebSocket, CouchDB, [WebRTC](../../replication-webrtc.md) |
| Conflict resolution                | Built-in CRDT                        | Pluggable [conflict handlers](../../transactions-conflicts-revisions.md) plus optional [CRDT plugin](../../crdt.md) |
| Best fit                           | Collaborative rich-text editors      | Offline-first apps with structured data and queries      |

If your product is a collaborative editor, start with Yjs. If your product is an app that happens to need collaboration on some fields, start with RxDB and add the [CRDT plugin](../../crdt.md) or embed Yjs documents where they pay off.
