---
title: RxDB as a MongoDB Realm Alternative After Atlas Device Sync Deprecation
slug: mongodb-realm-alternative.html
description: Replace MongoDB Realm and Atlas Device SDK with RxDB, a JavaScript local-first database with offline support, reactive queries, and flexible replication.
---

# RxDB as a MongoDB Realm Alternative After Atlas Device Sync Deprecation

Teams that built mobile and web applications on top of [MongoDB Realm](https://www.mongodb.com/docs/realm/) and the Atlas Device SDKs are now in a difficult position. In September 2024, MongoDB announced the deprecation of the Atlas Device SDKs and Atlas Device Sync, with end of life targeted for September 2025. Applications that still rely on Realm for client storage and bidirectional sync need a JavaScript friendly replacement that does not lock the project to a single cloud vendor and that will keep receiving updates well past 2025.

This page explains why [RxDB](https://rxdb.info/) is a strong replacement for Realm in JavaScript, TypeScript, [React Native](../../react-native-database.md), [Electron](../../electron-database.md), and browser environments. It covers the history of Realm, the technical shortcomings that existed even before the deprecation announcement, the features RxDB provides today, code samples for schema definition and replication to a MongoDB-backed HTTP endpoint, and practical migration notes.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="RxDB - JavaScript Database" width="220" />
    </a>
</center>

## A short history of Realm

Realm started in 2014 as a mobile database for Android and iOS, evolving from an earlier project called TightDB. It was positioned as a replacement for SQLite but the storage model resembled an object store more than a relational database. Realm Mobile Platform later added bidirectional sync between devices and a self-hostable server. Bindings for additional languages followed, including JavaScript through `realm-js` for Node.js and React Native.

In 2019 MongoDB acquired Realm and folded it into the MongoDB Atlas product line. The local database engine and the sync layer were rebranded as the Atlas Device SDKs and Atlas Device Sync, and the focus shifted toward replication against MongoDB Atlas in the cloud. Self-hosting the sync server stopped being a supported path. In September 2024, MongoDB published the deprecation notice for the Atlas Device SDKs and Atlas Device Sync. New project sign ups were closed, and existing customers were given until September 2025 before end of life.

For JavaScript teams this timeline is short. Migrating client storage, replication, and conflict handling without losing data takes planning, which is why choosing a long term alternative now matters.

## What is RxDB?

RxDB is a [local-first](../../articles/local-first-future.md) JavaScript database that stores data on the client and replicates it to any backend. It runs in the browser, Node.js, [Electron](../../electron-database.md), [React Native](../../react-native-database.md), Capacitor, Deno, and Bun. Data is organized into [collections](../../rx-collection.md) with a JSON [schema](../../rx-schema.md), queried with a MongoDB style [query language](../../rx-query.md), and observed through [RxJS observables](../../reactivity.md). Replication is pluggable: there are adapters for HTTP, GraphQL, WebRTC, CouchDB, Firestore, Supabase, NATS, and more. The storage layer is pluggable as well, so the same codebase can use IndexedDB, OPFS, SQLite, Memory, or a custom engine.

Unlike Realm, RxDB is written in TypeScript and ships as plain JavaScript. There are no per platform native bindings to maintain, and the same query and replication code works on every supported runtime.

## Realm shortcomings before the deprecation

The deprecation is the most pressing reason to migrate, but Realm had structural limitations long before the 2024 announcement.

- **Tight coupling to Atlas**: Atlas Device Sync only synced against MongoDB Atlas. Self hosted MongoDB clusters were not a supported sync target, which forced teams onto a single managed cloud service.
- **Limited query expressiveness in JavaScript**: The Realm query language in `realm-js` is a string based filter syntax with a smaller set of operators than the MongoDB query language. Aggregations, joins across collections, and complex nested filters often required client side post processing.
- **Native bindings on every platform**: Realm uses a C++ core with platform specific bindings. Upgrading React Native versions, Electron versions, or switching to a new architecture like Hermes or the new React Native architecture frequently broke the binding and required waiting for an upstream release.
- **License and vendor lock in**: While the SDKs are open source, the sync server and conflict resolution logic live inside MongoDB Atlas. Migrating away from Atlas meant rebuilding sync from scratch.
- **Schema migrations**: Schema changes in Realm required writing imperative migration functions in every client release, with limited tooling for testing migrations against production data.

## RxDB advantages for former Realm users

RxDB addresses each of the points above.

- **Pure JavaScript**: RxDB has no native bindings of its own. Storage adapters wrap the platform's existing engine, for example IndexedDB in the browser or `op-sqlite` on React Native, and the rest of the database is plain JS that runs anywhere.
- **Bring your own backend**: RxDB does not require any specific server. The [HTTP replication](../../replication-http.md) plugin replicates to any REST style endpoint, including one that writes to MongoDB on the server side. There are also plugins for [GraphQL](../../replication-graphql.md), WebRTC, CouchDB, Firestore, and Supabase. See the [replication overview](../../replication.md) for the full list.
- **MongoDB style queries**: Queries use the familiar `$gt`, `$in`, `$regex`, `$elemMatch` operators documented under [RxQuery](../../rx-query.md). Developers coming from MongoDB or Mongoose feel at home.
- **Observable queries**: Every query and document exposes an RxJS observable. UI code subscribes once and receives updates whenever the underlying data changes, on this tab or on another tab. This replaces Realm's change listeners with a standard reactive primitive. See [reactivity](../../reactivity.md).
- **Multi tab support**: RxDB coordinates writes across browser tabs through a leader election. A query opened in tab A reflects writes performed in tab B without manual wiring.
- **Encryption**: The [encryption plugin](../../encryption.md) encrypts field values at rest using AES, with a password derived key. Realm offered file level encryption, RxDB lets you choose which fields to encrypt.
- **Conflict resolution**: Replication conflicts are resolved through a user supplied handler. The default last write wins handler is provided, and custom merge logic can be plugged in. See [transactions, conflicts, and revisions](../../transactions-conflicts-revisions.md).
- **Offline first**: Reads and writes always go to the local store first and replication runs in the background. This is the same model Realm used and the same model that makes [offline first](../../offline-first.md) apps feel fast.

## Code sample: schema and reactive query

The following snippet defines a `todos` collection and subscribes to a reactive query. Compare this to the Realm equivalent that requires a Realm class definition and a synchronous `realm.objects(...)` call wrapped in a change listener.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const db = await createRxDatabase({
    name: 'tasksdb',
    storage: getRxStorageDexie()
});

await db.addCollections({
    todos: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 64 },
                title: { type: 'string' },
                done: { type: 'boolean' },
                createdAt: { type: 'number' }
            },
            required: ['id', 'title', 'done', 'createdAt']
        }
    }
});

