---
title: IndexedDB Query - How Querying Works, Indexes, and Limits
slug: indexeddb-query.html
description: Learn how an IndexedDB query works with key ranges and cursors, how the right index speeds it up, where it falls short, and how RxDB adds NoSQL queries.
image: /headers/indexeddb-query.jpg
---

import {Steps} from '@site/src/components/steps';
import {ComparisonTable} from '@site/src/components/comparison-table';
import {Faq, FaqItem} from '@site/src/components/faq';
import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_DATA_BROWSER, PERFORMANCE_METRICS } from '@site/src/components/performance-data';

# IndexedDB Query

An **IndexedDB query** is not a query in the sense you know from SQL or MongoDB. There is no query language, no `WHERE` clause, and no query planner that figures things out for you. [IndexedDB](../../rx-storage-indexeddb.md) gives you a primary key, a set of secondary indexes, and a way to walk one sorted range of one of them. Everything above that is JavaScript you write by hand.

This page explains how querying works in IndexedDB, how the right index changes the runtime of a query, how to implement a filtered, sorted, and paginated query with the raw API, where that approach stops working, and how [RxDB](https://rxdb.info/) puts a complete [NoSQL query engine](../../rx-query.md) on top of the same [browser storage](../browser-storage.md).

<RxdbLogo alt="IndexedDB query" />

## How Querying Works in IndexedDB

Every read in IndexedDB runs inside a transaction and goes through one of four operations.

- **`get(key)`** returns a single record by its key.
- **`getAll(range, count)`** returns every record inside a key range, with an optional limit.
- **`count(range)`** returns how many records fall into a range, without reading their data.
- **`openCursor(range, direction)`** walks the range one record at a time, so you can stop early or filter while you read.

Each of them exists on the object store, where the key is the primary key, and on an index, where the key is the indexed field, and each has a key-only variant (`getKey()`, `getAllKeys()`, `openKeyCursor()`) that returns keys without the record bodies. That is the entire query surface. If the [IndexedDB tutorial](./indexeddb-tutorial.md) taught you the API, this page is about what you can and cannot express with it.

### Keys and Key Ranges

Everything in IndexedDB is sorted by key, and a query is a slice of that sorted order. So the first thing to know is what is allowed to be a key.

A valid key is a string, a number that is not `NaN`, a `Date`, binary data (`ArrayBuffer` or a `TypedArray`), or an array of those values ([MDN: key characteristics](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology#key)). Booleans, `null`, `undefined`, and plain objects are not valid keys. As a primary key value one of them fails the write with a `DataError`. In an index it does not fail at all: the record is silently left out of the index, and no error is thrown.

Across types the sort order is fixed: numbers come first, then dates, then strings, then binary, then arrays. Strings are compared by their UTF-16 code units, so `'Z'` sorts before `'a'` and a case-insensitive lookup is not possible on a raw index.

A range is built with `IDBKeyRange`:

```js
IDBKeyRange.only('work');                  // category === 'work'
IDBKeyRange.lowerBound(18);                // age >= 18
IDBKeyRange.lowerBound(18, true);          // age > 18   (open bound)
IDBKeyRange.upperBound(65);                // age <= 65
IDBKeyRange.bound(18, 65, false, true);    // age >= 18 && age < 65
```

There is no range for "starts with". You build one from the sort order instead, by using the highest possible code unit as the upper bound:

```js
// every name that starts with 'foo'
const prefix = IDBKeyRange.bound('foo', 'foo\uffff');
```

This trick is the whole reason the key ordering rules are worth learning. Every query you write is an exercise in turning a condition into two bounds.

### Reading by the Primary Key

The primary key is the object store's own sort order, so it needs no index.

```js
const tx = db.transaction('todos', 'readonly');
const store = tx.objectStore('todos');

const one = store.get('todo1');
const many = store.getAll(IDBKeyRange.bound('todo1', 'todo9'));
```

### Reading Through a Secondary Index

To filter by any other field, you need an index on that field, created inside `onupgradeneeded`. The index is a second sorted list that maps the indexed value to the records that carry it.

```js
const index = store.index('category');

// all work todos
index.getAll(IDBKeyRange.only('work'));

// the first 20 work todos
index.getAll(IDBKeyRange.only('work'), 20);

// how many work todos exist, without reading any of them
index.count(IDBKeyRange.only('work'));
```

`getAll()` on an index resolves once with the full array. That is one round-trip between your code and the storage engine, which makes it the fastest way to read a known range.

### Walking a Range With a Cursor

A cursor is what you use when the result set is large, when you need to stop early, or when you have to filter on something the index does not cover.

```js
const request = store.index('category').openCursor(IDBKeyRange.only('work'), 'next');

request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) {
        return; // end of the range
    }
    console.log(cursor.value);   // the full record
    console.log(cursor.key);     // the index key
    console.log(cursor.primaryKey);
    cursor.continue();
};
```

A cursor has four directions:

- **`next`** walks the range in ascending key order, **`prev`** in descending order.
- **`nextunique`** and **`prevunique`** return only the first record per distinct index key. This is the closest thing IndexedDB has to a `DISTINCT`.

And three ways to move:

- **`cursor.continue()`** steps to the next entry.
- **`cursor.continue(key)`** jumps forward to a key.
- **`cursor.advance(n)`** skips `n` entries.

When you only need the keys, `openKeyCursor()` walks the same range without deserializing the record bodies.

### A Query Only Lives as Long as Its Transaction

Every read runs inside a transaction, and that transaction closes itself. There is no `commit()` to call. The browser marks it inactive as soon as control returns to the event loop, and commits it once its outstanding requests are done.

This makes a transaction a bad place to wait for anything that is not IndexedDB. The moment you await a `fetch`, a timer, or a Promise that resolves somewhere else, the transaction goes inactive, and the next read on it throws `TransactionInactiveError`.

```js
function promisify(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// wrong: the transaction is no longer active at the second read
const tx = db.transaction('todos', 'readonly');
const store = tx.objectStore('todos');

const first = await promisify(store.get('todo1'));
await fetch('/api/sync');                            // control leaves IndexedDB
const second = await promisify(store.get('todo2'));  // TransactionInactiveError
```

Queue every read you need first, then do the slow work once the transaction is gone.

```js
// right: both reads are placed before control leaves the transaction
const tx = db.transaction('todos', 'readonly');
const store = tx.objectStore('todos');

const [first, second] = await Promise.all([
    promisify(store.get('todo1')),
    promisify(store.get('todo2'))
]);

await fetch('/api/sync');
```

A cursor walk survives this because each `onsuccess` starts the next request synchronously, which keeps the transaction active. That is why the paging function further down calls `cursor.continue()` inside the handler and never after an `await`.

Two more rules follow from the same mechanism. Several `readonly` transactions over the same store can run at the same time, so concurrent reads do not queue behind each other. But a `readwrite` transaction on that store has to wait for them, so a long cursor walk delays every write to the store it holds.

### The Result Order Is the Index Order

There is no `sort` parameter anywhere in the API. Records come back in ascending order of the key that was used to read them, or in descending order when the cursor direction is `prev`. That is the only ordering you get for free.

Any other order means reading the full result set into memory and sorting it in JavaScript. For 50 records that is fine. For 50,000 it is the slowest part of your page.

## How the Right Index Speeds Up a Query

An index does one thing: it lets the browser seek straight to the start of a range and read forward, instead of touching every record in the store. The difference is not a constant factor, it is a different class of runtime.

### Without an Index, Every Query Is a Full Scan

This is the code most people write first, and it works until it does not.

```js
// getAll() without a range reads and deserializes EVERY record in the store
const request = store.getAll();

request.onsuccess = () => {
    const result = request.result
        .filter(todo => todo.category === 'work')
        .sort((a, b) => b.priority - a.priority);
};
```

With 200 todos nobody notices. With 200,000 todos the browser deserializes 200,000 objects, hands them to the main thread, and then sorts them there, to show ten rows. Add an index on `category` and the same query reads only the work todos.

### Put Equality Fields First and the Range Field Last

A compound index is created by passing an array as the key path, and its keys are compared element by element.

```js
store.createIndex('category_priority', ['category', 'priority']);
```

The order of the fields decides whether a query can be answered by one contiguous range or not. Take the query "work todos with a priority between 5 and 10".

With the index `['priority', 'category']` the first field is the range field, so the range has to cover every priority from 5 to 10 with every category in it. The browser reads all of those records, and your code throws away the ones from other categories.

With the index `['category', 'priority']` the same query is one slice:

```js
const range = IDBKeyRange.bound(['work', 5], ['work', 10]);
store.index('category_priority').getAll(range);
```

Nothing outside the result is read. The rule that follows from this holds for most databases, and RxDB's own [performance tips](../../nosql-performance-tips.md) apply it to Mango queries:

> Put the fields you compare with equality first, in any order among themselves, and put the one field you use for a range or for sorting last.

Fields that come after the first range field cannot narrow the range any further. They are still stored in the index, but only a full match on everything before them makes them useful.

One thing that surprises people: in a compound index, a record is only indexed when **every** field of the key path is present. A todo without a `priority` does not show up in a `['category', 'priority']` index at all, not even as a low value.

### Let the Index Do the Sorting

An index is a sorted list, so an index that matches your sort order removes the in-memory sort completely. The `['category', 'priority']` index above returns work todos already ordered by priority, ascending with `next` and descending with `prev`. No `Array.sort()` is needed, and you can stop reading as soon as you have enough records for the current page.

This is why sorting and filtering have to be designed together. An index that serves the filter but not the sort still forces you to read the whole result set.

### Read Only What You Need

Three operations avoid deserializing record bodies, and all three are much cheaper than fetching the documents:

- `index.count(range)` for "how many", for example to render a total next to a paginated list.
- `index.getAllKeys(range)` for the primary keys only.
- `index.openKeyCursor(range)` to walk keys without values.

### Read in Batches, Not Record by Record

A cursor that calls `continue()` per record pays the round-trip cost between the JavaScript thread and the storage engine once per record. `getAll()` pays it once for the whole batch. RxDB's [IndexedDB benchmarks](../../slow-indexeddb.md) measured this. The fix is a batched cursor: repeated `getAll()` calls with a key range that continues from the last record of the previous batch. The premium [IndexedDB RxStorage](../../rx-storage-indexeddb.md) uses it internally. The same benchmarks found that splitting a store into ten shards makes a batched cursor over an index about **43%** faster for a quarter of the dataset.

When you know you need every record of a range, do not set a batch size at all and call `getAll(range)` once.

### Indexes Are Not Free

Every index is a second copy of a field that the browser keeps in sync. So each index makes writes slower and takes disk space, which matters because the browser enforces a [storage quota](../indexeddb-max-storage-limit.md).

Worse, indexes can only be created inside `onupgradeneeded`. Adding one to a shipped app means bumping the database version, and the browser re-indexes every existing record inside the upgrade transaction, while the app waits. Index design is not something you can iterate on cheaply after release.

### Measure It, Do Not Guess

There is no `EXPLAIN` in IndexedDB. Nothing tells you which index a call used or how many records it touched, so the only way to know is to time both versions on a realistic dataset.

```js
async function timeQuery(label, run) {
    const start = performance.now();
    const result = await run();
    const ms = (performance.now() - start).toFixed(1);
    console.log(label + ': ' + ms + 'ms, ' + result.length + ' docs');
    return result;
}
```

Run it with the number of documents your heaviest user will have, not with the ten rows in your seed data.

## Running Queries in a Web Worker

IndexedDB is asynchronous, so reading from disk does not block the main thread. The JavaScript around the read does. Deserializing `50k` records, filtering them with `Array.filter()`, and ordering them with `Array.sort()` all run on the main thread, and while they run the page does not render, does not scroll, and does not answer input.

Moving that work into a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) removes the freeze. IndexedDB is available inside workers, so the whole query can live there and only the finished result crosses back.

```js
// query-worker.js
self.onmessage = async (event) => {
    const db = await openDatabase(); // the same indexedDB API, inside the worker
    const tx = db.transaction('todos', 'readonly');
    const index = tx.objectStore('todos').index('category');
    const request = index.getAll(IDBKeyRange.only(event.data.category));

    request.onsuccess = () => {
        // the expensive part runs on the worker thread, not on the main thread
        const page = request.result
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 20);
        self.postMessage(page);
    };
};
```

```js
// main thread
const worker = new Worker('/query-worker.js');

worker.onmessage = (event) => renderList(event.data);
worker.postMessage({ category: 'work' });
```

Notice that the result crosses the thread boundary by structured clone, which costs time proportional to how much you send. Sending `50k` documents back to the main thread moves the work instead of removing it. Return the page you render, not the result set you scanned.

A **SharedWorker** goes one step further. It is created once per origin instead of once per tab, so ten open tabs share one worker, one database connection, and one cache, rather than running the same query ten times. It works in Chrome, Firefox, and Safari 16 and later ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker)), and WebKit shipped it, removed it, and brought it back, so a fallback to a dedicated Worker is still worth keeping.

