---
title: React Native Database - Sync & Store Like a Pro
slug: react-native-database.html
description: Discover top React Native local database solutions - AsyncStorage, SQLite, RxDB, and more. Build offline-ready apps for iOS, Android, and Windows with easy sync.
---

import {Steps} from '@site/src/components/steps';
import {Tabs} from '@site/src/components/tabs';

# React Native Database

React Native provides a cross-platform JavaScript runtime that runs on different operating systems like Android, iOS, Windows and others. Mostly it is used to create hybrid Apps that run on mobile devices at Android (Google) and iOS (Apple).

In difference to the JavaScript runtime of browsers, React Native does not support all HTML5 APIs and so it is not possible to use browser storage possibilities like localstorage, cookies, WebSQL or IndexedDB.
Instead a different storage solution must be chosen that does not come directly with React Native itself but has to be installed as a library or plugin.

<p align="center">
  <img src="./files/icons/react-native.png" alt="React Native" width="20" />
</p>

## Database Solutions for React-Native

There are multiple database solutions that can be used with React Native. While I would recommend to use [RxDB](./) for most use cases, it is still helpful to learn about other alternatives.

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="RxDB" width="220" />
    </a>
</center>

### AsyncStorage

AsyncStorage is a key->value storage solution that works similar to the browsers [localstorage API](./articles/localstorage.md). The big difference is that access to the AsyncStorage is not a blocking operation but instead everything is `Promise` based. This is a big benefit because long running writes and reads will not block your JavaScript process which would cause a laggy user interface.

```ts
/**
 * Because it is Promise-based,
 * you have to 'await' the call to getItem()
 */
await setItem('myKey', 'myValue');
const value = await AsyncStorage.getItem('myKey');
```


