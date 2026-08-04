# React Native Database - Sync & Store Like a Pro

> The ultimate React Native Database guide. Build offline-first, real-time apps with RxDB. SQLite storage, easy sync, and React hooks included.

import {Steps} from '@site/src/components/steps';
import {Tabs} from '@site/src/components/tabs';
import {HeadlineWithIcon} from '@site/src/components/headline-with-icon';
import {Faq, FaqItem} from '@site/src/components/faq';

# <HeadlineWithIcon h1 icon={}>React Native Database</HeadlineWithIcon>

If you are looking for a **React Native Database**, you usually want three things:
1. **Persistence**: Store data locally on the device so the app works **[offline](./offline-first.md)**.
2. **Reactivity**: Automatically update the UI when data changes.
3. **Sync**: Replicate data with a backend server in real-time.

RxDB covers all of these requirements out of the box. It is a [local-first](./articles/local-first-future.md) NoSQL database that runs deeply integrated with React Native, giving you the power of a full featured database engine inside your mobile app.

<RxdbLogo alt="RxDB" />

## The Storage Layer

React Native does not have a native database engine. To store data persistently and efficiently, RxDB offers multiple storage options.

### 👑 Expo Filesystem (Highest Performance)

For the absolute best performance in React Native and Expo applications, the premium **[Expo Filesystem RxStorage](./rx-storage-filesystem-expo.md)** is highly recommended. Built on `expo-opfs`, it completely bypasses the React Native bridge and delivers significantly faster read/write speeds than traditional SQLite.

### SQLite

If you prefer a free solution or specifically need SQLite, RxDB fully supports **[SQLite](./rx-storage-sqlite.md)**. It works on all mobile platforms and abstracts the complex SQL commands into a simple, **[NoSQL JSON document API](./rx-database.md)**.

Depending on your environment, different SQLite adapters are recommended:

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
import {
    getRxStorageSQLite,
    getSQLiteBasicsQuickSQLite
} from 'rxdb-premium/plugins/storage-sqlite';
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
import {
    getRxStorageSQLite,
    getSQLiteBasicsExpoSQLiteAsync
} from 'rxdb-premium/plugins/storage-sqlite';
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

<Steps>

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
Use the `useRxQuery` hook (or `useLiveRxQuery` shortcut) to fetch data. The component will **automatically re-render** whenever the data in the database changes. You do not have to manage subscriptions or event listeners manually.

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
import {
    RxDBReactivityPreactSignalsPlugin
} from 'rxdb/plugins/reactivity-preact-signals';
addRxPlugin(RxDBReactivityPreactSignalsPlugin);

