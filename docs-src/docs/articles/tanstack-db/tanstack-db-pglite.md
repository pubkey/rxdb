---
title: 'TanStack DB with PGlite: Postgres-in-Browser Storage'
slug: tanstack-db-pglite.html
description: PGlite runs Postgres in the browser via WASM. See how it works as durable storage for TanStack DB, and when an RxDB-backed collection fits better.
image: /headers/tanstack-db-pglite.jpg
---

import {Steps} from '@site/src/components/steps';

# TanStack DB with PGlite: Postgres-in-Browser Storage

**PGlite** is a WASM build of Postgres that runs in the browser, and a common idea is to use it as the durable storage layer under **TanStack DB**. TanStack DB is an in-memory reactive client store with live queries and optimistic mutations, and it delegates persistence and sync to the collection type you choose. There is no official PGlite collection for TanStack DB today. [RxDB](https://rxdb.info/) on the other hand has an official, maintained integration through the `@tanstack/rxdb-db-collection` package, described in [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md). This page explains what PGlite is, what wiring it under TanStack DB would take, when PGlite is the right tool, and when an RxDB-backed collection fits better.

<RxdbLogo alt="TanStack DB PGlite Postgres in the browser" />

## What Is PGlite?

[PGlite](https://pglite.dev/) is a WASM build of Postgres from Electric, packaged as a TypeScript client library. It runs Postgres in the browser, Node.js, Bun, and Deno without any external dependencies, and the whole build is about 3 MB gzipped. Unlike earlier "Postgres in the browser" projects it does not boot a Linux virtual machine. It is plain Postgres compiled to WebAssembly, running in the single-user mode that Postgres ships for bootstrapping and recovery.

The facts that matter for a client-side storage decision:

- **Real SQL**: You write standard Postgres SQL, and PGlite supports many Postgres extensions, including `pgvector` for vector search and PostGIS for geospatial data.
- **Persistence options**: By default PGlite runs in memory. In the browser it can persist its data directory to IndexedDB with an `idb://my-database` data directory, or to the Origin Private File System (OPFS) through its access-handle-pool filesystem, which only works inside a Web Worker.
- **Live queries**: The `@electric-sql/pglite/live` extension adds `live.query()`, `live.incrementalQuery()`, and `live.changes()`, so you can subscribe to a SQL query and receive updated results when the underlying tables change.
- **Single connection**: PGlite is single user and single connection. For multiple browser tabs, the project provides a multi-tab worker that proxies all tabs through one instance.

This is what PGlite looks like standalone. Notice that this snippet is plain PGlite and has no TanStack DB integration:

```ts
// Standalone PGlite, NOT wired into TanStack DB.
import { PGlite } from '@electric-sql/pglite';

// 'idb://...' persists the data directory to IndexedDB.
const pg = new PGlite('idb://my-pgdata');

const result = await pg.query("select 'Hello world' as message;");
// > { rows: [ { message: "Hello world" } ] }
```

## Wiring PGlite Under TanStack DB Today

TanStack DB ships official collection types for TanStack Query, Electric, TrailBase, RxDB, PowerSync, localStorage, and local-only data. PGlite is not on that list. There is no `@tanstack/pglite-db-collection` package, so when you want PGlite under TanStack DB, you have to write the persistence glue yourself.

Conceptually that glue has three parts:

1. **Initial load**: On startup, run a `SELECT` against PGlite and insert the rows into the TanStack DB collection so the in-memory state matches the database.
2. **Write path**: Map every TanStack DB mutation (insert, update, delete) to the matching SQL statement, and roll the optimistic state back when the statement fails.
3. **Change feed**: Use the live query extension to detect changes that did not come from the collection itself, and stream them back into TanStack DB.

Each part is doable, but together they form a small sync protocol between two stores with different data models: TanStack DB thinks in documents and keys, Postgres thinks in rows, columns, and schemas. You also own the edge cases: mapping rows to objects and back, transactional ordering of mutations, avoiding echo loops where your own write comes back through the change feed, and coordinating the single PGlite connection across [multiple tabs](./tanstack-db-multi-tab.md). None of this is impossible. It is just custom infrastructure code that you have to write, test, and maintain, and this page will not pretend otherwise by showing an invented adapter.

For completeness: TanStack also ships its own SQLite persistence packages (`@tanstack/db-sqlite-persistence-core` with adapters for browser, Node.js, Electron, Expo, React Native, and Capacitor). When you only need SQL-flavored durability for TanStack DB and not Postgres itself, those are worth a look, and the [SQLite guide](./tanstack-db-sqlite.md) compares them with the RxDB approach.

## When PGlite Is the Right Choice

PGlite shines when the point of your app is Postgres, not just persistence:

- You need **real Postgres features client-side**: SQL joins across many tables, `pgvector` similarity search, or PostGIS queries in the browser.
- You want **one SQL dialect everywhere**, so the queries you run in the browser are the same queries you run against your server-side Postgres.
- You are building **developer tools, demos, or tests** where an embedded Postgres in Node.js or the browser replaces a full server setup.
- You are invested in the **Electric ecosystem**, since PGlite comes from the same team and is built with their sync tooling in mind.

In these cases the missing TanStack DB adapter may be worth the custom glue code, or you skip TanStack DB and build directly on PGlite's own live queries.

## When an RxDB-Backed Collection Fits Better

When your goal is a durable, syncable TanStack DB collection rather than Postgres itself, RxDB is the shorter path. The trouble with the do-it-yourself PGlite wiring is that you rebuild what already exists as a maintained package:

- **Official adapter**: `@tanstack/rxdb-db-collection` is an official TanStack package. Initial load, write path, rollback on error, and the change feed are already implemented and tested. The setup is a single `rxdbCollectionOptions({ rxCollection })` call.
- **Replication with any backend**: The RxDB [Sync Engine](../../replication.md) replicates with [any backend](./sync-tanstack-db.md), including a server-side PostgreSQL behind a [GraphQL](./tanstack-db-graphql.md) or HTTP endpoint. You get retries, checkpoints, offline resume, and [conflict handling](./tanstack-db-conflict-resolution.md) out of the box. So your data can live in Postgres on the server while the client stays lightweight.
- **Storage flexibility**: The [RxStorage](../../rx-storage.md) layer runs on [localStorage](../../rx-storage-localstorage.md), [IndexedDB](./persist-tanstack-db-indexeddb.md), OPFS, or [SQLite](./tanstack-db-sqlite.md) on native platforms. Switching storages is a configuration change, not a rewrite.
- **Multi-tab support**: RxDB shares one store across browser tabs and uses [leader election](../../leader-election.md) so replication runs in exactly one tab. With PGlite's single connection you have to route all tabs through its multi-tab worker yourself.
- **Encryption and database features**: [Encryption of local data](./tanstack-db-encryption.md), [schema migrations](../../migration-schema.md), compression, and attachments apply to the data under your TanStack DB collections.

There is also a build-size argument. PGlite adds about 3 MB gzipped of WASM before your app code. That is impressive for a full Postgres, but it is a lot of payload when all you need is durable document storage under an in-memory store.

To be clear about the reverse direction: there is no RxDB storage based on PGlite either. RxDB is a NoSQL document database and stores its data in storages like IndexedDB, OPFS, or SQLite, not in a client-side Postgres.

## Example: A Durable TanStack DB Collection with RxDB

The following is the working alternative to the hypothetical PGlite adapter: a TanStack DB collection persisted through RxDB. It uses the free [localStorage-based storage](../../rx-storage-localstorage.md), and any other [RxStorage](../../rx-storage.md) works the same way. The full setup with replication is in the [hub article](./rxdb-collection-for-tanstack-db.md).

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create the RxDatabase and a Collection

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
            title: 'notes',
            version: 0,
            type: 'object',
            primaryKey: 'id',
            properties: {
                id: { type: 'string', maxLength: 100 },
                text: { type: 'string' },
                archived: { type: 'boolean' }
            },
            required: ['id', 'text', 'archived']
        }
    }
});
```

### Wrap It as a TanStack DB Collection

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const notesCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.notes
    })
);
```

