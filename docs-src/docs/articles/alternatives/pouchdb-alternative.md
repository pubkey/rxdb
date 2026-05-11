---
title: RxDB as a PouchDB Alternative - Reactive, Fast, and Backend-Agnostic
slug: alternatives/pouchdb-alternative.html
description: Compare RxDB and PouchDB for offline-first JavaScript applications. Learn why RxDB is a modern alternative to PouchDB with reactive queries, pluggable storage engines, flexible replication, and no revision-tree overhead.
---

# RxDB as a PouchDB Alternative

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

Many developers start building an offline-first web application and reach for PouchDB because of its well-known CouchDB synchronization capabilities. Over time, those same developers encounter performance bottlenecks, storage bloat, and the absence of reactive queries. [RxDB](https://rxdb.info) is a local-first JavaScript database that solves exactly these problems while keeping the offline-first architecture developers rely on.

This page explains what PouchDB is, how it works, what its architectural constraints are, and how RxDB provides a more complete solution for modern offline-first and local-first applications.

---

## What is PouchDB?

<p align="center">
  <img src="/files/alternatives/pouchdb.svg" alt="PouchDB alternative" height="80" className="img-padding" />
</p>

PouchDB is a JavaScript database that was created to bring the [Apache CouchDB](./couchdb-alternative.md) replication protocol to the browser. It was first released in 2012 by Dale Harvey and grew rapidly as a go-to solution for browser-based offline storage. The name is derived from "Portable CouchDB": a CouchDB-compatible database you can carry around in JavaScript environments.

PouchDB stores documents in the browser using IndexedDB (or WebSQL in older browsers) and exposes an HTTP-based API that mirrors CouchDB. This means any PouchDB database can replicate bidirectionally with a CouchDB server using the established Couch Replication Protocol, making it the natural pairing for teams already running CouchDB on the server.

### A Brief Timeline

- **2012** - First published by Dale Harvey; early adoption in the CouchDB community
- **2013** - PouchDB 1.0 released; gains IndexedDB adapter for modern browser support
- **2014** - Version 2.0; plugin ecosystem grows with adapters for SQLite, LevelDB, and memory
- **2015** - PouchDB 4.0 with significant performance improvements and the `pouchdb-find` query plugin
- **2016** - Version 5.0 brings improved conflict resolution APIs
- **2018** - PouchDB 7.0 released; WebSQL adapter deprecated
- **2022** - Ongoing maintenance with no major feature additions
- **2024** - PouchDB 9.0.0 released; the project enters incubation at the Apache Software Foundation
- **2025** - Development continues under Apache incubation; project is maintained but no longer actively gaining new features compared to newer alternatives

PouchDB played a formative role in popularizing offline-first development. RxDB itself started as a wrapper around PouchDB in 2016. As the limitations of the PouchDB architecture became clear, RxDB version 10.0.0 (released in 2021) introduced the `RxStorage` abstraction and removed the hard dependency on PouchDB. The PouchDB RxStorage was subsequently removed from RxDB because it was too slow and too difficult to maintain.

### How PouchDB Works

PouchDB stores every document as a node in a **revision tree**. Each write to a document creates a new revision (`_rev` field). When two clients modify the same document while offline, PouchDB stores both revisions as branches in the tree. On sync, the Couch Replication Protocol transmits the revision tree from one side to the other and detects which revisions are missing. The receiving side merges the trees and designates a "winning" revision using a deterministic algorithm.

This approach guarantees that no data is lost during sync and that conflicts can always be detected and resolved. The protocol is proven and robust for server-to-server replication.

The same approach creates structural problems when applied to browser storage, because the client has to store and process the full revision history of every document.

---

## Limitations of PouchDB for Modern Applications

### Revision Tree Overhead and Storage Bloat

PouchDB must store the entire revision history of every document to stay compatible with the CouchDB replication protocol. Every write to a document adds a revision node to the tree. Over time this tree accumulates, and the stored data grows well beyond the size of the actual document state.

If a document is written 100 times, PouchDB stores metadata for all 100 revisions in addition to the current state. The database gets larger with every update cycle. Compaction (`db.compact()`) can prune non-leaf revisions, but it is a manual process, and purging a revision entirely from PouchDB [has never been possible](https://github.com/pouchdb/pouchdb/issues/802). This is a fundamental constraint of the Couch Replication Protocol: removing a revision from the tree can break sync with other nodes.

For a long-running production application, this means the local IndexedDB database grows continuously with no upper bound. In browser environments where storage is limited and users can be prompted to clear site data, this is a serious operational problem.

### Slow Queries Due to Storage Layout

PouchDB's IndexedDB storage layout is organized around the revision tree, not around query performance. When a query runs, PouchDB must read documents from IndexedDB, reconstruct the current state from the winning revision in the tree, and then filter and sort the results.

This sequence is significantly slower than reading directly from a storage structure optimized for queries. RxDB's own documentation describes the problem:

> "To be compliant with CouchDB, PouchDB has to store all revision trees of documents which slows down queries."

For small datasets the overhead is acceptable, but as the dataset grows or as queries become more complex, the performance gap widens.

### No Reactive Queries

PouchDB does not have a built-in reactive query system. When a document changes, PouchDB does not automatically update query results or notify subscribers. Developers who want UI components to reflect the current database state must manually listen to PouchDB's `changes` feed, identify which queries are affected, re-run them, and update the state.

This is complex to implement correctly and is a common source of bugs, especially around race conditions between incoming changes and in-flight queries. Third-party libraries like `pouchdb-live-find` attempted to fill this gap, but they add complexity and are not officially supported.

RxDB provides reactive queries as a first-class feature using RxJS Observables. Every query can be subscribed to, and the subscription emits updated results automatically whenever matching documents change.

### Backend Lock-In to the CouchDB Protocol

PouchDB's replication is tied to the Couch Replication Protocol. If your backend is CouchDB (or a CouchDB-compatible service like Cloudant), replication works out of the box. If your backend is anything else, such as a REST API, a GraphQL endpoint, or Supabase, you have to implement synchronization yourself.

Many teams start with CouchDB for the easy PouchDB sync, then later want to move to a different backend as their requirements change. With PouchDB, this migration requires writing a custom sync layer from scratch.

### No Schema Enforcement

PouchDB does not validate document structure before writing. Documents are free-form JSON. There is no schema declaration, no type checking, and no rejection of invalid documents. The full responsibility for data integrity falls on the application layer.

Without a schema, refactoring data models or adding new required fields requires manual data migration code and careful coordination across all app versions that might have written data to local storage.

### Limited TypeScript Support

PouchDB was designed before TypeScript became the standard in JavaScript development. Its TypeScript types describe the PouchDB API but cannot provide type-safe access to document fields. Accessing a document field returns `any`, which eliminates the benefit of TypeScript's compile-time checks.

### Issues That Were Never Fixed

During RxDB's time as a PouchDB wrapper, many PouchDB bugs were encountered that could not be resolved from outside the library. For example, queries with `$gt` operators [return incorrect documents](https://github.com/pouchdb/pouchdb/pull/8471). The RxDB codebase accumulated workarounds and monkey patches to work around these issues, but some problems could not be fixed externally at all. This was one of the primary motivations for building the `RxStorage` abstraction and removing PouchDB from RxDB's core.

---

## How RxDB Solves These Problems

[RxDB](https://rxdb.info) is a local-first JavaScript database that runs on the client and handles all the challenges described above. It stores data locally, supports reactive queries through RxJS Observables, validates documents against a JSON Schema, and replicates with a wide range of backends without being tied to any single protocol.

### No Revision Tree Overhead

RxDB stores only the current state of each document. There is no revision tree, no accumulated history, and no storage bloat over time. When documents are updated, old data is overwritten, not appended. The local database size reflects the actual data, not the complete update history.

This approach is possible because RxDB has its own [conflict detection mechanism](../../replication.md) that does not depend on storing revision trees. During replication, RxDB compares document versions using a configurable conflict handler rather than inspecting revision ancestry.

### Pluggable Storage Engines

RxDB separates the query engine from the storage layer through the [RxStorage interface](../../rx-storage.md). You choose the storage engine based on your platform and performance requirements:

| Environment | Storage Option |
|---|---|
| Browser (general use) | [IndexedDB](../../rx-storage-indexeddb.md) |
| Browser (write-heavy workloads) | [OPFS (Origin Private File System)](../../rx-storage-opfs.md) |
| React Native / Expo | [SQLite via expo-sqlite or op-sqlite](../../rx-storage-sqlite.md) |
| Node.js / Electron | [SQLite (better-sqlite3)](../../rx-storage-sqlite.md) |
| Multiple browser tabs | [SharedWorker](../../rx-storage-shared-worker.md) |
| Tests | [Memory](../../rx-storage-memory.md) |

Switching storage is a one-line change in the database creation call. The rest of the application, including queries, replication configuration, and schema definitions, remains unchanged:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';

// Change this import to switch storage engines
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';
// import { getRxStorageOPFS } from 'rxdb/plugins/storage-opfs';
// import { getRxStorageSQLite } from 'rxdb/plugins/storage-sqlite';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});
```

PouchDB is also available as an RxStorage backend for compatibility with existing setups, but its use in new projects is not recommended because of the performance and storage issues described above.

### Reactive Queries with RxJS Observables

RxDB builds on [RxJS](https://rxjs.dev) to provide observable queries. Every query result is a live data source. When documents that match the query change, the observable emits the updated result automatically:

```ts
// Subscribe to all active items sorted by creation time
db.items.find({
    selector: { status: 'active' },
    sort: [{ createdAt: 'asc' }]
}).$.subscribe(activeItems => {
    console.log('Active items:', activeItems.length);
    renderList(activeItems);
});
```

This subscription remains active and re-emits whenever a local write or a remote sync changes the matching set. There is no need to manually listen to change events, figure out which queries are affected, or re-run queries on every write.

RxDB uses the [event-reduce algorithm](https://github.com/pubkey/event-reduce) to determine whether a document change affects a query's result set. For most writes, the updated result can be calculated without re-querying the storage layer, making reactive queries fast even when many subscriptions are active.

You can also subscribe to individual documents or specific fields within a document:

```ts
const item = await db.items.findOne('item-001').exec();

// Fires only when the 'status' field changes
item.get$('status').subscribe(newStatus => {
    console.log('Status changed to:', newStatus);
});

// Fires for every change to any document in the collection
db.items.$.subscribe(changeEvent => {
    console.log(changeEvent.operation, changeEvent.documentId);
});
```

### Schema Validation and TypeScript Inference

RxDB validates every document against a [JSON Schema](../../rx-schema.md) before it is written to storage. Invalid documents are rejected immediately:

```ts
const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    items: {
        schema: {
            title: 'item schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                title:     { type: 'string' },
                status:    { type: 'string', enum: ['active', 'done', 'archived'] },
                createdAt: { type: 'number' }
            },
            required: ['id', 'title', 'status', 'createdAt'],
            indexes: ['createdAt', 'status']
        }
    }
});

