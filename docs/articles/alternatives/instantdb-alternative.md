# RxDB as an InstantDB Alternative with Custom Backends

> Compare RxDB and InstantDB for local-first apps. Bring your own backend, run open source, use Mango queries, and get full offline storage with conflict handling.

# RxDB as an InstantDB Alternative with Custom Backends

If you arrived here looking for an **InstantDB alternative**, you most likely want one of three things:

- A real [offline-first](../../offline-first.md) local database, not just a network cache that flushes when storage gets tight.
- The freedom to plug your own backend into the sync layer instead of relying on a hosted Datalog service.
- An open source stack that you can audit, fork, and self-host without depending on a single vendor.

**RxDB** (Reactive Database) is a client-side NoSQL database for JavaScript that stores data locally in the browser, mobile runtimes, Electron, or Node.js, and replicates with any backend you control. It is fully open source and has been used in production for offline-first apps for years.

<center>
    
        
    
</center>

## A Short History of InstantDB

InstantDB launched in 2023 out of Y Combinator with the goal of making real-time, collaborative apps feel as easy to build as a static page. The product centers on a hosted sync service written in Clojure that exposes a Datalog-style query language to JavaScript clients. Clients write through optimistic updates, the server stores the canonical state, and changes are streamed back to every connected device.

The design works well for prototypes and small collaborative tools. Queries are expressive once you know Datalog, and the SDK handles subscriptions and rollbacks automatically. The trade-off is that the sync engine and storage are tightly coupled to the InstantDB cloud, and the local layer is a query cache rather than a full database.

## What Is RxDB?

RxDB is an embeddable JavaScript database built around three ideas:

- **Local-first storage**: every read and write hits a local engine first. The app keeps working when the network is gone. See [offline-first](../../offline-first.md) and [local-first future](../../articles/local-first-future.md).
- **Reactive queries**: any [RxQuery](../../rx-query.md) returns an observable that re-emits when matching data changes, locally or from a remote push. See [reactivity](../../reactivity.md).
- **Pluggable replication**: the [Sync Engine](../../replication.md) talks to any HTTP endpoint, GraphQL server, CouchDB, Firestore, or peer over WebRTC. The protocol is documented and you can implement it on any backend with [HTTP replication](../../replication-http.md).

Storage is also pluggable. The same collection can run on IndexedDB, OPFS, SQLite, in-memory, or LocalStorage without changing application code.

## Limitations of InstantDB

InstantDB is a good fit for many apps, but a few constraints push teams to look for an alternative.

### 1. The Sync Service Is Hosted Only

InstantDB requires its managed backend. There is no open source server you can run on your own infrastructure for production workloads. If your app must run on customer hardware, in regulated environments, or in regions where the InstantDB cloud is not available, you are stuck.

### 2. Datalog Has a Learning Curve

InstantDB queries use a Datalog-style triple syntax. The model is expressive once it clicks, but new contributors have to learn it before they can ship a feature. RxDB uses a JSON Mango query format that is familiar to anyone who has touched MongoDB, PouchDB, or Supabase.

### 3. The Local Layer Is a Cache

InstantDB stores results of subscribed queries on the client so the UI stays responsive during short network drops. It is not a full local database. You cannot run arbitrary queries that were never subscribed, and the cache can be evicted. RxDB stores every document of every replicated collection on disk and lets you query any field at any time.

### 4. Few Storage Adapter Options

The InstantDB client picks its own persistence layer. RxDB exposes a [storage interface](../../rx-collection.md) with adapters for IndexedDB, OPFS, SQLite, Memory, LocalStorage, Dexie, and more. You can swap storage per platform or per collection.

### 5. Limited Conflict Resolution Knobs

InstantDB resolves write conflicts internally. You get optimistic updates and rollback, but the resolution policy is mostly fixed. RxDB lets you write a [custom conflict handler](../../transactions-conflicts-revisions.md) per collection, or opt into [CRDTs](../../crdt.md) when you need automatic merging without server arbitration.

## Why Teams Pick RxDB Instead

### Bring Your Own Backend

RxDB does not ship with a mandatory cloud. You connect a collection to whatever you already run:

- A REST API over [HTTP replication](../../replication-http.md).
- A GraphQL endpoint with subscriptions.
- A CouchDB or Firestore instance using the official replication plugins.
- WebRTC peers for direct device-to-device sync.

The sync protocol is a simple pull plus push plus event stream contract. Anything that can implement those three calls can be an RxDB backend.

### Open Source

RxDB is Apache 2.0 on the core and the storage adapters. You can read every line of the engine, fork it, and run it without sending data to a third party.

### JSON Mango Queries

Queries look like the rest of the JavaScript ecosystem. See [RxQuery](../../rx-query.md) for the full operator list.

### Observable Queries Out of the Box

Every query is an RxJS observable. UI frameworks subscribe once and re-render when data changes. See [reactivity](../../reactivity.md) and [optimistic UI](../../articles/optimistic-ui.md).

### Real Conflict Resolution

Plug in a [custom conflict handler](../../transactions-conflicts-revisions.md) per collection, or enable [CRDTs](../../crdt.md) when you want commutative merges without writing your own merge logic.

### Multi-Storage and Multi-Tab

The same code runs on IndexedDB in the browser, OPFS for higher write throughput, SQLite on React Native, or in-memory for tests. The [multi-tab](../../rx-collection.md) layer makes sure two browser tabs see the same state through a shared worker or BroadcastChannel.

## Code Sample: Rewriting an InstantDB Query in RxDB

A typical InstantDB query that fetches open todos for a user looks roughly like this:

```ts
// InstantDB
const { data } = db.useQuery({
  todos: {
    $: { where: { ownerId: userId, done: false } }
  }
});
```

The same query in RxDB uses the [Mango query format](../../rx-query.md) and returns an observable:

```ts
// RxDB
const query = db.todos.find({
  selector: {
    ownerId: userId,
    done: false
  },
  sort: [{ createdAt: 'desc' }]
});

const todos$ = query.$; // Observable<RxDocument[]>
```

`todos$` re-emits whenever a matching document is inserted, updated, or deleted, whether the change came from a local write, another tab, or the replication stream.

## Code Sample: Driving a React UI From an Observable

A small React component that mirrors the InstantDB pattern of subscribing to a query and writing optimistically:

```tsx
import { useEffect, useState } from 'react';
import { db } from './db';

export function TodoList({ userId }: { userId: string }) {
  const [todos, setTodos] = useState<any[]>([]);

  useEffect(() => {
    const sub = db.todos
      .find({ selector: { ownerId: userId, done: false } })
      .$.subscribe(setTodos);
    return () => sub.unsubscribe();
  }, [userId]);

  async function addTodo(title: string) {
    // Optimistic write: the local store updates first,
    // replication pushes it to the backend in the background.
    await db.todos.insert({
      id: crypto.randomUUID(),
      ownerId: userId,
      title,
      done: false,
      createdAt: new Date().toISOString()
    });
  }

  return (
    
      {todos.map(t => {t.title})}
      <button onClick={() => addTodo('New task')}>Add</button>
    
  );
}
```

The local insert resolves immediately. The replication layer streams the write to the server when the network is available, and any conflict is funneled through the configured conflict handler. See [optimistic UI](../../articles/optimistic-ui.md) for the full pattern.

## Hosting: Managed Sync vs Self-Hosted

| Concern | InstantDB | RxDB |
| --- | --- | --- |
| Sync service | Hosted by InstantDB | Self-hosted on any stack |
| Storage location | InstantDB cloud | Your servers, your database |
| Pricing model | Per-app hosted plan | Cost of your own infrastructure |
| Data residency | InstantDB regions | Wherever you deploy |
| Open source server | No | Yes, the protocol is open |

If you want to ship fast and a hosted backend is acceptable, InstantDB removes a lot of work. If your team needs to own the data path end to end, RxDB lets you put the sync server next to the rest of your services and reuse your existing auth, logging, and backups.

## FAQ

<details>
<summary>Is InstantDB self-hostable?</summary>

The InstantDB sync service is a hosted product. There is no supported way to run the production server on your own infrastructure today. If self-hosting is a hard requirement, RxDB plus a backend you already operate is a closer fit.

</details>

<details>
<summary>Does RxDB use Datalog?</summary>

No. RxDB queries use a JSON Mango syntax similar to MongoDB and PouchDB. The format is documented in [RxQuery](../../rx-query.md) and supports selectors, sorting, indexes, and limits without a separate query language.

</details>

<details>
<summary>How does RxDB handle optimistic updates?</summary>

Every write goes to the local storage first and resolves immediately. Observable queries re-emit with the new state, so the UI updates without waiting for the server. The [Sync Engine](../../replication.md) pushes the change in the background, and conflicts are routed through the collection's [conflict handler](../../transactions-conflicts-revisions.md). See [optimistic UI](../../articles/optimistic-ui.md) for an end-to-end example.

</details>

<details>
<summary>Can I customize storage in RxDB?</summary>

Yes. RxDB has a storage interface with adapters for IndexedDB, OPFS, SQLite, in-memory, LocalStorage, and Dexie. You pick the adapter when you create the database, and the rest of the API stays the same. See [RxCollection](../../rx-collection.md) for how storage plugs into a collection.

</details>

<details>
<summary>What about real-time collaboration?</summary>

RxDB streams changes from the server through the replication event channel and from other browser tabs through BroadcastChannel. Combined with [observable queries](../../reactivity.md), the UI updates as soon as a remote change lands. For peer-to-peer setups, the WebRTC plugin lets devices sync directly. See [realtime database](../../articles/realtime-database.md) for the architecture.

</details>

## Comparison Table

| Feature | InstantDB | RxDB |
| --- | --- | --- |
| License | Proprietary client, hosted backend | Apache 2.0 core |
| Backend | Hosted Clojure sync service | Any HTTP, GraphQL, CouchDB, Firestore, or WebRTC peer |
| Query language | Datalog-style triples | JSON Mango selectors |
| Local layer | Query cache | Full local database |
| Storage adapters | Built in, fixed | IndexedDB, OPFS, SQLite, Memory, LocalStorage, Dexie |
| Offline writes | Yes, queued | Yes, persisted to local storage |
| Conflict resolution | Built-in, limited knobs | Custom handler per collection or [CRDT](../../crdt.md) |
| Reactivity | Subscriptions on queries | RxJS observables on every query |
| Multi-tab sync | Yes | Yes, via BroadcastChannel or shared worker |
| P2P sync | No | Yes, via WebRTC plugin |
| Self-hosting | Not supported | Standard |

## Follow Up

If you want the developer experience of InstantDB but with a backend you control, an open source codebase, and a real local database underneath, RxDB is worth a look. Start with the [Sync Engine](../../replication.md) docs to see how a collection connects to your existing API, then read the [reactivity](../../reactivity.md) guide for how the UI stays in sync.

More resources:

- [RxDB Sync Engine](../../replication.md)
- [HTTP Replication](../../replication-http.md)
- [Custom Conflict Resolution](../../transactions-conflicts-revisions.md)
- [CRDT Support](../../crdt.md)
- [Local-First Future](../../articles/local-first-future.md)
- [Optimistic UI Patterns](../../articles/optimistic-ui.md)
- [Realtime Database](../../articles/realtime-database.md)
