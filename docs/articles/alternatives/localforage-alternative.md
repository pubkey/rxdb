# RxDB as a localForage Alternative for Real Database Features

> Outgrowing localForage? RxDB adds schemas, indexed queries, reactive subscriptions, multi-tab sync, and replication on top of IndexedDB and OPFS.

# RxDB as a localForage Alternative for Real Database Features

[localForage](https://localforage.github.io/localForage/) gives JavaScript developers a clean promise based wrapper around browser storage. It is a thin key-value layer that picks the best available backend, usually IndexedDB, with fallbacks to WebSQL or localStorage. Teams reach for it when they want a simple `setItem` and `getItem` API that works across browsers without writing IndexedDB transaction code by hand.

The trouble starts when an app grows past simple caching. As soon as you need indexed queries, schema validation, change subscriptions, replication with a backend, or coordination across browser tabs, you end up rebuilding most of a database on top of localForage. That is when [RxDB](https://rxdb.info/) becomes a better fit.

<center>
    
        
    
</center>

## A Short History of localForage

localForage was started around 2014 by developers at Mozilla as part of efforts to make offline web apps more practical. The motivation was straightforward: IndexedDB had a verbose, event based API, WebSQL was deprecated in some browsers, and localStorage was synchronous and capped at a few megabytes. localForage hid those differences behind a single API modeled on `localStorage`.

The library settled into a stable shape early. Recent commit activity on the main repository has been low, and the feature set has stayed close to its original scope: get, set, remove, clear, keys, length, and a few iteration helpers. It does what it set out to do, and nothing more.

That focus is the point. localForage is a storage compatibility layer, not a database. When the requirements list grows beyond key-value reads and writes, the gap between what localForage offers and what an application needs widens.

## What RxDB Is

RxDB is a [local-first](../../articles/local-first-future.md), NoSQL database that runs inside JavaScript runtimes. It stores documents in [collections](../../rx-collection.md), validates them against a schema, runs MongoDB style [queries](../../rx-query.md) with indexes, and emits changes through RxJS observables. RxDB sits on top of a pluggable storage layer, so the same database code can run on [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [Dexie](../../rx-storage-dexie.md), in memory, in Node.js, in React Native, or in Electron.

On top of local storage, RxDB ships a [replication protocol](../../replication.md) that syncs collections with any backend that can speak HTTP, GraphQL, WebRTC, CouchDB, or Firestore. Reads stay local and fast, while writes flow to the server in the background.

## Where localForage Stops

The places where localForage runs out of road are predictable once you list them:

- **Key-value only.** Every value is opaque to the library. There is no notion of fields, types, or relationships.
- **No indexes.** You cannot ask for "all todos where `done = false` and `dueDate < tomorrow`". You either keep your own index keys by hand or scan all entries.
- **No queries.** There is no query language, no filtering, no sorting, no pagination beyond what you build yourself.
- **No schema.** Data shape drifts over time and migrations become custom scripts.
- **No reactivity.** When a value changes, other parts of the app do not find out unless you wire your own event bus on top.
- **No multi-tab coordination.** Two tabs writing to the same key can clobber each other without warning.
- **No replication.** Syncing with a server is left entirely to the application.
- **Limited debugging.** There are no dev tools that understand collections, queries, or change streams because those concepts do not exist in the library.

For a cache of avatars or a saved form draft, none of this matters. For an app that wants to feel like a product with offline support, all of it matters.

## What RxDB Adds On Top

RxDB treats the browser like a real database environment.

- **Documents and collections.** Data is stored in typed [collections](../../rx-collection.md) with a JSON schema that validates every write.
- **Indexed queries.** Define indexes in the schema and run [MongoDB style queries](../../rx-query.md) such as `find`, `findOne`, `where`, `gt`, `in`, `sort`, `skip`, and `limit`.
- **Reactive results.** Every query returns an [observable](../../reactivity.md) that re-emits when matching documents change, so UI components stay in sync without manual refetching.
- **Multi-tab.** Open the same app in three tabs and they share one database state, with leader election and cross-tab change propagation handled by RxDB.
- **Replication primitives.** A [pull/push checkpoint protocol](../../replication.md) keeps local data in sync with any backend you choose, including custom REST APIs.
- **Storage choice.** Swap [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [Dexie](../../rx-storage-dexie.md), memory, or a server side storage without changing application code.
- **Conflict handling.** Each document carries a revision, and a custom conflict handler decides how concurrent edits merge.

## Code Sample: Reading a Single Record

A typical localForage read by key:

```ts
import localforage from 'localforage';

const todo = await localforage.getItem<Todo>('todo-42');
if (todo) {
    console.log(todo.title);
}
```

The same lookup in RxDB, by primary key, with a typed result and a schema validated value behind it:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    todos: {
        schema: {
            title: 'todo schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                title: { type: 'string' },
                done: { type: 'boolean' },
                dueDate: { type: 'string', format: 'date-time' }
            },
            required: ['id', 'title', 'done'],
            indexes: ['done', 'dueDate']
        }
    }
});

const todo = await db.todos.findOne('todo-42').exec();
console.log(todo?.title);
```

The RxDB version is longer at setup time, but the database now knows the shape of a todo, can index `done` and `dueDate`, and can stream changes to the rest of the app.

## Code Sample: Indexed Range Query With a Subscription

In localForage, finding open todos due before tomorrow means iterating every entry:

```ts
const openTodos: Todo[] = [];
await localforage.iterate<Todo, void>((value) => {
    if (!value.done && value.dueDate < tomorrow) {
        openTodos.push(value);
    }
});
```

The same query in RxDB uses the index and returns an observable that re-fires on every change:

```ts
const query = db.todos.find({
    selector: {
        done: false,
        dueDate: { $lt: tomorrow }
    },
    sort: [{ dueDate: 'asc' }]
});

const subscription = query.$.subscribe((openTodos) => {
    render(openTodos);
});
```

Insert a new todo, mark one as done, or sync a remote change in another tab, and the subscriber receives the new result set without writing extra code.

## Storage Layer Notes

localForage and RxDB both end up writing to similar browser primitives, but the way they use them differs.

- localForage selects one backend per database and stores opaque blobs at string keys.
- RxDB writes structured documents through a pluggable [storage interface](../../rx-storage-indexeddb.md). For modern browsers, the [OPFS storage](../../rx-storage-opfs.md) avoids many [IndexedDB performance issues](../../slow-indexeddb.md) by writing to the Origin Private File System. The [Dexie storage](../../rx-storage-dexie.md) is a thin layer over IndexedDB for cases where Dexie is already in use.

Because storages are swappable, the same RxDB schemas and queries run unchanged across these backends, including in Node.js or React Native where IndexedDB is not the right fit.

## FAQ

<details>
<summary>Should I use localForage or RxDB for caching?</summary>

For a flat cache of API responses keyed by URL, localForage is fine and has a smaller footprint. Reach for RxDB when the cache needs queries, indexes, expiry rules expressed as fields, change subscriptions for the UI, or replication back to a server. See the [reactivity guide](../../reactivity.md) for how observable queries replace manual cache invalidation.

</details>

<details>
<summary>Can RxDB replace localStorage?</summary>

Yes. RxDB ships a localStorage based [storage adapter](../../articles/localstorage.md) for small datasets, and IndexedDB or OPFS adapters for larger ones. Unlike raw localStorage, RxDB gives you schemas, queries, and async APIs that do not block the main thread.

</details>

<details>
<summary>Does RxDB handle multi-tab?</summary>

Yes. With `multiInstance: true`, RxDB coordinates across tabs of the same origin. Writes in one tab are visible to queries in other tabs, leader election picks one tab to run replication, and change events propagate over a BroadcastChannel.

</details>

<details>
<summary>How big can RxDB scale in IndexedDB?</summary>

RxDB has been used with hundreds of thousands of documents per collection in IndexedDB. For larger datasets or write heavy workloads, the [OPFS storage](../../rx-storage-opfs.md) sidesteps many of the [slow IndexedDB](../../slow-indexeddb.md) bottlenecks and keeps query latency low.

</details>

## Comparison Table

| Feature | localForage | RxDB |
| --- | --- | --- |
| Data model | Key-value blobs | Documents in collections |
| Schema validation | None | JSON Schema per collection |
| Queries | None, manual iteration | MongoDB style with indexes |
| Indexes | Not supported | Declared in schema |
| Reactivity | None | Observable queries and documents |
| Multi-tab sync | Not handled | Built in via BroadcastChannel |
| Replication | Not included | Pull/push protocol with many plugins |
| Conflict handling | Not applicable | Per document revisions and custom handlers |
| Storage backends | IndexedDB, WebSQL, localStorage | IndexedDB, OPFS, Dexie, memory, Node.js, React Native, more |
| Encryption | Not built in | Plugin available |
| Migrations | Manual | Schema versioning with migration strategies |
| Offline first | Storage only | Full [offline first](../../offline-first.md) stack |
| Active development | Low | Active |

## When to Pick Which

Choose localForage when the job is "store a few values in the browser without thinking about IndexedDB". It is small, well understood, and stays out of the way.

Choose RxDB when the app needs a real client side database: typed [collections](../../rx-collection.md), indexed [queries](../../rx-query.md), [reactive results](../../reactivity.md), [multi-tab](../../rx-storage-indexeddb.md) coordination, and [replication](../../replication.md) with a backend. RxDB takes more setup at first, then pays it back as features are added on top of the same data layer.

More resources:

- [RxDB Quickstart](../../quickstart.md)
- [RxDB Sync Engine](../../replication.md)
- [RxDB Storage Plugins](../../rx-storage-indexeddb.md)
- [Local First Future](../../articles/local-first-future.md)
