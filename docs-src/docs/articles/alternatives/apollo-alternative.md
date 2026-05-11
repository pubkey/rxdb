---
title: RxDB as an Apollo Client Alternative for Truly Offline-First Apps
slug: apollo-alternative.html
description: Compare Apollo Client with RxDB for offline-first apps. Learn why a local database with GraphQL replication beats cache persistence for reliable sync.
---

# RxDB as an Apollo Client Alternative for Truly Offline-First Apps

The Apollo GraphQL platform is built to move data between a server and UI applications over GraphQL endpoints. It ships with GraphQL clients for several languages, server libraries to build endpoints, and tools for federation and observability. Apollo Client offers caching features that can persist data for offline reads, but caching alone does not make an application fully usable when the user is offline. Teams that start with Apollo Client and try to push the cache into an [offline-first](../../offline-first.md) architecture often hit a wall, because the cache is a transport optimization, not a database.

If you need apps that start offline, write while offline, sync reliably when the network returns, and resolve conflicts deterministically, RxDB is a more direct fit. You can keep Apollo for the GraphQL transport and use RxDB for storage and sync, or replace the client cache entirely.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## A Short History of Apollo

Apollo Client started around 2016 as a project from the Meteor Development Group, the team behind the Meteor framework. After Meteor's data layer (Minimongo with DDP) showed the value of reactive data on the client, the group spun out Apollo as a GraphQL-first successor with a transport-agnostic design.

The platform grew across several products:

- **Apollo Client** for JavaScript, iOS, Android, and Kotlin Multiplatform.
- **Apollo Server** as a reference GraphQL server in Node.js.
- **Apollo Federation** for composing multiple GraphQL services into one supergraph.
- **Apollo Studio** (later GraphOS) for schema registry, metrics, and CI checks.

Apollo became one of the most adopted GraphQL toolchains, with a strong ecosystem of code generators, dev tools, and integrations with React, Vue, Angular, and Svelte. Its normalized in-memory cache, paired with `apollo-cache-persist`, is what most teams reach for when they think about offline support.

## What is RxDB?

