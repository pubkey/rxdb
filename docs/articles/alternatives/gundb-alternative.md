# RxDB as a GUN (gundb) Alternative for JavaScript Apps

> Compare RxDB and GUN (gundb) for JavaScript apps. Get typed schemas, MongoDB-style queries, encryption, and P2P replication via WebRTC and Nostr.

# RxDB as a GUN (gundb) Alternative for JavaScript Apps

Developers who reach for [GUN](https://gun.eco/) usually want one thing: a JavaScript database that syncs data peer-to-peer without depending on a central backend. GUN delivers on that promise, and it pairs the graph model with extras like the SEA module for cryptography and authentication. The trouble starts once you move past the first demo. Getting basic features running often takes days of trial and error, the schema story is informal, and the source code is dense enough that tracking down a sync bug can stall a project for a week.

This guide walks through where GUN came from, where it falls short for production JavaScript apps, and how [RxDB](https://rxdb.info/) covers the same [offline-first](../../offline-first.md) and peer-to-peer use cases with a typed API, JSON Schema validation, and well-documented [replication](../../replication.md) plugins.

<center>
    
        
    
</center>

## A Short History of GUN

GUN was started around 2014 by Mark Nadal as an experiment in building a fully decentralized graph database for the web. The library is dual licensed under ZLIB and Apache 2.0 and ships as a small JavaScript module that runs in browsers, Node.js, and React Native. Peers connect through WebSocket relays or WebRTC and exchange small graph deltas, which the library merges using a conflict resolution scheme based on a Hypothetical Amnesia Machine algorithm.

On top of the core graph, the project ships SEA (Security, Encryption, Authorization), a module that adds public key identities, signed updates, and end-to-end encryption. The community around GUN has stayed active on GitHub and Discord, with a steady stream of issues and a smaller pool of regular contributors than larger database projects. Maintenance is concentrated around a single primary author, which is part of why some long standing issues stay open for a long time.

## What is RxDB?

[RxDB](https://rxdb.info/) (Reactive Database) is a [local-first](../../articles/local-first-future.md) NoSQL database for JavaScript. It runs in the browser, in Node.js, in Electron, and in React Native, persists data through a pluggable storage layer, and exposes documents and queries as RxJS observables for [reactivity](../../reactivity.md). The query language follows the MongoDB style and validates documents against [JSON Schema](../../rx-schema.md). Replication is handled by a small generic protocol that already has plugins for HTTP, GraphQL, CouchDB, Firestore, [WebRTC](../../replication-webrtc.md).

## Where GUN Falls Short

GUN solves a hard problem and gets a lot right at the protocol level. The pain points show up once an application grows beyond a small prototype.

### Hard to Debug Source Code

The core source files use terse variable names, heavy use of nested callbacks, and unconventional control flow. When sync breaks or a write does not propagate, stepping through the code to find the cause is slow even for experienced JavaScript developers. Stack traces often point at internal callbacks rather than user code, which makes issue reports hard to write and harder to fix.

### Opaque CRDT Internals

GUN merges concurrent writes using its own algorithm rather than a documented CRDT family like LWW-Element-Set or RGA. The behavior is deterministic in many cases, but the rules around tombstones, deletion, and graph traversal are not described in a way that maps cleanly onto a formal model. Teams that need to reason about merge outcomes for compliance or correctness checks end up reading source code instead of specifications.

### Weak Schema and Types

Documents in GUN are loose JSON graphs with no enforced shape. There is no schema validation, no required fields, and no migration tooling. A typo in a property name silently writes a new field rather than failing fast. For larger codebases this turns into shape drift across clients and versions.

### Weak Query Language

GUN exposes a chainable graph traversal API. It works for fetching nodes by key and walking edges, but it does not support range queries, sorting, compound indexes, or aggregation. Anything that resembles a SQL `WHERE` with multiple conditions has to be implemented by hand on top of `.map()` and manual filtering.

### Limited Tooling

There is no official devtools panel, no schema explorer, and no migration runner. Logging is verbose by default and hard to filter. Test setups for sync code usually involve spinning up real relay peers, which slows feedback loops.

### No First-Class TypeScript Story

GUN ships informal type definitions through community packages. The graph traversal API is dynamic enough that type inference rarely catches mistakes. Developers used to typed end-to-end pipelines lose that safety net the moment they touch GUN code.

## Where RxDB Helps

RxDB targets the same set of use cases (offline reads, real time updates, peer-to-peer sync) and addresses the points above directly.

- **Typed API**: All collections, documents, and queries are typed. The schema feeds TypeScript types so query results infer correctly.
- **JSON Schema validation**: Documents are checked against a [JSON Schema](../../rx-schema.md). Required fields, enums, and string lengths are enforced at write time.
- **MongoDB-style queries**: Use `$gt`, `$in`, `$regex`, sorting, and compound indexes through the [RxQuery](../../rx-query.md) API. Queries return observables that re-emit when matching data changes.
- **CRDT plugin**: For collaborative apps that need formal merge semantics, the [CRDT plugin](../../crdt.md) provides documented operations on counters, sets, and lists.
- **Encryption**: The [encryption plugin](../../encryption.md) encrypts selected fields at rest using AES.
- **WebRTC P2P replication**: The [WebRTC replication plugin](../../replication-webrtc.md) syncs collections directly between browser peers without a central data server.
- **Conflict handling**: Custom conflict resolution is configured per collection through the [revisions and conflict handler API](../../transactions-conflicts-revisions.md).

## Code Sample: Schema and Reactive Query

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
  name: 'notesdb',
  storage: getRxStorageLocalstorage()
});

await db.addCollections({
  notes: {
    schema: {
      title: 'note schema',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string', maxLength: 100 },
        title: { type: 'string' },
        body: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        updatedAt: { type: 'number' }
      },
      required: ['id', 'title', 'updatedAt']
    }
  }
});

