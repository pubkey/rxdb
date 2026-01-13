---
title: 🚀 Quickstart
slug: quickstart.html
description: Learn how to build a realtime app with RxDB. Follow this quickstart for setup, schema creation, data operations, and real-time syncing.
---

import {Steps} from '@site/src/components/steps';
import {TriggerEvent} from '@site/src/components/trigger-event';
import {Tabs} from '@site/src/components/tabs';
import {NavbarDropdownSyncList} from '@site/src/components/navbar-dropdowns';

<TriggerEvent type="page_quickstart" value={0.2} maxPerUser={1} primary={false} />

# RxDB Quickstart

Welcome to the RxDB Quickstart. Here we'll learn how to create a simple real-time app with the RxDB database that is able to store and query data persistently in a browser and does realtime updates to the UI on changes.

<br />
<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Embedded Database" width="220" />
    </a>
</center>

<br />

<Steps>

### Installation
Install the RxDB library and the RxJS dependency:
 
```bash
npm install rxdb rxjs
```

### Pick a Storage

RxDB is able to run in a wide range of JavaScript runtimes like browsers, mobile apps, desktop and servers. Therefore different storage engines exist that ensure the best performance depending on where RxDB is used.


<Tabs>

#### LocalStorage

Use this for the simplest browser setup and very small datasets. It has a tiny bundle size and works anywhere [localStorage](./articles/localstorage.md) is available, but is not optimized for large data or heavy writes.

```ts
import {
    getRxStorageLocalstorage
} from 'rxdb/plugins/storage-localstorage';

let storage = getRxStorageLocalstorage();
```


#### IndexedDB 👑

The premium [IndexedDB storage](./rx-storage-indexeddb.md) is a high-performance, browser-native storage with a smaller bundle and faster startup compared to Dexie-based IndexedDB. Recommended when you have [👑 premium](/premium/) access and care about performance and bundle size.

```ts
import {
    getRxStorageIndexedDB
} from 'rxdb-premium/plugins/storage-indexeddb';

let storage = getRxStorageDexie();
```


#### Dexie.js

[Dexie.js](./rx-storage-dexie.md) is a friendly wrapper around IndexedDB and is a great default for browser apps when you don’t use premium. It’s reliable, works well for medium-sized datasets, and is free to use.

```ts
import {
    getRxStorageDexie
} from 'rxdb/plugins/storage-dexie';

let storage = getRxStorageDexie();
```


#### SQLite

[SQLite](./rx-storage-sqlite.md) is ideal for React Native, Capacitor, Electron, Node.js and other hybrid or native environments. It gives you a fast, durable database on disk. Use the 👑 premium storage for production; a trial version exists for quick experimentation.

**Premium SQLite (Node.js example)**

```ts
import {
    getRxStorageSQLite,
    getSQLiteBasicsNode
} from 'rxdb-premium/plugins/storage-sqlite';

// Provide the sqliteBasics adapter for your runtime, e.g. Node.js, React Native, etc.
// For example in Node.js you would derive sqliteBasics from a sqlite3-compatible library:
import sqlite3 from 'sqlite3';

const storage = getRxStorageSQLite({
  sqliteBasics: getSQLiteBasicsNode(sqlite3)
});
```

**SQLite trial storage (Node.js, free)**

```ts
import {
    getRxStorageSQLiteTrial,
    getSQLiteBasicsNodeNative
} from 'rxdb/plugins/storage-sqlite';
import { DatabaseSync } from 'node:sqlite';

const storage = getRxStorageSQLiteTrial({
sqliteBasics: getSQLiteBasicsNodeNative(DatabaseSync)
});
```

#### And more...

There are many more storages such as [MongoDB](./rx-storage-mongodb.md), [DenoKV](./rx-storage-denokv.md), [Filesystem](./rx-storage-filesystem-node.md), [Memory](./rx-storage-memory.md), [Memory-Mapped](./rx-storage-memory-mapped.md), [FoundationDB](./rx-storage-foundationdb.md) and more. [Browse the full list of storages](/rx-storage.html).


</Tabs>

<details>
    <summary>Which storage should I use?</summary>
    <div>
        RxDB provides a wide range of storages depending on your JavaScript runtime and performance needs.
        <ul>
    <li>In the Browser: Use the <a href="/rx-storage-localstorage.html">LocalStorage</a> storage for simple setup and small build size. For bigger datasets, use either the <a href="/rx-storage-dexie.html">dexie.js storage</a> (free) or the <a href="/rx-storage-indexeddb.html">IndexedDB RxStorage</a> if you have <a href="/premium/">👑 premium access</a> which is a bit faster and has a smaller build size.</li>
    <li>In <a href="/electron-database.html">Electron</a> and <a href="/react-native-database.html">ReactNative</a>: Use the <a href="./rx-storage-sqlite.html">SQLite RxStorage</a> if you have <a href="/premium/">👑 premium access</a> or the <a href="/rx-storage-sqlite.html">trial-SQLite RxStorage</a> for tryouts.</li>
    <li>In Capacitor: Use the <a href="/rx-storage-sqlite.html">SQLite RxStorage</a> if you have <a href="/premium/">👑 premium access</a>, otherwise use the <a href="/rx-storage-localstorage.html">localStorage</a> storage.</li>
</ul>

    </div>
</details>

### Dev-Mode

When you use RxDB in development, you should always enable the [dev-mode plugin](./dev-mode.md), which adds helpful checks and validations, and tells you if you do something wrong.

```ts
import { addRxPlugin } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';

addRxPlugin(RxDBDevModePlugin);
```

