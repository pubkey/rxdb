---
title: 'TanStack DB with SQLite: Native & WASM Storage via RxDB'
slug: tanstack-db-sqlite.html
description: Back TanStack DB with SQLite, native on React Native, Node and Electron, or WASM in the browser, using RxDB's SQLite storage for durable, syncable local data.
image: /headers/tanstack-db-sqlite.jpg
---

import {Steps} from '@site/src/components/steps';

# TanStack DB with SQLite: Native & WASM Storage via RxDB

**TanStack DB** is an in-memory reactive client store with live queries and optimistic mutations, and it delegates persistence and sync to the collection type you choose. The official `@tanstack/rxdb-db-collection` package puts [RxDB](https://rxdb.info/) underneath, as described in the [TanStack DB + RxDB overview](./rxdb-collection-for-tanstack-db.md). With the [SQLite RxStorage](../../rx-storage-sqlite.md), that RxDB layer writes your **TanStack DB SQLite** data into a real SQLite database: native on Node.js, [Electron](./tanstack-db-electron.md), [React Native](./tanstack-db-react-native.md), and [Capacitor](./tanstack-db-capacitor.md), or compiled to WebAssembly in the browser. This page explains the two versions of the SQLite storage, lists the `sqliteBasics` adapters for the common SQLite bundles, walks through a runnable Node.js example, and compares the setup with TanStack DB's own SQLite persistence packages.

<RxdbLogo alt="TanStack DB SQLite storage" />

## Why SQLite Under TanStack DB

SQLite is already there on most platforms where your app runs. Android and iOS ship with a built-in SQLite engine, Node.js version 22 and newer contains the `node:sqlite` module, and Electron apps can bundle SQLite with the main process. On mobile devices, SQLite stores data on the filesystem instead of inside browser-managed storage, so it is not subject to the cleanup rules that apply to IndexedDB. SQLite has been battle-tested for decades. It is a solid place for your local data.

TanStack DB keeps its collections in memory. When you combine it with the RxDB collection, every optimistic mutation is persisted through RxDB into SQLite, and on the next app start the TanStack DB collection loads its initial state back from the SQLite file. Changes that reach RxDB from [replication](../../replication.md) or from direct RxDB code stream into the TanStack DB collection automatically. The [how it works](./rxdb-collection-for-tanstack-db.md) section of the hub article describes the two loops in detail.

## Trial Version and Premium Version

The SQLite storage exists in two versions:

- **Trial version**: Shipped for free with the RxDB core package. Import `getRxStorageSQLiteTrial` from `rxdb/plugins/storage-sqlite`. It passes the full RxDB storage test suite, but it is limited to `500` non-deleted documents, does not use indexes, has no [attachment](../../rx-attachment.md) support, and fetches the whole storage state to run queries in memory. Use it for evaluation and prototypes only.
- **[RxDB Premium 👑](/premium/) version**: The production-ready storage. Import `getRxStorageSQLite` from `rxdb-premium/plugins/storage-sqlite`. It has full query support with indexes and a load of performance optimizations.

Both versions share the same API. Moving from the trial to the premium storage is an import change, not a rewrite, so you can build your whole TanStack DB integration on the trial version first.

## The sqliteBasics Adapters

Different SQLite libraries have different APIs to open a database and run statements. Some use callbacks, some use Promises. The RxDB SQLite storage abstracts this behind a `SQLiteBasics` interface, and RxDB ships ready-made implementations for the common SQLite bundles:

- `getSQLiteBasicsNodeNative()` for the `node:sqlite` module built into Node.js 22 and newer.
- `getSQLiteBasicsNode()` for the `sqlite3` npm package.
- `getSQLiteBasicsWasm()` for [wa-sqlite](https://github.com/rhashimoto/wa-sqlite), SQLite compiled to WebAssembly for the browser.
- `getSQLiteBasicsQuickSQLite()` for `react-native-quick-sqlite` in bare React Native projects.
- `getSQLiteBasicsExpoSQLiteAsync()` for `expo-sqlite` in current Expo SDK versions, and `getSQLiteBasicsExpoSQLite()` for the non-async API of older Expo SDKs.
- `getSQLiteBasicsWebSQL()` for `react-native-sqlite-2`.
- `getSQLiteBasicsCapacitor()` for `@capacitor-community/sqlite` in Capacitor apps.
- `getSQLiteBasicsTauri()` for the Tauri SQL plugin.

Notice that the storage requires SQLite version `3.38.0` or newer because it uses the SQLite JSON functions like `JSON_EXTRACT` to query document fields. The full code samples for every adapter are on the [SQLite RxStorage](../../rx-storage-sqlite.md) page.

## Example: TanStack DB on SQLite in Node.js

The following example runs on plain Node.js 22 or newer with the free trial storage and the built-in `node:sqlite` module. No native compilation step is needed.

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

The `@tanstack/react-db` package exports the framework-independent `createCollection()`, so this also works outside of React and with the Vue, Solid, Svelte, and Angular bindings.

### Create the RxDatabase on the SQLite Storage

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import {
    getRxStorageSQLiteTrial,
    getSQLiteBasicsNodeNative
} from 'rxdb/plugins/storage-sqlite';
import { DatabaseSync } from 'node:sqlite';

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageSQLiteTrial({
        sqliteBasics: getSQLiteBasicsNodeNative(DatabaseSync)
    })
});

