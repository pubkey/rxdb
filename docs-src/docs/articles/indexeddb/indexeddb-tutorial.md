---
title: IndexedDB Tutorial - How to Use IndexedDB, Its Limits, and RxDB
slug: indexeddb-tutorial.html
description: Learn how to use IndexedDB with a step-by-step tutorial, understand where it falls short, and see how RxDB adds queries, reactivity, and sync on top.
image: /headers/indexeddb-tutorial.jpg
---

import {Steps} from '@site/src/components/steps';

# IndexedDB Tutorial

**IndexedDB** is the standard [browser storage](../browser-storage.md) API for storing larger amounts of structured data on the client, including files and blobs. It runs in every modern browser and keeps your data on disk, so it survives page reloads and works offline. This tutorial teaches you how to use IndexedDB from scratch with the raw API, then shows where the native API falls short, and how [RxDB](https://rxdb.info/) adds the missing database layer on top of it.

<RxdbLogo alt="IndexedDB tutorial" />

We start with plain IndexedDB and no libraries, so you understand what the browser gives you on its own. If you already know the API and only want the parts that hurt, jump to [The Limits of IndexedDB](#the-limits-of-indexeddb).

## What is IndexedDB?

**IndexedDB** is a transactional database built into every browser. It stores JavaScript objects on disk, inside the user's browser, and lets you look them up by a primary key or by secondary indexes. It is a [low-level building block](../local-database.md), not a developer-facing database engine, so a minute on the core ideas pays off before you write any code.

### How IndexedDB Was Invented

In the early days of the web, the browser could only keep small strings in cookies. The first attempt at a real client-side database was **Web SQL Database**, a spec that put a full SQL engine (SQLite) into the browser. It was deprecated in 2010, because every browser would have had to ship the exact same SQLite build and there was no independent standard to implement against.

IndexedDB was the answer to that problem. Instead of SQL, it defines a storage engine that each browser can build on its own, and it became a W3C standard in 2015. The goals were clear:

- Store more structured data than cookies or [localStorage](../../rx-storage-localstorage.md) allow.
- Keep the API **asynchronous**, so a large read or write never blocks the UI thread.
- Make every change **transactional**, so a failed write does not leave half-written data behind.
- Support **indexes** for fast lookups by fields other than the primary key.
- Stay **low-level**, so libraries (like RxDB) can build friendlier APIs on top.

The last goal is why raw IndexedDB feels so bare. It was designed as a foundation for libraries, not as the thing you use directly.

### The Core Concepts

- **Database**: a named, versioned container. You open it by name, and the version number controls when its structure is allowed to change.
- **Object store**: the place where records live, similar to a table in SQL or a collection in a document database. One database can hold many object stores.
- **Record**: this is the part that trips people up. A record is one complete JavaScript object, stored under a key. It is not a single value like in localStorage, and it is not a row of separate columns like in SQL. Whatever object you put in is the object you get back. So `{ id: 'todo1', name: 'Learn IndexedDB', category: 'work', done: false }` goes in and comes out as one whole record.
- **Primary key**: the value that uniquely identifies a record inside its store. In the tutorial the key is the `id` field (`keyPath: 'id'`), so every todo needs its own unique `id`.
- **Index**: a secondary lookup path. By default you can only find a record by its primary key. An index lets you also find records by another field, for example every todo where `category` equals `work`, without reading the whole store. You define indexes once, at the moment the store is created, and the browser keeps them up to date on every write.
- **Transaction**: every read and write runs inside a transaction. It groups operations and commits them as one unit, and it commits on its own as soon as the browser is done with it.

### Callbacks and Why They Are Harder Than Promises

IndexedDB is older than Promises, so it reports results through **callbacks**. A callback is a function you hand to the API, and the API calls it back later, once the work is done. IndexedDB gives you two on every request: `onsuccess` when the operation worked and `onerror` when it failed. The result never comes back as a return value, it arrives inside the callback.

A **Promise** represents a value that is not ready yet, and you read it with `await` or `.then()`. The difference in practice:

```js
// callback style: the result lives inside onsuccess
const request = store.get('todo1');
request.onsuccess = () => {
    console.log(request.result);
};

// promise style: the result is the return value
const todo = await getTodo('todo1');
console.log(todo);
```

Callbacks are harder to work with for a few concrete reasons:

- **Nesting**: when one step depends on the previous one, callbacks nest inside callbacks, the code drifts to the right, and it gets hard to follow.
- **No await**: you cannot pause on a callback. With Promises you write straight-line code and `await` each step in order.
- **Scattered errors**: every request needs its own `onerror`, instead of one `try/catch` around the whole flow.
- **Hard to compose**: combining several async steps by hand is error-prone, while Promises chain and combine cleanly.

Keep this in mind while reading the tutorial below. Every `onsuccess` you see is a place where a Promise-based database would let you `await` the result instead.

## How to Use IndexedDB - Step by Step

The example below builds a small `todos` store, adds an index, and runs the full create, read, update, and delete cycle. Every record has the shape `{ id, name, category, done }`. You can paste each block into the browser console and follow along.

<Steps>

### Open a Database and Create an Object Store

You open a database by name and version. The `onupgradeneeded` event fires only on the first open or when you raise the version number, and it is the only place where you are allowed to create object stores and indexes.

```js
const request = indexedDB.open('todos-db', 1);

request.onupgradeneeded = (event) => {
    const db = event.target.result;
    // create the store on first open, keyed by the 'id' field
    const store = db.createObjectStore('todos', { keyPath: 'id' });
    // add a secondary index so we can query by category later
    store.createIndex('category', 'category', { unique: false });
};

let db;
request.onsuccess = (event) => {
    db = event.target.result; // the database is ready to use here
};

request.onerror = (event) => {
    console.error('Could not open the database', event.target.error);
};
```

### Add a Record

Every write needs a `readwrite` transaction. You open the transaction, get the object store, and call `add`. The transaction commits on its own once all its requests are done.

```js
function addTodo(todo) {
    const tx = db.transaction('todos', 'readwrite');
    const store = tx.objectStore('todos');
    const request = store.add(todo);

    request.onsuccess = () => console.log('added key', request.result);
    tx.onerror = () => console.error('write failed', tx.error);
}

addTodo({ id: 'todo1', name: 'Learn IndexedDB', category: 'work', done: false });
```

### Read a Record by Key

A `readonly` transaction is enough for reads. `store.get(key)` returns a request, and the result arrives on its `onsuccess` event, never as a return value.

```js
const tx = db.transaction('todos', 'readonly');
const store = tx.objectStore('todos');
const request = store.get('todo1');

request.onsuccess = () => {
    console.log(request.result);
    // > { id: 'todo1', name: 'Learn IndexedDB', category: 'work', done: false }
};
```

### Query Records With an Index

To fetch many records by a field, you go through the index you created. `IDBKeyRange.only('work')` limits the result to records where `category` equals `work`.

```js
const tx = db.transaction('todos', 'readonly');
const index = tx.objectStore('todos').index('category');
const request = index.getAll(IDBKeyRange.only('work'));

request.onsuccess = () => {
    console.log(request.result); // all todos where category === 'work'
};
```

### Update a Record

There is no partial update. You read the record, change it in memory, and write the whole object back with `put`, which overwrites the record that has the same key.

```js
const tx = db.transaction('todos', 'readwrite');
const store = tx.objectStore('todos');
const getRequest = store.get('todo1');

getRequest.onsuccess = () => {
    const todo = getRequest.result;
    todo.done = true;
    store.put(todo);
};
```

### Delete a Record

Deleting is a single call inside a `readwrite` transaction.

```js
const tx = db.transaction('todos', 'readwrite');
tx.objectStore('todos').delete('todo1');
```

</Steps>

That is the whole raw API. Notice that nothing here returns a Promise, so you cannot `await` a read or write, and you have to keep every transaction alive inside its own callback chain.

## The Limits of IndexedDB

The tutorial above works, but as soon as your app grows past a demo, the native API starts to bite back. These are the limits you will run into.

- **Callback-based API**: IndexedDB is built on events, not Promises. You cannot `await` a request, and a transaction auto-commits as soon as control returns to the event loop, so it cannot survive an `await` in the middle. Real code turns into nested `onsuccess` handlers or a pile of manual Promise wrappers.
- **No reactivity**: The native API has no way to tell you when data changes. If you want your UI to update after a write, you have to build your own event bus and call it from every place that touches the store.
- **Limited querying**: You can only query by a key or a single-field index range. Anything like "find all not-done todos in category 'work', sorted by name, skip 20, limit 10" means opening a cursor and iterating and filtering by hand. There is no combined filter, sort, skip, and limit. Booleans and plain objects are also not valid IndexedDB keys, so a `done: true/false` field cannot be indexed directly.
- **No schema or validation**: Object stores are schemaless. You can write any shape into them, which feels convenient until one wrong write puts a malformed record on disk and a later read crashes your app.
- **Slow for many operations**: IndexedDB is not fast, and bulk reads and writes have a lot of overhead. See [Slow IndexedDB](../../slow-indexeddb.md) for the numbers and the reasons.
- **Storage limits and eviction**: The browser controls the quota, and it can evict your data under storage pressure. Safari wipes script-writable storage after 7 days of inactivity. See [IndexedDB max storage limit](../indexeddb-max-storage-limit.md).
- **No sync**: IndexedDB stores data in one tab, on one device, in one origin. It has no concept of syncing to another tab, another device, or a backend server. See [IndexedDB sync](./indexeddb-sync.md).

None of this makes IndexedDB a bad storage engine. It is a good place to keep data on disk. The trouble starts when you expect it to behave like a database, because it does not. That is the gap [RxDB](https://rxdb.info/) fills.

## How RxDB Overcomes the Limits of IndexedDB

RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript applications. It runs on top of IndexedDB (and other storages) and gives you the database features the raw API is missing, while your data still lives in IndexedDB under the hood. Switching storages is a configuration change, not a rewrite.

In the browser you have two common ways to store into IndexedDB with RxDB: the free [Dexie.js storage](../../rx-storage-dexie.md), which wraps IndexedDB and is a good default, or the [IndexedDB RxStorage](../../rx-storage-indexeddb.md) with [👑 premium access](/premium/), which is faster and ships a smaller build. The examples below use the Dexie storage.

### 1. A Promise-Based API With Schemas

RxDB gives you a clean async API and validates every write against a [JSON schema](../../rx-schema.md), so bad data never reaches disk. Compare this to the callback code from the tutorial above.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const db = await createRxDatabase({
    name: 'todos-db',
    storage: getRxStorageDexie() // stores into IndexedDB under the hood
});

await db.addCollections({
    todos: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                // the primary key must have a maxLength
                id: { type: 'string', maxLength: 100 },
                name: { type: 'string' },
                category: { type: 'string' },
                done: { type: 'boolean' }
            },
            required: ['id', 'name', 'category', 'done']
        }
    }
});

