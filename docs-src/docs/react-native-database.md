---
title: React Native Database - Sync & Store Like a Pro
slug: react-native-database.html
description: The ultimate React Native Database guide. Build offline-first, real-time apps with RxDB. SQLite storage, easy sync, and React hooks included.
image: /headers/react-native-database.jpg
---

import {Steps} from '@site/src/components/steps';
import {Tabs} from '@site/src/components/tabs';

# React Native Database

If you are looking for a **React Native Database**, you usually want three things:
1. **Persistence**: Store data locally on the device so the app works **[offline](./offline-first.md)**.
2. **Reactivity**: Automatically update the UI when data changes.
3. **Sync**: Replicate data with a backend server in real-time.

RxDB covers all of these requirements out of the box. It is a [local-first](./articles/local-first-future.md) NoSQL database that runs deeply integrated with React Native, giving you the power of a full featured database engine inside your mobile app.

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="RxDB" width="220" />
    </a>
</center>

## The Storage Layer: SQLite

React Native does not have a native database engine. To store data persistently and efficiently, RxDB uses **[SQLite](./rx-storage-sqlite.md)** under the hood. SQLite is available on all mobile platforms (iOS, Android) and offers great performance.

RxDB abstracts the complex SQL commands away and provides a simple, **[NoSQL JSON document API](./rx-database.md)** that is easy to use for JavaScript developers.

We recommend different SQLite adapters depending on your environment:

<Tabs>

### React Native CLI

For bare React Native projects, use `react-native-quick-sqlite`. It uses JSI (JavaScript Interface) to communicate directly with C++, effectively bypassing the slow React Native Bridge.

**Installation**:
```bash
npm install rxdb rxjs react-native-quick-sqlite
```

**Configuration**:
```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageSQLite, getSQLiteBasicsQuickSQLite } from 'rxdb/plugins/storage-sqlite';
import { open } from 'react-native-quick-sqlite';

const db = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsQuickSQLite(open)
    }),
    multiInstance: false,
    ignoreDuplicate: true
});
```


### Expo Go

If you are using Expo, use the official `expo-sqlite` module.

**Installation**:
```bash
npx expo install expo-sqlite
npm install rxdb rxjs
```

**Configuration**:
```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageSQLite, getSQLiteBasicsExpoSQLiteAsync } from 'rxdb/plugins/storage-sqlite';
import * as SQLite from 'expo-sqlite';

const db = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsExpoSQLiteAsync(SQLite.openDatabaseAsync)
    }),
    multiInstance: false,
    ignoreDuplicate: true
});
```

</Tabs>

## React Integration

RxDB is deeply integrated with React. It provides hooks that make fetching data and subscribing to changes effortless.

### 1. Provide the Database
Wrap your application with the `RxDatabaseProvider`.

```tsx
import { RxDatabaseProvider } from 'rxdb/plugins/react';

export default function App() {
  // ... create db instance
  return (
    <RxDatabaseProvider database={db}>
       <MyComponent />
    </RxDatabaseProvider>
  );
}
```

### 2. Observe Data
Use the `useRxQuery` hook (or `useLiveRxQuery` shortcut) to fetch data. The component will **automatically re-render** whenever the data in the database changes. You don't need to manually subscriptions or handling event listeners.

```tsx
import { useRxCollection, useLiveRxQuery } from 'rxdb/plugins/react';

function TaskList() {
  const collection = useRxCollection('tasks');
  
  // This hook automatically updates 'tasks' whenever the query result changes
  const { result: tasks } = useLiveRxQuery(
    collection.find({
        selector: {
            done: { $eq: false }
        },
        sort: [{ createdAt: 'asc' }]
    })
  );

  return (
    <FlatList
      data={tasks}
      renderItem={({ item }) => <Text>{item.title}</Text>}
      keyExtractor={item => item.id}
    />
  );
}
```

