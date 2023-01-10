# RxStorage LokiJS

The LokiJS RxStorage is based on [LokiJS](https://github.com/techfort/LokiJS) which has the main benefit of having a better performance. It can do this because it is an **in-memory** database that processes all data in memory and only saves to disc when the app is closed or an interval is reached.

### Pros

- Queries can run faster because all data is processed in memory.
- It has a much faster initial load time because it loads all data from IndexedDB in a single request. But this is only true for small datasets. If much data must is stored, the initial load time can be higher than on other RxStorage implementations.

### Cons

- It does not support attachments. (Make a pull request)
- Data can be lost when the JavaScript process is killed ungracefully like when the browser crashes or the power of the PC is terminated.
- All data must fit into the memory.
- Slow initialisation time when used with `multiInstance: true` because it has to await the leader election process.
- Slow initialisation time when really much data is stored inside of the database because it has to parse a big `JSON` string.

## Usage

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageLoki
} from 'rxdb/plugins/storage-lokijs';

// in the browser, we want to persist data in IndexedDB, so we use the indexeddb adapter.
const LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageLoki({
        adapter: new LokiIncrementalIndexedDBAdapter(),
        /* 
         * Do not set lokiJS persistence options like autoload and autosave,
         * RxDB will pick proper defaults based on the given adapter
         */
    })
});
```

## Adapters

LokiJS is based on adapters that determine where to store persistend data. For LokiJS there are adapters for IndexedDB, AWS S3, the NodeJS filesystem or NativeScript.
Find more about the possible adapters at the [LokiJS docs](https://github.com/techfort/LokiJS/blob/master/tutorials/Persistence%20Adapters.md).

## Multi-Tab support

When you use plain LokiJS, you cannot build an app that can be used in multiple browser tabs. The reason is that LokiJS loads data in bulk and then only regularly persists the in-memory state to disc. When opened in multiple tabs, it would happen that the LokiJS instances overwrite each other and data is lost.
With the RxDB LokiJS-plugin, this problem is fixed with the [LeaderElection](https://github.com/pubkey/broadcast-channel#using-the-leaderelection) module. Between all open tabs, a leading tab is elected and only in this tab a database is created. All other tabs do not run queries against their own database, but instead call the leading tab to send and retrieve data. When the leading tab is closed, a new leader is elected that reopens the database and processes queries. You can disable this by setting `multiInstance: false` when creating the `RxDatabase`.

## Autosave and autoload

When using plain LokiJS, you could set the `autosave` option to `true` to make sure that LokiJS persists the database state after each write into the persistence adapter. Same goes to `autoload` which loads the persisted state on database creation.
But RxDB knows better when to persist the database state and when to load it, so it has its own autosave logic. This will ensure that running the persistence handler does not affect the performance of more important tasks. Instead RxDB will always wait until the database is idle and then runs the persistence handler.
A load of the persisted state is done on database or collection creation and it is ensured that multiple load calls do not run in parallel and interfere with each other or with `saveDatabase()` calls.

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

## Using the internal LokiJS database

For custom operations, you can access the internal LokiJS database.
This is dangerous because you might do changes that are not compatible with RxDB.
Only use this when there is no way to achieve your goals via the RxDB API.

```javascript

const storageInstance = myRxCollection.storageInstance;
const localState = await storageInstance.internals.localState;
localState.collection.insert({
    key: 'foo',
    value: 'bar',
    _deleted: false,
    _attachments: {},
    _rev: '1-62080c42d471e3d2625e49dcca3b8e3e',
    _meta: {
        lwt: new Date().getTime()
    }
});

// manually trigger the save queue because we did a write to the internal loki db. 
await localState.databaseState.saveQueue.addWrite();
```


