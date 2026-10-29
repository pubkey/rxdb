---
title: SQLite Sync - Sync a SQLite Database Between Devices and a Backend
slug: sqlite-sync.html
description: Learn how SQLite sync works with changesets, CRDTs, file replication and sync engines, and how to sync SQLite with your own backend using RxDB.
image: /headers/sqlite-sync.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';

# SQLite Sync: How to Sync a SQLite Database Between Devices and a Backend

**SQLite sync** means keeping the SQLite database on each device and the data on your server in the same state, in both directions, also when a device was offline for a while. [SQLite](https://www.sqlite.org/) is the default local database on Android, iOS, [Electron](./electron-sqlite.md) and Node.js, but it is an embedded library without any network layer. Every app that stores data in SQLite and wants it on a second device has to add sync on top. This page explains what SQLite sync has to solve, compares the tools that exist in October 2026, and shows how [RxDB](https://rxdb.info/) syncs a SQLite database with any backend through its [Sync Engine](../replication.md).

<RxdbLogo alt="SQLite sync" />

## What SQLite Sync Has to Solve

Copying a database file from one device to another is not sync. As soon as two devices write to their own copy, you need a protocol that moves single changes and merges them. A working SQLite sync layer has to handle all of these:

- **Change tracking**: Find out which rows changed since the last sync, including rows that were deleted. A deleted row is gone from the table, so you need tombstones or a change log to send the delete at all.
- **Checkpoints**: Remember how far each device has synced, so that a restart or a lost connection continues where it stopped instead of downloading everything again.
- **Offline writes**: Queue local writes while the device is offline and push them later, in the right order.
- **Conflicts**: Decide what happens when two devices changed the same row while both were offline.
- **Live updates**: Get changes from other devices without polling every few seconds.
- **Schema changes**: Old app versions with an old table layout still have data that has to sync after an update.

None of this is part of SQLite itself. The trouble starts when you build it yourself: change tracking, checkpoints and conflict handling are each small on their own, but the edge cases (a delete that races an update, a device that comes back after three weeks) are where most custom sync code breaks.

## Why SQLite Has No Built-In Sync

SQLite runs inside your process and reads and writes a single file. There is no server, no port and no replication protocol. The closest built-in feature is the [Session Extension](https://www.sqlite.org/sessionintro.html), which records changes to tables into a **changeset** blob that you can apply to another database with the same schema. It is part of the amalgamation since SQLite 3.13.0 but is disabled by default and has to be compiled in with `SQLITE_ENABLE_SESSION` and `SQLITE_ENABLE_PREUPDATE_HOOK`.

When a changeset is applied, SQLite calls a conflict handler for each row that does not match. The handler can only return [`SQLITE_CHANGESET_OMIT`, `SQLITE_CHANGESET_ABORT` or `SQLITE_CHANGESET_REPLACE`](https://www.sqlite.org/session/sqlite3changeset_apply.html), so it can keep one side or the other, but not merge fields. The extension also has no transport. The official introduction describes the transfer step as "Alice can send her changeset to Bob". Sending it, storing checkpoints and handling a device that missed changesets is up to you.

## SQLite Sync Tools Compared

The tools that call themselves SQLite sync solve different problems. Some replicate a server database for backups, some merge client databases with CRDTs, and some are hosted services with their own backend. All facts below were checked on October 29, 2026.

| Tool | How it syncs | Conflicts | Clients | Backend | Status |
| --- | --- | --- | --- | --- | --- |
| [Session Extension](https://www.sqlite.org/sessionintro.html) | Changesets you transport yourself | Omit, abort or replace per row | Anywhere SQLite is compiled with the flag | None, you build it | Part of SQLite |
| [cr-sqlite](https://github.com/vlcn-io/cr-sqlite) | CRDT per column, merges databases | "Automatically handles merge conflicts. No options for manual merging." | Desktop binaries, WASM build for the browser | None, you transport changes | Last release v0.16.3 on January 17, 2024 |
| [Litestream](https://litestream.io/) | Copies WAL pages to cloud storage | Not applicable, single writer | Server process | S3 or compatible storage | Active, v0.5.17 on August 31, 2026 |
| [LiteFS](https://github.com/superfly/litefs) | FUSE file system replicates to a cluster | Not applicable, one primary | Server process | Your own cluster | Beta, last commit on main April 22, 2025 |
| [SQLite Sync by SQLite AI](https://github.com/sqliteai/sqlite-sync) | CRDT extension | "No conflicts. Deterministic merge" | Linux, macOS, Windows, iOS, Android, WASM, React Native | SQLite Cloud, Postgres or Supabase via their CloudSync service | Active, 1.2.0 on September 28, 2026 |
| [ElectricSQL](https://electric.ax/) | Streams Postgres "shapes" to clients | "Electric does not do write-path sync." | TypeScript client, PGlite | Electric service in front of Postgres | SQLite client sync was dropped in the 2024 rewrite |

A few things stand out:

- **Litestream and LiteFS are server tools.** Litestream is a backup and disaster recovery tool, and its own [tips page](https://litestream.io/tips/) warns that "Multiple applications replicating into the same bucket & path can cause situations where you will be unable to restore". It does not sync user devices. LiteFS replicates one primary to read replicas in a cluster, and Fly.io says on its [LiteFS docs](https://docs.fly.io/litefs) that it is "not able to provide support or guidance for it".
- **CRDT extensions merge without asking you.** cr-sqlite and SQLite Sync resolve every conflict with a fixed merge strategy. That is the point of a CRDT, but it also means you cannot plug in business rules like "a done todo stays done". The last cr-sqlite release is v0.16.3 from January 17, 2024, <TimeSince date="2024-01-17" />. Read the [CRDT](../crdt.md) page for how RxDB handles CRDTs as an opt-in per collection.
- **Hosted sync services decide your backend.** PowerSync needs its sync service in front of one of its supported databases, Turso Sync needs Turso Cloud, and SQLite Sync routes through the CloudSync service of SQLite Cloud even when your data lives in your own Postgres. More detail is in the [PowerSync alternative](./alternatives/powersync-alternative.md), [Turso alternative](./alternatives/turso-alternative.md) and [ElectricSQL alternative](./alternatives/electricsql-alternative.md) articles.

## SQLite Sync With RxDB

[RxDB](../rx-database.md) (Reactive Database) is a local-first, NoSQL database for JavaScript applications. It runs in the browser, Node.js, Electron, React Native, Capacitor, Deno, and Bun. Instead of syncing SQLite tables directly, RxDB stores JSON documents in a pluggable [RxStorage](../rx-storage.md), and on mobile and desktop that storage is SQLite. The sync layer sits above the storage, so it works the same no matter which storage you use.

### 1. SQLite as the Storage

The [SQLite RxStorage](../rx-storage-sqlite.md) runs on top of the SQLite library that your platform already has: `expo-sqlite` or `react-native-quick-sqlite` in [React Native](../react-native-database.md), the Capacitor SQLite plugin in [Capacitor](../capacitor-database.md), `node:sqlite` in Node.js and Electron, and Tauri SQLite. RxDB Core ships a trial version that is limited to 500 documents. The production version is part of [RxDB Premium 👑](/premium/).

### 2. A Sync Engine With Checkpoints

The [RxDB Sync Engine](../replication.md) replicates with a simple protocol: the client pulls documents changed after a checkpoint and pushes its local changes. Deletes are replicated as documents with `_deleted: true`, so there are no lost deletes. Checkpoints are stored locally, so an app that was closed during sync continues where it stopped. While the device is offline, writes land in SQLite and are pushed when the connection is back.

### 3. Conflict Handling You Control

When the server reports that a pushed document was changed by another device, RxDB calls the [conflict handler](../transactions-conflicts-revisions.md#custom-conflict-handler) of that collection. The default keeps the server state. A custom handler can merge fields with your own rules, which is not possible with the omit or replace choices of the Session Extension or with a fixed CRDT merge.

### 4. Any Backend

RxDB does not need a hosted service. It ships replication plugins for [HTTP](../replication-http.md), [GraphQL](../replication-graphql.md), [WebSocket](../replication-websocket.md), [CouchDB](../replication-couchdb.md), [Supabase](../replication-supabase.md) and [Firestore](../replication-firestore.md). With the HTTP replication your backend only needs a pull and a push endpoint, and the data can live in Postgres, MySQL, MongoDB or a SQLite file on the server.

### 5. The Same Code in the Browser

SQLite is the right storage on phones and desktops. In a browser you would usually pick [IndexedDB](../rx-storage-indexeddb.md) or [OPFS](../rx-storage-opfs.md) instead, because they need no WebAssembly download (a WASM SQLite build works too, see [RxDB vs SQLite WASM vs PGlite](./rxdb-vs-sqlite-wasm-vs-pglite.md)). Switching storages is a configuration change, not a rewrite. The schema, queries, conflict handler and replication code stay the same on every platform.

## Code Sample: Sync a SQLite Database With Your Backend

The following example runs in an Expo app. It stores `todos` in SQLite, observes a query, and syncs with a backend over HTTP.

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
<FaqItem question="How do I sync a SQLite database between devices?">

You need a sync layer on top of SQLite, because SQLite has no network replication. Each device keeps its own SQLite database, pushes its local changes to a server and pulls the changes of other devices since its last checkpoint. **[RxDB](../rx-database.md)** stores its data in SQLite on mobile and desktop and does this with its Sync Engine against any backend.

</FaqItem>
<FaqItem question="Does SQLite have built-in replication?">

No. SQLite has the Session Extension, which records changes into changesets, but it is disabled by default and has no transport, checkpoints or merge logic. You have to send changesets yourself and handle devices that missed some. The **[RxDB Sync Engine](../replication.md)** adds checkpoints, offline queues and conflict handling on top of SQLite.

</FaqItem>
<FaqItem question="Can I sync SQLite with PostgreSQL?">

Yes. Tools like PowerSync and SQLite Sync connect a client SQLite database to Postgres through their own sync service. With **[RxDB](../replication-http.md)** you write a pull and a push endpoint in your existing backend that read and write Postgres, so no additional service is needed.

</FaqItem>
<FaqItem question="Is Litestream a SQLite sync tool?">

No. Litestream streams the write-ahead log of a server-side SQLite database to cloud storage for backups and disaster recovery. It supports one writer and warns against several applications replicating into the same path. For syncing user devices you need a client sync layer such as the **[RxDB Sync Engine](../replication.md)**.

</FaqItem>
<FaqItem question="How are conflicts handled when syncing SQLite?">

It depends on the tool. The Session Extension can only omit or replace a row, CRDT extensions merge with a fixed strategy, and Turso Sync uses "last push wins". **[RxDB](../transactions-conflicts-revisions.md)** calls a conflict handler that you define per collection, so you can merge fields with your own rules.

</FaqItem>
<FaqItem question="Does SQLite sync work offline?">

Yes, when the sync layer queues local writes. In RxDB every write goes to the local SQLite database first, the UI updates from it, and the replication pushes the changes when the device is online again. Read more about **[offline-first](../offline-first.md)** apps.

</FaqItem>
</Faq>

## Follow Up

- Start with the [RxDB Quickstart](../quickstart.md)
- [SQLite RxStorage](../rx-storage-sqlite.md) for React Native, Capacitor, Electron, Tauri and Node.js
- [RxDB Sync Engine](../replication.md) and the [HTTP replication](../replication-http.md)
- [Electron SQLite](./electron-sqlite.md) for desktop apps
- [RxDB vs SQLite WASM vs PGlite](./rxdb-vs-sqlite-wasm-vs-pglite.md) for SQLite in the browser
- [Local database](./local-database.md) and [offline database](./offline-database.md) basics
- [RxDB on GitHub](/code/), leave a star ⭐