try {
    // Missing 'status' field, schema validation rejects this
    await db.items.insert({
        id: 'item-001',
        title: 'First item',
        createdAt: Date.now()
    });
} catch (err) {
    console.error('Validation error:', err.message);
}
```

RxDB also infers TypeScript types from the schema automatically. IDE autocompletion and compile-time type checking work across all collection operations:

```ts
// TypeScript knows the exact shape of this document
const item = await db.items.findOne('item-001').exec();
if (item) {
    // 'title' is string, 'status' is 'active' | 'done' | 'archived'
    console.log(item.title);
    console.log(item.status);
}
```

PouchDB documents return untyped objects. There is no connection between the stored data structure and TypeScript's type system.

### Flexible Replication with Any Backend

RxDB is not coupled to a single replication protocol. The [RxDB replication system](../../replication.md) is designed around a generic pull/push model that can work with any backend that supports a checkpoint-based sync API.

Built-in replication plugins include:

- **[CouchDB replication](../../replication-couchdb.md)** - Sync with any CouchDB-compatible endpoint without the revision-tree overhead
- **[GraphQL replication](../../replication-graphql.md)** - Sync with any GraphQL API
- **[HTTP replication](../../replication-http.md)** - Sync with a custom REST API
- **[WebSocket replication](../../replication-websocket.md)** - Real-time push-based sync over WebSocket
- **[Supabase replication](../../replication-supabase.md)** - Sync with a Supabase PostgreSQL backend
- **[WebRTC replication](../../replication-webrtc.md)** - Peer-to-peer sync between browser tabs and devices
- **[Firestore replication](../../replication-firestore.md)** - Sync with Firebase Cloud Firestore

You can also implement a custom replication handler for any backend that does not have a built-in plugin. The interface is straightforward:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    replicationIdentifier: 'my-custom-sync',
    collection: db.items,
    pull: {
        async handler(checkpointOrNull, batchSize) {
            const checkpoint = checkpointOrNull ?? { updatedAt: 0 };
            const response = await fetch(
                `/api/items?since=${checkpoint.updatedAt}&limit=${batchSize}`
            );
            const data = await response.json();
            return {
                documents: data.items,
                checkpoint: data.checkpoint
            };
        }
    },
    push: {
        async handler(rows) {
            const response = await fetch('/api/items/bulk', {
                method: 'POST',
                body: JSON.stringify(rows)
            });
            const conflicts = await response.json();
            return conflicts;
        }
    },
    live: true,
    retryTime: 5000
});
```

