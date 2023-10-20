# RxDatabase

An RxDatabase contains your collections and handles the synchronization of change-events. 

## Creation

The database is created with the asynchronous `.createRxDatabase()` function of the core RxDB module, as follows:

```javascript
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const db = await createRxDatabase({
  name: 'heroesdb',                   // <- the database name
  storage: getRxStorageDexie(),       // <- RxStorage plugin to use for this database

  /* Optional parameters: */
  password: 'myPassword',             // <- password (optional)
  multiInstance: true,                // <- multiInstance (optional, default: true)
  eventReduce: true,                  // <- eventReduce (optional, default: false)
  cleanupPolicy: {}                   // <- custom cleanup policy (optional) 
});
```

### name

A string which uniquely identifies the database. When two RxDatabases have the same name and use the same `RxStorage`, their data can be assumed as equal and they will share events between each other. If using filesystem based storage the name will be used to define the directory used for your data.


### storage

RxDatabase makes used of the `RxStorage` interface. This interface is an abstraction that allows you to use different underlying databases for data handling/persistence. Different `RxStorage` plugins can be chosen for your application depending on target environment and performance requirements. For example you can use the [Dexie RxStorage](./rx-storage-dexie.md) in the browser or the LokiJS plugin with the filesystem adapter in Node.js.

```javascript

// use the Dexie.js RxStorage which stores data in IndexedDB.
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const dbDexie = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageDexie()
});


// ...or use the LokiJS RxStorage with the indexeddb adapter.
import { getRxStorageLoki } from 'rxdb/plugins/storage-lokijs';
const LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');

const dbLoki = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageLoki({
    adapter: new LokiIncrementalIndexedDBAdapter()
  })
});
```

Please refer to the full list of [RxStorage implementations](./rx-storage.md) here.

### password
`(optional)`
If you want to [use encrypted fields](./encryption.md) in your database you, or the user, will need to provide a password. The password must be a string with at least 12 characters.

### multiInstance
`(optional=true)`
When you create more than one instance of the same database in a single javascript-runtime, you should set `multiInstance` to ```true```. This will enable event sharing between the active instances. For example when the user has opened multiple browser windows, events will be shared between them so that all windows react to the same changes.
`multiInstance` should be set to `false` when you have single instances like a single Node.js-process, a react-native-app, a cordova-app or a single-window electron app, and  decreases app startup time because no coordination is needed.

### eventReduce
`(optional=false)`

One big benefit of having a realtime database is that significant performance optimizations are possible when the database knows a query is observed and the updated results are needed continuously. RxDB uses the [EventReduce Algorithm](https://github.com/pubkey/event-reduce) to optimize observed or recurring queries.

For better performance, you should always set `eventReduce: true`. This will also be the default in the next major RxDB version.

### ignoreDuplicate
`(optional=false)`
If you create multiple RxDatabase instances with the same name and adapter, it's very likely that you have done something wrong. To prevent this common mistake, RxDB will throw an error in such cases. In rare instances where this is intentional (such as unit tests) you can set `ignoreDuplicate` to `true` to prevent the error.

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
Calling this will return an [rxjs-Observable](http://reactivex.io/documentation/observable.html) which streams all write events on the `RxDatabase`.

```javascript
const myDatabase = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageDexie()
});

myDatabase.$.subscribe(changeEvent => console.dir(changeEvent));
```

### exportJSON()
Use this function to create a json export of all documents in all collections in the database. You can pass `true` as a parameter to decrypt any encrypted document fields.

To use the `exportJSON()` and `importJSON()` functions you have to add the `json-dump` plugin.

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
To import a json dump into your database, use this function (see `exportJSON` above to make the plugin available). 

```javascript
// import the dump to the database
emptyDatabase.importJSON(json)
  .then(() => console.log('done'));
```

### backup()

Writes the current (or ongoing) database state to the filesystem. [Read more](./backup.md)

### waitForLeadership()
Returns a Promise which resolves when the RxDatabase becomes [elected leader](./leader-election.md).

### requestIdlePromise()
Returns a promise which resolves when the database is in idle. This works similar to [requestIdleCallback](https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback) but tracks the idle-ness of the database instead of the CPU.
Use this for semi-important tasks like cleanups which should not affect the speed of more important tasks.

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
Destroys the RxDatabase object instance. This is to free up memory and stop all observers and replications.
Returns a `Promise` that resolves when the database is destroyed.

```javascript
await myDatabase.destroy();
```

Note that `destroy()` will not remove the data from storage, the data will still be available when an RxDatabase instance with the same name and storage adapter is created again. 

### remove()
Deletes all documents from the storage. Use this to free up disc space.

```javascript
await myDatabase.remove();
// database instance is now gone

// NOTICE: You can also clear a database without removing its instance
import { removeRxDatabase } from 'rxdb';
removeRxDatabase('mydatabasename', 'localstorage');
```

### isRxDatabase
Returns true if the given object is an instance of RxDatabase. Returns false if not.
```javascript
import { isRxDatabase } from 'rxdb';
const isRXDBInstance = isRxDatabase(myObj);
```
