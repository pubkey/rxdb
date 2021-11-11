# RxStorage LokiJS

Instead of using PouchDB as underlying storage engine, you can also use [LokiJS](https://github.com/techfort/LokiJS).
LokiJS has the main benefit of having a better performance. It can do this because it is an **in-memory** database that processes all data in memory and only saves to disc when the app is closed or an interval is reached.


## Pros & Cons

### Pros

- It has a much faster initial load time because it loads all data from IndexedDB in a single request.
- Queries can run faster because all data is processed in memory

### Cons

- It does not support CouchDB replication, only GraphQL replication.
- It does not support attachments.
- Data can be lost when the JavaScript process is killed ungracefully like when the browser crashes or the power of the PC is terminated.
- All data must fit into the memory.


## Usage

```ts
import {
    createRxDatabase
} from 'rxdb/plugins/core';
import {
    getRxStorageLoki
} from 'rxdb/plugins/lokijs';

// in the browser, we want to persist data in IndexedDB, so we use the indexeddb adapter.
const LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageLoki({
        adapter: new LokiIncrementalIndexedDBAdapter(),
        autoload: true,
        autosave: true,
        autosaveInterval: 2000
    })
});
```

## Adapters

Like PouchDB, LokiJS is based on adapters that determine where to store persistend data. For LokiJS there are adapters for IndexedDB, AWS S3, the NodeJS filesystem or NativeScript.
Find more about the possible adapters at the [LokiJS docs](https://github.com/techfort/LokiJS/blob/master/tutorials/Persistence%20Adapters.md).

## Multi-Tab support

When you use plain LokiJS, you cannot build an app that can be used in multiple browser tabs. The reason is that LokiJS loads data in bulk and then only regulary persists the in-memory state to disc. When opened in multiple tabs, it would happen that the LokiJS instances overwrite each other and data is lost.
With the RxDB LokiJS-plugin, this problem is fixed with the [LeaderElection](https://github.com/pubkey/broadcast-channel#using-the-leaderelection) module. Between all open tabs, a leading tab is elected and only in this tab a database is created. All other tabs do not run queries against their own database, but instead call the leading tab to send and retrieve data. When the leading tab is closed, a new leader is elected that reopens the database and processes queries. You can disable this by setting `multiInstance: false` when creating the `RxDatabase`.

## Known problems

When you bundle the LokiJS Plugin with webpack, you might get the error `Cannot find module "fs"`. This is because LokiJS uses a `require('fs')` statement that cannot work in the browser.
You can fix that by telling webpack to not resolve the `fs` module with the following block in your webpack config:

```js
// in your webpack.config.js
{
    /* ... */
    resolve: {
        fallback: {
            fs: false
        }
    }
    /* ... */
}

// Or if you do not have a webpack.config.js like you do with angular,
// you might fix it by setting the browser field in the package.json
{
  /* ... */
  "browser": {
    "fs": false
  }
  /* ... */
}

```


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./replication-couchdb.md)
