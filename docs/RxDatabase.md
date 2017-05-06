# RxDatabase

A RxDatabase-Object contains your collections and handles the synchronisation of change-events.

## Creation

The database is created by the asynchronous `.create()` function of the main RxDB module. It has the following 4 parameters.

```javascript
const db = await RxDB.create({
  name: 'heroesDB',           // <- name
  adapter: 'websql',          // <- storage-adapter
  password: 'myPassword',     // <- password (optional)
  multiInstance: true         // <- multiInstance (default: true)
});
console.dir(db);
```

### name

The database-name is a string which identifies the database. When two RxDatabases have the same name and use the same storage-adapter, their data can be assumed as equal and they will share change-events between each other.
Depending on the adapter this can also be used to define the storage-folder of your data.


### adapter

The storage-adapter defines where the data is actually stored at. You can use a string for [pouchdb-adapters](https://pouchdb.com/adapters.html) or an object for level-adapters. To use an adapter it must before have been added with the RxDB.plugin()-function.

Before using a level-adapter, you have to add the ``` pouchdb-adapter-leveldb``` module.

Example with level-adapter:

```javascript
import { default as memdown } from 'memdown';
RxDB.plugin(require('pouchdb-adapter-leveldb'));
const db = await RxDB.create({name: 'mydatabase', adapter: memdown});
```

### password (optional)
If you want to use encrypted fields in the collections of a database, you have to set a password for it. The password must be a string with at least 12 characters.

### multiInstance (optional=true)
When you create more than one instance of the same database in a single javascript-runtime, you should set multiInstance to ```true```. This will enable the event-sharing between the two instances **serverless**. This should be set to `false` when you have single-instances like a single nodejs-process, a react-native-app, a cordova-app or a single-window electron-app.


## Functions

### Observe with $
Calling this will return an [rxjs-Observable](http://reactivex.io/rxjs/manual/overview.html#observable) which streams every change to data of this database.

```js
myDb.$.subscribe(changeEvent => console.dir(changeEvent));
```

### waitForLeadership()
Returns a Promise which resolves when the RxDatabase becomes [elected leader](./LeaderElection.md).

### dump()
Use this function to create a json-export from every piece of data in every collection of this database. You can pass true as parameter to decrypted the encrypted data-fields of your document.
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


-----------
If you are new to RxDB, you should continue [here](./RxSchema.md)