[RxDB](https://rxdb.info/) (Reactive Database) is a local-first, NoSQL database for JavaScript. It runs in browsers, Node.js, Electron, React Native, Capacitor, Deno, and Bun. Data is stored on the client through a pluggable storage layer (IndexedDB, OPFS, SQLite, in-memory, and others), validated against a [JSON schema](../../rx-schema.md), and exposed through [observable queries](../../reactivity.md) so the UI updates automatically when data changes.

RxDB ships a generic [Sync Engine](../../replication.md) with ready-made plugins for [GraphQL](../../replication-graphql.md), HTTP, CouchDB, Firestore, NATS, WebRTC, and more. The replication protocol is designed for offline-first workloads from the start, with checkpoint-based pull, batched push, conflict detection, and live event streams.

## Where Apollo Client Falls Short for Offline-First

Apollo Client was designed around the request and response model of GraphQL. Offline support was added on top through cache persistence and link middleware. That foundation creates several limits when you need a real offline-first app.

### 1. The Cache is Not a Database

Apollo's normalized cache stores query results keyed by the queries that produced them. It is optimized for deduplication and re-rendering, not for arbitrary local queries. You cannot run an ad hoc filter, sort, or aggregation across the cache the way you would against a database. If a screen needs data shaped differently from the original query, you either re-query the server or write custom resolver logic.

RxDB stores documents in [collections](../../rx-collection.md) with their own indexes. You can run any [Mango-style query](../../rx-query.md) over local data without touching the network.

### 2. No Schema-Driven Persistence

Apollo's cache structure follows your GraphQL queries. Persistence with `apollo-cache-persist` writes the entire normalized cache to storage as a blob and reads it back at startup. There is no per-document schema validation, no migration system, and no fine-grained control over which fields persist.

RxDB requires a [JSON schema](../../rx-schema.md) per collection. Documents are validated on insert and update, schema versions trigger [migrations](../../migration-schema.md), and storage is document-level rather than blob-level.

### 3. No Conflict Handling on Writes

Apollo Client treats mutations as fire-and-forget RPCs. Optimistic responses can update the cache before the server replies, but if the device is offline when the mutation runs, the operation fails unless you wrap it in a queue. There is no built-in concept of revisions, vector clocks, or merge functions.

RxDB tracks revisions on every document and runs writes through a pluggable [conflict handler](../../transactions-conflicts-revisions.md). When the same document is modified locally and remotely, your handler decides how to merge, keep, or split the changes.

### 4. Fragile Write Queues

The common pattern for offline writes with Apollo is `apollo-link-queue` or a similar custom link that holds mutations while offline and replays them when the connection returns. These queues are not persisted by default, do not survive a tab reload reliably, and do not coordinate with the cache once the server response shape differs from the optimistic update.

RxDB's [replication](../../replication.md) persists every local change as part of the document store. A push handler is called with batched changes, retried on failure, and resumed across reloads through checkpoints.

### 5. No Multi-Tab Synchronization

Apollo Client instances in different browser tabs do not share state. Two tabs of the same app keep separate caches, and a write in one tab does not update the other unless both refetch from the server.

RxDB uses a [BroadcastChannel-based leader election](../../leader-election.md) so that multiple tabs share one logical database. A write in any tab streams to all other tabs through the same observable queries that drive the UI.

### 6. Normalized Cache Eviction Issues

Apollo's cache can grow without bound, and garbage collection through `cache.gc()` removes entries based on reachability from active queries. This is fine for a session cache, but it makes the cache an unreliable source of truth for data the user expects to be there next time the app opens.

RxDB documents stay in storage until you delete them. Storage size is bounded by the underlying engine (IndexedDB, OPFS, SQLite) rather than by query reachability.

## What RxDB Brings to the Table

### A Real Local Database

Documents are persisted in a [pluggable storage backend](../../rx-storage.md). You can pick IndexedDB or OPFS in browsers, SQLite in React Native and Electron, in-memory for tests, and swap storages without changing application code.

### GraphQL-Friendly Replication

The [GraphQL replication plugin](../../replication-graphql.md) speaks the same protocol you would build for Apollo: a `pullQuery` that returns documents plus a checkpoint, a `pushMutation` that accepts an array of changes, and a subscription for live updates. You keep your GraphQL server, schema, and auth setup. RxDB replaces the client-side cache and queue.

### Conflict Resolution

Every collection has a [conflict handler](../../transactions-conflicts-revisions.md) that runs on both local and remote write paths. You can implement last-write-wins, field-level merges, CRDT-style logic, or domain-specific rules.

### Schema Validation

[Schemas](../../rx-schema.md) are JSON Schema documents. They define types, required fields, indexes, encrypted fields, and primary keys. Schema changes are versioned and run through a [migration strategy](../../migration-schema.md) at startup.

### Observable Queries

Every [RxQuery](../../rx-query.md) is an [Observable](../../reactivity.md). The UI subscribes once and receives a new result whenever any document that affects the query changes, whether the change came from a local write, a replication pull, or another browser tab. This is the foundation for [optimistic UI](../../articles/optimistic-ui.md) without manual cache manipulation.

### Multi-Tab and Multi-Storage

Multiple tabs of the same origin share one logical database through leader election. Storage backends can be combined through [storage wrappers](../../rx-storage.md) for encryption, validation, sharding, or worker offloading.

## Code Sample: Replicate an RxDB Collection over GraphQL

The example below mirrors a typical Apollo setup but stores data in RxDB and uses the [GraphQL replication plugin](../../replication-graphql.md) for sync.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { replicateGraphQL } from 'rxdb/plugins/replication-graphql';

const db = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage(),
    multiInstance: true,
    eventReduce: true
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
                done: { type: 'boolean' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'title', 'updatedAt']
        }
    }
});

const replicationState = replicateGraphQL({
    collection: db.tasks,
    url: {
        http: 'https://example.com/graphql',
        ws: 'wss://example.com/graphql'
    },
    pull: {
        queryBuilder: (checkpoint, limit) => ({
            query: `query Pull($checkpoint: Checkpoint, $limit: Int!) {
                pullTasks(checkpoint: $checkpoint, limit: $limit) {
                    documents { id title done updatedAt _deleted }
                    checkpoint { id updatedAt }
                }
            }`,
            variables: { checkpoint, limit }
        })
    },
    push: {
        queryBuilder: (rows) => ({
            query: `mutation Push($rows: [TaskInputRow!]!) {
                pushTasks(rows: $rows) { id title done updatedAt }
            }`,
            variables: { rows }
        })
    },
    live: true,
    deletedField: '_deleted',
    replicationIdentifier: 'tasks-graphql'
});
```

The push handler returns conflicts as an array of server documents. RxDB then runs the conflict handler for each row before retrying.

## Code Sample: Observable Query in a React Component

Apollo's `useQuery` re-runs against the cache when relevant fields change. With RxDB, the same effect comes from subscribing to an `RxQuery`.

```tsx
import { useEffect, useState } from 'react';
import type { RxDocument } from 'rxdb';

type Task = {
    id: string;
    title: string;
    done: boolean;
    updatedAt: number;
};

