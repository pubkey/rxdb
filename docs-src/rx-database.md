# RxDatabase

A RxDatabase-Object contains your collections and handles the synchronization of change-events.

## Creation

The database is created by the asynchronous `.createRxDatabase()` function of the core RxDB module. It has the following parameters:

```javascript
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/dexie';

const db = await createRxDatabase({
  name: 'heroesdb',                   // <- name
  storage: getRxStorageDexie(),       // <- RxStorage
  password: 'myPassword',             // <- password (optional)
  multiInstance: true,                // <- multiInstance (optional, default: true)
  eventReduce: true                   // <- eventReduce (optional, default: true)
  cleanupPolicy: {}                   // <- custom cleanup policy (optional) 
});
```

### name

The database-name is a string which uniquely identifies the database. When two RxDatabases have the same name and use the same `RxStorage`, their data can be assumed as equal and they will share events between each other.
Depending on the storage or adapter this can also be used to define the filesystem folder of your data.


### storage

RxDB works on top of an implementation of the [RxStorage](./rx-storage.md) interface. This interface is an abstraction that allows you to use different underlying databases that actually handle the documents. Depending on your use case you might use a different `storage` with different tradeoffs in performance, bundle size or supported runtimes.

There are many `RxStorage` implementations that can be used depending on the JavaScript environment and performance requirements.
For example you can use the [Dexie RxStorage](./rx-storage-dexie.md) in the browser or use the LokiJS storage with the filesystem adapter in Node.js.

- [List of RxStorage implementations](./rx-storage.md)

```javascript

// use the Dexie.js RxStorage that stores data in IndexedDB.
import { getRxStorageDexie } from 'rxdb/plugins/dexie';

const dbDexie = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageDexie()
});


// ...or use the LokiJS RxStorage with the indexeddb adapter.
import { getRxStorageLoki } from 'rxdb/plugins/lokijs';
const LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');

const dbLoki = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageLoki({
    adapter: new LokiIncrementalIndexedDBAdapter()
  })
});
```


### password
`(optional)`
If you want to use encrypted fields in the collections of a database, you have to set a password for it. The password must be a string with at least 12 characters.

[Read more about encryption here](./encryption.md).

### multiInstance
`(optional=true)`
When you create more than one instance of the same database in a single javascript-runtime, you should set `multiInstance` to ```true```. This will enable the event sharing between the two instances. For example when the user has opened multiple browser windows, events will be shared between them so that both windows react to the same changes.
`multiInstance` should be set to `false` when you have single-instances like a single Node.js-process, a react-native-app, a cordova-app or a single-window electron app which can decrease the startup time because no instance coordination has to be done.

### eventReduce
`(optional=true)`

One big benefit of having a realtime database is that big performance optimizations can be done when the database knows a query is observed and the updated results are needed continuously. RxDB uses the [EventReduce Algorithm](https://github.com/pubkey/event-reduce) to optimize observer or recurring queries.

### ignoreDuplicate
`(optional=false)`
If you create multiple RxDatabase-instances with the same name and same adapter, it's very likely that you have done something wrong.
To prevent this common mistake, RxDB will throw an error when you do this.
In some rare cases like unit-tests, you want to do this intentional by setting `ignoreDuplicate` to `true`.

```js
const db1 = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageDexie(),
  ignoreDuplicate: true
});
const db2 = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageDexie(),
  ignoreDuplicate: true // this create-call will not throw because you explicitly allow it
});
```

## Methods

### Observe with $
Calling this will return an [rxjs-Observable](http://reactivex.io/documentation/observable.html) which streams all write events of the `RxDatabase`.

```javascript
myDb.$.subscribe(changeEvent => console.dir(changeEvent));
```

### exportJSON()
Use this function to create a json-export from every piece of data in every collection of this database. You can pass `true` as a parameter to decrypt the encrypted data-fields of your document.


Before `exportJSON()` and `importJSON()` can be used, you have to add the `json-dump` plugin.

```javascript
import { addRxPlugin } from 'rxdb';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
addRxPlugin(RxDBJsonDumpPlugin);
```


```javascript
myDatabase.exportJSON()
  .then(json => console.dir(json));
```

### importJSON()
To import the json-dumps into your database, use this function.

```javascript
// import the dump to the database
emptyDatabase.importJSON(json)
  .then(() => console.log('done'));
```

### backup()

Writes the current (or ongoing) database state to the filesystem. [Read more](./backup.md)

### server()
Spawns a CouchDB-compatible server from the database. [Read more](./tutorials/server-couchdb.md)

### waitForLeadership()
Returns a Promise which resolves when the RxDatabase becomes [elected leader](./leader-election.md).

### requestIdlePromise()
Returns a promise which resolves when the database is in idle. This works similar to [requestIdleCallback](https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback) but tracks the idle-ness of the database instead of the CPU.
Use this for semi-important tasks like cleanups which should not affect the speed of important tasks.

```javascript

myDatabase.requestIdlePromise().then(() => {
    // this will run at the moment the database has nothing else to do
    myCollection.customCleanupFunction();
});

// with timeout
myDatabase.requestIdlePromise(1000 /* time in ms */).then(() => {
    // this will run at the moment the database has nothing else to do
    // or the timeout has passed
    myCollection.customCleanupFunction();
});

```

### destroy()
Destroys the databases object-instance. This is to free up memory and stop all observers and replications.
Returns a `Promise` that resolves when the database is destroyed.
```javascript
await myDatabase.destroy();
```

### remove()
Removes the database and wipes all data of it from the storage.

```javascript
await myDatabase.remove();
// database is now gone

// NOTICE: You can also remove a database without its instance
import { removeRxDatabase } from 'rxdb';
removeRxDatabase('mydatabasename', 'localstorage');
```

### checkAdapter()
Checks if the given PouchDB adapter can be used with RxDB in the current environment.

```javascript
// must be imported from the pouchdb plugin
import { 
    checkAdapter
} from 'rxdb/plugins/pouchdb';

const ok = await checkAdapter('idb');
console.dir(ok); // true on most browsers, false on nodejs
```

### isRxDatabase
Returns true if the given object is an instance of RxDatabase. Returns false if not.
```javascript
import { isRxDatabase } from 'rxdb';
const is = isRxDatabase(myObj);
```
