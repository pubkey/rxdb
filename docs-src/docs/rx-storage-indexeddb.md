---
title: IndexedDB RxStorage 👑
slug: rx-storage-indexeddb.html
---

# IndexedDB RxStorage

The IndexedDB `RxStorage` is based on plain IndexedDB and can be used in browsers, electron or hybrid apps.


### Pros

- It is really fast because it uses many [performance optimizations](./slow-indexeddb.md) for IndexedDB. See [performance comparison](./rx-storage-performance.md)
- It has a small build size.

### Cons

- It is part of the [👑 RxDB Premium](/premium) plugin that must be purchased.
- Requires support for [IndexedDB v2](https://caniuse.com/indexeddb2), it does not work on Internet Explorer. 

## Usage

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageIndexedDB
} from 'rxdb-premium/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageIndexedDB({
        /**
         * For better performance, queries run with a batched cursor.
         * You can change the batchSize to optimize the query time
         * for specific queries.
         * You should only change this value when you are also doing performance measurements.
         * [default=300]
         */
        batchSize: 300
    })
});
```


## Overwrite/Polyfill the native IndexedDB

Node.js has no IndexedDB API. To still run the IndexedDB `RxStorage` in Node.js, for example to run unit tests, you have to polyfill it.
You can do that by using the [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) module and pass it to the `getRxStorageDexie()` function.

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

//> npm install fake-indexeddb --save
const fakeIndexedDB = require('fake-indexeddb');
const fakeIDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageIndexedDB({
        indexedDB: fakeIndexedDB,
        IDBKeyRange: fakeIDBKeyRange
    })
});

```