await db.addCollections({
    todos: {
        schema: {
            title: 'todos',
            version: 0,
            type: 'object',
            primaryKey: 'id',
            properties: {
                id: { type: 'string', maxLength: 100 },
                text: { type: 'string' },
                completed: { type: 'boolean' }
            },
            required: ['id', 'text', 'completed']
        }
    }
});
```

### Wrap the RxCollection in a TanStack DB Collection

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos
    })
);
```

### Mutate and Observe the Durable Data

```ts
// Observe the RxDB collection to see writes arrive in SQLite.
db.todos.find().$.subscribe((docs) => {
    // The count grows on every run of this script
    // because the data survives the process restart.
    console.log('todos in SQLite:', docs.length);
});

// Optimistic mutation on the TanStack DB collection,
// persisted through RxDB into the SQLite file.
todosCollection.insert({
    id: 'todo-' + Date.now(),
    text: 'stored in SQLite',
    completed: false
});
```

Run the script twice. The second run starts with the todos from the first run because they live in the SQLite database, not in memory. In a UI app you would read the data with `useLiveQuery` as shown in the [hub article](./rxdb-collection-for-tanstack-db.md).

</Steps>

To go to production, swap the storage import for the premium version:

```ts
import {
    getRxStorageSQLite,
    getSQLiteBasicsNodeNative
} from 'rxdb-premium/plugins/storage-sqlite';
import { DatabaseSync } from 'node:sqlite';

const storage = getRxStorageSQLite({
    sqliteBasics: getSQLiteBasicsNodeNative(DatabaseSync)
});
```

Everything else stays the same.

## SQLite via WASM in the Browser

In the browser there is no native SQLite, but the [wa-sqlite](https://github.com/rhashimoto/wa-sqlite) package runs SQLite as WebAssembly and can persist to IndexedDB or OPFS underneath:

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageSQLite,
    getSQLiteBasicsWasm
} from 'rxdb-premium/plugins/storage-sqlite';

import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import SQLite from 'wa-sqlite';
const sqliteModule = await SQLiteESMFactory();
const sqlite3 = SQLite.Factory(sqliteModule);

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsWasm(sqlite3)
    })
});
```

Keep in mind that SQLite via WebAssembly is slower than the [IndexedDB](../../rx-storage-indexeddb.md) or [OPFS](../../rx-storage-opfs.md) storages because sending data between the main thread and WASM adds latency, see the [performance comparison](../../rx-storage-performance.md). When you do not have a hard requirement on SQLite in the browser, follow the [IndexedDB and OPFS guide](./persist-tanstack-db-indexeddb.md) instead. Your TanStack DB code does not change either way.

## Mobile and Desktop Platforms

On mobile and desktop, native SQLite is the recommended storage for RxDB and by extension for TanStack DB:

- **React Native and Expo**: Use `getSQLiteBasicsQuickSQLite()` with `react-native-quick-sqlite` in bare projects, or `expo-sqlite` in Expo apps. Details are in the [React Native database guide](../../react-native-database.md) and the [TanStack DB React Native article](./tanstack-db-react-native.md).
- **Electron**: Run the storage in the main process so database work does not block rendering. See the [Electron database guide](../../electron-database.md) and the [TanStack DB Electron article](./tanstack-db-electron.md).
- **Capacitor**: Use `getSQLiteBasicsCapacitor()` with `@capacitor-community/sqlite`. See the [Capacitor database guide](../../capacitor-database.md) and the [TanStack DB Capacitor article](./tanstack-db-capacitor.md).

For TanStack DB with Expo SQLite, the setup looks like this:

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageSQLite,
    getSQLiteBasicsExpoSQLiteAsync
} from 'rxdb-premium/plugins/storage-sqlite';
import * as SQLite from 'expo-sqlite';

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    multiInstance: false,
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsExpoSQLiteAsync(SQLite.openDatabaseAsync)
    })
});
```

