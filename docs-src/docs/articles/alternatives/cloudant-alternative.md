---
title: RxDB as a Cloudant Alternative for the JavaScript Client
slug: cloudant-alternative.html
description: Replace PouchDB with RxDB on the client while keeping Cloudant or any CouchDB-compatible backend. Faster local storage, reactive queries, less lock-in.
---

# RxDB as a Cloudant Alternative for the JavaScript Client

Teams that adopted **Cloudant** usually picked it because they wanted CouchDB semantics without running their own cluster. The replication protocol, the JSON document model, and the ability to sync with [PouchDB](../../replication-couchdb.md) in the browser made Cloudant a popular choice for offline-capable web and mobile apps. Over time, many of those teams ran into the same set of issues on the client side: PouchDB struggles with large datasets, IBM Cloud pricing is hard to predict, and the developer experience around schemas and reactive UIs feels dated.

This page explains how **RxDB** fits as a Cloudant alternative on the JavaScript client. You can keep your existing Cloudant backend and replace only the client database, or move to a different sync target entirely.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## A Short History of Cloudant

Cloudant Inc. was founded in 2008 by former MIT physicists who wanted a distributed version of Apache CouchDB. The product was built on top of **BigCouch**, an internal fork that added clustering, sharding, and quorum reads and writes to plain CouchDB. BigCouch was later merged back into the upstream CouchDB project, which is why modern CouchDB clusters look very similar to what Cloudant offered from day one.

In 2014, **IBM acquired Cloudant** and integrated it into the IBM Cloud portfolio. The service kept the CouchDB API surface, including `_changes` feeds, MapReduce views, Mango queries, and the standard replication protocol. In 2018, the **Cloudant Shared Plan was retired** and existing customers were migrated to dedicated IBM Cloud accounts. Today, Cloudant is positioned as part of **IBM Cloud Databases**, billed mostly through provisioned throughput capacity and storage.

The protocol stayed open, which is the important part for this article: anything that can replicate with CouchDB can replicate with Cloudant.

## What is RxDB?