// Reactive query, emits whenever matching documents change.
const openTodos$ = db.todos.find({
    selector: { done: false },
    sort: [{ createdAt: 'desc' }]
}).$;

openTodos$.subscribe(todos => {
    console.log('open todos:', todos.map(t => t.title));
});

await db.todos.insert({
    id: 't1',
    title: 'Replace Realm with RxDB',
    done: false,
    createdAt: Date.now()
});
```

## Code sample: replicating to a MongoDB-backed HTTP endpoint

RxDB does not talk to MongoDB directly from the client, which is the right architectural choice because the database driver belongs on the server. Instead the [HTTP replication plugin](../../replication-http.md) calls REST endpoints that read from and write to MongoDB on the server. The endpoints follow the pull and push pattern documented in the [replication](../../replication.md) guide.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    collection: db.todos,
    replicationIdentifier: 'todos-mongo-http',
    live: true,
    pull: {
        async handler(checkpointOrNull, batchSize) {
            const updatedAt = checkpointOrNull?.updatedAt ?? 0;
            const id = checkpointOrNull?.id ?? '';
            const response = await fetch(
                `/api/todos/pull?updatedAt=${updatedAt}&id=${id}&limit=${batchSize}`
            );
            const data = await response.json();
            return {
                documents: data.documents,
                checkpoint: data.checkpoint
            };
        }
    },
    push: {
        async handler(changeRows) {
            const response = await fetch('/api/todos/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changeRows)
            });
            const conflicts = await response.json();
            return conflicts;
        }
    }
});

replicationState.error$.subscribe(err => console.error('replication error', err));
```

On the server side, `/api/todos/pull` runs a MongoDB `find({ updatedAt: { $gte: ... } })` sorted by `updatedAt` and `id`, and `/api/todos/push` performs a conditional update keyed on the document revision. This pattern preserves the Atlas Device Sync developer experience without depending on Atlas.