### Schema Validation

[Schema validation](./schema-validation.md) is required when using dev-mode and recommended (but optional) in production. Wrap your storage with the AJV schema validator to ensure all documents match your schema before being saved.

```ts
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

storage = wrappedValidateAjvStorage({ storage });
```

### Create a Database

A database is the top‑level container in RxDB, responsible for managing collections, coordinating persistence, and providing reactive change streams.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';

const myDatabase = await createRxDatabase({
  name: 'mydatabase',
  storage: storage
});
```


### Add a Collection

An RxDatabase contains [RxCollection](./rx-collection.md)s for storing and querying data. A collection is similar to an SQL table, and individual records are stored in the collection as JSON documents. An [RxDatabase](./rx-database.md) can have as many collections as you need.
Add a collection with a [schema](./rx-schema.md) to the database:

```ts
await myDatabase.addCollections({
    // name of the collection
    todos: {
        // we use the JSON-schema standard
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 100 // <- the primary key must have maxLength
                },
                name: {
                    type: 'string'
                },
                done: {
                    type: 'boolean'
                },
                timestamp: {
                    type: 'string',
                    format: 'date-time'
                }
            },
            required: ['id', 'name', 'done', 'timestamp']
        }
    }
});
```

### Insert a document

Now that we have an RxCollection we can store some [documents](./rx-document.md) in it.

```ts
const myDocument = await myDatabase.todos.insert({
    id: 'todo1',
    name: 'Learn RxDB',
    done: false,
    timestamp: new Date().toISOString()
});
```

### Run a Query

Execute a [query](./rx-query.md) that returns all found documents once:

```ts
const foundDocuments = await myDatabase.todos.find({
    selector: {
        done: {
            $eq: false
        }
    }
}).exec();
```


### Update a Document

In the first found document, set `done` to `true`:

```ts
const firstDocument = foundDocuments[0];
await firstDocument.patch({
    done: true
});
```

### Delete a document

Delete the document so that it can no longer be found in queries:

```ts
await firstDocument.remove();
```

### Observe a Query

Subscribe to data changes so that your UI is always up-to-date with the data stored on disk. RxDB allows you to subscribe to data changes even when the change happens in another part of your application, another browser tab, or during database [replication/synchronization](./replication.md):

```ts
const observable = myDatabase.todos.find({
    selector: {
        done: {
            $eq: false
        }
    }
}).$ // get the observable via RxQuery.$;
observable.subscribe(notDoneDocs => {
    console.log('Currently have ' + notDoneDocs.length + ' things to do');
    // -> here you would re-render your app to show the updated document list
});
```

### Observe a Document value

You can also subscribe to the fields of a single RxDocument. Add the `$` sign to the desired field and then subscribe to the returned observable.

```ts
myDocument.done$.subscribe(isDone => {
    console.log('done: ' + isDone);
});
```


### Sync the Client

RxDB has multiple [replication plugins](./replication.md) to replicate database state with a server.


<Tabs>

#### HTTP

```ts
import {
  replicateHTTP,
  pullQueryBuilderFromRxSchema,
} from "rxdb/plugins/replication-http";

replicateHTTP({
  collection: db.todos,
  push: {
    handler: async (rows) => {
      return fetch("https:/example.com/api/todos/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      }).then((res) => res.json());
    },
  },

  pull: {
    handler: async (lastCheckpoint) => {
      return fetch(
        "https://example.com/api/todos/pull?" +
        new URLSearchParams({
          checkpoint: JSON.stringify(lastCheckpoint)
        }),
      ).then((res) => res.json());
    },
  },
});
```


#### GraphQL

```ts
import { replicateGraphQL } from 'rxdb/plugins/replication-graphql';

replicateGraphQL({
    collection: db.todos,
    url: 'https://example.com/graphql',
    push: { batchSize: 50 },
    pull: { batchSize: 50 }
});
```


#### WebRTC (P2P)

The easiest way to replicate data between your clients' devices is the [WebRTC replication plugin](./replication-webrtc.md) that replicates data between devices without a centralized server. This makes it easy to try out replication without having to host anything:

```ts
import {
    replicateWebRTC,
    getConnectionHandlerSimplePeer
} from 'rxdb/plugins/replication-webrtc';
replicateWebRTC({
    collection: myDatabase.todos,
    connectionHandlerCreator: getConnectionHandlerSimplePeer({}),
    topic: '', // <- set any app-specific room id here.
    secret: 'mysecret',
    pull: {},
    push: {}
})
```


#### CouchDB


```ts
import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';

replicateCouchDB({
    collection: db.todos,
    url: 'http://example.com/todos/',
    push: {},
    pull: {}
});
```


#### And more...

Explore all [replication plugins](/replication.html), including advanced conflict handling and custom protocols.

<NavbarDropdownSyncList />

</Tabs>
</Steps>


## Next steps

You are now ready to dive deeper into RxDB. 
- Start reading the full documentation [here](./install.md).
- There is a full implementation of the [quickstart guide](https://github.com/pubkey/rxdb-quickstart) so you can clone that repository and play with the code.
- For frameworks and runtimes like Angular, React Native and others, check out the list of [example implementations](https://github.com/pubkey/rxdb/tree/master/examples).
- Also please continue reading the documentation, join the community on our [Discord chat](/chat/), and star the [GitHub repo](https://github.com/pubkey/rxdb).
- If you are using RxDB in a production environment and are able to support its continued development, please take a look at the [👑 Premium package](/premium/) which includes additional plugins and utilities.