AsyncStorage was originally included in [React Native itself](https://reactnative.dev/docs/asyncstorage). But it was deprecated by the React Native Team which recommends to use a community based package instead. There is a [community fork of AsyncStorage](https://github.com/react-native-async-storage/async-storage) that is actively maintained and open source.

AsyncStorage is fine when only a small amount of data needs to be stored and when no query capabilities besides the key-access are required. Complex queries or features are not supported which makes AsyncStorage not suitable for anything more than storing simple user settings data.


### SQLite

<p align="center">
  <img src="./files/icons/sqlite.svg" alt="SQLite" width="120" />
</p>

SQLite is a SQL based relational database written in C that was crafted to be embed inside of applications. Operations are written in the SQL query language and SQLite generally follows the PostgreSQL syntax.

To use SQLite in React Native, you first have to include the SQLite library itself as a plugin. There a different project out there that can be used, but I would recommend to use the [react-native-quick-sqlite](https://github.com/ospfranco/react-native-quick-sqlite) project.

First you have to install the library into your React Native project via `npm install react-native-quick-sqlite`.
In your code you can then import the library and create a database connection:

```ts
import {open} from 'react-native-quick-sqlite';
const db = open('myDb.sqlite');
```

Notice that SQLite is a file based database where all data is stored directly in the filesystem of the OS. Therefore to create a connection, you have to provide a filename.

With the open connection you can then run SQL queries:

```ts
let { rows } = db.execute('SELECT somevalue FROM sometable');
```

If that does not work for you, you might want to try the [react-native-sqlite-storage](https://github.com/andpor/react-native-sqlite-storage) project instead which is also very popular.


#### Downsides of Using SQLite in UI-Based Apps

While SQLite is reliable and well-tested, it has several shortcomings when it comes to using it directly in UI-based React Native applications:

- **Lack of Observability**: Out of the box, SQLite does not offer a straightforward way to observe queries or document fields. This means that implementing [real-time data updates](./articles/realtime-database.md) in your UI requires additional layers or libraries.
- **Bridging Overhead**: Each query or data operation must go through the React Native bridge to access the native SQLite module. This can introduce performance bottlenecks or responsiveness issues, especially for large or complex data operations.
- **No Built-In Replication**: SQLite on its own is not designed for syncing data across multiple devices or with a backend. If your app requires multi-device data syncing or [offline-first](./offline-first.md) features, additional tools or a custom solution are necessary.
- **Version Management**: Handling schema changes often requires a custom migration process. If your data structure evolves frequently, managing these migrations can be cumbersome.

Overall, SQLite can be a good solution for straightforward, local-only data storage where complex real-time features or synchronization are not needed. For more advanced requirements, like reactive UI updates or multi-client [data replication](./replication.md), you'll likely want a more feature-rich solution.

### PouchDB

<p align="center">
  <img src="./files/icons/pouchdb.png" alt="PouchDB" width="40" />
</p>

PouchDB is a JavaScript NoSQL database that follows the API of the [Apache CouchDB](https://couchdb.apache.org/) server database.
The core feature of PouchDB is the ability to do a two-way replication with any CouchDB compliant endpoint.
While PouchDB is pretty mature, it has some drawbacks that blocks it from being used in a client-side React Native application. For example it has to store all documents states over time which is required to replicate with CouchDB. Also it is not easily possible to fully purge documents and so it will fill up disc space over time. A big problem is also that PouchDB is not really maintained and major bugs like wrong query results are not fixed anymore. The performance of PouchDB is a general bottleneck which is caused by how it has to store and fetch documents while being compliant to CouchDB. The only real reason to use [PouchDB](./rx-storage-pouchdb.md) in React Native, is when you want to replicate with a [CouchDB or Couchbase server](./replication-couchdb.md).

Because PouchDB is based on an [adapter system](./adapters.md) for storage, there are two options to use it with React Native:

- Either use the [pouchdb-adapter-react-native-sqlite](https://github.com/craftzdog/pouchdb-react-native) adapter
- or the [pouchdb-adapter-asyncstorage](https://github.com/seigel/pouchdb-react-native) adapter.

Because the `asyncstorage` adapter is no longer maintained, it is recommended to use the `native-sqlite` adapter:

First you have to install the adapter and other dependencies via `npm install pouchdb-adapter-react-native-sqlite react-native-quick-sqlite react-native-quick-websql`.

Then you have to craft a custom PouchDB class that combines these plugins:

```ts
import 'react-native-get-random-values';
import PouchDB from 'pouchdb-core';
import HttpPouch from 'pouchdb-adapter-http';
import replication from 'pouchdb-replication';
import mapreduce from 'pouchdb-mapreduce';
import SQLiteAdapterFactory from 'pouchdb-adapter-react-native-sqlite';
import WebSQLite from 'react-native-quick-websql';

const SQLiteAdapter = SQLiteAdapterFactory(WebSQLite);
export default PouchDB.plugin(HttpPouch)
  .plugin(replication)
  .plugin(mapreduce)
  .plugin(SQLiteAdapter);
```

This can then be used to create a PouchDB database instance which can store and query documents:

```ts
const db = new PouchDB('mydb.db', {
  adapter: 'react-native-sqlite'
});
```


### RxDB

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="RxDB" width="250" />
    </a>
</center>

[RxDB](https://rxdb.info/) is an [local-first](./offline-first.md), NoSQL-database for JavaScript applications. It is reactive which means that you can not only query the current state, but subscribe to all state changes like the result of a [query](./rx-query.md) or even a single field of a [document](./rx-document.md). This is great for UI-based realtime applications in a way that makes it easy to develop realtime applications like what you need in React Native.

**Key benefits of RxDB include:**

- Observability and Real-Time Queries: Automatic UI updates when underlying data changes, making it much simpler to build responsive, reactive apps.
- Offline-First and Sync: Built-in support for [syncing with CouchDB](./replication-couchdb.md), or via [GraphQL replication](./replication-graphql.md), allowing your app to work offline and seamlessly sync when online. It is easy to make the RxDB [replication](./replication.md) compatible with anything that [supports HTTP](./replication-http.md).
- Encryption and Data Security: RxDB supports [field-level encryption](./articles//react-native-encryption.md) and a robust plugin ecosystem for [compression](./key-compression.md) and [attachments](./rx-attachment.md).
- Data Modeling and Ease of Use: Offers a schema-based approach that helps catch invalid data early and ensures consistency.
- **Performance**: Optimized for storing and querying large amounts of data on [mobile devices](./articles/mobile-database.md).

There are multiple ways to use RxDB in React Native:

- Use the [memory RxStorage](./rx-storage-memory.md) that stores the data inside of the JavaScript memory without persistence
- Use the [SQLite RxStorage](./rx-storage-sqlite.md) with the [react-native-quick-sqlite](https://github.com/ospfranco/react-native-quick-sqlite) plugin.

It is recommended to use the [SQLite RxStorage](./rx-storage-sqlite.md) because it has the best performance and is the easiest to set up. However it is part of the [👑 Premium Plugins](/premium/) which must be purchased, so to try out RxDB with React Native, you might want to use the memory storage first. Later you can replace it with the SQLite storage by just changing two lines of configuration.

First you have to install all dependencies via `npm install rxdb rxjs rxdb-premium react-native-quick-sqlite`.
Then you can assemble the RxStorage and create a database with it:


<Steps>

### Import RxDB and SQLite
```ts
import {
  createRxDatabase
} from 'rxdb';
import { open } from 'react-native-quick-sqlite';
```

<Tabs>

#### RxDB Core

```ts
import {
    getRxStorageSQLiteTrial,
    getSQLiteBasicsCapacitor
} from 'rxdb/plugins/storage-sqlite';
```

#### RxDB Premium 👑

```ts
import {
    getRxStorageSQLite,
    getSQLiteBasicsCapacitor
} from 'rxdb-premium/plugins/storage-sqlite';
```

</Tabs>

### Create a database
```ts
const myRxDatabase = await createRxDatabase({
    // Instead of a simple name,
    // you can use a folder path to determine the database location 
    name: 'exampledb',
    multiInstance: false, // <- Set this to false when using RxDB in React Native
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsQuickSQLite(open)
    })
});

```

### Add a Collection
```ts
const collections = await myRxDatabase.addCollections({
    humans: {
        /* ... */
    }
});
```

### Insert a Document
```ts
await collections.humans.insert({id: 'foo', name: 'bar'});

```

### Run a Query
```ts
const result = await collections.humans.find({
    selector: {
        name: 'bar'
    }
}).exec();

```

### Observe a Query
```ts
await collections.humans.find({
    selector: {
        name: 'bar'
    }
}).$.subscribe(result => {/* ... */});
```
</Steps>

Using the SQLite RxStorage is pretty fast, which is shown in the [performance comparison](./rx-storage.md#performance-comparison).
To learn more about using RxDB with React Native, you might want to check out [this example project](https://github.com/pubkey/rxdb/tree/master/examples/react-native).

Also RxDB provides many other features like [encryption](./encryption.md) or [compression](./key-compression.md). You can even store binary data as [attachments](./rx-attachment.md) or use RxDB as an [ORM](./orm.md) in React Native.

### Realm

<p align="center">
  <img src="./files/icons/mongodb.svg" alt="MongoDB Realm" width="120" />
</p>


Realm is another database solution that is particularly popular in the mobile world. Originally an independent project, Realm is now owned by MongoDB, and has seen deeper integration with MongoDB services over time.

**Pros**:
- Fast, object-based database approach with an easy data model.
- Historically known for good performance and a simple, user-friendly API.

**Downsides**:
- **Forced MongoDB Cloud Usage**: Realm Sync is now tightly coupled with MongoDB Realm Cloud. If you want to use their full sync or advanced features, you are essentially locked into MongoDB's ecosystem, which can be a downside if you need on-premise or custom hosting.
- **Missing or Limited Features**: While Realm covers many basic needs, some developers find that advanced queries or certain offline-first features are not as robust or flexible as other solutions.
- **Vendor Lock-In**: If you rely heavily on Realm Sync, migrating away from MongoDB's cloud can be difficult because the sync logic and data format are tightly integrated.
- **Community Concerns**: Since the MongoDB acquisition, some worry about Realm's open-source future and whether large changes or new features will remain community-friendly.

Although Realm can be a good solution when used purely as a local database, if you plan on syncing data across clients or want to avoid cloud vendor lock-in, you should consider carefully how MongoDB's ownership might affect your long-term plans.

### Firebase / Firestore

<p align="center">
  <img src="./files/alternatives/firebase.svg" alt="Firebase" width="120" />
</p>

Firestore is a cloud based database technology that stores data on clients devices and replicates it with the Firebase cloud service that is run by google. It has many features like observability and authentication.
The main feature lacking is the non-complete offline first support because clients cannot start the application while being offline because then the authentication does not work. After they are authenticated, being offline is no longer a problem.
Also using firestore creates a vendor lock-in because it is not possible to replicate with a custom self hosted backend.

To get started with Firestore in React Native, it is recommended to use the [React Native Firebase](https://github.com/invertase/react-native-firebase) open-source project.


### Summary

| **Characteristic**      | **AsyncStorage**                     | **SQLite**                              | **PouchDB**                               | <img src="../files/logo/logo.svg" alt="RxDB" width="20" /> **RxDB**                                                   | **Realm**                                     | **Firestore**                                             |
| ----------------------- | ------------------------------------ | --------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| **Database Type**       | Key-value store, no advanced queries | Embedded SQL engine in a local file     | NoSQL doc store, revision-based           | NoSQL doc-based (JSON)                                     | Object-based (MongoDB-owned)                  | NoSQL doc-based, cloud by Google                          |
| **Query Model**         | getItem/setItem only                 | Standard SQL statements                 | Map/reduce or basic Mango queries         | JSON-based query language, optional indexes                | Object-level queries, sync with MongoDB Realm | Document queries, limited advanced ops                    |
| **Observability**       | None built-in                        | No direct reactivity                    | Changes feed from Couch-style backend     | Built-in reactive queries, UI auto-updates                 | Local reactivity, or realm sync (cloud)       | Real-time snapshots, partial offline                      |
| **Offline Replication** | None                                 | None by default                         | CouchDB-compatible sync                   | Built-in sync (HTTP, GraphQL, CouchDB, etc.)               | Realm Cloud sync only                         | Basic offline caching, re-auth needed                     |
| **Performance**         | Fine for small keys/values           | Generally good; bridging overhead       | OK for mid data sets; can bloat over time | Varies by storage; Dexie/SQLite w/ compression can be fast | Typically fast on mobile                      | Good read-heavy perf; can be rate-limited, costy          |
| **Schema Handling**     | None                                 | SQL schema, migrations needed           | No formal schema, doc-based               | Optional JSON-Schema, typed checks, compression            | Declarative schema, migration needed          | No strict schema; rules in console mostly                 |
| **Usage Cases**         | Store small user settings            | Local structured data, moderate queries | Basic doc store, synergy with CouchDB     | Reactive offline-first for large or dynamic data           | Local object DB, locked to MongoDB realm sync | Real-time Google backend, partial offline, vendor lock-in |

<!-- TODO
## Realm

- bound to mongodb cloud replication
-->


## Follow up

- A good way to learn using RxDB database with React Native is to check out the [RxDB React Native example](https://github.com/pubkey/rxdb/tree/master/examples/react-native) and use that as a tutorial.
- If you haven't done so yet, you should start learning about RxDB with the [Quickstart Tutorial](./quickstart.md).
- There is a followup list of other [client side database alternatives](./alternatives.md) that might work with React Native.
