---
title: RxDB as a Convex Alternative or Offline Layer for Convex Apps
slug: convex-alternative.html
description: Compare Convex and RxDB for realtime TypeScript apps. Learn where Convex falls short offline and how to add RxDB as an offline layer.
image: /headers/convex-alternative.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';
import {ComparisonTable} from '@site/src/components/comparison-table';

# RxDB as a Convex Alternative or Offline Layer for Convex Apps

[Convex](https://www.convex.dev/) is a reactive backend for TypeScript apps. You write queries and mutations as TypeScript functions that run on the server, and every client query is a live subscription that updates when the underlying data changes. The developer experience is the main reason teams pick it, and the numbers show it: the `convex` npm package was downloaded **6,188,547** times between September 27 and October 26, 2026 ([npm](https://api.npmjs.org/downloads/range/2026-09-27:2026-10-26/convex)), and the company raised a [$57M Series B](https://news.convex.dev/convex-raises-57m/) in August 2026.

If you are looking for a **Convex alternative**, the reason is usually offline support, vendor lock-in, or pricing. [RxDB](https://rxdb.info/) is a [local-first](../local-first-future.md), NoSQL database for JavaScript that stores data on the device and syncs with any backend through its [Sync Engine](../../replication.md). This page explains how Convex works, where it falls short for offline-first apps, and how you can either replace it with RxDB or keep Convex and add RxDB as its offline layer.

<RxdbLogo alt="Convex alternative" />

## A Short History of Convex

Convex was founded in 2021 by former Dropbox infrastructure engineers, including CEO Jamie Turner and CTO James Cowling ([about us](https://www.convex.dev/about-us)). Several team members worked on the Dropbox desktop sync engine. The product combines a transactional document database, server functions, file storage, scheduling, and auth in one hosted platform.

### A Brief Timeline

- **April 27, 2022** - [$26M Series A](https://news.convex.dev/series-a/) led by Andreessen Horowitz.
- **March 2024** - The Convex backend is published as [source-available code](https://github.com/convex/convex-backend) under the FSL-1.1-Apache-2.0 license, so it can be self-hosted.
- **November 13, 2024** - The Convex team describes a planned [object sync engine for local-first apps](https://stack.convex.dev/object-sync-engine).
- **November 12, 2025** - [$24M funding round](https://news.convex.dev/convex-raises-24m/). The post states: "We aim to ship a Convex-flavored take on local-first."
- **August 4, 2026** - [$57M Series B](https://news.convex.dev/convex-raises-57m/) led by Insight Partners, focused on backends for AI coding agents.
- **October 2026** - Convex 1.48 is the latest release. No offline or local-first feature has shipped yet.

## What is RxDB?

RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript applications. It runs in the browser, Node.js, Electron, React Native, Capacitor, Deno, and Bun. Documents are validated against a [JSON schema](../../rx-schema.md), queries use [MongoDB-style (Mango) queries](../../rx-query.md), and every query is an observable that emits when the result changes.

Data lives in a local [storage](../../rx-storage.md) of your choice, such as [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), or [SQLite](../../rx-storage-sqlite.md). The [replication protocol](../../replication.md) syncs that data with any backend, including CouchDB, GraphQL, Firestore, Supabase, a custom HTTP API, or Convex itself.

## Where Convex Falls Short

### 1. No Offline Support

Convex is online-first. The client keeps an in-memory cache of query results, not a persistent local database. Convex states it on its own [sync page](https://www.convex.dev/sync): "Convex doesn't currently provide a full offline sync mechanism, but some customers have used tools like Replicache." When the device is offline for longer than a network blip, the app cannot query data it has not loaded, and it cannot store writes across a reload. With RxDB, the full dataset of a collection lives on the device and every query runs locally, which makes it an [offline database](../offline-database.md).

### 2. Optimistic Updates Are Temporary

Convex optimistic updates are "temporary, local changes to your query results" that are "rolled back when a mutation completes" ([docs](https://docs.convex.dev/client/react/optimistic-updates)). You write a separate update function for each mutation that should feel instant. In RxDB, every write goes to the local database first, so the UI updates at once without extra code, and the write survives a reload. See [optimistic UI](../optimistic-ui.md).

### 3. Lock-In to the Convex Function Model

Your backend code is written against `ctx.db` and the Convex function types. Moving off Convex means rewriting queries, mutations, and authorization. The backend is source-available under FSL-1.1, which converts to Apache 2.0 only two years after each release ([license](https://github.com/convex/convex-backend)). RxDB is Apache 2.0, and its replication works with the backend you already run.

### 4. Imperative Queries

Convex has no query language. You write queries as TypeScript functions with index ranges, and joins are loops in your code. RxDB has declarative Mango queries that run on the device, with indexes defined in the schema.

### 5. Usage-Based Pricing on Every Read

On Convex, every query run is a billed function call. The [Professional plan](https://www.convex.dev/pricing) costs $25 per developer per month and includes 25M function calls. The Starter plan charges $2.20 per million function calls beyond the free limit. A realtime app that re-runs subscriptions for many clients pays for server work on every change. With RxDB, reads hit the local database and cost nothing on the server.

As of October 27, 2026, the [Convex backend repository](https://github.com/convex/convex-backend) has 12,760 GitHub stars while [RxDB](https://github.com/pubkey/rxdb) has 23,416.

## Code Sample: A Convex Query and the Same Query in RxDB

A Convex query is a server function, and the client subscribes to it with a React hook:

```ts
// convex/todos.ts
import { query } from './_generated/server';

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('todos')
      .withIndex('by_done', q => q.eq('done', false))
      .collect();
  }
});

// in a React component
const todos = useQuery(api.todos.listOpen);
```

In RxDB, the same query runs on the device and returns an observable:

```ts
const todos$ = myDatabase.todos.find({
  selector: { done: false },
  sort: [{ priority: 'desc' }]
}).$;

todos$.subscribe(todos => console.log(todos.map(t => t.name)));
```

The Convex query needs a connection to the server. The RxDB query works offline and emits again when a local write, another browser tab, or the replication changes the result.

## Using RxDB as an Offline Layer for Convex

You do not have to leave Convex to get offline support. RxDB can hold the data on the device while Convex stays the server and source of truth. The UI only reads and writes RxDB, and the [RxDB replication](../../replication.md) syncs with Convex in the background:

- **Pull** is a Convex query that returns all documents changed after a checkpoint.
- **Push** is a Convex mutation that writes the changed documents and returns conflicts.
- **Live updates** come from a Convex subscription. When it fires, RxDB pulls again.

Convex mutations run as serializable transactions, so the conflict check in the push mutation is safe without extra locking.

### The Convex Side

Each synced table gets a client-generated string `id` (RxDB creates documents before the server knows them, so it cannot use the Convex `_id`), a `deleted` flag so that deletions replicate, and a `serverSeq` number that orders the changes.

```ts
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  todos: defineTable({
    id: v.string(),
    name: v.string(),
    done: v.boolean(),
    priority: v.number(),
    deleted: v.boolean(),
    serverSeq: v.number()
  })
    .index('by_id', ['id'])
    .index('by_seq', ['serverSeq']),
  counters: defineTable({ name: v.string(), value: v.number() })
    .index('by_name', ['name'])
});
```

`serverSeq` comes from a counter document that every push increments. Do not use `Date.now()` for it. A mutation that starts earlier but commits later would write a smaller timestamp than a checkpoint that a client already pulled, and that client would never see the change. Because Convex retries transactions that conflict on the counter, the counter follows the real commit order.

```ts
// convex/todos.ts
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

function toRxDoc(row: any) {
  return {
    id: row.id,
    name: row.name,
    done: row.done,
    priority: row.priority,
    _deleted: row.deleted
  };
}

function sameState(a: any, b: any) {
  return a.name === b.name && a.done === b.done &&
    a.priority === b.priority && a._deleted === b._deleted;
}

export const pull = query({
  args: {
    checkpoint: v.union(v.null(), v.object({ serverSeq: v.number() })),
    limit: v.number()
  },
  handler: async (ctx, { checkpoint, limit }) => {
    const after = checkpoint ? checkpoint.serverSeq : -1;
    const rows = await ctx.db
      .query('todos')
      .withIndex('by_seq', q => q.gt('serverSeq', after))
      .take(limit);
    return {
      documents: rows.map(toRxDoc),
      checkpoint: rows.length > 0
        ? { serverSeq: rows[rows.length - 1].serverSeq }
        : checkpoint
    };
  }
});

export const push = mutation({
  args: {
    rows: v.array(v.object({
      newDocumentState: v.any(),
      assumedMasterState: v.optional(v.any())
    }))
  },
  handler: async (ctx, { rows }) => {
    const counter = await ctx.db.query('counters')
      .withIndex('by_name', q => q.eq('name', 'todos')).unique();
    let seq = counter ? counter.value : 0;
    const conflicts = [];

    for (const row of rows) {
      const doc = row.newDocumentState;
      const current = await ctx.db.query('todos')
        .withIndex('by_id', q => q.eq('id', doc.id)).unique();

      // The client wrote based on an outdated server state: return a conflict.
      if (current && (!row.assumedMasterState ||
        !sameState(toRxDoc(current), row.assumedMasterState))) {
        conflicts.push(toRxDoc(current));
        continue;
      }

      seq = seq + 1;
      const fields = {
        id: doc.id,
        name: doc.name,
        done: doc.done ?? false,
        priority: doc.priority,
        deleted: doc._deleted,
        serverSeq: seq
      };
      if (current) {
        await ctx.db.replace(current._id, fields);
      } else {
        await ctx.db.insert('todos', fields);
      }
    }

    if (counter) {
      await ctx.db.patch(counter._id, { value: seq });
    } else {
      await ctx.db.insert('counters', { name: 'todos', value: seq });
    }
    return conflicts;
  }
});

// Clients subscribe to this to know when to pull.
export const latestSeq = query({
  args: {},
  handler: async (ctx) => {
    const counter = await ctx.db.query('counters')
      .withIndex('by_name', q => q.eq('name', 'todos')).unique();
    return counter ? counter.value : 0;
  }
});
```

### The RxDB Side

On the client, the pull and push handlers call the Convex functions, and a Convex subscription on `latestSeq` tells RxDB when to pull again:

```ts
import { ConvexClient } from 'convex/browser';
import { Subject } from 'rxjs';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { api } from '../convex/_generated/api';

const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL);

const pullStream$ = new Subject<'RESYNC'>();
convex.onUpdate(api.todos.latestSeq, {}, () => pullStream$.next('RESYNC'));

const replicationState = replicateRxCollection({
  collection: myDatabase.todos,
  replicationIdentifier: 'todos-convex',
  live: true,
  pull: {
    handler: (checkpoint, batchSize) => convex.query(api.todos.pull, {
      checkpoint: checkpoint ?? null,
      limit: batchSize
    }),
    stream$: pullStream$.asObservable()
  },
  push: {
    handler: (rows) => convex.mutation(api.todos.push, { rows })
  }
});
```

While the device is offline, writes stay in the local database and the replication pushes them when the connection is back. Conflicts returned by the push mutation go through the collection's [conflict handler](../../transactions-conflicts-revisions.md). Only one browser tab runs the replication, through [leader election](../../leader-election.md).

### Things to Keep in Mind

- **Every write path has to bump the counter.** A Convex mutation that changes `todos` outside of `push` has to increment `serverSeq` too, or clients never pull that change.
- **One counter means one hot document.** All pushes conflict on the counter, which limits write throughput. When documents belong to a user or a tenant, use one counter per user and filter the pull query with `ctx.auth`, so that each user only receives their own documents.
- **Stay below the Convex limits.** A Convex function can read 16 MiB and write 16,000 documents ([limits](https://docs.convex.dev/production/state/limits)), so keep the pull and push batch sizes small.
- **Deleted documents stay as tombstones.** Clean them up with a scheduled function after all clients had time to pull them.
- **Pulls and pushes are billed function calls**, but local reads in the app are not.

## When Convex Still Makes Sense

- **Online-only apps with server logic**: When your app always has a connection and you want database, server functions, auth, file storage, and scheduling in one product with end-to-end types, Convex removes a lot of backend work.
- **Strong consistency across users**: Convex runs serializable ACID transactions on the server. RxDB syncs devices eventually and resolves conflicts per document.
- **Native Swift and Kotlin clients**: Convex ships first-party clients for iOS and Android. RxDB is JavaScript only.
- **You want offline support without leaving Convex**: Add RxDB as the offline layer as shown above, and keep Convex as the backend.

## FAQ

<Faq>
<FaqItem question="Does Convex work offline?">

No. Convex handles short network interruptions, but it "doesn't currently provide a full offline sync mechanism" according to its own sync page. The client caches query results in memory, and optimistic updates are rolled back after the mutation completes. **[RxDB](../../rx-database.md)** stores the data on the device, so queries and writes work without a connection.

</FaqItem>
<FaqItem question="Can I use RxDB together with Convex?">

Yes. Use a Convex query as the pull handler, a Convex mutation as the push handler, and a Convex subscription to trigger new pulls. The **[RxDB replication](../../replication.md)** then keeps the local database in sync with Convex, and the app keeps working offline.

</FaqItem>
<FaqItem question="Is Convex open source?">

No, not fully. The `convex` client package is Apache 2.0. The backend is source-available under FSL-1.1-Apache-2.0, which allows self-hosting but restricts competing uses until each release converts to Apache 2.0 after two years. The **[RxDB](../../rx-database.md)** core is Apache 2.0.

</FaqItem>
<FaqItem question="What is the best Convex alternative for a local-first app?">

For a local-first JavaScript app, use a client-side database with replication, such as **[RxDB](../../rx-database.md)**, and sync it with the backend you already run. If you want a hosted Postgres sync service instead, compare the [PowerSync alternative page](./powersync-alternative.md).

</FaqItem>
</Faq>

## Comparison Table

<ComparisonTable>

| Feature | Convex | RxDB |
| --- | --- | --- |
| Architecture | Server-authoritative, online-first | Local-first client database |
| Offline reads and writes | No, in-memory cache only | Yes, persisted on the device |
| Query language | TypeScript functions with index ranges | MongoDB-style (Mango) queries |
| Where queries run | On the server | On the device |
| Reactivity | Live query subscriptions over WebSocket | Observables on every query |
| Transactions | Serializable ACID on the server | Per document, with conflict handlers |
| Backend | Convex cloud or self-hosted Convex backend | Any backend, including Convex |
| License | FSL-1.1-Apache-2.0 backend, Apache 2.0 client | Apache 2.0 core |
| Pricing | Usage-based, $25 per developer per month on Professional | Free core, <PremiumIcon /> Premium plugins optional |
| Native clients | Swift, Kotlin, Python, Rust | JavaScript runtimes only |

</ComparisonTable>

## Follow Up

If your Convex app has to work offline, you can add RxDB next to Convex today instead of waiting for a local-first release. Start with the [Quickstart](../../quickstart.md), then read the [Sync Engine](../../replication.md) docs and the [HTTP replication](../../replication-http.md) guide for the full replication contract. The [Firebase alternative](../firestore-alternative.md) and the [Supabase alternative](./supabase-alternative.md) cover two more realtime backends.

More resources:

- [RxDB Sync Engine](../../replication.md)
- [Optimistic UI](../optimistic-ui.md)
- [Offline Database](../offline-database.md)
- [Realtime Database](../realtime-database.md)
- [RxDB on GitHub](/code/), leave a star ⭐