// Reactive query: re-emits whenever matching documents change.
const recent$ = db.notes
  .find({
    selector: { tags: { $in: ['inbox'] } },
    sort: [{ updatedAt: 'desc' }],
    limit: 20
  })
  .$;

recent$.subscribe(notes => {
  console.log('inbox notes:', notes.map(n => n.title));
});
```

The schema enforces shape at write time, and the query result is a stream that any UI layer can subscribe to.

## Code Sample: Peer-to-Peer Replication via WebRTC

The [WebRTC replication plugin](../../replication-webrtc.md) gives you the same serverless P2P sync that draws people to GUN, with an explicit configuration and clear error events.

```ts
import {
  replicateWebRTC,
  getConnectionHandlerSimplePeer,
  createSimplePeerWrtc
} from 'rxdb/plugins/replication-webrtc';

const replicationPool = await replicateWebRTC({
  collection: db.notes,
  topic: 'notes-room-42', // peers sharing a topic sync with each other
  connectionHandlerCreator: getConnectionHandlerSimplePeer({
    signalingServerUrl: 'wss://signaling.rxdb.info/',
    wrtc: createSimplePeerWrtc(),
  }),
  pull: {},
  push: {}
});

replicationPool.error$.subscribe(err => {
  console.error('P2P sync error:', err);
});
```

Peers join a topic, the signaling server pairs them, and from there the data exchange runs directly between browsers. For a transport that does not require running your own signaling server, the Nostr replication plugin routes updates through public Nostr relays.

## FAQ

<details>
<summary>Does RxDB support P2P like GUN?</summary>

Yes. The [WebRTC replication plugin](../../replication-webrtc.md) syncs collections directly between browser peers. Both run without a central data server, and both reuse the same RxDB sync protocol used for HTTP and GraphQL backends.

</details>

<details>
<summary>Can RxDB run without a central server?</summary>

Yes. RxDB stores data locally in IndexedDB, OPFS, SQLite, or memory, and any [replication](../../replication.md) is optional. With the WebRTC or Nostr plugins, multiple clients can sync directly with each other and never contact a backend you operate.

</details>

<details>
<summary>How do I migrate data from GUN?</summary>

Export your GUN graph to a JSON file by walking the root nodes you care about and serializing each subgraph. Then map the flat documents onto an RxDB collection schema and bulk insert them with `collection.bulkInsert(docs)`. Because GUN graphs use references between nodes, denormalize linked nodes into embedded fields or split them across collections that match your query patterns.

</details>

<details>
<summary>Does RxDB have built-in user accounts like SEA?</summary>

RxDB does not bundle a full identity module. It pairs with any auth system you already use (JWT, OAuth, custom tokens) by passing credentials into the replication handler headers. For data confidentiality, the [encryption plugin](../../encryption.md) encrypts selected fields with AES, and signed payloads can be added on top in the replication layer when needed.

</details>

<details>
<summary>How does RxDB handle conflicts in P2P sync?</summary>

Each collection has a conflict handler. The default keeps the newer revision, and you can replace it with a custom function that merges fields, picks a winner based on metadata, or runs CRDT operations through the [CRDT plugin](../../crdt.md). The full model is described in [transactions, conflicts and revisions](../../transactions-conflicts-revisions.md).

</details>

## Comparison Table

| Topic                    | GUN (gundb)                              | RxDB                                                                 |
| ------------------------ | ---------------------------------------- | -------------------------------------------------------------------- |
| Data model               | JSON graph of linked nodes               | JSON documents organized into typed collections                      |
| Schema                   | None, fields are free-form               | [JSON Schema](../../rx-schema.md) with validation and migrations        |
| TypeScript               | Community types, dynamic API             | First-class types inferred from schemas                              |
| Query language           | Chainable graph traversal                | [MongoDB-style queries](../../rx-query.md) with sort, limit, and indexes |
| Reactivity               | Subscriptions on nodes                   | RxJS observables on documents and queries                            |
| Conflict resolution      | Built-in HAM merge, opaque rules         | Pluggable handler plus optional [CRDT plugin](../../crdt.md)            |
| Encryption               | SEA module                               | [Encryption plugin](../../encryption.md), AES on selected fields        |
| P2P transport            | Built-in WebSocket and WebRTC peers      | [WebRTC](../../replication-webrtc.md) plugins |
| Server-based sync        | Optional relay peers                     | HTTP, GraphQL, CouchDB, Firestore, and custom backends               |
| Storage backends         | IndexedDB, file, in-memory               | IndexedDB, OPFS, SQLite, Dexie, LocalStorage, Memory, and more       |
| Tooling                  | Minimal, source-level debugging          | Devtools, logger, schema validator, migration runner                 |
| License                  | ZLIB and Apache 2.0                      | Apache 2.0 with paid premium plugins                                 |

## Follow Up

If GUN attracted you because of peer-to-peer sync but the debugging cost is slowing the project down, RxDB covers the same ground with a typed schema, documented merge semantics, and dedicated plugins for [WebRTC](../../replication-webrtc.md) replication. Start with the [RxDB Quickstart](../../quickstart.md), pick a storage that fits your runtime, and add a replication plugin once your local data model is stable.

More resources:

- [RxDB Sync Engine](../../replication.md)
- [WebRTC Replication](../../replication-webrtc.md)
- [CRDT Plugin](../../crdt.md)
- [Encryption Plugin](../../encryption.md)
- [Conflicts and Revisions](../../transactions-conflicts-revisions.md)
- [The Local-First Future](../../articles/local-first-future.md)
