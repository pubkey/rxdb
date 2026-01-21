# IndexedDB Database in React Apps - The Power of RxDB

> Discover how RxDB simplifies IndexedDB in React, offering reactive queries, offline-first capability, encryption, compression, and effortless integration.

# IndexedDB Database in React Apps - The Power of RxDB

Building robust, [offline-capable](../offline-first.md) React applications often involves leveraging browser storage solutions to manage data. IndexedDB is one such powerful tool, but its raw API can be challenging to work with directly. RxDB abstracts away much of IndexedDB's complexity, providing a more developer-friendly experience. In this article, we'll explore what IndexedDB is, why it's beneficial in React applications, the challenges of using plain IndexedDB, and how [RxDB](https://rxdb.info/) can simplify your development process while adding advanced features.

## What is IndexedDB?

[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) is a low-level API for storing significant amounts of structured data in the browser. It provides a transactional database system that can store key-value pairs, complex objects, and more. This storage engine is asynchronous and supports advanced data types, making it suitable for offline storage and complex web applications.

<center>
        
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
- **Limited Platform Support**: IndexedDB exists only in the browser. In contrast, RxDB offers swappable storages to use the same code in React Native, Capacitor, or Electron.

<center>
    
        
    
</center>

## Set up RxDB in React

Setting up RxDB with React is straightforward. It abstracts IndexedDB complexities and adds a layer of powerful features over it.

### Installing RxDB

First, install RxDB and RxJS from npm:

```bash
npm install rxdb rxjs --save```
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
    
      Hero List
      
        {heroes.map(hero => (
          
            {hero.name} - {hero.power}
          
        ))}
      
    
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
    
      {heroes.map(hero => (
        {hero.name}
      ))}
    
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

  

## Follow Up
- Learn how to use RxDB with the [RxDB Quickstart](../quickstart.md) for a guided introduction.
- Check out the [RxDB GitHub repository](https://github.com/pubkey/rxdb) and leave a star ⭐ if you find it useful.

By leveraging RxDB on top of IndexedDB, you can create highly responsive, offline-capable React applications without dealing with the low-level complexities of IndexedDB directly. With reactive queries, seamless cross-tab communication, and powerful advanced features, RxDB becomes an invaluable tool in modern web development.