But there is no free lunch. A worker does not make a query faster, it changes what has to wait for it. RxDB's [storage benchmarks](../../rx-storage-performance.md) show the shape of the trade on the OPFS storage: time to first insert goes from `4ms` on the main thread to `27.2ms` in a worker, because the worker has to start and open the database there, while `find-by-query` stays at about `21ms` either way.

So a worker pays off when queries are big enough to drop frames, and it costs you startup time when they are not.

RxDB ships this as a storage option instead of a rewrite. The [👑 Worker RxStorage](../../rx-storage-worker.md) and the [👑 SharedWorker RxStorage](../../rx-storage-shared-worker.md) run any RxStorage in a worker process, and your query code does not change.

## Code Sample: A Complex Query in Raw IndexedDB

Here is a query that a server-side database answers in one line: **the ten open todos in the category `work` with the highest priority, skipping the first ten**. Filter on two fields, sort descending on a third, skip, and limit.

<Steps>

### Store the Boolean as a Number

`done` is a boolean, and booleans are not valid IndexedDB keys, so the field cannot be indexed as it is. Store it as `0` or `1` and convert at the edges of your app.

```js
// { id: 'todo1', name: 'Write docs', category: 'work', done: 0, priority: 7 }
```

This is the first compromise, and it leaks into every piece of code that touches the record.