The collection loads its initial state from disk and stays in sync with RxDB from then on. Changes written by replication, other tabs, or direct RxDB code stream into it automatically.

### Query and Mutate

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function NoteList() {
    // Live query: re-renders whenever a matching document changes.
    const { data: activeNotes } = useLiveQuery((q) =>
        q
            .from({ note: notesCollection })
            .where(({ note }) => eq(note.archived, false))
    );

    return (
        <ul>
            {activeNotes.map((note) => (
                <li key={note.id}>{note.text}</li>
            ))}
        </ul>
    );
}

// Writes are optimistic in memory and persisted to RxDB.
notesCollection.insert({
    id: 'note-1',
    text: 'compare PGlite and RxDB',
    archived: false
});
notesCollection.update('note-1', (draft) => {
    draft.archived = true;
});
```

</Steps>

This is done. No custom adapter, no SQL-to-document mapping, and the data survives a reload.

## FAQ

<details>
    <summary>Is there an official TanStack DB PGlite collection?</summary>

No. The official TanStack DB collection types cover TanStack Query, Electric, TrailBase, RxDB, PowerSync, localStorage, and local-only data. For PGlite you would have to write your own persistence glue, while the **[RxDB collection](./rxdb-collection-for-tanstack-db.md)** is an official, maintained package.

</details>

<details>
    <summary>Can PGlite persist data in the browser?</summary>

Yes. PGlite defaults to an in-memory database, and in the browser it can persist its data directory to IndexedDB via an `idb://` data directory or to OPFS through its access-handle-pool filesystem inside a Web Worker. This persists the Postgres files themselves, which is different from a document store like **[RxDB](../../rx-database.md)** that persists JSON documents through an [RxStorage](../../rx-storage.md).

</details>

<details>
    <summary>Can I use PGlite as an RxDB storage?</summary>

No. There is no RxDB storage built on PGlite or any other client-side Postgres. RxDB is a NoSQL document database and ships **[storages](../../rx-storage.md)** for localStorage, IndexedDB, OPFS, SQLite, and more. When you need Postgres semantics on the client, use PGlite directly instead of forcing it under a document database.

</details>

<details>
    <summary>Does the RxDB-backed TanStack DB collection sync with a Postgres backend?</summary>

Yes. Replication is configured on the RxDB collection through the **[Sync Engine](../../replication.md)**, which works with any backend, including a server-side PostgreSQL exposed over [HTTP](../../replication-http.md) or [GraphQL](./tanstack-db-graphql.md). Pulled documents stream into the TanStack DB collection automatically, so Postgres stays on the server where it scales best.

</details>

## Follow Up

- Read the hub article [TanStack DB + RxDB: Durable, Offline-First Persistence & Sync](./rxdb-collection-for-tanstack-db.md).
- Compare the SQL route in [TanStack DB with SQLite](./tanstack-db-sqlite.md).
- Learn how to [persist TanStack DB to IndexedDB and OPFS](./persist-tanstack-db-indexeddb.md).
- Set up backend sync with [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).
- Start with the [RxDB Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to ask questions.
