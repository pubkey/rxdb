---
title: PouchDB RxStorage - Migrate for Better Performance
slug: rx-storage-pouchdb.html
description: Discover why PouchDB RxStorage is deprecated in RxDB. Learn its legacy, performance drawbacks, and how to upgrade to a faster solution.
image: /headers/rx-storage-pouchdb.jpg
---

# RxStorage PouchDB

The PouchDB RxStorage is based on the [PouchDB](https://github.com/pouchdb/pouchdb) database. It is the most battle proven RxStorage and has a big ecosystem of adapters. PouchDB does a lot of overhead to enable CouchDB replication which makes the PouchDB RxStorage one of the slowest.


:::warning
The PouchDB RxStorage is removed from RxDB and can no longer be used in new projects. You should switch to a different [RxStorage](./rx-storage.md).
:::


## Why is the PouchDB RxStorage deprecated?
When I started developing RxDB in 2016, I had a specific use case to solve.
Because there was no client-side database out there that fitted, I created
RxDB as a wrapper around PouchDB. This worked great and all the PouchDB features
like the query engine, the adapter system, CouchDB-replication and so on, came for free.
But over the years, it became clear that PouchDB is not suitable for many applications,
mostly because of its performance: To be compliant to CouchDB, PouchDB has to store all
revision trees of documents which slows down queries. Also purging these document revisions [is not possible](https://github.com/pouchdb/pouchdb/issues/802)
so the database storage size will only increase over time.
Another problem was that many issues in PouchDB have never been fixed, but only closed by the issue-bot like [this one](https://github.com/pouchdb/pouchdb/issues/6454). The whole PouchDB RxStorage code was full of [workarounds and monkey patches](https://github.com/pubkey/rxdb/blob/285c3cf6008b3cc83bd9b9946118a621434f0cff/src/plugins/pouchdb/pouch-statics.ts#L181) to resolve
these issues for RxDB users. Many these patches decreased performance even further. Sometimes it was not possible to fix things from the outside, for example queries with `$gt` operators return [the wrong documents](https://github.com/pouchdb/pouchdb/pull/8471) which is a no-go for a production database
and hard to debug.

In version [10.0.0](./releases/10.0.0.md) RxDB introduced the [RxStorage](./rx-storage.md) layer which
allows users to swap out the underlying storage engine where RxDB stores and queries documents from.
This allowed to use alternatives from PouchDB, for example the [IndexedDB RxStorage](./rx-storage-indexeddb.md) in browsers
or even the [FoundationDB RxStorage](./rx-storage-foundationdb.md) on the server side.
There where not many use cases left where it was a good choice to use the PouchDB RxStorage. Only replicating with a
CouchDB server, was only possible with PouchDB. But this has also changed. RxDB has [a plugin](./replication-couchdb.md) that allows
to replicate clients with any CouchDB server by using the [RxDB Sync Engine](./replication.md). This plugins work with any RxStorage so that it is not necessary to use the PouchDB storage.
Removing PouchDB allows RxDB to add many awaited features like filtered change streams for easier replication and permission handling. It will also free up development time.

If you are currently using the PouchDB RxStorage, you have these options:

- Migrate to another [RxStorage](./rx-storage.md) (recommended)
- Never update RxDB to the next major version (stay on older 14.0.0)
- Fork the [PouchDB RxStorage](./rx-storage-pouchdb.md) and maintain the plugin by yourself.
- Fix all the [PouchDB problems](https://github.com/pouchdb/pouchdb/issues?q=author%3Apubkey) so that we can add PouchDB to the RxDB Core again.



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

When you use RxDB with **angular** or other **webpack** based frameworks, you might get the error:
```html
<span style="color: red;">Uncaught ReferenceError: global is not defined</span>
```
This is because pouchdb assumes a nodejs-specific `global` variable that is not added to browser runtimes by some bundlers.
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