This is in contrast to PouchDB, where the only built-in replication mechanism is the Couch Replication Protocol. Teams that want to use a different backend have to build the entire sync layer from scratch.

### CouchDB Replication Without the Overhead

If you are currently using PouchDB with a CouchDB backend, you can migrate to RxDB and continue using CouchDB as the sync target. RxDB's [CouchDB replication plugin](../../replication-couchdb.md) syncs with any CouchDB-compatible endpoint using RxDB's own sync engine. This means no revision trees are stored on the client and no compaction is required.

```ts
import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';

const replicationState = replicateCouchDB({
    replicationIdentifier: 'my-couchdb-replication',
    collection: db.items,
    url: 'https://example.com/db/items',
    live: true,
    pull: { batchSize: 60 },
    push: { batchSize: 60 }
});

await replicationState.awaitInitialReplication();

replicationState.error$.subscribe(err => {
    console.error('Replication error:', err);
});
```

The token can be updated mid-session when authentication is required:

```ts
import {
    replicateCouchDB,
    getFetchWithCouchDBAuthorization
} from 'rxdb/plugins/replication-couchdb';

const replicationState = replicateCouchDB({
    replicationIdentifier: 'my-couchdb-replication',
    collection: db.items,
    url: 'https://example.com/db/items',
    fetch: getFetchWithCouchDBAuthorization('myUsername', 'myPassword'),
    live: true,
    pull: { batchSize: 60 },
    push: { batchSize: 60 }
});
```

