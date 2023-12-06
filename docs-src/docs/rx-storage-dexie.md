---
title: Dexie.js RxStorage
slug: rx-storage-dexie.html
---

# RxStorage Dexie.js

To store the data inside of IndexedDB in the browser, you can also use the [Dexie.js](https://github.com/dexie/Dexie.js) [RxStorage](./rx-storage.md).

Dexie.js is a minimal wrapper around IndexedDB.
For the Dexie based `RxStorage`, we use the [mingo](https://github.com/kofrasa/mingo) query handler.

## Pros 
  - Can use [Dexie.js addons](https://dexie.org/docs/Tutorial/Building-Addons).

## Cons
  - Does not use a [Batched Cursor](./slow-indexeddb.md#batched-cursor) or [custom indexes](./slow-indexeddb.md#custom-indexes) which makes queries slower compared to the [IndexedDB RxStorage](./rx-storage-indexeddb.md).

## Usage

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageDexie()
});
```


## Overwrite/Polyfill the native IndexedDB

Node.js has no IndexedDB API. To still run the Dexie `RxStorage` in Node.js, for example to run unit tests, you have to polyfill it.
You can do that by using the [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) module and pass it to the `getRxStorageDexie()` function.

```ts
import { createRxDatabase } from 'rxdb';
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


## Using addons

Dexie.js has its own plugin system with [many plugins](https://dexie.org/docs/DerivedWork#known-addons) for encryption, replication or other use cases. With the Dexie.js `RxStorage` you can use the same plugins by passing them to the `getRxStorageDexie()` function.

```ts
const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageDexie({
        addons: [ /* Your Dexie.js plugins */ ]
    })
});
```
