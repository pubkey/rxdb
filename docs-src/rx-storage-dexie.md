# RxStorage Dexie.js (In beta)

Instead of using PouchDB as underlying storage engine, you can also use [Dexie.js](https://github.com/dexie/Dexie.js).
Dexie.js is a minimal wrapper around IndexedDB that has a good performance.

For the Dexie based `RxStorage`, we use the [mingo](https://github.com/kofrasa/mingo) query handler. And a copy of the query planner from the [PouchDB-find](https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules/pouchdb-find) plugin.

**IMPORTANT:** The Dexie.js `RxStorage` is in **beta** mode. It may get breaking changes in any minor new RxDB version. Use at your own risk.

## Pros 
  - Smaller bundle size then with the PouchDB storage.
  - Fast inital load even on big datasets.
  - Faster write and read performance than with PouchDB because it has less overhead.

## Cons
  - Does not support CouchDB replication.
  - It does not support attachments. (Make a pull request)
  - Running many operations can be slow because the underlying [IndexedDB is slow](./slow-indexeddb.md).


## Usage

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/dexie';

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageDexie()
});
```


## Overwrite/Polyfil the native IndexedDB

Node.js has no IndexedDB API. To still run the Dexie `RxStorage` in Node.js, for example to run unit tests, you have to polyfil it.
You can do that by using the [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) module and pass it to the `getRxStorageDexie()` function.

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/dexie';

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


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./rx-storage-lokijs.md)