## Migration notes from Realm to RxDB

A migration from Realm typically follows these steps.

1. **Map Realm classes to RxDB schemas**. Each Realm object schema becomes a JSON schema under an [RxCollection](../../rx-collection.md). Relationship properties map to references by primary key, and embedded objects map to nested object types in the schema.
2. **Export existing data**. Use the Realm SDK to read every object of every type and write them as JSON. This is a one off script that runs on app start during the transition release.
3. **Bulk insert into RxDB**. Use `collection.bulkInsert(docs)` on first launch after the migration release. Mark the migration as complete in `localStorage` so it only runs once.
4. **Replace Realm queries**. Realm's filter strings translate to RxDB selectors. For example `realm.objects('Todo').filtered('done == false SORT(createdAt DESC)')` becomes `db.todos.find({ selector: { done: false }, sort: [{ createdAt: 'desc' }] })`.
5. **Replace change listeners with observables**. `collection.addListener` becomes `query.$.subscribe`. Most UI frameworks already integrate with RxJS or with hooks like `useRxQuery`.
6. **Wire up replication**. Stand up the pull and push HTTP endpoints against MongoDB or any other server. Roll out the new client and disable Atlas Device Sync once devices have synced their final state.

A staged rollout where both databases run side by side for one release is the safest path. RxDB writes the authoritative copy, Realm stays read only, and the next release removes Realm.

## FAQ

<details>
<summary>Is MongoDB Realm being deprecated?</summary>

Yes. In September 2024 MongoDB announced the deprecation of the Atlas Device SDKs and Atlas Device Sync. End of life is targeted for September 2025, and new project sign ups have already been closed. Existing apps will continue to function until EOL, after which the service will be shut down.

</details>

<details>
<summary>Can RxDB still talk to MongoDB?</summary>

Yes, through a server side adapter. The RxDB client uses the [HTTP replication plugin](../../replication-http.md) to call REST endpoints, and those endpoints read from and write to MongoDB on the server. Direct client to MongoDB connections are not supported, which is the correct security boundary for any production app.

</details>

<details>
<summary>How do I migrate Realm objects to RxDB?</summary>

Define an [RxSchema](../../rx-schema.md) for each Realm class, export every Realm object to JSON on app launch, and call `collection.bulkInsert(docs)` to load them into RxDB. Track migration completion in persistent storage so the import runs exactly once per device.

</details>

<details>
<summary>Does RxDB run on React Native?</summary>

Yes. RxDB has first class support for [React Native](../../react-native-database.md) using the SQLite or memory storage adapters. The same schema and query code runs in the browser, in Node.js, in Electron, and on React Native without modification.

</details>

<details>
<summary>Is RxDB free for commercial use?</summary>

The RxDB core is open source under the Apache 2.0 license and free for commercial use. There is also a Premium offering with extra storage adapters, encryption modes, and performance plugins. The free core is sufficient for most applications.

</details>

## Comparison table

| Feature | MongoDB Realm / Atlas Device SDK | RxDB |
| --- | --- | --- |
| Status | Deprecated, EOL September 2025 | Active, regular releases |
| Implementation | C++ core with native bindings per platform | Pure TypeScript, no native bindings |
| Backend | MongoDB Atlas only | Any HTTP, GraphQL, WebRTC, CouchDB, Firestore, Supabase, custom |
| Query language | Realm filter strings | MongoDB style selectors with `$gt`, `$in`, `$regex`, `$elemMatch` |
| Reactive queries | Change listeners | RxJS observables |
| Multi tab | Limited in browser | Built in leader election |
| Encryption | File level | Per field with AES |
| Schema migrations | Imperative migration callbacks | Declarative migration strategies per schema version |
| Offline first | Yes | Yes |
| React Native | Yes through native binding | Yes through SQLite or memory adapter |
| Browser | Limited via WebAssembly | First class through IndexedDB, OPFS, Memory |
| License | Apache 2.0 SDK, proprietary sync | Apache 2.0 core, optional Premium add-ons |
| Self hosting | Not supported | Fully supported |

For teams currently running on Realm, the EOL date in September 2025 is firm. Starting the migration to RxDB now leaves time for a staged rollout, a tested HTTP replication layer against MongoDB, and a clean removal of the Atlas Device SDK before support ends.
