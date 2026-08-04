---
title: Realm to RxDB Migration Guide
slug: realm-to-rxdb-migration.html
description: Migrate a Realm application to RxDB step by step. Map object schemas to JSON schemas, translate Realm Query Language, move existing data and replace Atlas Device Sync with open replication.
image: /headers/realm-to-rxdb-migration.jpg
---

import {Steps} from '@site/src/components/steps';
import {Faq, FaqItem} from '@site/src/components/faq';

# Realm to RxDB Migration Guide

MongoDB deprecated the Atlas Device SDKs in September 2024 and shut down Atlas Device Sync in September 2025. Applications that still ship the Realm SDK run on an archived codebase without security fixes, new platform support or a working sync backend. This guide walks through a complete migration from [Realm](https://www.mongodb.com/docs/atlas/device-sdks/) (`realm` / `realm-js`) to [RxDB](https://rxdb.info/) for JavaScript, TypeScript and [React Native](../react-native-database.md) projects: schema translation, data export, query rewrites, reactivity and the replacement of Device Sync with [RxDB replication](../replication.md).

If you first want to understand why RxDB is the recommended replacement, read the [MongoDB Realm alternative](./alternatives/mongodb-realm-alternative.md) comparison. This page assumes the decision is made and focuses on the mechanical steps of the migration.

<RxdbLogo alt="RxDB - JavaScript Database" />

## How Realm concepts map to RxDB

Realm and RxDB follow the same local-first model: reads and writes go to a database on the device and synchronization runs in the background. The building blocks map one to one, which keeps the migration mechanical.

| Realm | RxDB |
| --- | --- |
| `Realm.open()` instance | [RxDatabase](../rx-database.md) |
| Object class with `static schema` | [RxCollection](../rx-collection.md) with a JSON [schema](../rx-schema.md) |
| Realm object | [RxDocument](../rx-document.md) |
| `primaryKey: '_id'` | `primaryKey` field in the JSON schema |
| `realm.objects('Todo').filtered('...')` | `db.todos.find({ selector: { ... } })` with [Mango queries](../rx-query.md) |
| `results.addListener(...)` | `query.$.subscribe(...)` [RxJS observable](../reactivity.md) |
| `realm.write(() => { ... })` | `insert()`, `bulkInsert()`, `incrementalPatch()`, `remove()` |
| Embedded objects (`embedded: true`) | Nested `type: 'object'` properties in the schema |
| Links and `linkingObjects` | References by primary key, resolved with [population](../population.md) |
| `schemaVersion` + `onMigration` callback | Schema `version` + [migration strategies](../migration-schema.md) |
| `encryptionKey` (file level) | [Encryption plugin](../encryption.md) (field level) |
| Atlas Device Sync | [Replication](../replication.md) to any backend (HTTP, GraphQL, CouchDB, Firestore, Supabase, WebRTC and more) |
| Flexible Sync subscriptions | Pull filtering and [partial sync](../partial-sync.md) |

Two architectural differences matter during the migration:

- Realm returns live, lazily loaded objects while RxDB returns immutable JSON documents wrapped in an [RxDocument](../rx-document.md). Code that mutates a Realm object inside a write transaction becomes an explicit document update call in RxDB.
- Realm couples storage to its own C++ engine. RxDB has a pluggable [storage layer](../rx-storage.md), so you pick IndexedDB or [LocalStorage](../rx-storage-localstorage.md) in the browser and [SQLite](../rx-storage-sqlite.md) on React Native, Capacitor or Electron, all with the same application code.

## Migration steps

<Steps>

### Install RxDB and pick a storage

```bash
npm install rxdb rxjs
```

Choose the [RxStorage](../rx-storage.md) that fits the runtime. In the browser start with [LocalStorage](../rx-storage-localstorage.md) or [Dexie.js](../rx-storage-dexie.md), on [React Native](../react-native-database.md) use the [SQLite storage](../rx-storage-sqlite.md). The storage is a parameter of the database, so switching later does not touch application code.

```ts
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';

// dev-mode adds readable errors and schema checks during development
addRxPlugin(RxDBDevModePlugin);

const db = await createRxDatabase({
    name: 'appdb',
    storage: getRxStorageLocalstorage()
});
```

### Translate the Realm object schemas

Each Realm object class becomes one collection with a JSON schema. Take this Realm model:

```ts
// Realm (before)
import Realm, { ObjectSchema } from 'realm';

class Todo extends Realm.Object<Todo> {
    _id!: Realm.BSON.ObjectId;
    title!: string;
    done!: boolean;
    priority!: number;
    createdAt!: Date;
    tags!: Realm.List<string>;

    static schema: ObjectSchema = {
        name: 'Todo',
        primaryKey: '_id',
        properties: {
            _id: 'objectId',
            title: 'string',
            done: { type: 'bool', default: false },
            priority: 'int',
            createdAt: 'date',
            tags: 'string[]'
        }
    };
}
```

The RxDB equivalent:

```ts
// RxDB (after)
await db.addCollections({
    todos: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                title: { type: 'string' },
                done: { type: 'boolean', default: false },
                priority: { type: 'number' },
                createdAt: {
                    type: 'number',
                    minimum: 0,
                    maximum: 9007199254740991,
                    multipleOf: 1
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' }
                }
            },
            required: ['id', 'title', 'done', 'priority', 'createdAt'],
            indexes: ['createdAt']
        }
    }
});
```

Type mapping rules:

- `objectId` becomes a `string`. Call `.toHexString()` during the data export. The primary key property needs a `maxLength`.
- `date` becomes a `number` (unix timestamp) or a `string` with `format: 'date-time'`. Numbers used in an index need `minimum`, `maximum` and `multipleOf`.
- `int`, `float` and `double` become `number`.
- `string[]`, `int[]` and other Realm lists of primitives become arrays with an `items` definition.
- Optional Realm properties (`'string?'`) stay out of the `required` array instead.
- Fields you queried with `SORT` or filtered on frequently belong in `indexes`.

Embedded Realm objects (`embedded: true`) become nested `type: 'object'` properties inside the same document. Links to other Realm classes become plain string fields that store the primary key of the target document, resolved at read time with the [population plugin](../population.md).

### Move the existing data

Ship one release where both databases are installed. On startup, the app reads the Realm file, writes the data into RxDB and records its progress so the import completes once per device. There are three ways to move the data:

1. **Export to JSON and insert as normal documents.** Read all Realm objects, map them to plain JSON and call `bulkInsert`. Simple, but if the app gets killed mid-import, the whole run starts over.
2. **Use the JSON dump plugin.** If you produce a dump in the RxDB dump format, the [json-dump plugin](../rx-collection.md#importjson) loads it in one call with `collection.importJSON(dump)`.
3. **Iterate over the Realm data with a checkpoint.** Import in batches and persist a checkpoint after each batch. This is the recommended approach because the import continues where it stopped when the app restarts at any point.

The checkpointed import looks like this:

```ts
const BATCH_SIZE = 500;
const CHECKPOINT_KEY = 'realm-import-checkpoint';

export async function migrateFromRealm(db: RxDatabase) {
    const realm = await Realm.open({ schema: [Todo] });
    // stable order, the Realm file is read only during the migration
    const all = realm.objects(Todo).sorted('_id');

    // continue where a previous run stopped
    let imported = parseInt(localStorage.getItem(CHECKPOINT_KEY) ?? '0', 10);

    while (imported < all.length) {
        const batch = all.slice(imported, imported + BATCH_SIZE).map(todo => ({
            id: todo._id.toHexString(),
            title: todo.title,
            done: todo.done,
            priority: todo.priority,
            createdAt: todo.createdAt.getTime(),
            tags: Array.from(todo.tags)
        }));
        // bulkUpsert is idempotent, re-importing a
        // half-written batch after a restart is safe
        await db.todos.bulkUpsert(batch);
        imported += batch.length;
        localStorage.setItem(CHECKPOINT_KEY, String(imported));
    }
    realm.close();
}
```

On React Native, store the checkpoint in the RxDB database itself with a [local document](../rx-local-document.md) instead of `localStorage`. After the import has shipped and your analytics show that active devices have run it, a follow-up release removes the `realm` dependency and deletes the Realm file with `Realm.deleteFile()`.

### Translate the queries

Realm Query Language filter strings become [Mango query](../rx-query.md) selectors, the same operator style used by MongoDB.

| Realm Query Language | RxDB selector |
| --- | --- |
| `done == false` | `{ done: false }` |
| `priority > 2` | `{ priority: { $gt: 2 } }` |
| `title BEGINSWITH 'Buy'` | `{ title: { $regex: '^Buy' } }` |
| `title CONTAINS[c] 'milk'` | `{ title: { $regex: 'milk', $options: 'i' } }` |
| `status IN {'open', 'active'}` | `{ status: { $in: ['open', 'active'] } }` |
| `done == false AND priority > 2` | `{ done: false, priority: { $gt: 2 } }` |
| `done == false OR priority > 2` | `{ $or: [{ done: false }, { priority: { $gt: 2 } }] }` |
| `ANY tags == 'work'` | `{ tags: { $elemMatch: { $eq: 'work' } } }` |

Sorting and limits move out of the filter string into query options:

```ts
// Realm (before)
const open = realm
    .objects(Todo)
    .filtered('done == false SORT(createdAt DESC) LIMIT(20)');

// RxDB (after)
const open = await db.todos.find({
    selector: { done: false },
    sort: [{ createdAt: 'desc' }],
    limit: 20
}).exec();
```

Point lookups by primary key use `findOne`:

```ts
const todo = await db.todos.findOne('66f2a1...').exec();
```

### Replace change listeners with observables

Realm collection and object listeners become RxJS subscriptions. Every RxDB query exposes a `$` observable that emits the current result set and every later change, across browser tabs as well.

```ts
// Realm (before)
const results = realm.objects(Todo).filtered('done == false');
results.addListener((collection, changes) => {
    renderList(Array.from(collection));
});

// RxDB (after)
const subscription = db.todos.find({
    selector: { done: false },
    sort: [{ createdAt: 'desc' }]
}).$.subscribe(todos => {
    renderList(todos);
});

// instead of results.removeListener(...)
subscription.unsubscribe();
```

Single object listeners map to `findOne(...).$` and field level updates map to `document.get$('fieldName')`. In React, the [RxDB hooks](../react.md) replace `@realm/react` providers like `useQuery` and `useObject`. Details on the reactive layer are in the [reactivity documentation](../reactivity.md).

### Replace write transactions

Realm requires every mutation to happen inside `realm.write()`. RxDB writes are single document operations that persist immediately.

```ts
// Realm (before)
realm.write(() => {
    realm.create(Todo, {
        _id: new Realm.BSON.ObjectId(),
        title: 'Migrate to RxDB',
        done: false,
        priority: 3,
        createdAt: new Date()
    });
});

// RxDB (after)
await db.todos.insert({
    id: crypto.randomUUID(),
    title: 'Migrate to RxDB',
    done: false,
    priority: 3,
    createdAt: Date.now()
});
```

Updates on a fetched object translate like this:

```ts
// Realm (before)
realm.write(() => {
    todo.done = true;
});

// RxDB (after)
await todo.incrementalPatch({ done: true });
```

`incrementalPatch` and `incrementalModify` handle concurrent writes to the same document without conflict errors. Deletes become `await todo.remove()`. Multi document batches use `bulkInsert`, `bulkUpsert` and `bulkRemove`. RxDB has no cross document transactions by design, the reasoning is explained in [transactions, conflicts and revisions](../transactions-conflicts-revisions.md).

### Replace Atlas Device Sync with replication

Device Sync only ever talked to MongoDB Atlas. RxDB replication is backend agnostic and follows the same offline-first pattern: local writes first, background sync with checkpoints and conflict handling.

Pick the replication plugin that matches your backend:

- [HTTP replication](../replication-http.md) against your own REST endpoints, including endpoints backed by a self hosted MongoDB.
- [GraphQL replication](../replication-graphql.md) for an existing GraphQL API.
- [CouchDB](../replication-couchdb.md), [Firestore](../replication-firestore.md), [Supabase](../replication-supabase.md), [Appwrite](../replication-appwrite.md), [NATS](../replication-nats.md) or [WebRTC peer to peer](../replication-webrtc.md).
- [RxServer](../rx-server.md) as a prebuilt Node.js sync server.

A minimal HTTP replication looks like this:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    collection: db.todos,
    replicationIdentifier: 'todos-api',
    live: true,
    pull: {
        async handler(checkpoint, batchSize) {
            const updatedAt = checkpoint ? checkpoint.updatedAt : 0;
            const response = await fetch(
                `/api/todos/pull?updatedAt=${updatedAt}&limit=${batchSize}`
            );
            return await response.json();
        }
    },
    push: {
        async handler(changeRows) {
            const response = await fetch('/api/todos/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changeRows)
            });
            return await response.json();
        }
    }
});

