---
title: RxDB as a Replicache Alternative for Local-First Web Apps
slug: replicache-alternative.html
description: Compare RxDB and Replicache for local-first web apps. Learn how RxDB offers an open source document database with flexible sync instead of mutators.
---

# RxDB as a Replicache Alternative for Local-First Web Apps

Replicache built strong mindshare in the local-first community with its mutator-based sync model and tight focus on collaborative web apps. Teams pick it because it advertises support for many backend stacks and ships a polished developer experience. Once a project grows, the mutator architecture, the source-available license, and the opinionated query API push some teams to look for a Replicache alternative. RxDB is an open source [local-first](../../articles/local-first-future.md), NoSQL database for JavaScript that stores data on the client, runs MongoDB-style queries against a local store, and replicates with any backend you control.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="RxDB JavaScript Database" width="220" />
    </a>
</center>

## A Short History of Replicache

Replicache was built by [Rocicorp](https://rocicorp.dev/), founded by Aaron Boodman and Erik Arvidsson, and first appeared around 2020. It was distributed under a source-available license rather than an OSI-approved open source license. In 2024 Rocicorp announced that Replicache would be free to use and that the next-generation product, Zero (sometimes referred to as Zerosync), would succeed both Replicache and Reflect.

The defining trait of Replicache is its mutator-driven model. Instead of writing to a local database and pushing the changes through a generic replication protocol, you define mutator functions that describe how a piece of input data changes the state. Each mutator runs first on the client for instant feedback and then again on the server to produce the authoritative state. The frontend reads data through `useSubscribe` and similar hooks that fire when the local cache changes. This gives strong [optimistic UI](../../articles/optimistic-ui.md) behavior, but it forces you to mirror logic across both sides of the stack and to design your APIs around mutator names rather than collections, queries, or REST resources.

## What Is RxDB?

RxDB (Reactive Database) is a JavaScript database that stores documents in a local [RxCollection](../../rx-collection.md) and exposes [reactive queries](../../reactivity.md) on top of that store. It runs in the browser, in Node.js, in Electron, and in [React Native](../../react-native-database.md). The local store is the source of truth for the UI, and the [Sync Engine](../../replication.md) keeps it aligned with a remote endpoint. RxDB is licensed under Apache 2.0 with optional premium plugins, so the core code is fully open source and auditable.

Key properties:

- Document model with JSON schemas and indexes.
- MongoDB-style query language through [RxQuery](../../rx-query.md).
- Reactive results based on RxJS Observables.
- Pluggable storage layer (IndexedDB, OPFS, SQLite, in-memory, and more).
- Replication with [HTTP](../../replication-http.md), [GraphQL](../../replication-graphql.md), CouchDB, Firestore, WebRTC, and custom transports.
- Custom [conflict handlers](../../transactions-conflicts-revisions.md) per collection.

## Where Replicache Falls Short

Replicache is a focused product, and that focus shows up as friction once requirements expand.

### 1. Mutator Architecture Forces Shared Logic

Every write goes through a mutator. The same function definition has to exist on the client and on the server, and both must produce the same delta for the same input. Teams that already own a REST or GraphQL backend end up wrapping their existing endpoints in mutators or rewriting business logic on the client. RxDB instead treats the local collection as a regular database. Writes happen locally and the [replication protocol](../../replication.md) ships changes to whatever endpoint you already run.

### 2. Source-Available, Not Open Source Until 2024

For most of Replicache's history the source code shipped under a source-available license. Free use was capped at non-commercial projects, companies under $200k ARR, and companies with less than $500k in funding. The 2024 announcement made Replicache free, but the long-term product investment has shifted to Zero. RxDB has been Apache 2.0 from the start, the source lives on [GitHub](/code/), and the project does not gate features behind revenue thresholds.

### 3. Opinionated Query API

Replicache reads data through key/value scans and `useSubscribe`. There is no built-in support for MongoDB-style operators, secondary indexes defined in a schema, or aggregation. Anything that resembles a query is something you assemble in JavaScript on top of the scan API. RxDB ships a full [RxQuery](../../rx-query.md) engine with `$gt`, `$in`, `$regex`, sorting, limits, and indexed lookups, plus observable results.

### 4. Server-Side State Is Your Problem

Replicache hands you a sync protocol but expects you to maintain the canonical state on the server, including version tracking, client groups, and patch generation. RxDB's pull and push handlers are simple async functions that return documents and a checkpoint. The server side can be a thin wrapper around an existing database, a stored procedure, or a CouchDB instance.

### 5. No First-Party Peer-to-Peer

Replicache is a client-server protocol. RxDB ships a [WebRTC replication plugin](../../replication.md) so peers can sync directly without a central server.

## Why Teams Pick RxDB Instead

- **Apache 2.0 license** with no revenue gates on the core.
- **Document database** with JSON schema validation and typed queries.
- **Observable queries** that update the UI when underlying data changes.
- **Replication with arbitrary endpoints**, including [HTTP](../../replication-http.md), [GraphQL](../../replication-graphql.md), CouchDB, Firestore, and WebRTC.
- **Multi-storage** so the same code runs on IndexedDB in the browser, SQLite in React Native, and in-memory in tests.
- **No required mutator definitions**. Writes are normal `insert`, `patch`, and `remove` calls on the collection.
- **Conflict handlers** that you control per collection.
- **Real-time** behavior through the [reactive query engine](../../articles/realtime-database.md).

## Code Sample: HTTP Replication Without Shared Mutators

The following example creates a collection and replicates it against a plain REST endpoint. There is no mutator definition shared with the server. The server only needs to accept a batch of documents on push and return new documents plus a checkpoint on pull.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { replicateRxCollection } from 'rxdb/plugins/replication';

const db = await createRxDatabase({
  name: 'app',
  storage: getRxStorageLocalstorage()
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
        text: { type: 'string' },
        done: { type: 'boolean' },
        updatedAt: { type: 'number' }
      },
      required: ['id', 'text', 'done', 'updatedAt']
    }
  }
});

