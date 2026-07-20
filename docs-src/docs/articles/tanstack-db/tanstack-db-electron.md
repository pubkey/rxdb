---
title: 'TanStack DB in Electron: A Local Database for Desktop Apps'
slug: tanstack-db-electron.html
description: Give your Electron app a reactive, offline-first data layer. Pair TanStack DB's live queries with RxDB for durable local storage and backend sync on desktop.
image: /headers/tanstack-db-electron.jpg
---

import {Steps} from '@site/src/components/steps';

# TanStack DB in Electron: A Local Database for Desktop Apps

**TanStack DB in Electron** gives your desktop app live queries and optimistic mutations, but TanStack DB itself is an in-memory store: persistence and sync belong to the collection implementation you choose. The official `@tanstack/rxdb-db-collection` package puts [RxDB](https://rxdb.info/) underneath, a [local-first](../local-first-future.md) NoSQL database with [storage engines](../../rx-storage.md) for SQLite and the Node.js filesystem and a [Sync Engine](../../replication.md) for any backend. The combination is described in the [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md) hub article. This page explains where the database belongs in Electron's process model, which storages the repo recommends for desktop, and how to wire a complete example with the free SQLite trial storage and `useLiveQuery` in the renderer.

<RxdbLogo alt="TanStack DB Electron reactive database" />

## The Two Electron Processes and Where the Database Belongs

An [Electron](https://www.electronjs.org/) runtime is divided into two parts. The **main** process is a Node.js process that runs without a UI in the background. The **renderer** processes are Chromium browser windows that render your UI, and each `BrowserWindow` is its own renderer process. This split decides where your data can live.

The renderer has access to the common Web Storage APIs like [localStorage](../../rx-storage-localstorage.md) and [IndexedDB](../../rx-storage-indexeddb.md). That is easy to set up, but [IndexedDB is slow](../../slow-indexeddb.md) because every operation goes through layers of browser security and abstractions, and with multiple windows it becomes hard to keep the state consistent. The main process has full Node.js access, so it can open SQLite or write files directly. SQLite cannot run in the renderer at all. So the recommended architecture from the [Electron database comparison](../../electron-database.md) is: run the storage in the main process, keep the UI in the renderer, and connect the two over IPC.

This is exactly the shape of the TanStack DB integration. RxDB persists documents through a storage in the main process. TanStack DB mirrors the collection in memory inside the renderer and runs [live queries](https://tanstack.com/db/latest/docs/guides/live-queries) against that copy. Reads in your components never touch the disk or the IPC boundary.

## Storage Options for Electron

RxDB abstracts persistence behind the [RxStorage](../../rx-storage.md) interface, and several storages fit the Electron main process:

- **[SQLite RxStorage](../../rx-storage-sqlite.md)**: The recommended production option. It stores everything in a single `.sqlite` file, and since Node.js version 22 the `node:sqlite` module ships with Node itself, which recent Electron versions include. No native module rebuilds needed. A free **trial version** (`getRxStorageSQLiteTrial`) comes with RxDB Core for evaluation. It is limited to 500 non-deleted documents, skips indexes, and runs queries in memory. The full version is part of [RxDB Premium 👑](/premium/).
- **[Filesystem Node RxStorage](../../rx-storage-filesystem-node.md)** 👑: Stores documents as plain JSON files through the Node.js filesystem API. It is a bit faster than the SQLite storage because it skips the boundary between the JavaScript process and the SQLite engine, and its setup is less complex.
- **[LocalStorage](../../rx-storage-localstorage.md) or [IndexedDB](../../rx-storage-indexeddb.md) in the renderer**: Good for a quick prototype without any main-process code, slower for large datasets.
- **[Memory RxStorage](../../rx-storage-memory.md)**: Keeps everything in RAM, useful for tests.

Switching storages is a configuration change, not a rewrite. You can prototype with localStorage in the renderer and move to SQLite in the main process later without touching your TanStack DB code. A deeper comparison of SQLite against the filesystem storage is in the [Electron SQLite article](../electron-sqlite.md).

## Sharing One Database Between Main and Renderer

Hand-rolling the IPC layer means one handler per query, manual result serialization, and a self-built change-notification system so windows do not show stale state. RxDB ships this wiring as the [Electron plugin](../../electron.md). It provides two helper functions that wrap any RxStorage, similar to the [Worker RxStorage](../../rx-storage-worker.md):

- `exposeIpcMainRxStorage` runs in the main process and exposes the real storage over `ipcMain`.
- `getRxStorageIpcRenderer` runs in each renderer and returns a [remote RxStorage](../../rx-storage-remote.md) that forwards all operations to the main process over `ipcRenderer`.

The renderer then creates a normal [RxDatabase](../../rx-database.md) on top of that remote storage. Every write from any window lands in the main-process storage, and RxDB's change feed streams it back into the TanStack DB collections of all windows. Heavy database work never blocks the UI.

:::note
`nodeIntegration` must be enabled on the `BrowserWindow` so that the renderer can use `ipcRenderer`, see the [Electron plugin docs](../../electron.md).
:::

## Example: TanStack DB on RxDB with SQLite in Electron

The following example uses the free SQLite trial storage in the main process and a React renderer. The TanStack DB parts are identical to the [hub setup](./rxdb-collection-for-tanstack-db.md), only the storage wiring is Electron-specific.

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Expose the SQLite Storage in the Main Process

The trial storage ships with RxDB Core. The `sqliteBasics` adapter tells RxDB how to talk to the `node:sqlite` module that comes with Node.js 22 and newer.

```ts
// main.js (Electron main process)
import { app, ipcMain } from 'electron';
import { exposeIpcMainRxStorage } from 'rxdb/plugins/electron';
import {
    getRxStorageSQLiteTrial,
    getSQLiteBasicsNodeNative
} from 'rxdb/plugins/storage-sqlite';
import { DatabaseSync } from 'node:sqlite';

app.on('ready', () => {
    exposeIpcMainRxStorage({
        key: 'main-storage',
        storage: getRxStorageSQLiteTrial({
            sqliteBasics: getSQLiteBasicsNodeNative(DatabaseSync)
        }),
        ipcMain
    });
    /* ... open your BrowserWindow ... */
});
```

### Create the RxDatabase in the Renderer

The renderer connects to the main-process storage with the same `key` and defines the collection schema.

```ts
// database.ts (renderer process)
import { createRxDatabase } from 'rxdb';
import { getRxStorageIpcRenderer } from 'rxdb/plugins/electron';
import { ipcRenderer } from 'electron';

export const db = await createRxDatabase({
    name: 'desktopdb',
    storage: getRxStorageIpcRenderer({
        key: 'main-storage',
        ipcRenderer
    })
});

await db.addCollections({
    todos: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
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

### Wrap the RxCollection for TanStack DB

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

export const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos,
        startSync: true // load the SQLite state into memory immediately
    })
);
```

### Query and Mutate in Your Components

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';
import { todosCollection } from './database';

export function TodoList() {
    // Live query: re-renders when a matching document changes,
    // also when the write came from another Electron window.
    const { data: openTodos } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );

    return (
        <ul>
            {openTodos.map((todo) => (
                <li
                    key={todo.id}
                    onClick={() =>
                        // Optimistic update: instant in the UI,
                        // persisted to SQLite in the main process.
                        todosCollection.update(todo.id, (draft) => {
                            draft.completed = true;
                        })
                    }
                >
                    {todo.text}
                </li>
            ))}
        </ul>
    );
}

todosCollection.insert({
    id: 'todo-1',
    text: 'ship the desktop app',
    completed: false
});
```

The mutation applies to the in-memory state instantly, travels over IPC into SQLite, and streams back into every subscribed window. When persisting fails, TanStack DB rolls the optimistic state back.

### Switch to a Production Storage

The trial storage is for evaluation and prototypes only. For production, exchange the storage in the main process for the [Premium SQLite RxStorage](../../rx-storage-sqlite.md) 👑 or the [Filesystem Node RxStorage](../../rx-storage-filesystem-node.md) 👑. Nothing else changes.

```ts
// main.js, production variant
import {
    getRxStorageSQLite,
    getSQLiteBasicsNodeNative
} from 'rxdb-premium/plugins/storage-sqlite';
import { DatabaseSync } from 'node:sqlite';

const storage = getRxStorageSQLite({
    sqliteBasics: getSQLiteBasicsNodeNative(DatabaseSync)
});
```

</Steps>

## Syncing the Desktop App with a Backend

Desktop users expect their data on other devices too. Replication is configured on the RxDB collection with `replicateRxCollection()` or one of the ready-made plugins for [GraphQL](./tanstack-db-graphql.md), [CouchDB](./tanstack-db-couchdb-sync.md), or [Supabase](./tanstack-db-supabase-offline.md). Writes land in SQLite first, the UI updates instantly, and the [Sync Engine](../../replication.md) pushes and pulls changes whenever the network allows it. Documents pulled from the backend stream into the TanStack DB collection automatically. The general pattern is described in [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).

## TanStack DB's Own Electron Persistence

TanStack also ships a first-party persistence adapter for Electron, the `@tanstack/electron-db-sqlite-persistence` package. When your app only needs collections to survive a restart on the desktop, that adapter is a valid choice and you do not need RxDB. The RxDB collection is the better fit when you want a full database under your store: replication with [any backend](./sync-tanstack-db.md), [conflict resolution](./tanstack-db-conflict-resolution.md), [encryption](./tanstack-db-encryption.md), [schema migrations](../../migration-schema.md), and one storage abstraction that also covers your [React Native](./tanstack-db-react-native.md) and [Capacitor](./tanstack-db-capacitor.md) builds.

## FAQ

<details>
    <summary>Can I use TanStack DB with SQLite in Electron?</summary>

Yes. The `@tanstack/rxdb-db-collection` package connects TanStack DB to an RxDB collection, and the **[SQLite RxStorage](../../rx-storage-sqlite.md)** persists that collection to a single `.sqlite` file in the Electron main process. A free trial version of the storage ships with RxDB Core for evaluation.

</details>

<details>
    <summary>Does the database run in the Electron main or renderer process?</summary>

The storage runs in the main process and the RxDatabase runs in the renderer. The **[Electron plugin](../../electron.md)** connects them with `exposeIpcMainRxStorage` and `getRxStorageIpcRenderer`, so database work never blocks the UI and SQLite stays where Node.js can reach it.

</details>

<details>
    <summary>Do multiple Electron windows stay in sync with TanStack DB?</summary>

Yes. Each `BrowserWindow` connects to the same main-process storage through `getRxStorageIpcRenderer` with the same `key`. A write in one window streams through **[RxDB](../../rx-database.md)**'s change feed into the TanStack DB collections of all other windows, and their live queries re-render on their own.

</details>

<details>
    <summary>Do I need native module rebuilds for SQLite in Electron?</summary>

No, not when you use the `node:sqlite` module that ships with Node.js 22 and newer, which recent Electron versions include. The `getSQLiteBasicsNodeNative()` adapter of the **[SQLite RxStorage](../../rx-storage-sqlite.md)** wraps it directly. Third-party packages like `sqlite3` are native addons and must be rebuilt with @electron/rebuild on every Electron upgrade.

</details>

<details>
    <summary>Is there a free way to try TanStack DB with RxDB in Electron?</summary>

Yes. The SQLite trial storage comes with RxDB Core and passes the full storage test suite, limited to 500 non-deleted documents and without indexes. You can also run the free **[localStorage-based storage](../../rx-storage-localstorage.md)** in the renderer for a prototype. For production, the full SQLite and filesystem storages are part of [RxDB Premium 👑](/premium/).

</details>

## Follow Up

- Read the [TanStack DB + RxDB overview](./rxdb-collection-for-tanstack-db.md) for the full integration guide.
- Learn how [SQLite and RxDB work together in Electron](../electron-sqlite.md) in detail.
- Compare the [database options for Electron](../../electron-database.md).
- Sync your desktop data with [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).
- Start with the [RxDB Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