[RxDB](https://rxdb.info/) is a [local-first](../../articles/local-first-future.md) NoSQL database for JavaScript. It runs in the browser, in [Node.js](../../nodejs-database.md), in React Native, in Electron, and in most other JavaScript runtimes. Documents live on the client, queries run locally against indexed storage, and a [replication layer](../../replication.md) keeps the local state in sync with a remote endpoint.

Two design choices matter for Cloudant users:

- The storage layer is swappable. You can pick [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [Dexie](../../rx-storage-dexie.md), in-memory, SQLite, and others depending on the runtime.
- The replication layer is pluggable. There is a dedicated [CouchDB replication plugin](../../replication-couchdb.md) that speaks the same protocol Cloudant uses, plus generic [HTTP replication](../../replication-http.md) for custom endpoints.

## Where Cloudant with PouchDB Falls Short on the Client

Cloudant on the server is solid. The friction shows up in the browser, where most teams pair it with PouchDB.

### PouchDB Performance with Large Datasets

PouchDB stores a full **revision tree** for every document to stay protocol-compatible with CouchDB. On top of [IndexedDB](../../slow-indexeddb.md), this design pays a cost for every read and write:

- Each document update appends to a per-document revision tree, which inflates storage size.
- Bulk inserts trigger many IndexedDB transactions because of the way revision metadata is written.
- Initial replication of tens of thousands of documents can take minutes and freeze the UI.
- Query performance degrades because secondary indexes are built on top of slow IndexedDB key ranges.

Once a collection grows past a few thousand active documents, users notice the slowdowns.

### IBM Lock-In

Even though Cloudant uses an open protocol, the operational side is tied to IBM Cloud. Identity and Access Management, billing, support tickets, and monitoring all live inside the IBM ecosystem. Moving away requires migrating accounts, IAM policies, and integration glue, not just data.

### Billing Complexity

Cloudant pricing is based on provisioned throughput capacity for reads, writes, and queries, plus storage. Spikes in client activity translate directly into throughput overruns. Teams often over-provision to be safe, which makes the bill larger than expected.

### Limited Client-Side Features

PouchDB ships a small query engine and basic change events. There is no schema validation, no typed collections, no reactive query results out of the box, and no first-class hooks for migrations or encryption. Application code has to fill those gaps.

## Why RxDB Works as a Cloudant Alternative

RxDB keeps the parts that made Cloudant attractive and replaces the parts that hurt on the client.

### 1. Still Talks to Any CouchDB-Compatible Server

The [CouchDB replication plugin](../../replication-couchdb.md) implements the standard CouchDB replication protocol, so it works against Cloudant, Apache CouchDB, and any compatible service. You keep your existing backend, your existing documents, and your existing access control.

### 2. Faster Client Storage Options

RxDB does not force a single storage engine. For browsers you can choose:

- [IndexedDB storage](../../rx-storage-indexeddb.md) for broad compatibility.
- [OPFS storage](../../rx-storage-opfs.md) for the fastest persistent storage in modern browsers.
- [Dexie storage](../../rx-storage-dexie.md) when you want a battle-tested IndexedDB wrapper.

Because RxDB does not maintain a full CouchDB-style revision tree on disk, write throughput and initial sync are noticeably faster than PouchDB on the same hardware.

### 3. MongoDB-Style Queries

[RxQuery](../../rx-query.md) supports a Mango-like syntax with selectors, sort, skip, limit, and indexes defined at the schema level. The query planner uses your indexes directly against the underlying storage, so equality, range, and compound queries stay fast as the dataset grows.

### 4. Observable Queries

Every query and document in RxDB is [reactive](../../reactivity.md). A query returns an observable that emits a new result whenever a matching document changes, locally or through replication. UI frameworks like React, Vue, Svelte, and Angular bind to those observables directly, which removes a lot of glue code that PouchDB users normally write by hand.

### 5. Schemas, Migrations, and Plugins

[Collections](../../rx-collection.md) are defined with JSON schemas, which gives you validation, typed documents, schema versioning with migration strategies, encryption, attachments, and a long list of optional plugins. Cloudant on its own does not enforce a schema, and PouchDB does not either. Adding RxDB on the client gives you that structure without changing the backend.

## Code Sample: Replicating with a Cloudant CouchDB Endpoint

The CouchDB replication plugin points at any CouchDB-compatible URL, including a Cloudant database URL. The example below uses a basic auth token, but you can plug in IAM-issued session cookies or API keys the same way you would with PouchDB.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';

const db = await createRxDatabase({
  name: 'mydb',
  storage: getRxStorageDexie()
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
  replicationIdentifier: 'cloudant-todos-replication',
  collection: db.todos,
  url: 'https://USER:PASSWORD@my-account.cloudantnosqldb.appdomain.cloud/todos/',
  live: true,
  pull: {},
  push: {}
});

replicationState.error$.subscribe(err => {
  console.error('Cloudant sync error', err);
});
```

The replication is bidirectional, runs continuously when `live: true`, and survives offline periods. When the client comes back online, RxDB replays local changes against Cloudant and pulls down any new revisions.

## Code Sample: Subscribing to a Query in the Browser

Once data is local, queries no longer hit the network. The same query that would cost a Cloudant read now runs against IndexedDB or OPFS and updates automatically when documents change.

```ts
const openTodos$ = db.todos.find({
  selector: { done: false },
  sort: [{ updatedAt: 'desc' }]
}).$;

const subscription = openTodos$.subscribe(todos => {
  // Re-render the list whenever the result set changes
  renderTodoList(todos);
});

// Writing a document triggers the subscription above
await db.todos.insert({
  id: 'todo-1',
  title: 'Try RxDB with Cloudant',
  done: false,
  updatedAt: new Date().toISOString()
});
```

There is no separate change feed wiring, no manual diffing, and no extra Cloudant reads.

## Keep Cloudant as the Backend, Swap the Client

You do not have to leave Cloudant to fix the client. A common migration path looks like this:

1. Keep the existing Cloudant database, indexes, and security configuration.
2. Replace PouchDB on the client with RxDB plus the [CouchDB replication plugin](../../replication-couchdb.md).
3. Pick a storage adapter that fits the target runtime, for example [OPFS](../../rx-storage-opfs.md) for desktop browsers and [IndexedDB](../../rx-storage-indexeddb.md) for older ones.
4. Define RxDB schemas that mirror your existing document shapes and add validations gradually.
5. Roll the new client out behind a feature flag so existing PouchDB users keep working until they switch over.

Because RxDB speaks the CouchDB replication protocol, the server does not know or care whether the client is PouchDB or RxDB. You can run both at the same time during the transition.

If you later decide to leave IBM Cloud entirely, you can repoint the [CouchDB replication](../../replication-couchdb.md) at a self-hosted CouchDB cluster, or switch to [generic HTTP replication](../../replication-http.md) against your own API. The client code does not change.

## FAQ

<details>
<summary>Can RxDB replicate with Cloudant?</summary>

Yes. Cloudant exposes the standard CouchDB replication protocol, and RxDB ships an official [CouchDB replication plugin](../../replication-couchdb.md) that targets that protocol. Point the plugin at your Cloudant database URL and authenticate the same way you would with any other CouchDB client. Both pull and push are supported, including continuous live replication.

</details>

<details>
<summary>Is Cloudant still active?</summary>

Cloudant is still offered as a managed service inside IBM Cloud Databases. The Cloudant Shared Plan was retired in 2018, and current deployments run on dedicated IBM Cloud capacity with throughput-based billing. The CouchDB-compatible API is still the supported way to talk to the service, so client tooling built for CouchDB keeps working against modern Cloudant.

</details>

<details>
<summary>Why is RxDB faster than PouchDB?</summary>

PouchDB stores a full per-document revision tree to mirror CouchDB on disk, which adds overhead to every read and write on top of [slow IndexedDB](../../slow-indexeddb.md). RxDB separates the storage engine from the replication protocol, so the on-disk format is optimized for the client and replication metadata is kept compact. RxDB also supports faster storage backends like [OPFS](../../rx-storage-opfs.md) and uses event reduction to avoid recomputing observable queries on every change.

</details>

<details>
<summary>How do I migrate from PouchDB plus Cloudant to RxDB plus Cloudant?</summary>

Install RxDB and the [CouchDB replication plugin](../../replication-couchdb.md), define schemas for your existing collections, and start replication against the same Cloudant URL you used with PouchDB. RxDB will pull the documents into local storage on first run. You can keep the old PouchDB code path during a rollout window and remove it after users have synced. No server-side changes are required.

</details>

## Comparison Table

| Capability | Cloudant + PouchDB | RxDB |
| --- | --- | --- |
| Client storage | IndexedDB via PouchDB only | IndexedDB, OPFS, Dexie, in-memory, SQLite, more |
| Replication protocol | CouchDB | CouchDB, HTTP, GraphQL, WebRTC, P2P, Firestore, others |
| Backend choice | IBM Cloud Cloudant | Cloudant, self-hosted CouchDB, custom servers |
| Query language | Mango on PouchDB | Mango-like [RxQuery](../../rx-query.md) with indexes |
| Reactive queries | Manual via change feed | Built-in observable queries |
| Schema validation | None on client | JSON schema per collection |
| Schema migrations | Manual | Built-in versioned migrations |
| Encryption | Manual | Optional plugin |
| Conflict handling | Revision-based, manual resolution | Pluggable conflict handler per collection |
| Offline-first | Yes, with PouchDB caveats | Yes, [offline-first](../../offline-first.md) by design |
| Vendor lock-in | IBM Cloud account and billing | None, replace replication target at any time |

## Follow Up

If Cloudant works for your backend but PouchDB is holding back your client, RxDB is a drop-in upgrade path. You keep the open replication protocol, switch to faster storage, and gain schemas, reactive queries, and a plugin ecosystem.

More resources:

- [RxDB Sync Engine](../../replication.md)
- [CouchDB Replication Plugin](../../replication-couchdb.md)
- [HTTP Replication](../../replication-http.md)
- [RxDB GitHub Repository](/code/)