replicateRxCollection({
  collection: db.todos,
  replicationIdentifier: 'todos-http',
  live: true,
  pull: {
    async handler(checkpoint, batchSize) {
      const url = `https://api.example.com/todos/pull?cp=${
        encodeURIComponent(JSON.stringify(checkpoint || {}))
      }&limit=${batchSize}`;
      const res = await fetch(url);
      const body = await res.json();
      return {
        documents: body.documents,
        checkpoint: body.checkpoint
      };
    }
  },
  push: {
    async handler(changeRows) {
      const res = await fetch('https://api.example.com/todos/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(changeRows)
      });
      return await res.json();
    }
  }
});

// Standard write. No mutator needed.
await db.todos.insert({
  id: 't1',
  text: 'Try RxDB',
  done: false,
  updatedAt: Date.now()
});
```

The same collection can be wired to a [GraphQL endpoint](../../replication-graphql.md), a CouchDB server, or a custom WebSocket stream by swapping the replication plugin. The collection API does not change.

## Code Sample: Subscribing to a Query in React

Replicache exposes `useSubscribe` over its scan API. RxDB exposes the full query language and returns an Observable that React can consume directly.

```tsx
import { useEffect, useState } from 'react';
import { RxDocument } from 'rxdb';

type Todo = {
  id: string;
  text: string;
  done: boolean;
  updatedAt: number;
};

