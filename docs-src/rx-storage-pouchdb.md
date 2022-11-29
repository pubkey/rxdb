# RxStorage PouchDB

The PouchDB RxStorage is based on the [PouchDB](https://github.com/pouchdb/pouchdb) database. It is the most battle proven RxStorage and has a big ecosystem of adapters. PouchDB does a lot of overhead to enable CouchDB replication which makes the PouchDB RxStorage one of the slowest.

## IMPORTANT:
The PouchDB RxStorage [is deprecated](https://rxdb.info/questions-answers.html#why-is-the-pouchdb-rxstorage-deprecated) and should no longer be used in new projects.

## Pros 
  - Most battle proven RxStorage
  - Supports replication with a CouchDB endpoint
  - Support storing [attachments](./rx-attachment.md)
  - Big ecosystem of adapters

## Cons
  - Big bundle size
  - Slow performance because of revision handling overhead


## Usage

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStoragePouch, addPouchPlugin } from 'rxdb/plugins/pouchdb';

addPouchPlugin(require('pouchdb-adapter-idb'));

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStoragePouch(
        'idb',
        {
            /**
             * other pouchdb specific options
             * @link https://pouchdb.com/api.html#create_database
             */
        }
    )
});
```

## Polyfill the `global` variable

When you use RxDB with **angular** or other **webpack** based frameworks, you might get the error <span style="color: red;">Uncaught ReferenceError: global is not defined</span>. This is because pouchdb assumes a nodejs-specific `global` variable that is not added to browser runtimes by some bundlers.
You have to add them by your own, like we do [here](https://github.com/pubkey/rxdb/blob/master/examples/angular/src/polyfills.ts).

```ts
(window as any).global = window;
(window as any).process = {
    env: { DEBUG: undefined },
};
```


## Adapters

[PouchDB has many adapters for all JavaScript runtimes](./adapters.md).


## Using the internal PouchDB Database

For custom operations, you can access the internal PouchDB database.
This is dangerous because you might do changes that are not compatible with RxDB.
Only use this when there is no way to achieve your goals via the RxDB API.


```javascript
import {
    getPouchDBOfRxCollection
} from 'rxdb/plugins/pouchdb';

const pouch = getPouchDBOfRxCollection(myRxCollection);
```
