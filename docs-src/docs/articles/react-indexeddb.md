---
title: IndexedDB Database in React Apps - The Power of RxDB
slug: react-indexeddb.html
description: Discover how RxDB simplifies IndexedDB in React, offering reactive queries, offline-first capability, encryption, compression, and effortless integration.
image: /headers/react-indexeddb.jpg
---

import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_DATA_BROWSER, PERFORMANCE_METRICS } from '@site/src/components/performance-data';

# IndexedDB Database in React Apps - The Power of RxDB

Building robust, [offline-capable](../offline-first.md) React applications often involves leveraging browser storage solutions to manage data. IndexedDB is one such powerful tool, but its raw API can be challenging to work with directly. RxDB abstracts away much of IndexedDB's complexity, providing a more developer-friendly experience. In this article, we'll explore what IndexedDB is, why it's beneficial in React applications, the challenges of using plain IndexedDB, and how [RxDB](https://rxdb.info/) can simplify your development process while adding advanced features.

## What is IndexedDB?

[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) is a low-level API for storing significant amounts of structured data in the browser. It provides a transactional database system that can store key-value pairs, complex objects, and more. This storage engine is asynchronous and supports advanced data types, making it suitable for offline storage and complex web applications.

<center>
        <img src="../files/icons/react.svg" alt="React IndexedDB" width="120" />
</center>

## Why Use IndexedDB in React

When building React applications, IndexedDB can play a crucial role in enhancing both performance and user experience. Here are some reasons to consider using IndexedDB:

- **Offline-First / Local-First**: By storing data locally, your application remains functional even without an internet connection.
- **Performance**: Using local data means [zero latency](./zero-latency-local-first.md) and no loading spinners, as data doesn't need to be fetched over a network.
- **Easier Implementation**: Replicating all data to the client once is often simpler than implementing multiple endpoints for each user interaction.
- **Scalability**: Local data reduces server load because queries run on the client side, decreasing server bandwidth and processing requirements.

## Why To Not Use Plain IndexedDB

While IndexedDB itself is powerful, its native API comes with several drawbacks for everyday application developers:

- **Callback-Based API**: IndexedDB was designed with callbacks rather than modern Promises, making asynchronous code more cumbersome.
- **Complexity**: IndexedDB is low-level, intended for library developers rather than for app developers who simply want to store data.
- **Basic Query API**: Its rudimentary query capabilities limit how you can efficiently perform complex queries, whereas libraries like RxDB offer more advanced query features.
- **TypeScript Support**: Ensuring good TypeScript support with IndexedDB is challenging, especially when trying to enforce document type consistency.
- **Lack of Observable API**: IndexedDB doesn't provide an observable API out of the box. RxDB solves this by enabling you to observe query results or specific document fields.
- **Cross-Tab Communication**: Managing cross-tab updates in plain IndexedDB is difficult. RxDB handles this seamlessly-changes in one tab automatically affect observed data in others.
- **Missing Advanced Features**: Features like encryption or compression aren't built into IndexedDB, but they are available via RxDB.
- **Limited Platform Support**: IndexedDB exists only in the browser. In contrast, RxDB offers swappable storages to use the same code in [React Native](../react-native-database.md), [Capacitor](../capacitor-database.md), or [Electron](../electron-database.md).

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## Set up RxDB in React

Setting up RxDB with React is straightforward. It abstracts IndexedDB complexities and adds a layer of powerful features over it.

### Installing RxDB

First, install RxDB and RxJS from npm:

```bash
npm install rxdb rxjs --save
```

### Create a Database and Collections

RxDB provides two main storage options:
- The free [localstorage-based storage](../rx-storage-localstorage.md)
- The premium plain [IndexedDB-based storage](../rx-storage-indexeddb.md), offering faster performance
Below is an example of setting up a simple RxDB [database](./react-database.md) using the localstorage-based storage in a React app:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// create a database
const db = await createRxDatabase({
    name: 'heroesdb', // the name of the database
    storage: getRxStorageLocalstorage()
});

// Define your schema
const heroSchema = {
  title: 'hero schema',
  version: 0,
  description: 'Describes a hero in your app',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string'
    },
    power: {
      type: 'string'
    }
  },
  required: ['id', 'name']
};

// add collections
await db.addCollections({
  heroes: {
    schema: heroSchema
  }
});
```

### CRUD Operations

Once your database is initialized, you can perform all CRUD operations:

```ts
// insert
await db.heroes.insert({ name: 'Iron Man', power: 'Genius-level intellect' });

// bulk insert
await db.heroes.bulkInsert([
  { name: 'Thor', power: 'God of Thunder' },
  { name: 'Hulk', power: 'Superhuman Strength' }
]);

// find and findOne
const heroes = await db.heroes.find().exec();
const ironMan = await db.heroes.findOne({ selector: { name: 'Iron Man' } }).exec();