export function TaskList({ db }) {
    const [tasks, setTasks] = useState<RxDocument<Task>[]>([]);

    useEffect(() => {
        const sub = db.tasks
            .find({ selector: { done: false }, sort: [{ updatedAt: 'desc' }] })
            .$.subscribe(setTasks);
        return () => sub.unsubscribe();
    }, [db]);

    return (
        <ul>
            {tasks.map(t => (
                <li key={t.id}>{t.title}</li>
            ))}
        </ul>
    );
}
```

The list updates on every local write, every replication pull, and every change from another tab, with no manual cache reads or refetch calls.

## Use Both: Apollo for Transport, RxDB for Storage

Replacing Apollo wholesale is not always the goal. Some teams already run Apollo Federation, persisted queries, and GraphOS metrics, and want to keep them. In that case, RxDB fits next to Apollo rather than in place of it.

A common split looks like this:

- **Apollo Client** handles one-shot queries that do not need offline persistence, such as analytics dashboards or admin screens that are online by definition.
- **RxDB** owns the data that must work offline: user-authored content, drafts, settings, and any list the UI renders frequently.
- **Replication** between RxDB and the GraphQL server reuses the same schema and resolvers Apollo already calls. The [GraphQL replication plugin](../../replication-graphql.md) is server-agnostic and works with Apollo Server, Yoga, Mercurius, or any other GraphQL endpoint.

This split lets you adopt RxDB collection by collection. Start with the most offline-sensitive feature, point its queries at RxDB, and leave the rest of the app on Apollo until you decide to migrate.

## FAQ

<details>
<summary>Is Apollo a database?</summary>

No. Apollo Client is a GraphQL client with an in-memory normalized cache. The cache can be persisted to storage through `apollo-cache-persist`, but it does not offer schema validation, migrations, indexes, or local query planning. RxDB is a database with a pluggable storage layer and replication built in.
</details>

<details>
<summary>Can RxDB replicate over GraphQL?</summary>

Yes. The [GraphQL replication plugin](../../replication-graphql.md) implements the RxDB sync protocol on top of GraphQL queries, mutations, and subscriptions. You define a pull query, a push mutation, and an optional subscription for live updates, and RxDB handles checkpoints, batching, retries, and conflict detection.
</details>

<details>
<summary>How does RxDB compare to apollo-cache-persist?</summary>

`apollo-cache-persist` serializes the entire normalized cache to a single storage entry on a debounce timer. It is meant to warm the cache after a reload, not to be a source of truth. RxDB writes each document as it changes, validates against a schema, supports per-collection migrations, and exposes [reactive queries](../../reactivity.md) that fire on every change. Crashes between persist intervals do not cost data because every write is durable on commit.
</details>

<details>
<summary>What about subscriptions?</summary>

GraphQL subscriptions still work. The RxDB GraphQL replication plugin can subscribe to a server stream and use each event as a trigger to run a pull. That keeps the protocol resumable through checkpoints while giving you near real-time updates over WebSockets. See the [realtime database](../../articles/realtime-database.md) article for the broader pattern.
</details>

<details>
<summary>Can I replace Apollo entirely?</summary>

Yes, if your app's data flow fits the RxDB model of collections, schemas, and replicated documents. Many teams do this for product surfaces that need offline support and keep a thin GraphQL fetch layer (or plain `fetch`) for one-off requests. If you rely heavily on Apollo Federation tooling on the server, you can keep that and only swap the client side.
</details>

## Comparison Table

| Capability | Apollo Client | RxDB |
| --- | --- | --- |
| Primary role | GraphQL client and cache | Local database with sync |
| Storage model | Normalized in-memory cache, optional blob persistence | Document store with pluggable backends (IndexedDB, OPFS, SQLite, memory) |
| Schema validation | None on client | JSON Schema per [collection](../../rx-schema.md) |
| Local queries | Limited to query results in cache | Full [Mango query API](../../rx-query.md) with indexes |
| Reactivity | `useQuery` over cache | [Observable queries](../../reactivity.md) over storage and replication |
| Offline writes | Manual queue link, not persisted by default | Built-in persistent push queue with checkpoints |
| Conflict resolution | None on client | [Custom conflict handler](../../transactions-conflicts-revisions.md) per collection |
| Multi-tab sync | Separate cache per tab | Shared database through leader election |
| Migrations | Not provided | Versioned [schema migrations](../../migration-schema.md) |
| Transport | GraphQL over HTTP and WebSocket | Storage-agnostic; GraphQL, HTTP, CouchDB, Firestore, WebRTC, P2P |
| Server requirement | GraphQL server | Any backend that implements the pull and push handlers |

## Follow Up

If your goal is to make a GraphQL app work offline, an Apollo cache and a queue link will get you partway. For apps that must start offline, survive long disconnects, sync deterministically, and stay consistent across tabs, a real local database is the right shape. RxDB gives you that database and keeps your GraphQL backend in place through the [GraphQL replication plugin](../../replication-graphql.md).

More resources:

- [RxDB Sync Engine](../../replication.md)
- [GraphQL Replication](../../replication-graphql.md)
- [Conflict Resolution](../../transactions-conflicts-revisions.md)
- [Reactivity in RxDB](../../reactivity.md)
- [Local-First Future](../../articles/local-first-future.md)
- [Optimistic UI Patterns](../../articles/optimistic-ui.md)
- [Realtime Database Patterns](../../articles/realtime-database.md)
- [RxDB GitHub Repository](/code/)