### Create the Compound Index

Two equality fields first, the sort field last. The version has to be raised so that `onupgradeneeded` runs again on an existing database.

```js
const request = indexedDB.open('todos-db', 2);

request.onupgradeneeded = (event) => {
    // inside a version change, the store is reached through the transaction
    const store = event.target.transaction.objectStore('todos');
    store.createIndex(
        'category_done_priority',
        ['category', 'done', 'priority']
    );
};
```

### Build the Key Range

The range has to cover every priority for one `[category, done]` pair. Arrays sort after every other key type, so `['work', 0, []]` is greater than `['work', 0, <any number>]` and makes a clean upper bound.

```js
const range = IDBKeyRange.bound(
    ['work', 0],
    ['work', 0, []]
);
```

### Walk the Range Backwards and Page It

The cursor direction `prev` gives the descending sort, `advance()` does the skip, and counting the pushed records does the limit.

```js
function findTodoPage(db, { category, done, skip, limit }) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('todos', 'readonly');
        const index = tx.objectStore('todos').index('category_done_priority');
        const range = IDBKeyRange.bound([category, done], [category, done, []]);

        const result = [];
        let skipped = skip === 0;
        // 'prev' walks the index backwards, so the highest priority comes first
        const cursorRequest = index.openCursor(range, 'prev');

        cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) {
                resolve(result); // reached the end of the range
                return;
            }
            if (skipped === false) {
                skipped = true;
                cursor.advance(skip);
                return;
            }
            result.push(cursor.value);
            if (result.length === limit) {
                resolve(result); // the page is full, stop reading
                return;
            }
            cursor.continue();
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);
    });
}

const page = await findTodoPage(db, {
    category: 'work',
    done: 0,
    skip: 10,
    limit: 10
});
```