### Schema Migrations

When your data model changes, RxDB handles migration automatically. You increment the schema version number and provide a migration strategy for each version step:

```ts
await db.addCollections({
    items: {
        schema: {
            title: 'item schema',
            version: 1, // incremented from 0
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                title:     { type: 'string' },
                status:    { type: 'string', enum: ['active', 'done', 'archived'] },
                priority:  { type: 'number' }, // new field
                createdAt: { type: 'number' }
            },
            required: ['id', 'title', 'status', 'priority', 'createdAt']
        },
        migrationStrategies: {
            1: (oldDoc) => {
                // Assign default priority to all existing documents
                oldDoc.priority = 0;
                return oldDoc;
            }
        }
    }
});
```

When the database opens and detects the new schema version, it automatically runs the migration strategy on all locally stored documents before the application starts. PouchDB has no built-in migration system. Schema changes require manual update scripts that must be applied carefully to avoid data corruption.

### Conflict Resolution

RxDB resolves conflicts during replication through a configurable conflict handler:

```ts
await db.addCollections({
    items: {
        schema: itemSchema,
        conflictHandler: async (input) => {
            const { newDocumentState, realMasterState } = input;

            // Last-write-wins based on timestamp
            if (newDocumentState.updatedAt >= realMasterState.updatedAt) {
                return { documentData: newDocumentState };
            }
            return { documentData: realMasterState };
        }
    }
});
```

For collaborative applications where concurrent edits from multiple users should be merged, RxDB supports [CRDTs (Conflict-free Replicated Data Types)](../../crdt.md):

