# RxDB Dexie.js Database - Fast, Reactive, Sync with Any Backend

> Use Dexie.js to power RxDB in the browser. Enjoy quick setup, Dexie addons, and reliable storage for small apps or prototypes.

import {Steps} from '@site/src/components/steps';

# RxStorage Dexie.js

To store the data inside of and RxDB Database in IndexedDB in the [browser](./articles/browser-database.md), you can use the [Dexie.js](https://github.com/dexie/Dexie.js) based [RxStorage](./rx-storage.md). Dexie.js is a minimal wrapper around IndexedDB and the Dexie.js RxStorage wraps that again to use it for an RxDB database in the browser. For side projects and prototypes that run in a browser, you should use the dexie RxStorage as a default.

## Dexie.js vs IndexedDB Storage

While Dexie.js [RxStorage](./rx-storage.md) can be used for free, most professional projects should switch to our **premium [IndexedDB RxStorage](./rx-storage-indexeddb.md) 👑** in production:

- It is faster and reduces build size by up to **36%**.
- It has a way [better performance](./rx-storage-performance.md) on reads and writes.
- It stores attachments data as binary instead of base64 which reduces used space by 33%.
- It does not use a [Batched Cursor](./slow-indexeddb.md#batched-cursor) or [custom indexes](./slow-indexeddb.md#custom-indexes) which makes queries slower compared to the [IndexedDB RxStorage](./rx-storage-indexeddb.md).
- It supports **non-required indexes** which is [not possible](https://github.com/pubkey/rxdb/pull/6643#issuecomment-2505310082) with Dexie.js.
- It runs in a **WAL-like mode** (similar to SQLite) for faster writes and improved responsiveness.
- It support the [Storage Buckets API](./rx-storage-indexeddb.md#storage-buckets)

## How to use Dexie.js as a Storage for RxDB

<Steps>

### Import the Dexie Storage
```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
```

### Create a Database
```ts
const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageDexie()
});
```
</Steps>

## Overwrite/Polyfill the native IndexedDB API with an in-memory version

Node.js has no IndexedDB API. To still run the Dexie `RxStorage` in Node.js, for example to run unit tests, you have to polyfill it.
You can do that by using the [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) module and pass it to the `getRxStorageDexie()` function.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

//> npm install fake-indexeddb --save
const fakeIndexedDB = require('fake-indexeddb');
const fakeIDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageDexie({
        indexedDB: fakeIndexedDB,
        IDBKeyRange: fakeIDBKeyRange
    })
});

```

## Using Dexie Addons

Dexie.js has its own plugin system with [many plugins](https://dexie.org/docs/DerivedWork#known-addons) for encryption, replication or other use cases. With the Dexie.js `RxStorage` you can use the same plugins by passing them to the `getRxStorageDexie()` function.

```ts
const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageDexie({
        addons: [ /* Your Dexie.js plugins */ ]
    })
});
```

## Sync Dexie.js with your Backend in RxDB

Having your local data in sync with a remote backend is a key feature of RxDB. Here are two approaches to achieve this when using the Dexie.js RxStorage:

*   **Dexie Cloud** provides a **managed solution**: For quick setups, letting you rely on its Cloud backend and conflict resolution.
*   [RxDB's replication](./replication.md): Offers **full control** over your backend, data flow, and [conflict handling](./transactions-conflicts-revisions.md).

Choose the approach that best suits your needs - whether you want to get started quickly with Dexie Cloud or require the adaptability and autonomy of RxDB's native replication.

### A. Use Dexie Cloud Sync

**Dexie Cloud** is an official SaaS solution provided by the Dexie team. It offers automatic synchronization, user management, and conflict resolution out of the box. The primary benefits are:

- **Automatic Sync**: Dexie Cloud keeps your local IndexedDB in sync with its cloud-based backend.
- **User Authentication**: Built-in user management (auth, roles, permissions).
- **Conflict Resolution**: Automated resolution logic on the server side.

<Steps>

#### Install the Dexie Cloud Addon

```bash
npm install dexie-cloud-addon
```

#### Import RxDB and dexie-cloud
```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import dexieCloud from 'dexie-cloud-addon';
```

#### Create a Dexie based RxStorage with the Cloud Plugin

```ts
const storage = getRxStorageDexie({
  addons: [dexieCloud],
  /*
   * Whenever a new dexie database instance is created,
   * this method will be called.
   */
  async onCreate(dexieDatabase, dexieDatabaseName) {
    await dexieDatabase.cloud.configure({
        databaseUrl: "https://<yourdatabase>.dexie.cloud",
        requireAuth: true // optional
    });
  }
});
```

#### Create an RxDB Database

```ts
const db = await createRxDatabase({
  name: 'mydb',
  storage
});
```
</Steps>

### B. Use the RxDB Replication

For **full flexibility** over your backend or conflict resolution strategy, you can use one of **RxDB's many replication plugins** like

- [CouchDB Replication](./replication-couchdb.md) Plugin: Replicate with a CouchDB Server
- [GraphQL Replication](./replication-graphql.md) Plugin: Sync data with any GraphQL endpoint. Useful when you have a custom schema or you want to utilize GraphQL's powerful query features.
- [Custom Replication with REST APIs](./replication-http.md): Implement your own replication by building a pull/push handler that communicates with any RESTful backend.

Below is an example of replicating an RxDB collection with a CouchDB backend using RxDB's CouchDB replication plugin:

<Steps>

#### Import the RxDB with dexie and the CouchDB plugin
```ts
import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { createRxDatabase } from 'rxdb/plugins/core';
```

#### Create an RxDB Database with the Dexie Storage

```ts
const db = await createRxDatabase({
  name: 'mydb',
  storage: getRxStorageDexie()
});
```

#### Add a Collection

```ts
await db.addCollections({
    humans: {
        schema: {
            version: 0,
            type: 'object',
            primaryKey: 'id',
            properties: {
                id: { type: 'string', maxLength: 100 },
                name: { type: 'string' },
                age: { type: 'number' }
              },
            required: ['id', 'name']
        }
    }
});
```

#### Sync the Collection with a CouchDB Server

```ts
const replicationState = replicateCouchDB({
  replicationIdentifier: 'my-couchdb-replication',
  collection: db.humans,
  // The URL to your CouchDB endpoint
  url: 'http://example.com/db/humans'
});
```

</Steps>

## liveQuery - Realtime Queries

Dexie.js offers a feature called `liveQuery` which automatically updates query results as data changes, allowing you to react to these changes in real-time. However, because RxDB intrinsically provides [reactive queries](./rx-query.md#observe), you typically do **not** need to enable live queries through Dexie. Once you have created your database and collections with RxDB, any query you perform can be observed by subscribing to it, for example via `collection.find().$.subscribe(results => { /*... */ })`. This means RxDB takes care of listening for changes and automatically emitting new results - ensuring your UI stays in sync with the underlying data without requiring extra plugins or manual polling.

## Disabling the non-premium console log

We want to be transparent with our community, and you'll notice a console message when using the free Dexie.js based RxStorage implementation. This message serves to inform you about the availability of faster storage solutions within our [👑 Premium Plugins](/premium/). We understand that this might be a minor inconvenience, and we sincerely apologize for that. However, maintaining and improving RxDB requires substantial resources, and our premium users help us ensure its sustainability. If you find value in RxDB and wish to remove this message, we encourage you to explore our premium storage options, which are optimized for professional use and production environments. Thank you for your understanding and support.

If you already have premium access and want to use the Dexie.js [RxStorage](./rx-storage.md) without the log, you can call the `setPremiumFlag()` function to disable the log.

```js
import { setPremiumFlag } from 'rxdb-premium/plugins/shared';
setPremiumFlag();
```

## Performance comparison with other RxStorage plugins

The performance of the Dexie.js RxStorage is good enough for most use cases but other storages can have way better performance metrics:
