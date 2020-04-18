# RxDatabase

A RxDatabase-Object contains your collections and handles the synchronisation of change-events.

## Creation

The database is created by the asynchronous .create()-function of the main RxDB-module. It has the following parameters:

```javascript
import { createRxDatabase } from 'rxdb';
const db = await createRxDatabase({
  name: 'heroesdb',           // <- name
  adapter: 'idb',          // <- storage-adapter
  password: 'myPassword',     // <- password (optional)
  multiInstance: true,         // <- multiInstance (optional, default: true)
  eventReduce: false // <- eventReduce (optional, default: true)
});
console.dir(db);
```

### name

The database-name is a string which uniquely identifies the database. When two RxDatabases have the same name and use the same storage-adapter, their data can be assumed as equal and they will share change-events between each other.
Depending on the adapter this can also be used to define the storage-folder of your data.


### adapter

RxDB uses adapters to define where the data is actually stored at. You can use different adapters depending on which environment your database runs in. This has the advantage that you can use the same RxDB code in different environments and just switch out the adapter.

Example for browsers:

```javascript

// this adapter stores the data in indexeddb
addRxPlugin(require('pouchdb-adapter-idb'));

const db = await createRxDatabase({
  name: 'mydatabase',
  adapter: 'idb' // name of the adapter
});
```

** Check out the [List of adapters for RxDB](./adapters.md) to learn which adapter you should use. **


### password
`(optional)`
If you want to use encrypted fields in the collections of a database, you have to set a password for it. The password must be a string with at least 12 characters.

### multiInstance
`(optional=true)`
When you create more than one instance of the same database in a single javascript-runtime, you should set multiInstance to ```true```. This will enable the event-sharing between the two instances **serverless**. This should be set to `false` when you have single-instances like a single nodejs-process, a react-native-app, a cordova-app or a single-window electron-app.

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
  adapter: 'websql',
  ignoreDuplicate: true
});
const db2 = await createRxDatabase({
  name: 'heroesdb',
  adapter: 'websql',
  ignoreDuplicate: true // this create-call will not throw because you explicitly allow it
});
```

### pouchSettings
You can pass settings directly to the [pouchdb database create options](https://pouchdb.com/api.html#options) through this property. This settings will be added to all pouchdb-instances that are created for this database.

## Functions

### Observe with $
Calling this will return an [rxjs-Observable](http://reactivex.io/documentation/observable.html) which streams every change to data of this database.

```js
myDb.$.subscribe(changeEvent => console.dir(changeEvent));
```

### dump()
Use this function to create a json-export from every piece of data in every collection of this database. You can pass `true` as a parameter to decrypt the encrypted data-fields of your document.
```js
myDatabase.dump()
  .then(json => console.dir(json));

// decrypted dump
myDatabase.dump(true)
  .then(json => console.dir(json));
```

### importDump()
To import the json-dumps into your database, use this function.

```js
// import the dump to the database
emptyDatabase.importDump(json)
  .then(() => console.log('done'));
```

### server()
Spawns a couchdb-compatible server from the database. [Read more](./custom-build.md#server)

### waitForLeadership()
Returns a Promise which resolves when the RxDatabase becomes [elected leader](./leader-election.md).

### requestIdlePromise()
Returns a promise which resolves when the database is in idle. This works similar to [requestIdleCallback](https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback) but tracks the idle-ness of the database instead of the CPU.
Use this for semi-important tasks like cleanups which should not affect the speed of important tasks.

```js

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
Destroys the databases object-instance. This is to free up memory and stop all observings and replications.
Returns a `Promise` that resolves when the database is destroyed.
```js
await myDatabase.destroy();
```

### remove()
Removes the database and wipes all data of it from the storage.

```js
await myDatabase.remove();
// database is now gone

// NOTICE: You can also remove a database without its instance
import { removeRxDatabase } from 'rxdb';
removeRxDatabase('mydatabasename', 'localstorage');
```

### checkAdapter()
Checks if the given adapter can be used with RxDB in the current environment.

```js
import { checkAdapter, addRxPlugin } from 'rxdb';
addRxPlugin(require('pouchdb-adapter-localstorage')); // adapter must be added before

const ok = await checkAdapter('localstorage');
console.dir(ok); // true on most browsers, false on nodejs
```

### isRxDatabase
Returns true if the given object is an instance of RxDatabase. Returns false if not.
```js
import { isRxDatabase } from 'rxdb';
const is = isRxDatabase(myObj);
```


-----------
If you are new to RxDB, you should continue [here](./rx-schema.md)