```ts
import { getCRDTSchemaPart, RxDBcrdtPlugin } from 'rxdb/plugins/crdt';
import { addRxPlugin } from 'rxdb/plugins/core';

addRxPlugin(RxDBcrdtPlugin);

const itemSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:     { type: 'string', maxLength: 100 },
        title:  { type: 'string' },
        done:   { type: 'boolean' },
        crdts:  getCRDTSchemaPart()
    },
    crdt: { field: 'crdts' }
};
```

With CRDTs enabled, concurrent writes are automatically merged when clients sync. No manual conflict resolution code is required for the common case.

PouchDB stores conflicting revisions as alternate branches in the revision tree. Resolving a conflict requires fetching all conflicting revisions, comparing them, picking a winner, and posting that winner back as the new revision. This is explicit, verbose, and easy to implement incorrectly.

### Multi-Tab Support

When a user opens a web app in multiple browser tabs, each tab has its own JavaScript process. A PouchDB write in one tab does not automatically appear in reactive queries in another tab. Synchronizing state across tabs requires custom coordination code using `localStorage` events, `BroadcastChannel`, or a similar mechanism.

RxDB handles this through the [SharedWorker storage option](../../rx-storage-shared-worker.md). All tabs share a single database instance running in the SharedWorker. A write from one tab automatically propagates to reactive queries in all other tabs without any additional code:

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

### Encryption at Rest

RxDB includes a [built-in encryption plugin](../../encryption.md) for encrypting specific document fields before they are written to local storage. The raw storage (IndexedDB, SQLite, OPFS) contains ciphertext for encrypted fields:

```ts
import {
    wrappedKeyEncryptionCryptoJsStorage
} from 'rxdb/plugins/encryption-crypto-js';

const db = await createRxDatabase({
    name: 'myapp',
    storage: wrappedKeyEncryptionCryptoJsStorage({
        storage: getRxStorageIndexedDB()
    }),
    password: 'user-specific-passphrase'
});

const schema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:            { type: 'string', maxLength: 100 },
        sensitiveNote: { type: 'string' }
    },
    encrypted: ['sensitiveNote']
};
```

Without the passphrase, the raw IndexedDB contents are unreadable. PouchDB has no built-in encryption for document fields.

### Performance Comparison

Because RxDB does not store revision trees and its storage layer is optimized for read queries, it is significantly faster than PouchDB for most workloads. The following patterns cause the largest performance differences:

- **Bulk inserts**: RxDB writes only the current document. PouchDB initializes a revision tree for each document.
- **Document reads after many updates**: RxDB reads the current document directly. PouchDB must navigate the revision tree to determine the winning revision.
- **Range queries**: RxDB's IndexedDB storage layout uses indexes designed for range queries. PouchDB's layout is designed for replication correctness.
- **Storage size after sustained use**: RxDB database size is proportional to the number of documents. PouchDB database size grows with both the number of documents and the number of updates to each document.

When using the [OPFS storage](../../rx-storage-opfs.md), RxDB gets an additional performance advantage over PouchDB, because OPFS bypasses IndexedDB's transaction overhead entirely:

```ts
import { getRxStorageOPFS } from 'rxdb/plugins/storage-opfs';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageOPFS()
});
```

OPFS gives RxDB direct filesystem access inside the browser's origin-private file system, resulting in significantly higher write throughput than IndexedDB for bulk operations.

---

## Migrating from PouchDB to RxDB

If you have an existing application using PouchDB, migration to RxDB involves the following steps:

1. **Define a schema** for each collection. List all document fields with their types and which fields should be indexed.
2. **Replace the PouchDB initialization code** with `createRxDatabase` and `addCollections`.
3. **Replace PouchDB queries** with RxDB's MongoDB-style query selectors and `find()` / `findOne()` APIs.
4. **Replace the changes feed subscription** with RxDB's observable query subscriptions.
5. **Replace PouchDB sync** with the appropriate RxDB replication plugin.
6. **Migrate existing local data** using RxDB's migration strategies if local documents already exist in IndexedDB.

The main conceptual shift is moving from PouchDB's event-based model (listen to changes, re-run queries manually) to RxDB's reactive model (subscribe to query observables, receive automatic updates).

---

## Comparison Table

