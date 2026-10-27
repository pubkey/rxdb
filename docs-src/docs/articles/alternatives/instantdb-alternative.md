---
title: RxDB as an InstantDB Alternative After the Instant Cloud Shutdown
slug: instantdb-alternative.html
description: Instant Cloud shuts down on August 31, 2027. Compare RxDB and InstantDB and learn how to move a local-first app to a backend you control.
image: /headers/instantdb-alternative.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';
import {ComparisonTable} from '@site/src/components/comparison-table';

# RxDB as an InstantDB Alternative After the Instant Cloud Shutdown

[InstantDB](https://www.instantdb.com/) made realtime, collaborative apps easy to start: a client SDK with optimistic updates, a Datalog-style query language, and a hosted sync service that just worked. In August 2026 the Instant team [joined OpenAI](https://www.instantdb.com/essays/instant_team_joins_openai). New signups for Instant Cloud are closed, and **all Instant Cloud apps shut down on August 31, 2027**. If you are looking for an **InstantDB alternative**, you now have a deadline.

[RxDB](https://rxdb.info/) (Reactive Database) is a [local-first](../local-first-future.md), NoSQL database for JavaScript applications that stores data on the device and replicates with any backend you run. This page explains what the Instant Cloud shutdown means for existing apps, where InstantDB falls short as a local database, and how to move an InstantDB app to RxDB with your own [Sync Engine](../../replication.md) backend.

<RxdbLogo alt="InstantDB alternative" />

## A Short History of InstantDB

InstantDB launched in 2023 out of Y Combinator. The product centers on a sync server written in Clojure that talks to Postgres and exposes a Datalog-style query language (InstaQL) to JavaScript clients. Clients write through optimistic updates, the server stores the canonical state, and changes are streamed back to every connected device. The design works well for prototypes and collaborative tools, and the SDK handles subscriptions and rollbacks automatically.

### A Brief Timeline

- **2023** - InstantDB launches as a Y Combinator company with a hosted sync service.
- **2024** - The full stack, including the Clojure server, is published under the Apache 2.0 license on [GitHub](https://github.com/instantdb/instant).
- **July 31, 2026** - Subscriptions started after this date are fully refunded.
- **August 2026** - The Instant team joins OpenAI. New signups for Instant Cloud are closed ([announcement](https://www.instantdb.com/essays/instant_team_joins_openai)).
- **August 31, 2027** - All Instant Cloud apps shut down.
- **August 31, 2028** - Instant Cloud backups are no longer available.

## What the Instant Cloud Shutdown Means for Your App

The announcement is clear: "Existing users should migrate off of Instant Cloud within the next 12 months." There are two paths. You can self-host Instant, or you can move to a different stack.

Instant stays open source, and the team published a [migration guide to self-hosting](https://www.instantdb.com/docs/self-hosting/migrate.md). Following it, you set up your own Instant server, rehearse with a test backup, switch Instant Cloud to read-only, restore a final backup, and deploy a client release with the new app ID and URLs. The guide states that "Migrating without data loss will require some downtime." During the cutover, writes are blocked, and users may have to sign in again.

Self-hosting keeps your app code unchanged. But you take over the operation of a Clojure sync server and its Postgres database, and the project that you depend on no longer has its original team working on it full-time. This is the trade-off to evaluate before you choose a path.

If you have to touch the backend anyway, the migration is also the moment to move to a stack where the sync server is a small part of the backend you already run, instead of a separate service that you have to keep alive.

## What is RxDB?

RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript applications. It runs in the browser, Node.js, Electron, React Native, Capacitor, Deno, and Bun. It is built around three ideas:

- **Local-first storage**: every read and write hits a local engine first. The app keeps working when the network is gone. See [offline-first](../../offline-first.md).
- **Reactive queries**: any [RxQuery](../../rx-query.md) returns an observable that emits again when matching data changes, locally or from a remote push. See [reactivity](../../reactivity.md).
- **Pluggable replication**: the [Sync Engine](../../replication.md) talks to any HTTP endpoint, GraphQL server, CouchDB, Firestore, Supabase, or peer over WebRTC. The protocol is documented, so you can implement it on any backend with [HTTP replication](../../replication-http.md).

Storage is also pluggable. The same collection can run on [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [SQLite](../../rx-storage-sqlite.md), in-memory, or [localStorage](../../rx-storage-localstorage.md) without changing application code.

## Where InstantDB Falls Short

The shutdown is the urgent reason to move, but some limits of InstantDB also apply to a self-hosted Instant server.

### 1. The Backend Is a Fixed Service

Instant clients only talk to an Instant server. Your data model, permissions, and sync all live inside that Clojure service and its Postgres schema. When you self-host, you operate the full Instant backend next to your own services. With RxDB, the sync endpoints are a few routes in the backend you already have, written in the language you already use.

### 2. Datalog Has a Learning Curve

InstantDB queries use a Datalog-style syntax. The model is expressive once it clicks, but new contributors have to learn it before they can ship a feature. RxDB uses [MongoDB-style (Mango) queries](../../rx-query.md) that are familiar to anyone who has used MongoDB or PouchDB.

### 3. The Local Layer Is a Cache

InstantDB stores the results of subscribed queries on the client so the UI stays responsive during network drops. It is not a full local database. You cannot run arbitrary queries over data that was never subscribed. RxDB stores every document of every replicated collection on the device and lets you query any field at any time, which makes it an [offline database](../offline-database.md) and not just a cache.

### 4. Few Storage Options

The InstantDB client picks its own persistence layer. RxDB exposes an [RxStorage](../../rx-storage.md) interface with storages for IndexedDB, OPFS, SQLite, memory, localStorage, Dexie, and more. You can switch storages per platform. Switching storages is a configuration change, not a rewrite.

### 5. Limited Conflict Resolution Knobs

InstantDB resolves write conflicts internally. You get optimistic updates and rollback, but the resolution policy is mostly fixed. RxDB lets you write a [custom conflict handler](../../transactions-conflicts-revisions.md) per collection, or use [CRDTs](../../crdt.md) when you need automatic merging.

As of October 27, 2026, [InstantDB](https://github.com/instantdb/instant) has about 10,600 GitHub stars while [RxDB](https://github.com/pubkey/rxdb) has 23,416.

## Why Teams Pick RxDB Instead

### Bring Your Own Backend

RxDB does not ship with a mandatory cloud. A collection connects to whatever you already run:

- A REST API over [HTTP replication](../../replication-http.md).
- A [GraphQL](../../replication-graphql.md) endpoint with subscriptions.
- [CouchDB](../../replication-couchdb.md), [Firestore](../../replication-firestore.md), or [Supabase](../../replication-supabase.md) with the official replication plugins.
- [WebRTC](../../replication-webrtc.md) peers for direct device-to-device sync.

The sync protocol is a pull plus push plus event stream contract. Anything that can implement those three calls can be an RxDB backend. No vendor can shut it down for you.

### Open Source and Independent

The RxDB core is Apache 2.0. The project has been maintained since 2016 and is funded by [👑 RxDB Premium](/premium/) plugins, not by venture capital that needs an exit.

### Observable Queries Out of the Box

Every query is an RxJS observable. UI frameworks subscribe once and re-render when data changes. See [reactivity](../../reactivity.md) and [optimistic UI](../optimistic-ui.md).

### Multi-Tab

The same code runs in every browser tab. The [multi-tab](../../rx-collection.md) support makes sure two tabs see the same state, and replication runs only once through [leader election](../../leader-election.md).

## Code Sample: Rewriting an InstantDB Query in RxDB

A typical InstantDB query that fetches open todos looks like this:

```ts
// InstantDB
const { data } = db.useQuery({
  todos: {
    $: { where: { done: false } }
  }
});
```

The same query in RxDB uses the [Mango query format](../../rx-query.md) and returns an observable:

```ts
// RxDB
const query = myDatabase.todos.find({
  selector: {
    done: false
  },
  sort: [{ dueAt: 'asc' }]
});

const todos$ = query.$; // Observable<RxDocument<TodoDocType>[]>
```

`todos$` emits whenever a matching document is inserted, updated, or deleted, whether the change came from a local write, another tab, or the replication stream.

## Code Sample: Driving a React UI From an Observable

A small React component that mirrors the InstantDB pattern of subscribing to a query and writing optimistically:

```tsx
import { useEffect, useState } from 'react';
import { myDatabase } from './database';

export function TodoList() {
  const [todos, setTodos] = useState<any[]>([]);

  useEffect(() => {
    const sub = myDatabase.todos
      .find({ selector: { done: false }, sort: [{ dueAt: 'asc' }] })
      .$.subscribe(setTodos);
    return () => sub.unsubscribe();
  }, []);

  async function addTodo(name: string) {
    // The local write resolves at once,
    // replication pushes it to the backend in the background.
    await myDatabase.todos.insert({
      id: crypto.randomUUID(),
      name,
      dueAt: new Date().toISOString(),
      priority: 5
    });
  }

  return (
    <ul>
      {todos.map(t => <li key={t.id}>{t.name}</li>)}
      <button onClick={() => addTodo('New task')}>Add</button>
    </ul>
  );
}
```

The local insert resolves immediately. The replication pushes the write to the server when the network is available, and any conflict goes through the configured conflict handler. See [optimistic UI](../optimistic-ui.md) for the full pattern.

## Moving an InstantDB App to RxDB

Instant Cloud offers on-demand backups, and the data model of an InstantDB app is a set of namespaces with attributes and links. In the following, these steps move such an app to RxDB:

1. **Map each namespace to an RxDB collection** and write a [JSON schema](../../rx-schema.md) for it. Links between namespaces become id fields or arrays of ids, which RxDB can resolve with [population](../../population.md).
2. **Load your data into your own backend database.** Use the Instant admin SDK or a backup to export the entities, and write them to the database that will be the source of truth, for example Postgres or MongoDB. Add an `updatedAt` field and keep deleted entities as tombstones with a `_deleted` flag.
3. **Add pull, push, and stream endpoints** to your backend as described in the [HTTP replication docs](../../replication-http.md). Move your Instant permission rules into these endpoints, so each user only pulls and pushes the documents they are allowed to see.
4. **Replace `useQuery` and `transact` calls** with RxDB queries and writes as shown above.
5. **Ship the new client release** before August 31, 2027. Clients that open the new version start a fresh initial replication from your backend.

Because the RxDB client keeps working offline, users who open the app during the cutover can keep writing locally. Their changes are pushed as soon as the new backend is reachable.

## When InstantDB Still Makes Sense

If your app is small, your team is happy with InstaQL, and you are fine operating a Clojure service and its Postgres database, self-hosting Instant is the path with the fewest code changes. The [self-hosting guide](https://www.instantdb.com/docs/self-hosting/migrate.md) is well written, and the code is Apache 2.0, so nobody can take it away from you.

## FAQ

<Faq>
<FaqItem question="When does Instant Cloud shut down?">

On August 31, 2027, all Instant Cloud apps shut down. New signups are already closed, and backups stay available until August 31, 2028. Moving to **[RxDB](../../rx-database.md)** with your own backend removes the dependency on any hosted sync service.

</FaqItem>
<FaqItem question="Is InstantDB self-hostable?">

Yes. Instant is open source under Apache 2.0 and publishes a self-hosting guide. Migrating from Instant Cloud to a self-hosted server requires some downtime, and you have to operate the Clojure server and its Postgres database yourself. With the **[RxDB Sync Engine](../../replication.md)**, the sync endpoints live inside the backend you already run.

</FaqItem>
<FaqItem question="What is the best InstantDB alternative for a local-first app?">

That depends on your backend. If you want a full local database that syncs with a backend you own, **[RxDB](../../rx-database.md)** fits because it replicates with any HTTP, GraphQL, CouchDB, Firestore, or Supabase backend. If you want to keep Postgres and a hosted sync service, look at the [PowerSync comparison](./powersync-alternative.md).

</FaqItem>
<FaqItem question="Does RxDB use Datalog?">

No. RxDB queries use a JSON Mango syntax similar to MongoDB. The format is documented in **[RxQuery](../../rx-query.md)** and supports selectors, sorting, indexes, and limits without a separate query language.

</FaqItem>
<FaqItem question="How does RxDB handle optimistic updates?">

Every write goes to the local storage first and resolves immediately. Observable queries emit the new state, so the UI updates without waiting for the server. The **[Sync Engine](../../replication.md)** pushes the change in the background, and conflicts go through the collection's [conflict handler](../../transactions-conflicts-revisions.md).

</FaqItem>
</Faq>

## Comparison Table

<ComparisonTable>

| Feature | InstantDB | RxDB |
| --- | --- | --- |
| License | Apache 2.0 | Apache 2.0 core |
| Hosted service | Instant Cloud, shuts down August 31, 2027 | None required |
| Backend | Instant Clojure server with Postgres | Any HTTP, GraphQL, CouchDB, Firestore, Supabase backend, or WebRTC peers |
| Query language | Datalog-style (InstaQL) | MongoDB-style (Mango) queries |
| Local layer | Query cache | Full local database |
| Storages | Built in, fixed | IndexedDB, OPFS, SQLite, memory, localStorage, Dexie, and more |
| Offline writes | Yes, queued | Yes, persisted to local storage |
| Conflict resolution | Built in, limited knobs | Custom handler per collection or [CRDT](../../crdt.md) |
| Reactivity | Subscriptions on queries | RxJS observables on every query |
| P2P sync | No | Yes, via the WebRTC plugin |

</ComparisonTable>

## Follow Up

If you have to move off Instant Cloud anyway, move to a stack where nobody else decides when your sync backend goes away. Start with the [Quickstart](../../quickstart.md), then read the [Sync Engine](../../replication.md) docs to see how a collection connects to your existing API. The [ElectricSQL comparison](./electricsql-alternative.md) and the [Turso comparison](./turso-alternative.md) cover two more hosted sync services that changed course in 2026.

More resources:

- [RxDB Sync Engine](../../replication.md)
- [HTTP Replication](../../replication-http.md)
- [Custom Conflict Resolution](../../transactions-conflicts-revisions.md)
- [Local-First Future](../local-first-future.md)
- [Optimistic UI Patterns](../optimistic-ui.md)
- [Realtime Database](../realtime-database.md)
- [RxDB on GitHub](/code/), leave a star ⭐
