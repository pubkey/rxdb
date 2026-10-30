---
title: SQLite Sync - How to Sync Local Data From Devices to Any Backend
slug: sqlite-sync.html
description: Learn how device-to-server sync works, from change tracking and conflicts to its downsides, and how to sync SQLite or any local data with any backend using RxDB.
image: /headers/sqlite-sync.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';

# SQLite Sync and Device-to-Server Sync: How to Sync Local Data With Any Backend

**SQLite sync** and device-to-server sync in general mean keeping the local database on each device and the data on your server in the same state, in both directions, also when a device was offline for a while. [SQLite](https://www.sqlite.org/) is the default local database on Android, iOS, [Electron](./electron-sqlite.md) and Node.js, and in the browser the same job falls to [IndexedDB](../rx-storage-indexeddb.md) or [OPFS](../rx-storage-opfs.md). None of them has a network layer. Every app that keeps data on the device and wants it on a server or a second device has to add sync on top. This page explains what device-to-server sync has to solve, its downsides, why a NoSQL document model makes it easier to sync with any backend, and how [RxDB](https://rxdb.info/) does it with its [Sync Engine](../replication.md).

<RxdbLogo alt="SQLite sync" />

## What Device-to-Server Sync Has to Solve

Copying a database file from one device to another is not sync. As soon as a device and a server both accept writes, you need a protocol that moves single changes and merges them. A working sync layer has to handle all of these, no matter which local database you use:

- **Change tracking**: Find out which records changed since the last sync, including records that were deleted. A deleted record is gone from the table, so you need tombstones or a change log to send the delete at all.
- **Checkpoints**: Remember how far each device has synced, so that a restart or a lost connection continues where it stopped instead of downloading everything again.
- **Offline writes**: Queue local writes while the device is offline and push them later, in the right order.
- **Conflicts**: Decide what happens when two devices changed the same record while both were offline.
- **Live updates**: Get changes from the server and other devices without polling every few seconds.
- **Schema changes**: Old app versions with an old data layout still have data that has to sync after an update.

The trouble starts when you build it yourself: change tracking, checkpoints and conflict handling are each small on their own, but the edge cases (a delete that races an update, a device that comes back after three weeks) are where most custom sync code breaks.

## How Data Moves Between Device and Server

There are four common models. They differ in what is sent over the wire.

1. **Replicate the changed state**: The client asks the server for all records that changed after its checkpoint and sends its own changed records back. The server only has to answer "what changed since X". This is the model of the RxDB [Sync Engine](../replication.md) and of CouchDB.
2. **Replay an operation log**: Every write is recorded as an operation (an SQL statement, a mutation) and replayed on the other side. This needs a global order of all operations. When an older operation arrives late, the client has to roll back and re-apply newer ones, which gets expensive for clients that were offline for days. [Why NoSQL](../why-nosql.md#reliable-replication) explains this with an `UPDATE ... WHERE` example.
3. **Merge with CRDTs**: Each field carries enough metadata to merge any two versions without asking the application. The merge is automatic, but the merge rules are fixed. See [CRDT](../crdt.md).
4. **Copy pages or files**: The database file or its write-ahead log is copied to another machine. This works for one writer and its read replicas on servers, not for many devices that all write.

The transport is a separate decision. Pulling can be plain HTTP polling, and live updates come over long polling, [Server-Sent Events or WebSockets](./websockets-sse-polling-webrtc-webtransport.md). RxDB uses a pull handler for catching up and an optional event stream for live changes, so the protocol works the same over any transport.

## Conflict Strategies

When the same record was changed on two devices, one of these rules decides the result:

- **Server wins**: The client drops its change and takes the server state. Simple, but offline edits get lost without the user noticing.
- **Last write wins**: The newer timestamp wins. Device clocks drift and can be set by the user, so "newer" is not reliable across devices.
- **Field merge**: Fields that were changed on only one side are kept, fields changed on both sides need a rule. This needs application knowledge, for example "a done todo stays done".
- **CRDT merge**: A data type that merges deterministically. Good for counters, sets and text, but you cannot add business rules.

RxDB detects conflicts on the server with a revision check and resolves them on the client with a [conflict handler](../transactions-conflicts-revisions.md#custom-conflict-handler) per collection. The default keeps the server state, and a custom handler can implement any of the strategies above.

## Downsides of Syncing Local Data

Syncing local data makes apps fast and lets them work offline, but there is no free lunch. Before you build on it, keep these costs in mind. A longer discussion is in [Downsides of Local First / Offline First](../downsides-of-offline-first.md).

- **Data size on the device**: Every synced record is stored on the device. The first sync of a large dataset takes time and storage, which is why most apps sync only the data a user needs with [partial sync](../partial-sync.md).
- **Eventual consistency**: Two devices can show different data until both have synced. A read on the device is fast, but it is not guaranteed to be the latest state on the server.
- **Conflicts are product decisions**: No algorithm knows whether a price change or a deleted comment should win. Someone has to define the rules per data type, and users can still be surprised by the outcome.
- **Permissions move to the sync layer**: The server has to check for every pulled and pushed record whether the user may read or write it. A query that runs on the device cannot enforce access rules on its own.
- **Client migrations**: When your data layout changes, every device has to migrate its local data, and old app versions keep sending data in the old layout until they update. See [schema migration](../migration-schema.md).
- **Deletes keep using storage**: Tombstones have to stay around until every device has synced them, so the storage keeps growing unless you [clean up](../cleanup.md) old deletes.
- **Data at rest on the device**: A lost phone or a shared computer holds a copy of the user's data. Sensitive fields should be [encrypted](../encryption.md).
- **More states to test**: Offline, slow network, app killed during sync, two tabs, two devices. Each of them is a case your tests have to cover.

## Why a NoSQL Document Model Makes Sync Easier

Most of the work in device-to-server sync comes from the data model, not from the network. A document model, where each record is one JSON document with a primary key, removes several of the hard parts.

### 1. The Document Is the Unit of Sync and Conflict

A document carries all fields of one entity. A change is "this document now looks like this", and a conflict is "two versions of this document". In a relational schema, one user action often touches several rows in several tables (a todo, its tags in a join table, a counter in a parent row), and the sync layer has to keep those rows together or the other side sees a half-applied change.

### 2. Replicate State, Not Queries

With documents you replicate the result of a write, not the statement that produced it. An `UPDATE ... WHERE` that ran on an outdated local state cannot produce a different result on the server, because the server never runs it. The changed documents are simply sent over, and replaying is no longer needed.

### 3. No Ordering Constraints Between Records

Foreign keys require that a parent row exists before its child row is inserted. When changes arrive in batches, out of order, or partially because the connection dropped, a relational sync layer has to sort them or temporarily disable constraints. Documents reference each other by id, and a missing reference is a state the app can handle instead of a write that fails.

### 4. JSON Maps to Every Backend

A JSON document can be stored as-is in MongoDB, CouchDB or Firestore, as a `jsonb` column in Postgres, as a row with columns, or returned by any REST or GraphQL API. The client does not have to mirror the server schema, and the server does not have to run the same database engine as the device. A SQLite table on the device that has to match a Postgres table on the server breaks as soon as the column types or constraints differ.

### 5. One Checkpoint per Collection

With one primary key and one `updatedAt` per document, "give me everything that changed after checkpoint X" is a single indexed query on the server. There is no change log across tables to maintain.

### 6. Schema Versions per Document

A document schema with a version number lets the client migrate stored documents with a migration strategy, and the server can accept or upgrade documents from old app versions one by one.

What you give up: there are no joins or multi-document transactions on the client. Related data is either embedded in the document or loaded by id, and writes that must change several documents atomically need a different design. [Why NoSQL](../why-nosql.md#what-you-lose-with-nosql) lists these trade-offs in detail.

## SQLite Has No Built-In Sync

SQLite runs inside your process and reads and writes a single file. There is no server, no port and no replication protocol. The closest built-in feature is the [Session Extension](https://www.sqlite.org/sessionintro.html), which records changes to tables into a **changeset** blob that you can apply to another database with the same schema. It is part of the amalgamation since SQLite 3.13.0 but is disabled by default and has to be compiled in with `SQLITE_ENABLE_SESSION` and `SQLITE_ENABLE_PREUPDATE_HOOK`.

When a changeset is applied, SQLite calls a conflict handler for each row that does not match. The handler can only return [`SQLITE_CHANGESET_OMIT`, `SQLITE_CHANGESET_ABORT` or `SQLITE_CHANGESET_REPLACE`](https://www.sqlite.org/session/sqlite3changeset_apply.html), so it can keep one side or the other, but not merge fields. The extension also has no transport. The official introduction describes the transfer step as "Alice can send her changeset to Bob". Sending it, storing checkpoints and handling a device that missed changesets is up to you.

### SQLite Sync Tools Compared

The tools that call themselves SQLite sync solve different problems. Some replicate a server database for backups, some merge client databases with CRDTs, and some are hosted services with their own backend. All facts below were checked on October 29, 2026.

| Tool | How it syncs | Conflicts | Clients | Backend | Status |
| --- | --- | --- | --- | --- | --- |
| [Session Extension](https://www.sqlite.org/sessionintro.html) | Changesets you transport yourself | Omit, abort or replace per row | Anywhere SQLite is compiled with the flag | None, you build it | Part of SQLite |
| [cr-sqlite](https://github.com/vlcn-io/cr-sqlite) | CRDT per column, merges databases | "Automatically handles merge conflicts. No options for manual merging." | Desktop binaries, WASM build for the browser | None, you transport changes | Last release v0.16.3 on January 17, 2024 |
| [Litestream](https://litestream.io/) | Copies WAL pages to cloud storage | Not applicable, single writer | Server process | S3 or compatible storage | Active, v0.5.17 on August 31, 2026 |
| [LiteFS](https://github.com/superfly/litefs) | FUSE file system replicates to a cluster | Not applicable, one primary | Server process | Your own cluster | Beta, last commit on main April 22, 2025 |
| [SQLite Sync by SQLite AI](https://github.com/sqliteai/sqlite-sync) | CRDT extension | "No conflicts. Deterministic merge" | Linux, macOS, Windows, iOS, Android, WASM, React Native | SQLite Cloud, Postgres or Supabase via their CloudSync service | Active, 1.2.0 on September 28, 2026 |
| [ElectricSQL](https://electric.ax/) | Streams Postgres "shapes" to clients | "Electric does not do write-path sync." | TypeScript client, PGlite | Electric service in front of Postgres | SQLite client sync was dropped in the 2024 rewrite |

- **Litestream and LiteFS are server tools.** Litestream is a backup and disaster recovery tool, and its own [tips page](https://litestream.io/tips/) warns that "Multiple applications replicating into the same bucket & path can cause situations where you will be unable to restore". It does not sync user devices. LiteFS replicates one primary to read replicas in a cluster, and Fly.io says on its [LiteFS docs](https://docs.fly.io/litefs) that it is "not able to provide support or guidance for it".
- **CRDT extensions merge without asking you.** cr-sqlite and SQLite Sync resolve every conflict with a fixed merge strategy. That is the point of a CRDT, but it also means you cannot plug in business rules like "a done todo stays done". The last cr-sqlite release is v0.16.3 from January 17, 2024, <TimeSince date="2024-01-17" />.
- **Hosted sync services decide your backend.** SQLite Sync routes through the CloudSync service of SQLite Cloud even when your data lives in your own Postgres, and ElectricSQL needs its sync service in front of Postgres and leaves the write path to you. More detail is in the [ElectricSQL alternative](./alternatives/electricsql-alternative.md) article.

## Sync Any Local Data With RxDB

[RxDB](../rx-database.md) (Reactive Database) is a local-first, NoSQL database for JavaScript applications. It runs in the browser, Node.js, Electron, React Native, Capacitor, Deno, and Bun. RxDB stores JSON documents in a pluggable [RxStorage](../rx-storage.md), and the sync layer sits above the storage, so it works the same no matter where the data is stored on the device.

### 1. SQLite or Any Other Storage on the Device

On mobile and desktop the [SQLite RxStorage](../rx-storage-sqlite.md) runs on top of the SQLite library that your platform already has: `expo-sqlite` or `react-native-quick-sqlite` in [React Native](../react-native-database.md), the Capacitor SQLite plugin in [Capacitor](../capacitor-database.md), `node:sqlite` in Node.js and Electron, and Tauri SQLite. RxDB Core ships a trial version that is limited to 500 documents. The production version is part of [RxDB Premium <PremiumIcon />](/premium/). In a browser you would usually pick [IndexedDB](../rx-storage-indexeddb.md) or [OPFS](../rx-storage-opfs.md) instead, because they need no WebAssembly download. Switching storages is a configuration change, not a rewrite.

### 2. A Sync Engine With Checkpoints

The [RxDB Sync Engine](../replication.md) replicates changed documents: the client pulls documents changed after a checkpoint and pushes its local changes. Deletes are replicated as documents with `_deleted: true`, so there are no lost deletes. Checkpoints are stored locally, so an app that was closed during sync continues where it stopped. While the device is offline, writes land in the local storage and are pushed when the connection is back.

### 3. Conflict Handling You Control

When the server reports that a pushed document was changed by another device, RxDB calls the [conflict handler](../transactions-conflicts-revisions.md#custom-conflict-handler) of that collection. The default keeps the server state. A custom handler can merge fields with your own rules, which is not possible with the omit or replace choices of the Session Extension or with a fixed CRDT merge.

### 4. Any Backend

RxDB does not need a hosted service. It ships replication plugins for [HTTP](../replication-http.md), [GraphQL](../replication-graphql.md), [WebSocket](../replication-websocket.md), [CouchDB](../replication-couchdb.md), [Supabase](../replication-supabase.md) and [Firestore](../replication-firestore.md). With the HTTP replication your backend only needs a pull and a push endpoint, and the data can live in Postgres, MySQL, MongoDB or a SQLite file on the server.

## Code Sample: Sync a SQLite Database With Your Backend

The following example runs in an Expo app. It stores `todos` in SQLite, observes a query, and syncs with a backend over HTTP. In a browser app only the `storage` line changes.

```ts
import { createRxDatabase } from 'rxdb';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { deepEqual } from 'rxdb/plugins/utils';
import {
    getRxStorageSQLite,
    getSQLiteBasicsExpoSQLiteAsync
} from 'rxdb-premium/plugins/storage-sqlite';
import * as SQLite from 'expo-sqlite';

// 1. Create the database with SQLite as storage.
const myDatabase = await createRxDatabase({
    name: 'tododb',
    multiInstance: false,
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsExpoSQLiteAsync(SQLite.openDatabaseAsync)
    })
});

// 2. Add the todos collection with a custom conflict handler.
const todoSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        done: { type: 'boolean', default: false },
        priority: { type: 'integer', minimum: 0, maximum: 10, multipleOf: 1 }
    },
    required: ['id', 'name']
};

await myDatabase.addCollections({
    todos: {
        schema: todoSchema,
        conflictHandler: {
            isEqual(a, b) {
                return deepEqual(a, b);
            },
            async resolve(input) {
                // Keep the server state, but a todo that was
                // marked as done on this device stays done.
                return {
                    ...input.realMasterState,
                    done: input.realMasterState.done || input.newDocumentState.done
                };
            }
        }
    }
});

// 3. Observe a query. It emits again on every local or replicated change.
myDatabase.todos.find({
    selector: { done: false },
    sort: [{ priority: 'desc' }]
}).$.subscribe(openTodos => {
    console.log('open todos:', openTodos.length);
});

// 4. Sync with your backend.
const replicationState = replicateRxCollection({
    collection: myDatabase.todos,
    replicationIdentifier: 'todos-http',
    live: true,
    pull: {
        async handler(checkpoint, batchSize) {
            const updatedAt = checkpoint ? checkpoint.updatedAt : 0;
            const id = checkpoint ? checkpoint.id : '';
            const params = new URLSearchParams({
                updatedAt: String(updatedAt),
                id,
                batchSize: String(batchSize)
            });
            const response = await fetch(
                'https://api.example.com/todos/pull?' + params.toString()
            );
            return await response.json(); // { documents, checkpoint }
        }
    },
    push: {
        async handler(changeRows) {
            const response = await fetch('https://api.example.com/todos/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changeRows)
            });
            return await response.json(); // documents that are in conflict
        }
    }
});
```

On the server, the pull endpoint returns the documents with an `updatedAt` greater than the checkpoint, or the same `updatedAt` and a greater `id`, sorted by both fields, and the push endpoint writes each change unless the stored document differs from the `assumedMasterState` the client sent. In that case it returns the stored document as a conflict. The full contract, including the event stream for live updates, is described in the [HTTP replication docs](../replication-http.md).

## FAQ

<Faq>
<FaqItem question="How do I sync a local database with a server?">

You need a sync layer on top of the local database, because SQLite, IndexedDB and OPFS have no network replication. The device pushes its local changes to the server and pulls the changes since its last checkpoint. **[RxDB](../rx-database.md)** does this with its Sync Engine against any backend, with SQLite, IndexedDB or OPFS as storage.

</FaqItem>
<FaqItem question="Does SQLite have built-in replication?">

No. SQLite has the Session Extension, which records changes into changesets, but it is disabled by default and has no transport, checkpoints or merge logic. You have to send changesets yourself and handle devices that missed some. The **[RxDB Sync Engine](../replication.md)** adds checkpoints, offline queues and conflict handling on top of SQLite.

</FaqItem>
<FaqItem question="Is a NoSQL database easier to sync than a SQL database?">

Yes, for device-to-server sync it is. A document is one unit of change and conflict, there are no foreign-key ordering constraints between records, and JSON can be stored by any backend. SQL sync has to keep multi-row changes together and keep the client schema in line with the server schema. Read **[Why NoSQL](../why-nosql.md)** for the details.

</FaqItem>
<FaqItem question="Can I sync SQLite with PostgreSQL?">

Yes. Tools like SQLite Sync connect a client SQLite database to Postgres through their own sync service. With **[RxDB](../replication-http.md)** you write a pull and a push endpoint in your existing backend that read and write Postgres, so no additional service is needed.

</FaqItem>
<FaqItem question="Is Litestream a SQLite sync tool?">

No. Litestream streams the write-ahead log of a server-side SQLite database to cloud storage for backups and disaster recovery. It supports one writer and warns against several applications replicating into the same path. For syncing user devices you need a client sync layer such as the **[RxDB Sync Engine](../replication.md)**.

</FaqItem>
<FaqItem question="How are conflicts handled when syncing local data?">

It depends on the tool. The SQLite Session Extension can only omit or replace a row, CRDT extensions merge with a fixed strategy, and many services use last write wins. **[RxDB](../transactions-conflicts-revisions.md)** calls a conflict handler that you define per collection, so you can merge fields with your own rules.

</FaqItem>
<FaqItem question="Does device-to-server sync work offline?">

Yes, when the sync layer queues local writes. In RxDB every write goes to the local database first, the UI updates from it, and the replication pushes the changes when the device is online again. Read more about **[offline-first](../offline-first.md)** apps.

</FaqItem>
</Faq>

## Follow Up

- Start with the [RxDB Quickstart](../quickstart.md)
- [RxDB Sync Engine](../replication.md) and the [HTTP replication](../replication-http.md)
- [SQLite RxStorage](../rx-storage-sqlite.md) for React Native, Capacitor, Electron, Tauri and Node.js
- [Downsides of Local First / Offline First](../downsides-of-offline-first.md) and [Why NoSQL](../why-nosql.md)
- [Electron SQLite](./electron-sqlite.md) for desktop apps
- [Local database](./local-database.md) and [offline database](./offline-database.md) basics
- [RxDB on GitHub](/code/), leave a star ⭐
