---
title: RxDatabase - The Core of Your Realtime Data
slug: rx-database.html
description: Get started with RxDatabase and integrate multiple storages. Learn to create, encrypt, and optimize your realtime database today.
---

# RxDatabase

A RxDatabase-Object contains your collections and handles the synchronization of change-events.

## Creation

The database is created by the asynchronous `.createRxDatabase()` function of the core RxDB module. It has the following parameters:

```javascript
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
  name: 'heroesdb',                   // <- name
  storage: getRxStorageLocalstorage(),       // <- RxStorage

  /* Optional parameters: */
  password: 'myPassword',             // <- password (optional)
  multiInstance: true,                // <- multiInstance (optional, default: true)
  eventReduce: true,                  // <- eventReduce (optional, default: false)
  cleanupPolicy: {}                   // <- custom cleanup policy (optional) 
});
```

### name

The database-name is a string which uniquely identifies the database. When two RxDatabases have the same name and use the same `RxStorage`, their data can be assumed as equal and they will share events between each other.
Depending on the storage or adapter this can also be used to define the filesystem folder of your data.


### storage

RxDB works on top of an implementation of the [RxStorage](./rx-storage.md) interface. This interface is an abstraction that allows you to use different underlying databases that actually handle the documents. Depending on your use case you might use a different `storage` with different tradeoffs in performance, bundle size or supported runtimes.

There are many `RxStorage` implementations that can be used depending on the JavaScript environment and performance requirements.
For example you can use the [LocalStorage RxStorage](./rx-storage-localstorage.md) in the browser or use the [MongoDB RxStorage](./rx-storage-mongodb.md) in Node.js.

- [List of RxStorage implementations](./rx-storage.md)

```javascript

// use the LocalStroage that stores data in the browser.
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageLocalstorage()
});


// ...or use the MongoDB RxStorage in Node.js.
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';

const dbMongo = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageMongoDB({
    connection: 'mongodb://localhost:27017,localhost:27018,localhost:27019'
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
`multiInstance` should be set to `false` when you have single-instances like a single Node.js-process, a react-native-app, a cordova-app or a single-window [electron](./electron-database.md) app which can decrease the startup time because no instance coordination has to be done.

### eventReduce
`(optional=false)`

One big benefit of having a realtime database is that big performance optimizations can be done when the database knows a query is observed and the updated results are needed continuously. RxDB uses the [EventReduce Algorithm](https://github.com/pubkey/event-reduce) to optimize observer or recurring queries.

For better performance, you should always set `eventReduce: true`. This will also be the default in the next major RxDB version.


### ignoreDuplicate
`(optional=false)`
If you create multiple RxDatabase-instances with the same name and same adapter, it's very likely that you have done something wrong.
To prevent this common mistake, RxDB will throw an error when you do this.
In some rare cases like unit-tests, you want to do this intentional by setting `ignoreDuplicate` to `true`. Because setting `ignoreDuplicate: true` in production will decrease the performance by having multiple instances of the same database, `ignoreDuplicate` is only allowed to be set in [dev-mode](./dev-mode.md).

```js
const db1 = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageLocalstorage(),
  ignoreDuplicate: true
});
const db2 = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageLocalstorage(),
  ignoreDuplicate: true // this create-call will not throw because you explicitly allow it
});
```

### closeDuplicates
`(optional=false)`

Closes all other RxDatabases instances that have the same storage+name combination.

```js
const db1 = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageLocalstorage(),
  closeDuplicates: true
});
const db2 = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageLocalstorage(),
  closeDuplicates: true // this create-call will close db1
});

// db1 is now closed.
```



### hashFunction

By default, RxDB will use `crypto.subtle.digest('SHA-256', data)` for hashing. If you need a different hash function or the `crypto.subtle` API is not supported in your JavaScript runtime, you can provide an own hash function instead. A hash function gets a string as input and returns a `Promise` that resolves a string.

```ts
// example hash function that runs in plain JavaScript
import { sha256 } from 'ohash';
function myOwnHashFunction(input: string) {
    return Promise.resolve(sha256(input));
}
const db = await createRxDatabase({
  hashFunction: myOwnHashFunction
  /* ... */
});
```

If you get the error message `TypeError: Cannot read properties of undefined (reading 'digest')` this likely means that you are neither running on `localhost` nor on `https` which is why your browser might not allow access to `crypto.subtle.digest`.

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

### close()
Closes the databases object-instance. This is to free up memory and stop all observers and replications.
Returns a `Promise` that resolves when the database is closed.
Closing a database will not remove the databases data. When you create the database again with `createRxDatabase()`, all data will still be there.
```javascript
await myDatabase.close();
```

### remove()
Wipes all documents from the storage. Use this to free up disc space.

```javascript
await myDatabase.remove();
// database instance is now gone
```


You can also clear a database without removing its instance by using `removeRxDatabase()`. This is useful if you want to migrate data or reset the users state by renaming the database. Then you can remove the previous data with `removeRxDatabase()` without creating a RxDatabase first. Notice that this will only remove the
stored data on the storage. It will not clear the cache of any [RxDatabase](./rx-database.md) instances.
```javascript
import { removeRxDatabase } from 'rxdb';
removeRxDatabase('mydatabasename', 'localstorage');
```

### isRxDatabase
Returns true if the given object is an instance of RxDatabase. Returns false if not.
```javascript
import { isRxDatabase } from 'rxdb';
const is = isRxDatabase(myObj);
```


### collections$

Emits events whenever a [RxCollection](./rx-collection.md) is added or removed to the instance of the RxDatabase. Notice that this only emits the JavaScript instance of the RxCollection class, it does not emit events accross browser tabs.

```javascript
const sub = myDatabase.collections$.subscribe(event => {
  console.dir(event);
});

await myDatabase.addCollections({
  heroes: {
    schema: mySchema
  }
});

// -> emits the event

sub.unsubscribe();
```