</Steps>

That is about forty lines, one hand-written index, one boolean stored as a number, and one key-range trick, for a single query. Now count the queries in your app.

And it only stays this short because every condition happens to fit the index. The moment the requirements move, so does the code:

- **One more filter** on a field that is not in the index means a manual `if` inside `onsuccess`, and the `limit` no longer tells you when to stop reading.
- **A different sort**, for example by `name` ascending, needs a different compound index, or a full read plus an in-memory sort.
- **An `$or` condition** means running the whole function once per branch and merging the results by primary key, in the right order.
- **A total count** for "showing 10 of 143" is a second request with `index.count(range)`.
- **A changed index** means a version bump and a re-index of the whole store on the user's device.

## The Limits of IndexedDB Querying

The API is not incomplete by accident. IndexedDB was specified as a low-level storage primitive that libraries build on, and these are the edges you meet when you use it directly.

- **No query language.** Conditions are key ranges, not expressions. There is no way to describe a query as data, so queries cannot be composed, stored, or sent over the wire.
- **One index per read.** IndexedDB never intersects two indexes. A query that filters on two unrelated fields uses one of them and checks the rest in JavaScript.
- **No `$or`.** Each branch is its own request, and merging plus deduplicating them by primary key is your code.
- **Sorting only by an index.** Any sort order that no index provides means loading the full result set into memory first.
- **Skipping is walking.** `advance(n)` still moves through `n` index entries, so deep pagination gets slower the further the user goes.
- **Booleans, `null`, and `undefined` cannot be indexed.** Records holding them are dropped from the index without an error.
- **Compound indexes need every field.** A record missing one field of the key path is not indexed at all.
- **No substring, no case-insensitive, no full text.** Only prefix ranges work. Anything else is a full scan or a token index you maintain yourself.
- **No aggregation beyond `count()`.** There is no sum, no average, and no group by.
- **No joins.** Relations across object stores are resolved by hand, as described in [IndexedDB relationships](./indexeddb-relationships.md).
- **No `EXPLAIN` and no statistics.** Nothing reports which index was used or how many records were read.
- **No reactivity.** A query returns a snapshot. When a write changes the result, nothing tells you, so keeping a UI in sync is an event bus you write and call from every write path.

