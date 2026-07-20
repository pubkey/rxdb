---
title: 'TanStack DB in React Native & Expo: Offline Storage Guide'
slug: tanstack-db-react-native.html
description: Run TanStack DB in React Native and Expo with durable offline storage. Use RxDB as the collection backend for SQLite-backed persistence and sync on mobile.
image: /headers/tanstack-db-react-native.jpg
---

import {Steps} from '@site/src/components/steps';

# TanStack DB in React Native & Expo: Offline Storage Guide

**TanStack DB in React Native** works out of the box because TanStack DB is plain JavaScript: an in-memory reactive client store with live queries and optimistic mutations that runs fine inside Hermes. But on mobile, in-memory is not enough, because the operating system evicts apps from memory all the time, and persistence and sync come from the collection implementation you choose. The official `@tanstack/rxdb-db-collection` package puts [RxDB](https://rxdb.info/) underneath as a durable, [local-first](../local-first-future.md) backend, as described in the [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md) overview. This page explains which RxDB storages work in React Native and Expo, how the SQLite storage is configured, and walks through a runnable Expo example.

<RxdbLogo alt="TanStack DB React Native offline storage" />

## TanStack DB Runs in React Native, but It Forgets

TanStack DB has no DOM dependency and no browser-only APIs in its core, so it runs in React Native without changes. Collections, live queries, and optimistic mutations all behave the same as on the web.

The catch is durability. TanStack DB keeps collection data in memory, and on a phone the app process is killed whenever the user switches apps for too long or the OS needs memory. When that happens, every in-memory collection starts empty on the next launch. On the web a reload is a rare event. On mobile it is the normal life cycle.

So the collection backend has to write to disk. The [RxDB collection](./rxdb-collection-for-tanstack-db.md) does exactly that: RxDB persists every document through an [RxStorage](../../rx-storage.md) on the device, and TanStack DB reloads its in-memory state from there on every app start. Writes on the TanStack DB collection are persisted to RxDB, and changes in RxDB, for example from [replication](../../replication.md), stream back into the TanStack DB collection automatically.

## Storage Options for React Native and Expo

React Native does not ship a database engine, so RxDB brings its own storage layer. The [React Native database guide](../../react-native-database.md) recommends the following options, and switching between them is a configuration change, not a rewrite.

### SQLite Storage

The [SQLite RxStorage](../../rx-storage-sqlite.md) works on all mobile platforms and uses the SQLite engine that Android and iOS already ship. There are two versions:

- The **trial version** ships directly with RxDB Core as `getRxStorageSQLiteTrial()`. It passes the full storage test suite, but it is made for evaluation and prototypes only: it does not use indexes, has no attachment support, is limited to `500` non-deleted documents, and fetches the whole storage state to run queries in memory.
- The **[RxDB Premium 👑](/premium/)** version `getRxStorageSQLite()` is the production-ready storage with full query support and performance optimizations.

Both versions connect to the concrete SQLite library through a so called `sqliteBasics` adapter:

- **Expo**: install `expo-sqlite` and use `getSQLiteBasicsExpoSQLiteAsync(SQLite.openDatabaseAsync)`. Notice that `expo-sqlite` cannot be used on Android with Expo SDK version 50 or older. Older SDKs can fall back to the non-async `getSQLiteBasicsExpoSQLite(openDatabase)` adapter.
- **Bare React Native**: use `react-native-quick-sqlite` with `getSQLiteBasicsQuickSQLite(open)`. It uses JSI to talk directly to C++ and bypasses the slow React Native bridge. When that library does not work for you, `react-native-sqlite-2` with `getSQLiteBasicsWebSQL(SQLite.openDatabase)` is the alternative.

Also set `multiInstance: false` when creating the database, because React Native runs a single JavaScript process and does not need cross-instance coordination.

### Expo Filesystem Storage 👑

For the best performance in React Native and Expo apps, the premium **[Expo Filesystem RxStorage](../../rx-storage-filesystem-expo.md)** is recommended. It is built on `expo-file-system` with the `expo-opfs` peer dependency, requires at least Expo SDK 54, and skips the SQL engine entirely: no SQL parsing, no native query planning, no relational mapping. This makes it significantly faster than SQLite in the [Expo performance comparison](../../rx-storage-filesystem-expo.md). You can pick the asynchronous `getRxStorageExpoAsync()` or the synchronous `getRxStorageExpoSync()` API.

### Memory Storage for Tests

For unit tests and quick experiments, the free [memory storage](../../rx-storage-memory.md) runs the same API without persisting anything. Your TanStack DB integration code stays identical.

## TanStack DB's Own Mobile Persistence

TanStack ships its own SQLite persistence adapters for mobile: `@tanstack/expo-db-sqlite-persistence` and `@tanstack/react-native-db-sqlite-persistence` persist the store itself to SQLite, and `@tanstack/offline-transactions` queues mutations while offline. When surviving an app restart on one platform is all you need, these are a valid choice.

The RxDB collection is the better fit when you want a full database under your store: [replication with any backend](./sync-tanstack-db.md) instead of a specific sync service, [encryption of local data](../react-native-encryption.md), [schema migrations](../../migration-schema.md) for when your data model changes, and one storage abstraction that also covers the [browser](./persist-tanstack-db-indexeddb.md), [Electron](./tanstack-db-electron.md), and [Capacitor](./tanstack-db-capacitor.md).

## Example: Expo App with SQLite Storage

The following example uses the free SQLite trial storage with `expo-sqlite`. For production you would swap in the [premium 👑 storage](/premium/) or the [Expo Filesystem storage](../../rx-storage-filesystem-expo.md), the rest of the code stays the same. The basics of `rxdbCollectionOptions()` are explained in the [hub article](./rxdb-collection-for-tanstack-db.md).

<Steps>

### Install the Packages

```bash
npx expo install expo-sqlite
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create the RxDatabase with SQLite Storage

```ts
// database.ts
import { createRxDatabase } from 'rxdb';
import {
    getRxStorageSQLiteTrial,
    getSQLiteBasicsExpoSQLiteAsync
} from 'rxdb/plugins/storage-sqlite';
import * as SQLite from 'expo-sqlite';

export const db = await createRxDatabase({
    name: 'todosdb',
    storage: getRxStorageSQLiteTrial({
        sqliteBasics: getSQLiteBasicsExpoSQLiteAsync(SQLite.openDatabaseAsync)
    }),
    // React Native runs a single JavaScript process.
    multiInstance: false
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
// todos-collection.ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';
import { db } from './database';

export const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos
    })
);
```

On every app start the collection loads its state from the SQLite file on disk and stays in sync with RxDB from then on.

### Query and Mutate in a React Native Component

```tsx
// TodoList.tsx
import { useLiveQuery, eq } from '@tanstack/react-db';
import { FlatList, Pressable, Text, View } from 'react-native';
import { todosCollection } from './todos-collection';