Then wrap the collections with `rxdbCollectionOptions()` exactly as in the Node.js example above. Notice that for Expo apps the [Expo Filesystem RxStorage](../../rx-storage-filesystem-expo.md) exists as a faster alternative to SQLite.

## TanStack DB's Own SQLite Persistence

TanStack DB ships its own SQLite persistence layer: the `@tanstack/db-sqlite-persistence-core` package with platform adapters for the browser (wa-sqlite), Node.js, Electron, Expo, React Native, and Capacitor. When your only goal is to make a local-only TanStack DB collection survive a restart on one platform, those packages do the job and you do not need RxDB.

The RxDB SQLite storage covers a different scope. It puts a full database under your store, and the SQLite file becomes one part of a larger system:

- **Replication with any backend** through the [Sync Engine](../../replication.md), including [GraphQL](./tanstack-db-graphql.md), [CouchDB](./tanstack-db-couchdb-sync.md), [Supabase](./tanstack-db-supabase-offline.md), and custom HTTP endpoints, with [conflict resolution](./tanstack-db-conflict-resolution.md) and offline resume.
- **[Encryption](./tanstack-db-encryption.md)** of the data stored inside SQLite.
- **[Schema migrations](../../migration-schema.md)** for when your data model changes between app versions.
- **[Multi-tab support](./tanstack-db-multi-tab.md)** with leader election when the app runs in multiple browser tabs.
- **Storage portability**: The same code runs on [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [localStorage](../../rx-storage-localstorage.md), or the [Node.js filesystem storage](../../rx-storage-filesystem-node.md). Switching storages is a configuration change, not a rewrite.

## FAQ

<details>
    <summary>Is there a free SQLite storage for TanStack DB with RxDB?</summary>

Yes. The trial version of the **[SQLite RxStorage](../../rx-storage-sqlite.md)** ships with the free RxDB core package as `getRxStorageSQLiteTrial`. It is limited to `500` non-deleted documents and is meant for evaluation and prototypes. The production version with indexes and full query support is part of [RxDB Premium 👑](/premium/).

</details>

<details>
    <summary>Can TanStack DB use SQLite WASM in the browser?</summary>

Yes. The premium SQLite storage supports `wa-sqlite` through the `getSQLiteBasicsWasm()` adapter, so your TanStack DB collections persist into WebAssembly SQLite. In most browser apps the **[IndexedDB storage](../../rx-storage-indexeddb.md)** or [OPFS storage](../../rx-storage-opfs.md) is the faster choice, and your TanStack DB code stays identical when you switch.

</details>

<details>
    <summary>Does TanStack DB work with Expo SQLite?</summary>

Yes. The `getSQLiteBasicsExpoSQLiteAsync()` adapter connects the SQLite storage to the `expo-sqlite` module, and the TanStack DB collection sits on top through `rxdbCollectionOptions()`. The **[React Native database guide](../../react-native-database.md)** lists the recommended adapters per environment, including the faster [Expo Filesystem storage](../../rx-storage-filesystem-expo.md).

</details>

<details>
    <summary>Do I have to change my TanStack DB code when I switch from SQLite to another storage?</summary>

No. The storage is set once when the database is created, and the **[RxStorage](../../rx-storage.md)** interface hides it from everything above. Your TanStack DB collections, live queries, and mutations keep working unchanged on IndexedDB, OPFS, SQLite, or any other storage.

</details>

## Follow Up

- Read the [TanStack DB + RxDB overview](./rxdb-collection-for-tanstack-db.md) for the full integration guide.
- See all adapters and options on the [SQLite RxStorage](../../rx-storage-sqlite.md) page.
- Persist in the browser without SQLite: [IndexedDB and OPFS for TanStack DB](./persist-tanstack-db-indexeddb.md).
- Platform guides: [React Native](./tanstack-db-react-native.md), [Electron](./tanstack-db-electron.md), and [Capacitor](./tanstack-db-capacitor.md).
- Start with the [RxDB Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