export function OpenTodos({ db }) {
  const [todos, setTodos] = useState<RxDocument<Todo>[]>([]);

  useEffect(() => {
    const sub = db.todos
      .find({
        selector: { done: false },
        sort: [{ updatedAt: 'desc' }]
      })
      .$.subscribe(results => setTodos(results));
    return () => sub.unsubscribe();
  }, [db]);

  return (
    <ul>
      {todos.map(t => (
        <li key={t.id} onClick={() => t.patch({ done: true })}>
          {t.text}
        </li>
      ))}
    </ul>
  );
}
```

The query is declarative. The patch call is a normal write on the document. Optimistic UI behavior comes from the local store and is described in the [Optimistic UI guide](../../articles/optimistic-ui.md).

## Mutators vs Documents

The core difference between Replicache and RxDB is the mental model.

Replicache treats every change as a named operation. A mutator like `addTodo({ id, text })` is the only way to mutate state. The client runs the mutator against the local cache for an instant result, the server runs the same mutator to produce the canonical state, and the protocol reconciles the two. Application logic lives inside mutators. Reads are scans over a key/value store.

RxDB treats every change as a write to a document in a collection. Code calls `collection.insert`, `doc.patch`, or `collection.bulkUpsert`. The local store records the change, the [Sync Engine](../../replication.md) ships it to the server through a generic push handler, and the server stores it in whatever database it already uses. Reads are MongoDB-style queries with reactive results.

This has practical consequences:

- **Backend reuse**: RxDB plugs into existing REST, GraphQL, or SQL backends without renaming endpoints to match mutator semantics.
- **Schema-driven storage**: RxDB validates documents against a JSON schema. Replicache stores arbitrary JSON values keyed by strings.
- **Query expressiveness**: RxDB supports operators, sorting, and indexes. Replicache requires you to scan and filter manually.
- **Conflict handling**: RxDB lets you write a [custom conflict handler](../../transactions-conflicts-revisions.md) per collection. Replicache merges through mutator replay.

Neither model is universally better. Mutators are convenient for tightly coupled collaborative editing. Documents are convenient for general application data, offline-first apps, and existing backends.

## FAQ

<details>
<summary>Is RxDB open source?</summary>

Yes. RxDB core is licensed under Apache 2.0 and the source is on GitHub. There are optional premium plugins for advanced storages and enterprise features, but the database, the query engine, and the replication protocol are open source with no revenue gating.

</details>

<details>
<summary>Do I need to write mutators in RxDB?</summary>

No. RxDB uses regular collection methods such as `insert`, `patch`, `bulkUpsert`, and `remove`. The replication protocol forwards the resulting changes to your backend through pull and push handlers. You can still centralize write logic in helper functions if you want to, but the database does not require it.

</details>

<details>
<summary>Can RxDB scale to many clients?</summary>

Yes. The replication protocol is checkpoint-based, so each client only fetches changes since its last sync. The server can be any system that exposes pull and push endpoints, which means horizontal scaling is the same problem as scaling your existing API. RxDB also ships [WebRTC replication](../../replication.md) for peer-to-peer scenarios.

</details>

<details>
<summary>What about Zero or Zerosync?</summary>

Zero is Rocicorp's successor to Replicache and Reflect. It is a different product with its own protocol and trade-offs. RxDB is not a drop-in port of Zero, but it covers the same use cases of local-first apps with reactive queries and sync. RxDB has been stable for years, ships under Apache 2.0, and works with any backend you already run.

</details>

<details>
<summary>Does RxDB work with NextJS, Remix, and React Native?</summary>

Yes. RxDB runs anywhere JavaScript runs. In NextJS and Remix you instantiate the database in the browser and use the React bindings to subscribe to queries. In [React Native](../../react-native-database.md) you pick a native storage such as SQLite. The same collection definitions and queries work across all environments.

</details>

## Comparison Table

| Feature                       | Replicache                          | RxDB                                     |
| ----------------------------- | ----------------------------------- | ---------------------------------------- |
| License                       | Source-available, free since 2024   | Apache 2.0 (open source)                 |
| Data model                    | Key/value store                     | Document collections with JSON schema    |
| Writes                        | Mutator functions on client+server  | Direct `insert`, `patch`, `remove` calls |
| Query API                     | `useSubscribe` over scans           | MongoDB-style [RxQuery](../../rx-query.md)  |
| Reactive results              | Yes                                 | Yes, via RxJS Observables                |
| Server requirements           | Implement mutators and patch API    | Implement pull and push handlers         |
| Storage options               | IndexedDB                           | IndexedDB, OPFS, SQLite, memory, more    |
| Conflict resolution           | Mutator replay                      | Custom per-collection handlers           |
| Peer-to-peer sync             | No                                  | Yes, [WebRTC](../../replication.md)         |
| Transports                    | Replicache protocol                 | HTTP, GraphQL, CouchDB, Firestore, WebRTC|
| Runtimes                      | Browser, React Native               | Browser, Node.js, Electron, React Native |

## Follow Up

If the mutator architecture or the historical license terms of Replicache are blocking your project, RxDB is a direct alternative. It keeps the local-first developer experience, adds a real document database with reactive queries, and replicates with whatever backend you already run.

More resources:

- [RxDB Sync Engine](../../replication.md)
- [HTTP Replication](../../replication-http.md)
- [GraphQL Replication](../../replication-graphql.md)
- [RxQuery](../../rx-query.md)
- [Reactivity](../../reactivity.md)
- [Conflict Resolution](../../transactions-conflicts-revisions.md)
- [Local-First Future](../../articles/local-first-future.md)
- [Realtime Database](../../articles/realtime-database.md)
- [RxDB GitHub Repository](/code/)