replicationState.error$.subscribe(err => console.error(err));
```

Realm's Flexible Sync subscriptions, which limited what a device downloads, map to filtered pull handlers or the [partial sync](../partial-sync.md) approach. Conflicts are resolved on the client through a [conflict handler](../transactions-conflicts-revisions.md), with last write wins as the default.

### Test and roll out in stages

1. Run the new RxDB code path behind a feature flag while Realm remains the authoritative store.
2. Ship the transition release that imports Realm data into RxDB on first launch and switches reads and writes to RxDB.
3. Monitor the import success rate and replication errors through `replicationState.error$`.
4. Ship the cleanup release that removes the `realm` dependency, deletes the Realm file and drops the migration code.

Keep the import code tolerant: a device that updated from a version older than the transition release must still find and export its Realm file.

</Steps>

## Schema changes after the migration

Realm required an `onMigration` callback for every schema change. In RxDB you bump the schema `version` and provide one [migration strategy](../migration-schema.md) per version step. RxDB runs the strategies on existing documents when the app starts with the new schema.

```ts
await db.addCollections({
    todos: {
        schema: todoSchemaV1, // version: 1, added "dueDate"
        migrationStrategies: {
            1: oldDoc => {
                oldDoc.dueDate = null;
                return oldDoc;
            }
        }
    }
});
```

## Encryption

Realm encrypted the whole database file with a 64 byte key. The RxDB [encryption plugin](../encryption.md) encrypts on the field level: you list the properties that hold sensitive data in the schema's `encrypted` array and pass a password to `createRxDatabase`. Indexed fields stay unencrypted so queries keep working. On [React Native](./react-native-encryption.md), combine this with a key stored in the platform keychain.

## FAQ

<Faq>
<FaqItem question="Can I keep MongoDB as my backend?">

Yes. The RxDB client does not connect to MongoDB directly. Your server exposes pull and push endpoints that read from and write to MongoDB, and the client replicates through the [HTTP replication plugin](../replication-http.md). This works with self hosted MongoDB as well as Atlas clusters and removes the dependency on the shut down Device Sync service.

</FaqItem>
<FaqItem question="How do I migrate Realm relationships?">

Store the primary key of the target document in a string field and declare a `ref` in the schema so the [population plugin](../population.md) can resolve it, or embed the related data as a nested object when it always loads together with the parent. Inverse relationships (`linkingObjects`) become a query on the referencing collection.

</FaqItem>
<FaqItem question="What happens to data on devices that never open the app again?">

Nothing is lost on the device, but data that was never synced before Device Sync shut down only exists in the local Realm file. The import step in this guide reads that file on the next app start, loads the data into RxDB and syncs it through the new replication. This is why the migration code should stay in the app for several releases.

</FaqItem>
<FaqItem question="Does RxDB support the same platforms as Realm?">

RxDB covers browsers, Node.js, [Electron](../electron-database.md), [React Native](../react-native-database.md), Expo, Capacitor, Deno and Bun. Because RxDB is plain JavaScript without native bindings, React Native and Electron upgrades do not depend on a binding release. Realm's Kotlin, Swift and .NET SDKs are out of scope for RxDB, which targets JavaScript runtimes.

</FaqItem>
<FaqItem question="How long does a migration take?">

For a typical app with 5 to 15 Realm classes, plan one to two weeks: schema translation and the data import are a few days, rewriting queries and listeners is mostly find and replace with the tables above, and the largest block is standing up replication endpoints if you used Device Sync. The staged rollout adds calendar time but little engineering effort.

</FaqItem>
</Faq>

## Follow-up reading

- [Why RxDB is a MongoDB Realm alternative](./alternatives/mongodb-realm-alternative.md)
- [RxDB quickstart](../quickstart.md)
- [Replication protocol](../replication.md)
- [React Native database setup](../react-native-database.md)
- [Schema migration](../migration-schema.md)