| Feature | PouchDB | RxDB |
|---|---|---|
| **Offline-first** | Yes | Yes |
| **Reactive queries** | No (manual implementation required) | Yes (RxJS Observables) |
| **Schema validation** | No | Yes (JSON Schema) |
| **TypeScript support** | Limited (untyped documents) | Full (inferred from schema) |
| **Storage engine** | Fixed (IndexedDB in browser) | Pluggable (IndexedDB, OPFS, SQLite, Memory) |
| **Revision tree overhead** | Yes (storage grows with every update) | No (current state only) |
| **CouchDB replication** | Yes (Couch Replication Protocol) | Yes (custom plugin, no revision-tree overhead) |
| **GraphQL replication** | No | Yes (built-in plugin) |
| **HTTP / REST replication** | No | Yes (built-in plugin) |
| **WebSocket replication** | No | Yes (built-in plugin) |
| **Supabase replication** | No | Yes (built-in plugin) |
| **WebRTC replication** | No | Yes (built-in plugin) |
| **Conflict resolution** | Revision-tree branches (manual) | Configurable handler or CRDT plugin |
| **Schema migrations** | Manual | Automatic via versioned strategies |
| **Multi-tab consistency** | Not built-in | SharedWorker storage |
| **Encryption at rest** | No | Per-field encryption plugin |
| **Backend flexibility** | CouchDB protocol only | Any backend via replication plugins |
| **Query language** | `pouchdb-find` Mango syntax | MongoDB-style selectors |
| **Compaction required** | Yes (storage grows without it) | No |
| **Bundle size** | Large | Modular (tree-shakeable) |
| **Active development** | Apache incubation (maintenance mode) | Active, with commercial support |

---

## FAQ

<details>
<summary>Can RxDB still replicate with CouchDB?</summary>

Yes. RxDB has a dedicated [CouchDB replication plugin](../../replication-couchdb.md) that syncs with any CouchDB-compatible endpoint. The key difference from PouchDB is that RxDB does not use the Couch Replication Protocol internally. It uses RxDB's own sync engine on top of the CouchDB HTTP API. This avoids the revision-tree storage overhead while still replicating correctly with CouchDB servers.

</details>

<details>
<summary>Do I have to migrate my local PouchDB data when switching to RxDB?</summary>

If your users have existing data in PouchDB's IndexedDB storage, you need to migrate it to RxDB's storage format. The recommended approach is to read all documents from the existing PouchDB database on first launch after the upgrade, insert them into RxDB, and then remove the old PouchDB storage. RxDB's migration strategies handle schema version changes within RxDB itself, but the initial import from PouchDB is a one-time operation that you implement in application code.

</details>

<details>
<summary>Is PouchDB no longer maintained?</summary>

PouchDB is in incubation at the Apache Software Foundation as of 2024 and released version 9.0.0 in mid-2024. It is maintained in the sense that critical bugs are addressed, but it is not gaining significant new features. Its architecture is constrained by the requirement to remain compatible with the Couch Replication Protocol, which limits how much the performance and feature set can evolve without breaking backward compatibility.

</details>

<details>
<summary>What happens to the PouchDB RxStorage in RxDB?</summary>

The PouchDB RxStorage was removed from RxDB because of persistent performance issues and bugs that could not be fixed externally. If you were using RxDB with the PouchDB storage, you should migrate to a different RxStorage such as [IndexedDB](../../rx-storage-indexeddb.md) or [OPFS](../../rx-storage-opfs.md). Staying on older versions of RxDB (before version 15) is also possible but means missing out on all improvements since then.

</details>

<details>
<summary>Is RxDB suitable for React Native, not just browsers?</summary>

Yes. RxDB works in browsers, React Native, Electron, and Node.js. For React Native, the recommended storage is [SQLite via expo-sqlite or op-sqlite](../../rx-storage-sqlite.md), which provides native performance on both iOS and Android. The same schema definitions, queries, and replication configuration work across all environments.

</details>

<details>
<summary>Does RxDB require a backend to work?</summary>

No. RxDB is a local-first database. All reads and writes go to local storage. Replication with a backend is optional and can be enabled or disabled at any time. An application using RxDB works fully offline without any backend connection. Replication runs in the background and syncs when connectivity is available.

</details>