export function TodoList() {
    // Live query: re-renders whenever a matching document changes.
    const { data: openTodos, isLoading } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );

    if (isLoading) {
        return <Text>Loading...</Text>;
    }

    return (
        <View>
            <FlatList
                data={openTodos}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() =>
                            // Optimistic update: instant in the UI,
                            // persisted to SQLite in the background.
                            todosCollection.update(item.id, (draft) => {
                                draft.completed = true;
                            })
                        }
                    >
                        <Text>{item.text}</Text>
                    </Pressable>
                )}
            />
            <Pressable
                onPress={() =>
                    todosCollection.insert({
                        id: 'todo-' + Date.now(),
                        text: 'new todo',
                        completed: false
                    })
                }
            >
                <Text>Add Todo</Text>
            </Pressable>
        </View>
    );
}
```

Kill the app and reopen it. The todos are still there, loaded from SQLite into the TanStack DB collection before the first render finishes.

### (Optional) Switch to the Premium Storage

For production, only the storage import changes:

```ts
import {
    getRxStorageSQLite,
    getSQLiteBasicsExpoSQLiteAsync
} from 'rxdb-premium/plugins/storage-sqlite';
```

</Steps>

## Sync with Your Backend

Replication is configured on the RxDB collection, not on the TanStack DB collection. RxDB's [Sync Engine](../../replication.md) ships plugins for [Supabase](../../replication-supabase.md), [Firestore](../../replication-firestore.md), [GraphQL](./tanstack-db-graphql.md), [CouchDB](./tanstack-db-couchdb-sync.md), and a generic [HTTP protocol](../../replication-http.md) for custom backends. Documents pulled from the server land in SQLite and stream into the TanStack DB collection automatically, and local mutations are pushed back in the background. When the phone is offline, replication resumes from a checkpoint later. The full pattern is described in [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).

## FAQ

<details>
    <summary>Does TanStack DB work in React Native and Expo?</summary>

Yes. TanStack DB is plain JavaScript without DOM dependencies, so it runs in React Native and Expo without changes. Its collections are in-memory though, so for offline data you need a durable collection backend like the **[RxDB collection](./rxdb-collection-for-tanstack-db.md)** on top of a persistent storage.

</details>

<details>
    <summary>How do I persist TanStack DB data offline in React Native?</summary>

Yes, this works through the collection implementation. The `@tanstack/rxdb-db-collection` package stores all documents in **[RxDB](../../rx-database.md)**, which persists them to SQLite or the Expo filesystem on the device. On the next app start the TanStack DB collection reloads its state from disk.

</details>

<details>
    <summary>Can I use TanStack DB with SQLite in Expo?</summary>

Yes. Install `expo-sqlite` and create the RxDatabase with the **[SQLite RxStorage](../../rx-storage-sqlite.md)** using the `getSQLiteBasicsExpoSQLiteAsync()` adapter. The free trial version is fine for prototypes, the production version is part of [RxDB Premium 👑](/premium/).

</details>

<details>
    <summary>Which RxDB storage is fastest for React Native?</summary>

Yes, there is a clear answer: the premium **[Expo Filesystem RxStorage](../../rx-storage-filesystem-expo.md)**. It skips the SQL engine and writes documents directly through `expo-file-system`, which makes it significantly faster than SQLite in RxDB's performance test suite. It requires Expo SDK 54 or newer.

</details>

<details>
    <summary>Do I still need a sync library for TanStack DB on mobile?</summary>

No. When you use the RxDB collection, RxDB's **[Sync Engine](../../replication.md)** handles replication with any backend, including retries, checkpoints, and conflict handling. TanStack DB picks up replicated changes automatically through RxDB's change feed.

</details>

## Follow Up

- Read the hub article [TanStack DB + RxDB: Durable, Offline-First Persistence & Sync](./rxdb-collection-for-tanstack-db.md).
- Learn the basics in the [RxDB Quickstart](../../quickstart.md).
- Compare all options in the [React Native database guide](../../react-native-database.md).
- Sync your mobile data with [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).
- Building for iOS and Android with web tech instead: [TanStack DB with Capacitor & Ionic](./tanstack-db-capacitor.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
