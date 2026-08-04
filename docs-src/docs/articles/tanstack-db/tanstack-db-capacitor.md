---
title: 'TanStack DB with Capacitor & Ionic: Offline Storage Guide'
slug: tanstack-db-capacitor.html
description: Add durable offline storage to your Capacitor or Ionic app. Use RxDB as the TanStack DB collection backend for reactive, local-first hybrid mobile apps.
image: /headers/tanstack-db-capacitor.jpg
---

import {Steps} from '@site/src/components/steps';

# TanStack DB with Capacitor & Ionic: Offline Storage Guide

**TanStack DB** gives your [Capacitor](../../capacitor-database.md) or [Ionic](../ionic-database.md) app live queries and optimistic mutations, but it is an in-memory reactive store: persistence and sync come from the collection implementation you choose. [RxDB](https://rxdb.info/) is a [local-first](../local-first-future.md) NoSQL database that runs inside the Capacitor webview and stores data in [SQLite](../../rx-storage-sqlite.md) on the device filesystem, and the official `@tanstack/rxdb-db-collection` package puts it underneath TanStack DB as described in [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md). This page explains which storages are safe in a hybrid app, walks through a complete Capacitor setup with the SQLite storage, and shows where backend sync fits in.

<RxdbLogo alt="TanStack DB Capacitor Ionic" />

## Where a Capacitor App Can Store Data

Capacitor apps run your web code in a native webview. This makes them more web-like than [React Native](./tanstack-db-react-native.md): Web APIs like [IndexedDB](../../rx-storage-indexeddb.md) and [localStorage](../../rx-storage-localstorage.md) are available, so most browser [RxStorage](../../rx-storage.md) plugins work out of the box. But there is a catch. The operating system treats webview storage as disposable and can clean it up when the device runs low on space or the app has not been used for a while. You cannot rely on that data surviving forever.

For production hybrid apps the recommended option is the [SQLite RxStorage](../../rx-storage-sqlite.md). It writes to the device filesystem instead of the webview, so the data is persistent and will not be cleaned up by any process. SQLite is also [much faster](../../rx-storage-performance.md) than IndexedDB because it does not have to go through the browser's permission layers, and Android and iOS already ship with a built-in SQLite engine. For the native binding, RxDB uses the [@capacitor-community/sqlite](https://github.com/capacitor-community/sqlite) package through the `getSQLiteBasicsCapacitor` adapter.

Two versions of the SQLite storage exist:

- **Trial version**: ships free with RxDB core as `getRxStorageSQLiteTrial`. It passes the full storage test suite but uses no indexes, is limited to `500` non-deleted documents, and runs queries in memory. Use it for evaluation and prototypes only.
- **[RxDB Premium 👑](/premium/) version**: the production-ready `getRxStorageSQLite` with full query support and performance optimizations.

While testing and prototyping you can also use the free [localStorage-based storage](../../rx-storage-localstorage.md) inside the webview and switch to SQLite later. Switching storages is a configuration change, not a rewrite. Your TanStack DB code does not change at all.

## Example: Todo App with Capacitor, SQLite, and TanStack DB

The following example wires up an Ionic React todo list. RxDB owns durability through SQLite, TanStack DB sits on top as the reactive query layer. Every write on the TanStack DB collection is persisted to disk, and every change in RxDB streams back into memory through the change feed. The example uses the free trial storage so that you can run it without a license. For production you swap in the [premium 👑](/premium/) storage with the same `sqliteBasics` adapter.

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @capacitor-community/sqlite
npm install @tanstack/react-db @tanstack/rxdb-db-collection
```

For an Ionic Angular or Vue app, install `@tanstack/angular-db` or `@tanstack/vue-db` instead of the React binding. The RxDB collection works with all of them because it plugs into the framework-independent `createCollection()`.

### Configure the iOS Database Location

For iOS apps, set the database location in your Capacitor config:

```json
{
    "plugins": {
        "CapacitorSQLite": {
            "iosDatabaseLocation": "Library/CapacitorDatabase"
        }
    }
}
```

### Create the RxDatabase with the SQLite Storage

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import {
    getRxStorageSQLiteTrial,
    getSQLiteBasicsCapacitor
} from 'rxdb/plugins/storage-sqlite';
import {
    CapacitorSQLite,
    SQLiteConnection
} from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const sqlite = new SQLiteConnection(CapacitorSQLite);

const db = await createRxDatabase({
    name: 'todosdb',
    storage: getRxStorageSQLiteTrial({
        // The sqliteBasics adapter bridges the capacitor
        // sqlite API into the RxDB SQLite storage.
        sqliteBasics: getSQLiteBasicsCapacitor(sqlite, Capacitor)
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

For production, import `getRxStorageSQLite` and `getSQLiteBasicsCapacitor` from `rxdb-premium/plugins/storage-sqlite` and replace `getRxStorageSQLiteTrial` with `getRxStorageSQLite`. Everything else stays the same.

### Wrap the RxCollection in a TanStack DB Collection

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

export const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos
    })
);
```

On app start the collection loads its state from SQLite into memory and stays in sync with RxDB from then on. When the user closes and reopens the app, the data is still there.

### Query and Mutate from Your Ionic Components

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';
import { IonList, IonItem, IonLabel, IonCheckbox } from '@ionic/react';
import { todosCollection } from './database';

export function TodoList() {
    // Live query: re-renders whenever a matching document changes.
    const { data: openTodos } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );

    return (
        <IonList>
            {openTodos.map((todo) => (
                <IonItem key={todo.id}>
                    <IonCheckbox
                        checked={todo.completed}
                        onIonChange={() =>
                            // Optimistic update: instant in the UI,
                            // persisted to SQLite in the background.
                            todosCollection.update(todo.id, (draft) => {
                                draft.completed = true;
                            })
                        }
                    />
                    <IonLabel>{todo.text}</IonLabel>
                </IonItem>
            ))}
        </IonList>
    );
}