### 3. Signals (Performance Mode)
For high-performance applications with frequent data updates, re-rendering the entire React component might be too slow.
RxDB supports **Signals** (via `@preact/signals-react` or similar) to pinpoint updates directly to the DOM nodes.

```tsx
// Enable the signals plugin once
import { addRxPlugin } from 'rxdb';
import { RxDBReactivityPreactSignalsPlugin } from 'rxdb/plugins/reactivity-preact-signals';
addRxPlugin(RxDBReactivityPreactSignalsPlugin);

// ... in your component
const signals = collection.find().$$; // Returns a Signal<Doc[]>
```

Using signals allows you to update only the specific text node that changed, keeping your UI running at 60fps even with massive data flux.

## Sync with Backend

A local database is useful, but a synchronized database is powerful.
RxDB provides a robust replication protocol that can sync with **any backend**.

It has dedicated plugins for popular backend solutions:
- **[Supabase / Postgres](./replication-supabase.md)**
- **[Firebase / Firestore](./replication-firestore.md)**
- **[GraphQL](./replication-graphql.md)**
- **[CouchDB](./replication-couchdb.md)**

For custom backends, you can implement the **[simple HTTP replication](./replication-http.md)** protocol.

### Example: Sync with Supabase
Syncing is set-and-forget. You start the replication, and RxDB handles the rest (pulling changes, pushing writes, handling conflict resolution).

```ts
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';

const replicationState = replicateSupabase({
    replicationIdentifier: 'my-sync',
    collection: db.tasks,
    supabaseClient: supabase,
    pull: {},
    push: {},
});
```

Because RxDB handles the sync layer, you can build your app as if it were a purely local application. All reads and writes happen against the local SQLite database instantly, while the replication happens in the background. This is the essence of **Local-First** development.

## Comparison with Alternatives

How does RxDB compare to other React Native database solutions?

| Feature | **AsyncStorage** | **SQLite** (Raw) | **Realm** | **Firestore** (SDK) | <img src="../files/logo/logo.svg" alt="RxDB" width="20" /> **RxDB** |
|:--- |:--- |:--- |:--- |:--- |:--- |
| **Type** | Key-Value Store | Relational (SQL) | Object Store | Cloud Document Store | **NoSQL Document Store** |
| **Reactivity** | ❌ None | ❌ Manual events | ✅ Local listeners | ✅ Real-time listeners | ✅ **Hooks / Signals / RxJS** |
| **Persistence** | ✅ File (Slow) | ✅ File (Generic) | ✅ Custom File | ⚠️ Partial Cache | ✅ **SQLite / File** |
| **Sync** | ❌ Manual | ❌ Manual | ✅ Realm Sync only | ✅ Firebase only | ✅ **Any Backend** |
| **Query Engine** | ❌ None | ✅ SQL Strings | ✅ Custom API | ✅ Limited | ✅ **Mango JSON Query** |
| **Schema** | ❌ None | ✅ SQL Schema | ✅ Class Schema | ❌ Loose | ✅ **[JSON Schema](./rx-schema.md)** |
| **Migration** | ❌ Manual | ❌ Manual SQL | ✅ Migration API | ❌ None | ✅ **Automatic** |

### Summary
- **AsyncStorage**: Good for simple key-value pairs (like settings). Too slow for data.
- **SQLite**: Great foundation, but requires writing raw SQL and manual reactivity/sync.
- **Realm**: Fast object store, but locks you into the MongoDB ecosystem for sync. Realm was deprecated in 2024 ([source](https://github.com/realm/realm-swift/discussions/8680)).
- **Firestore**: Easy networked DB, but poor offline support (cannot start offline) and latency issues.
- **RxDB**: Combines the performance of local SQLite with the ease of NoSQL, automatic reactivity, and backend-agnostic synchronization.

---

**Ready to start?**
Check out the **[React Native Example Project](https://github.com/pubkey/rxdb/tree/master/examples/react-native)** or read the **[Quickstart Guide](./quickstart.md)**.