None of this makes IndexedDB a bad storage engine. It is a solid transactional place to keep data on disk in the browser. The trouble starts when you expect it to answer questions about that data, because answering questions is not what it does.

## How RxDB Solves This With Full NoSQL Queries

RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript applications. It runs in the browser, Node.js, Electron, React Native, Capacitor, Deno, and Bun, and it stores its data through a pluggable [RxStorage](../../rx-storage.md) layer. In the browser that storage can be IndexedDB, through the free [Dexie.js RxStorage](../../rx-storage-dexie.md) or the faster [👑 premium IndexedDB RxStorage](../../rx-storage-indexeddb.md). Your data still lands in IndexedDB. What changes is everything above it.

### 1. Mango Queries Instead of Key Ranges

The forty-line paging function from above is this:

```ts
const page = await db.todos.find({
    selector: {
        category: { $eq: 'work' },
        done: { $eq: false }
    },
    sort: [{ priority: 'desc' }],
    skip: 10,
    limit: 10
}).exec();
```

Filter, sort, skip, and limit in one object. `done` stays a real boolean. [MongoDB-style (Mango) queries](../../rx-query.md) support `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$regex`, `$exists`, `$type`, `$size`, `$mod`, `$elemMatch`, `$and`, `$or`, `$nor`, and `$not`. A query is a plain JSON object, so you can build it at runtime, store it, and send it over the wire.

### 2. Indexes Live in the Schema