// ... in your component
const signals = collection.find().$$; // Returns a Signal<Doc[]>
```

Using signals allows you to update only the specific text node that changed, keeping your UI running at 60fps even with massive data flux.

</Steps>

## Sync with Backend

A local database alone is useful. But most real-world apps also have to sync their data with a backend.
RxDB provides a robust [replication](./replication.md) protocol that can sync with **any backend**.

It has dedicated plugins for popular backend solutions:
- **[Supabase / Postgres](./replication-supabase.md)**
- **[Firebase / Firestore](./replication-firestore.md)**
- **[GraphQL](./replication-graphql.md)**
- **[CouchDB](./replication-couchdb.md)**

For custom backends, you can implement the **[simple HTTP replication](./replication-http.md)** protocol.

### Example: Sync with Supabase
Syncing is set-and-forget. You start the replication, and RxDB handles the rest (pulling changes, pushing writes, handling [conflict resolution](./transactions-conflicts-revisions.md)).

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

In the following you can see how RxDB compares to the most common React Native storage and database solutions. Each of them has valid use cases. The trouble starts when you use a key-value store for document data or a cloud SDK for an offline-first app.

| Feature | **AsyncStorage** | **MMKV** | **SQLite** (Raw) | **WatermelonDB** | **Realm** | **Firestore** (SDK) |  **RxDB** |
|:--- |:--- |:--- |:--- |:--- |:--- |:--- |:--- |
| **Type** | Key-Value Store | Key-Value Store | Relational (SQL) | ORM on SQLite | Object Store | Cloud Document Store | **NoSQL Document Store** |
| **Reactivity** | ❌ None | ⚠️ Per-key listeners | ❌ Manual events | ✅ Observables | ✅ Local listeners | ✅ Real-time listeners | ✅ **Hooks / Signals / RxJS** |
| **Persistence** | ✅ File (Slow) | ✅ File (memory-mapped) | ✅ File (Generic) | ✅ SQLite | ✅ Custom File | ⚠️ Partial Cache | ✅ **SQLite / File** |
| **Sync** | ❌ Manual | ❌ Manual | ❌ Manual | ⚠️ Client primitives only | ❌ Shut down 2025 | ✅ Firebase only | ✅ **Any Backend** |
| **Query Engine** | ❌ None | ❌ None | ✅ SQL Strings | ✅ Query builder | ✅ Custom API | ✅ Limited | ✅ **Mango JSON Query** |
| **Schema** | ❌ None | ❌ None | ✅ SQL Schema | ✅ Schema + Models | ✅ Class Schema | ❌ Loose | ✅ **[JSON Schema](./rx-schema.md)** |
| **Migration** | ❌ Manual | ❌ Manual | ❌ Manual SQL | ✅ Migration API | ✅ Migration API | ❌ None | ✅ **Automatic** |

### Summary
- **AsyncStorage**: Good for simple key-value pairs like settings and flags. On Android it stores everything in one SQLite-backed store with a default total size limit of `6 MB` and a read limit of about `2 MB` per entry ([known limits](https://react-native-async-storage.github.io/async-storage/docs/limits/)). Too slow and too limited for document data.
- **MMKV**: [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) is a fast, synchronous key-value store that uses JSI to skip the React Native bridge. It is a good AsyncStorage replacement for settings. But it is not a database: there are no queries, no indexes, and no sync.
- **SQLite**: Great foundation, but requires writing raw SQL and manual [reactivity](./reactivity.md)/sync. RxDB uses it as a [storage layer](./rx-storage-sqlite.md) instead.
- **WatermelonDB**: [WatermelonDB](https://watermelondb.dev/) is a reactive ORM on top of SQLite, built for large datasets with lazy loading, and it performs well at that job. Its sync feature only ships the client-side primitives, so you have to design and implement the pull/push endpoints on your backend yourself, and the relational schema requires hand-written migrations.
- **Realm**: Fast object store, but MongoDB deprecated it in September 2024 and shut down the Device Sync service on September 30, 2025 ([deprecation notice](https://www.mongodb.com/community/forums/t/atlas-device-sync-end-of-life-and-deprecation/296687), [community discussion](https://github.com/realm/realm-swift/discussions/8680)). The local database lives on as open source, but without sync you should not start new projects on it. The [Realm migration guide](./articles/realm-to-rxdb-migration.md) shows how to move to RxDB.
- **Firestore**: Easy networked DB, but poor offline support (cannot start offline), vendor lock-in, and latency issues. RxDB can [replicate with Firestore](./replication-firestore.md) so that reads and writes stay local.
- **RxDB**: Combines the performance of local SQLite with the ease of NoSQL, automatic reactivity, and backend-agnostic synchronization.

Performance claims are cheap. You can find measured numbers for the different RxDB storages on the [RxStorage performance page](./rx-storage-performance.md), and it is recommended to run your own measurements with the access patterns of your app.

## FAQ

<Faq>
<FaqItem question="What database should I use for React Native?">

For small key-value data like settings, AsyncStorage or MMKV are enough. When your app stores documents, needs queries and indexes, or has to work offline, you have to use a real database. **[RxDB](./rx-database.md)** combines local SQLite persistence with automatic reactivity and [replication](./replication.md) to any backend, which is why it fits most offline-first React Native apps.

</FaqItem>
<FaqItem question="Does RxDB work with Expo?">

Yes. RxDB runs in Expo apps with the `expo-sqlite` adapter of the **[SQLite RxStorage](./rx-storage-sqlite.md)**, and for the best performance you can use the **[Expo Filesystem RxStorage](./rx-storage-filesystem-expo.md)** which bypasses the React Native bridge. Both work with the managed Expo workflow.

</FaqItem>
<FaqItem question="Is AsyncStorage a database?">

No. AsyncStorage is an unencrypted key-value store without queries, indexes, or schemas. On Android its default total size limit is `6 MB` ([known limits](https://react-native-async-storage.github.io/async-storage/docs/limits/)), so storing your app's documents in it will bite back as soon as the dataset grows. Use it for settings and use a **[database](./rx-database.md)** for data.

</FaqItem>
<FaqItem question="What should I use instead of Realm in React Native?">

MongoDB deprecated Realm in September 2024 and shut down its Device Sync service on September 30, 2025, so new projects should not be started on it. **[RxDB](./rx-database.md)** is the closest replacement because it is also a local, reactive, object-like database, and its [Sync Engine](./replication.md) works with your own backend instead of a proprietary cloud. The **[Realm migration guide](./articles/realm-to-rxdb-migration.md)** describes the migration path.

</FaqItem>
<FaqItem question="Can RxDB sync with any backend?">

Yes. The RxDB [replication protocol](./replication.md) is backend-agnostic and only requires you to expose pull and push handlers, for example over the [simple HTTP replication](./replication-http.md). There are also prebuilt plugins for [Supabase](./replication-supabase.md), [Firestore](./replication-firestore.md), [GraphQL](./replication-graphql.md), and [CouchDB](./replication-couchdb.md).

</FaqItem>
</Faq>

---

**Ready to start?**
Check out the **[React Native Example Project](https://github.com/pubkey/rxdb/tree/master/examples/react-native)** or read the **[Quickstart Guide](./quickstart.md)**.