// update
const doc = await db.heroes.findOne({ selector: { name: 'Hulk' } }).exec();
await doc.update({ $set: { power: 'Unlimited Strength' } });

// delete
const doc = await db.heroes.findOne({ selector: { name: 'Thor' } }).exec();
await doc.remove();
```

## Reactive Queries and Live Updates

RxDB excels in providing reactive data capabilities, ideal for [real-time applications](./realtime-database.md). There are two main approaches to achieving live queries with RxDB: using RxJS Observables with React Hooks or utilizing Preact Signals.

<p align="center">
  <img src="../files/animations/realtime.gif" alt="realtime ui updates" width="700" />
</p>

### With RxJS Observables and React Hooks

RxDB integrates seamlessly with RxJS Observables, allowing you to build reactive components. Here's an example of a React component that subscribes to live data updates:

```ts
import { useState, useEffect } from 'react';

function HeroList({ collection }) {
  const [heroes, setHeroes] = useState([]);

  useEffect(() => {
    // create an observable query
    const query = collection.find();
    const subscription = query.$.subscribe(newHeroes => {
      setHeroes(newHeroes);
    });
    return () => subscription.unsubscribe();
  }, [collection]);

  return (
    <div>
      <h2>Hero List</h2>
      <ul>
        {heroes.map(hero => (
          <li key={hero.id}>
            <strong>{hero.name}</strong> - {hero.power}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

This component subscribes to the collection's changes, updating the UI automatically whenever the underlying data changes, even across browser tabs.

### With Preact Signals

RxDB also supports Preact Signals for reactivity, which can be integrated into React applications. Preact Signals offer a modern, fine-grained reactivity model.

First, install the necessary package:
```bash
npm install @preact/signals-core --save
```
Set up RxDB with Preact Signals reactivity:

```ts
import { PreactSignalsRxReactivityFactory } from 'rxdb/plugins/reactivity-preact-signals';
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const database = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage(),
    reactivity: PreactSignalsRxReactivityFactory
});
```

Now, you can obtain signals directly from RxDB queries using the double-dollar sign (`$$`):

```ts
function HeroList({ collection }) {
  const heroes = collection.find().$$;
  return (
    <ul>
      {heroes.map(hero => (
        <li key={hero.id}>{hero.name}</li>
      ))}
    </ul>
  );
}
```

This approach provides automatic updates whenever the data changes, without needing to manage subscriptions manually.

## React IndexedDB Example with RxDB

A comprehensive example of using RxDB within a React application can be found in the [RxDB GitHub repository](https://github.com/pubkey/rxdb/tree/master/examples/react). This repository contains sample applications, showcasing best practices and demonstrating how to integrate RxDB for various use cases.

## Advanced RxDB Features

RxDB offers many advanced features that extend beyond basic data storage:

- **RxDB Replication**: Synchronize local data with remote databases seamlessly. Learn more: [RxDB Replication](https://rxdb.info/replication.html)
- **Data Migration**: Handle schema changes gracefully with automatic data migrations. See: [Data migration](https://rxdb.info/migration-schema.html)
- **Encryption**: Secure your data with built-in encryption capabilities. Explore: [Encryption](https://rxdb.info/encryption.html)
- **Compression**: Optimize storage using key compression. Details: [Compression](https://rxdb.info/key-compression.html)

## Limitations of IndexedDB

While IndexedDB is powerful, it has some inherent limitations:

- **Performance**: IndexedDB can be slow under certain conditions. Read more: [Slow IndexedDB](https://rxdb.info/slow-indexeddb.html)
- **Storage Limits**: Browsers [impose limits](./indexeddb-max-storage-limit.md) on how much data can be stored. See: [Browser storage limits](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html)

## Alternatives to IndexedDB
Depending on your application's requirements, there are [alternative storage solutions](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md) to consider:

- **Origin Private File System (OPFS)**: A newer API that can offer better performance. RxDB supports OPFS as well. More info: [RxDB OPFS Storage](../rx-storage-opfs.md)
- **SQLite**: Ideal for React applications on Capacitor or [Ionic](./ionic-storage.md), offering native performance. Explore: [RxDB SQLite Storage](../rx-storage-sqlite.md)

## Performance comparison with other browser storages
Here is a [performance overview](../rx-storage-performance.md) of the various browser based storage implementation of RxDB:

<PerformanceChart title="Browser Storages" data={PERFORMANCE_DATA_BROWSER} metrics={PERFORMANCE_METRICS} />

## FAQ

<details>
<summary>Is IDBRequest constructible via new IDBRequest()?</summary>

No, `IDBRequest` is an interface provided by the [IndexedDB](./react-indexeddb.md) API and is not constructible via `new IDBRequest()`. Trying to do so will throw a `TypeError: Illegal constructor`. `IDBRequest` objects are generated automatically by the browser exclusively when you execute an asynchronous database operation, such as calling `.put()`, `.get()`, or `.openCursor()` on an `IDBObjectStore` or `IDBIndex`.
</details>

<details>
<summary>How does IndexedDB store data in the browser and how does it compare to LocalStorage?</summary>

IndexedDB is a low-level, transactional NoSQL database native to the browser that stores structured data (including JSON objects and files/blobs) using indexes for high-performance searches. Unlike [LocalStorage](./localstorage.md), which is strictly synchronous, string-only, and capped at around 5 MiB, IndexedDB operates asynchronously, supports complex querying, and can store gigabytes of application state, making it the superior choice for complex web applications.
</details>

<details>
<summary>Are there ways to sync LocalStorage and IndexedDB state?</summary>

Yes, it is a common optimization pattern to sync or split state between the two. Because IndexedDB can be slow to initialize, tools like the [RxDB LocalStorage Meta Optimizer](../rx-storage-localstorage-meta-optimizer.md) specifically store initial fast-boot metadata in LocalStorage while keeping the heavyweight, complex JSON documents inside IndexedDB. You can keep them in sync by subscribing to IndexedDB write events and patching the LocalStorage cache.
</details>

<details>
<summary>Does clearing the browser cache delete IndexedDB data?</summary>

Clearing the standard browser cache (images, CSS, JS files) does *not* necessarily delete IndexedDB data, but clearing "Site Data" or "Cookies and other site data" **will** definitively wipe out your IndexedDB databases. Additionally, browsers like Safari may proactively evict IndexedDB data if the user hasn't interacted with the originating website for 7 days. This is why [Local-First](../offline-first.md) apps must still implement a robust [sync mechanism](../replication.md) to safely back up client data to a server.
</details>

<details>
<summary>Is IndexedDB available in service workers?</summary>

Yes, IndexedDB is fully available in Service Workers, [Web Workers](../rx-storage-worker.md), and Shared Workers. Since workers run on separate background threads and cannot execute synchronous APIs (meaning LocalStorage is completely blocked in workers), IndexedDB is often the primary mechanism for Service Workers to stubbornly cache network requests, queue offline background sync payloads, or manage push notification configurations.
</details>

<details>
<summary>Can complex objects like CryptoKey or FileSystemDirectoryHandle be stored in IndexedDB?</summary>

Yes, one of the massive advantages of IndexedDB over standard string-based storage is its support for the **Structured Clone Algorithm**. This allows you to effortlessly store natively complex JavaScript objects, including `CryptoKey` instances (provided they are marked as extractable), `FileSystemDirectoryHandle` and `FileSystemFileHandle` references (crucial for [OPFS](../rx-storage-opfs.md) and File System Access API), as well as generic `Blob`, `File`, `Map`, and `Set` objects.
</details>

<details>
<summary>Does aborting onupgradeneeded prevent database creation in IndexedDB?</summary>

Yes, if you abort an IndexedDB transaction during the `onupgradeneeded` event (by calling `event.target.transaction.abort()`), the entire upgrade process is rolled back. If this was the very first time the database was being created (version 1), the database creation itself is entirely canceled, and no database will be persisted to the user's disk.
</details>

<details>
<summary>How do you clear IndexedDB data programmatically in JavaScript?</summary>

You can completely delete an entire IndexedDB database programmatically by calling `indexedDB.deleteDatabase('DatabaseName')`. This method returns an `IDBOpenDBRequest` which you can attach `.onsuccess` and `.onerror` handlers to. If you only want to clear the data *inside* a specific object store without deleting the whole database structure, you should open a `readwrite` transaction and call `.clear()` on the `IDBObjectStore`.
</details>

<details>
<summary>How to properly implement IndexedDB in a modern React application?</summary>

You should almost never implement the raw IndexedDB API directly inside React components due to its complex callback architecture, unstructured data streams, and severe lack of native React-friendly reactivity. The proper modern implementation involves wrapping IndexedDB with a reactive abstraction layer like **[RxDB](https://rxdb.info)**. This entirely hides the native `onupgradeneeded` lifecycle complexity, automatically exposes queries as RxJS Observables (or Preact Signals), and allows you to bind live UI state directly to the underlying IndexedDB storage engine.
</details>

## Follow Up
- Learn how to use RxDB with the [RxDB Quickstart](../quickstart.md) for a guided introduction.
- Check out the [RxDB GitHub repository](https://github.com/pubkey/rxdb) and leave a star ⭐ if you find it useful.

By leveraging RxDB on top of IndexedDB, you can create highly responsive, offline-capable React applications without dealing with the low-level complexities of IndexedDB directly. With reactive queries, seamless cross-tab communication, and powerful advanced features, RxDB becomes an invaluable tool in modern web development.