// Inserts and deletes work the same way:
todosCollection.insert({ id: 'todo-1', text: 'buy milk', completed: false });
todosCollection.delete('todo-1');
```

Mutations apply to the in-memory state instantly. Under the hood, inserts are persisted through `bulkUpsert()`, updates through `incrementalPatch()`, and deletes through `bulkRemove()`. When a write fails, TanStack DB rolls the optimistic state back.

</Steps>

## Adding Backend Sync

Mobile devices go offline all the time: in the subway, in elevators, on airplane mode. Because RxDB owns the storage layer, your app also gets RxDB's [Sync Engine](../../replication.md) for free. Replication is configured on the RxCollection only, TanStack DB never talks to the backend. Documents pulled from the server land in SQLite and stream into your TanStack DB collections automatically, and local writes are pushed back with retries and checkpoints, so the app resumes exactly where it left off when connectivity returns. The general pattern is described in [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md), and the full offline behavior including conflict handling is covered in [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md).

## When TanStack DB Alone Is Enough

TanStack DB has its own persistence answer for Capacitor: the `@tanstack/capacitor-db-sqlite-persistence` adapter persists collections to SQLite, and `@tanstack/offline-transactions` queues mutations while offline. When your app only needs to survive a restart and you sync through Electric or PowerSync anyway, that setup is a good fit and you do not need RxDB.

The RxDB collection is the better choice when you want a full database under your store: one [storage abstraction](../../rx-storage.md) that also covers the browser and [Electron](./tanstack-db-electron.md), replication with [any backend](./sync-tanstack-db.md), [encryption of local data](./tanstack-db-encryption.md), [schema migrations](../../migration-schema.md), and [conflict resolution](./tanstack-db-conflict-resolution.md). Encryption in particular matters on mobile, where a stolen device means direct access to the SQLite file. RxDB is also a proven [Ionic storage](../ionic-storage.md) layer on its own, so you keep direct access to the RxCollection for indexed queries against large datasets.

## FAQ

<details>
    <summary>Does TanStack DB work with Capacitor and Ionic?</summary>

Yes. TanStack DB is plain JavaScript and runs in the Capacitor webview with React, Angular, Vue, Solid, or Svelte bindings. It keeps data in memory, so pair it with a persistent collection implementation like the **[RxDB collection](./rxdb-collection-for-tanstack-db.md)** to make the data survive app restarts.

</details>

<details>
    <summary>Can I use IndexedDB or localStorage for TanStack DB in a Capacitor app?</summary>

Yes, but only for prototyping. Webview storages work inside Capacitor, and the OS can delete them when the device runs low on space. For production, use the **[SQLite RxStorage](../../rx-storage-sqlite.md)** which writes to the device filesystem and is not subject to webview cleanup.

</details>

<details>
    <summary>Is the RxDB SQLite storage for Capacitor free?</summary>

No, not the full version. The production SQLite storage is part of the **[RxDB Premium 👑](/premium/)** plugins. A free trial version (`getRxStorageSQLiteTrial`) ships with RxDB core and is limited to `500` documents without indexes, and the free localStorage-based storage works for testing inside the webview.

</details>

<details>
    <summary>Does the RxDB collection for TanStack DB work with Ionic Angular or Vue?</summary>

Yes. The `rxdbCollectionOptions()` function targets the framework-independent `createCollection()` API, so it works with `@tanstack/angular-db`, `@tanstack/vue-db`, and the other official bindings. **[RxDB](../../rx-database.md)** itself is framework-agnostic as well.

</details>

<details>
    <summary>Does the same code run as a PWA in the browser?</summary>

Yes. Swap the SQLite storage for the **[IndexedDB RxStorage](../../rx-storage-indexeddb.md)** or another browser storage and the rest of the code stays identical. See [Building an Offline PWA with TanStack DB and RxDB](./tanstack-db-pwa.md) for the browser setup.

</details>

## Follow Up

- Read the hub article [TanStack DB + RxDB: Durable, Offline-First Persistence & Sync](./rxdb-collection-for-tanstack-db.md).
- Start with the [RxDB Quickstart](../../quickstart.md).
- Learn how to [sync TanStack DB with your backend](./sync-tanstack-db.md) and how to [build offline-first](./tanstack-db-offline-first.md).
- Compare the platform guides for [React Native](./tanstack-db-react-native.md) and [Electron](./tanstack-db-electron.md).
- Read more about [Capacitor databases](../../capacitor-database.md) and [Ionic storage](../ionic-storage.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