Indexes are declared once in the [RxSchema](../../rx-schema.md), next to the fields they cover. There is no `onupgradeneeded`, and the field type rules that IndexedDB enforces at runtime are checked when the collection is created.

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
                id: { type: 'string', maxLength: 100 },
                name: { type: 'string' },
                category: { type: 'string', maxLength: 50 },
                done: { type: 'boolean' },
                priority: {
                    // number fields in an index need minimum, maximum and multipleOf
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    multipleOf: 1
                }
            },
            required: ['id', 'name', 'category', 'done', 'priority'],
            indexes: [
                ['category', 'done', 'priority']
            ]
        }
    }
});
```

:::note
RxDB indexes `string`, `integer`, and `number` fields, and `boolean` fields on the storages that support them. A boolean used in an index has to be listed in `required`. On a storage without boolean index support, index `['category', 'priority']` instead and let the query matcher handle `done`. See [Indexes](../../rx-schema.md#indexes).
:::

Schema validation also closes the other gap: a write that does not match the schema is rejected, so a malformed record never reaches the index in the first place.

### 3. A Query Planner Picks the Index, and You Can Override It

RxDB sends every query to a query planner that turns the selector into an index range, the same way you would by hand, and picks the index for it. When you know your data better than the planner does, you pin the index on the query:

```ts
const query = db.todos.find({
    selector: {
        category: { $eq: 'work' },
        priority: { $gt: 5 }
    },
    // 20% of todos are 'work', but 80% have a priority above 5,
    // so starting the index range on 'category' reads fewer records
    index: ['category', 'priority']
});
```

For picking that index from measurements instead of intuition, the premium [Query Optimizer](../../query-optimizer.md) runs your real queries against your real schema at build time and reports which index is fastest.

### 4. Query Results Are Reactive

Every RxQuery has an observable. You subscribe once, and it emits a new result whenever a write changes the result set, including writes from another browser tab or from [syncing IndexedDB with a backend](./indexeddb-sync.md).

```ts
db.todos.find({
    selector: { done: { $eq: false } },
    sort: [{ priority: 'desc' }],
    limit: 10
}).$.subscribe(topTodos => {
    // runs again on every change that affects this query
    renderList(topTodos);
});
```

Re-running the full query on every write would be slow, so RxDB uses the [EventReduce algorithm](https://github.com/pubkey/event-reduce) to calculate the new result from the previous one and the change event, without going to the storage at all in most cases.

### 5. Counting, Relations, and Full Text

The operations IndexedDB leaves to you are ordinary API calls:

```ts
// a count query never fetches document data
const total = await db.todos.count({
    selector: { category: { $eq: 'work' } }
}).exec();
```

Relations are resolved from the schema with [population](../../population.md), and text search beyond prefix ranges is covered by the [full-text search plugin](../../fulltext-search.md).

### 6. The Same Query Runs on Every Storage

A Mango query is written against RxDB, not against IndexedDB. The same query runs on [OPFS](../../rx-storage-opfs.md), [SQLite](../../rx-storage-sqlite.md), [localStorage](../../rx-storage-localstorage.md), or the [memory storage](../../rx-storage-memory.md) in your unit tests. Switching storages is a configuration change, not a rewrite.

## Query Performance Across Storages

Changing the storage moves query performance more than any index tweak, so RxDB measures every storage with the same benchmark. The chart below shows the read-side metrics for the browser storages over a dataset of `3000` documents (lower is better).

<PerformanceChart
    title="Browser Storage Query Performance"
    data={PERFORMANCE_DATA_BROWSER}
    metrics={PERFORMANCE_METRICS}
    skipMetrics={['time-to-first-insert', 'insert-documents-500', 'serial-inserts-50']}
/>

Two things are worth reading off it. Fetching all `3000` documents with a single query takes about **58.7ms** on the IndexedDB storage and about **21.2ms** on OPFS, so the storage sets the floor that no index can get you under. And counting stays cheap everywhere: four `count()` runs over the same `3000` documents cost about **18.5ms** on IndexedDB, against **58.7ms** for one query that fetches them. That is the same effect as the raw `index.count(range)` further up, and it is why a count query is the right tool when you only need a number.

The metric definitions, the methodology, and the numbers for Node.js and server storages are on the [storage performance](../../rx-storage-performance.md) page.

## Comparison Table

<ComparisonTable>

| Feature | Native IndexedDB | RxDB |
| --- | --- | --- |
| Query language | ❌ key ranges only | ✅ Mango selector |
| Filter on multiple fields | ⚠️ one index, rest in JS | ✅ |
| `$or` queries | ❌ manual merge | ✅ |
| `$regex` and substring | ❌ prefix ranges only | ✅ |
| Sort by any field | ⚠️ index order only | ✅ `sort` |
| `skip` and `limit` | ⚠️ manual cursor | ✅ |
| Count query | ✅ `count()` | ✅ `count()` |
| Index on a boolean field | ❌ not a valid key | ⚠️ storage dependent |
| Index on a nested field | ✅ dotted key path | ✅ |
| Index chosen automatically | ❌ | ✅ query planner |
| Add an index after release | ⚠️ version bump, full re-index | ✅ schema change |
| Joins across stores | ❌ | ✅ `populate()` |
| Reactive results | ❌ | ✅ RxJS observable |
| Schema validation | ❌ | ✅ |

</ComparisonTable>

## FAQ

<Faq>
<FaqItem question="How do I query data in IndexedDB?">

You open a transaction, get the object store or one of its indexes, and read a key range from it with `get()`, `getAll()`, `count()`, or `openCursor()`. There is no query language, so every condition has to be expressed as an `IDBKeyRange` with a lower and an upper bound. Anything the range cannot express is filtered in JavaScript after the read.

</FaqItem>
<FaqItem question="Can you query IndexedDB without an index?">

Yes, but only by primary key or with a full scan. Without an index the only way to filter on a field is `store.getAll()` followed by `Array.filter()`, which deserializes every record in the store. That is fine for a few hundred records and a problem at tens of thousands.

</FaqItem>
<FaqItem question="How do I query multiple fields in IndexedDB?">

Create a compound index with an array key path, for example `store.createIndex('category_priority', ['category', 'priority'])`, and build a range over the array keys. The field order matters: equality fields first, the range or sort field last. IndexedDB never combines two separate indexes, so any condition outside the one index you used has to be checked in JavaScript.

</FaqItem>
<FaqItem question="How do I sort IndexedDB query results?">

By reading them through an index that is already sorted the way you want. The cursor direction `next` gives ascending order and `prev` gives descending order, and there is no `sort` option anywhere in the API. Any other order means loading the full result set and sorting it in memory. **[RxDB](../../rx-query.md)** takes a `sort` parameter and maps it to the index for you.

</FaqItem>
<FaqItem question="How do I paginate IndexedDB results?">

Open a cursor over the range, call `cursor.advance(skip)` once to jump over the first page, then collect records until you reach the page size and stop. `advance()` still walks the skipped index entries, so deep pages get slower. Keyset pagination, where you continue from the last key of the previous page with `cursor.continue(key)`, stays fast at any depth.

</FaqItem>
<FaqItem question="Why is my IndexedDB query slow?">

Most often because it reads more records than it returns. The three usual causes are a missing index that turns the query into a full scan, a compound index whose field order forces a wide range, and a cursor that calls `continue()` per record instead of reading a batch with `getAll()`. Transaction overhead is the other half of the story, measured in [why IndexedDB is slow](../../slow-indexeddb.md).

</FaqItem>
<FaqItem question="Can I index a boolean field in IndexedDB?">

No. Valid IndexedDB keys are strings, numbers, dates, binary data, and arrays of those. A boolean is not a valid key, and a record with a boolean in an indexed field is left out of the index without an error. The common workaround is to store `0` and `1` instead.

</FaqItem>
<FaqItem question="Does IndexedDB support LIKE or full text search?">

No. The only string matching an index supports is a prefix range, built as `IDBKeyRange.bound('foo', 'foo\uffff')`. Substring matching, case-insensitive matching, and full text search need a full scan or a token index that you maintain on every write. RxDB ships a [full-text search plugin](../../fulltext-search.md) for this.

</FaqItem>
<FaqItem question="How do I add an index to an existing IndexedDB database?">

Raise the version number in `indexedDB.open(name, version)` and call `createIndex()` inside `onupgradeneeded`, reaching the store through `event.target.transaction.objectStore(name)`. The browser then re-indexes every existing record inside the upgrade transaction, so the app waits while it runs. Indexes cannot be created at any other point in time.

</FaqItem>
<FaqItem question="How does RxDB query IndexedDB?">

RxDB takes a [Mango query](../../rx-query.md), runs it through a query planner that turns the selector into an index range, and hands that range to the [RxStorage](../../rx-storage.md), which reads only that slice out of IndexedDB. Conditions the index cannot cover are applied by a query matcher on the results. You write the query, RxDB writes the key ranges.

</FaqItem>
</Faq>

## Follow Up

- Learn the raw API first in the [IndexedDB tutorial](./indexeddb-tutorial.md)
- Understand [why IndexedDB is slow](../../slow-indexeddb.md) and which optimizations help
- Read the [RxQuery documentation](../../rx-query.md) for the full Mango syntax
- Apply the [NoSQL performance tips](../../nosql-performance-tips.md) to your own queries
- Model relations with [IndexedDB relationships](./indexeddb-relationships.md)
- Compare the [best IndexedDB wrappers](./best-indexeddb-wrapper.md)
- Start building with the [RxDB Quickstart](../../quickstart.md)
- Check the code on [GitHub](/code/) and leave a star ⭐ if RxDB helps you
- Ask questions in the [community chat](/chat/)