// a single awaitable line instead of an onupgradeneeded/onsuccess chain
const doc = await db.todos.insert({
    id: 'todo1',
    name: 'Learn RxDB',
    category: 'work',
    done: false
});
```

### 2. Reactive Queries

Every RxDB query is observable. You subscribe once, and it emits a new result whenever a matching document changes, even when the change happens in another part of your app or another browser tab. This is the reactivity the native API leaves you to build yourself.

```ts
const observable = db.todos.find({
    selector: { done: { $eq: false } }
}).$; // get the observable via RxQuery.$

observable.subscribe(openTodos => {
    console.log('Currently have ' + openTodos.length + ' things to do');
    // -> re-render your UI here with the updated list
});
```

### 3. MongoDB-Style Queries

Instead of opening a cursor and filtering by hand, you write [MongoDB-style (Mango) queries](../../rx-query.md) that combine filter, sort, skip, and limit in one object. And a boolean field like `done` is queryable, which a raw IndexedDB index cannot do.

```ts
const results = await db.todos.find({
    selector: {
        done: { $eq: false },
        category: { $eq: 'work' }
    },
    sort: [{ name: 'asc' }],
    skip: 0,
    limit: 10
}).exec();
```

### 4. Sync Across Tabs, Devices, and Servers

RxDB ships a [Sync Engine](../../replication.md) that replicates your IndexedDB data to a backend over HTTP, WebSocket, or GraphQL, with conflict handling and offline queueing built in. Writes made offline sync later, and changes flow back to every connected client in realtime. Raw IndexedDB gives you none of this. See [IndexedDB sync](./indexeddb-sync.md) for the full picture.

### 5. Better Performance and Managed Storage

RxDB uses batched cursors and other techniques to work around the slow parts of IndexedDB, and it helps you handle quota and eviction instead of letting the browser surprise you. For the details, read [Slow IndexedDB](../../slow-indexeddb.md) and [IndexedDB max storage limit](../indexeddb-max-storage-limit.md).

## FAQ

<details>
<summary>How do I use IndexedDB in JavaScript?</summary>

You open a database with `indexedDB.open(name, version)`, create an **object store** inside the `onupgradeneeded` event, and then read and write records inside `readwrite` or `readonly` transactions. Every operation returns a request whose result arrives on an `onsuccess` callback. The [step-by-step tutorial above](#how-to-use-indexeddb---step-by-step) walks through the full create, read, update, and delete cycle.

</details>

<details>
<summary>What is a record in IndexedDB?</summary>

A record is one complete JavaScript object stored inside an **object store** under a key. It is not a single value like a localStorage string, and it is not a row of separate columns like in SQL. You put an object in and you get the same object back. See [The Core Concepts](#the-core-concepts) above.

</details>

<details>
<summary>What is an index in IndexedDB?</summary>

An index is a secondary lookup path. Without it you can only find a record by its primary key. An index lets you find records by another field, for example every todo where `category` equals `work`, without scanning the whole store. You create indexes once, inside `onupgradeneeded`, and the browser keeps them current on every write.

</details>

<details>
<summary>What is the difference between a callback and a promise?</summary>

A callback is a function you pass to an API that gets called later with the result, like IndexedDB's `onsuccess`. A Promise is a value you read with `await` or `.then()`. Promises let you write straight-line code with one `try/catch`, while callbacks nest and need error handling on every step. This is a large part of why raw IndexedDB feels harder than a modern database.

</details>

<details>
<summary>Is IndexedDB better than localStorage?</summary>

Yes, for structured data. [localStorage](../../rx-storage-localstorage.md) only stores strings, is synchronous, and is capped at a few megabytes. IndexedDB stores objects and blobs, works asynchronously, and holds much more data. For simple key-value flags, localStorage is fine.

</details>

<details>
<summary>Why is IndexedDB so hard to use?</summary>

The API predates Promises and is built around events and callbacks, so control flow is verbose and a transaction cannot survive an `await`. It also has no reactivity, no schema, and only single-field range queries. Most teams add a wrapper. See [the best IndexedDB wrapper](./best-indexeddb-wrapper.md) for a comparison.

</details>

<details>
<summary>Can IndexedDB sync data to a server or other devices?</summary>

No. IndexedDB stores data in one browser, on one device, in one origin, and has no built-in sync. You have to build replication yourself or use a library like **[RxDB](https://rxdb.info/)** that ships a [Sync Engine](../../replication.md). See [IndexedDB sync](./indexeddb-sync.md).

</details>

<details>
<summary>Does RxDB use IndexedDB?</summary>

Yes. **[RxDB](https://rxdb.info/)** can store its data in IndexedDB through the free [Dexie.js storage](../../rx-storage-dexie.md) or the premium [IndexedDB RxStorage](../../rx-storage-indexeddb.md). You keep IndexedDB as the storage and get a real database API, reactivity, and sync on top.

</details>

## Follow Up

- Start building with the [RxDB Quickstart](../../quickstart.md).
- Compare wrappers in [Best IndexedDB Wrapper](./best-indexeddb-wrapper.md).
- Read why the native API is slow in [Slow IndexedDB](../../slow-indexeddb.md).
- Learn about replication in [IndexedDB Sync](./indexeddb-sync.md).
- See the full picture in [IndexedDB Alternative](../indexeddb-alternative.md).
- Check the code on [GitHub](/code/) and leave a star ⭐ if RxDB helps you.
- Ask questions in the [community chat](/chat/).
