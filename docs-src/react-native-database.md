# React Native Database

React Native provides a cross-platform JavaScript runtime that runs on different operating systems like Android, iOS, Windows and others. Mostly it is used to create hybrid Apps that run on mobile devices at Android (google) and iOS (apple).

In difference to the JavaScript runtime of browsers, React Native does not support all HTML5 APIs and so it is not possible to use browser storage possibilities like localstorage, cookies, WebSQL or IndexedDB.
Instead a different storage solution must be chosen that does not come directly with React Native itself but has to be installed as a library or plugin.

**NOTICE:** You are reading this inside of the [RxDB](./) documentation, so everything might be opinionated.

<p align="center">
  <img src="./files/icons/react-native.png" alt="React Native" width="20" />
</p>

## Database Solutions for React-Native

There are multiple database solutions that can be used with React Native. While I would recommend to use [RxDB](./) for most use cases, it is still helpful to learn about other alternatives.

### AsyncStorage

AsyncStorage is a key->value storage solution that works similar to the browsers *localstorage* API. The big difference is that access to the AsyncStorage is not a blocking operation but instead everything is `Promise` based. This is a big benefit because long running writes and reads will not block your JavaScript process which would cause a laggy user interface.

```ts
/**
 * Because it is Promise-based,
 * you have to 'await' the call to getItem()
 */
await setItem('myKey', 'myValue');
const value = await AsyncStorage.getItem('myKey');
```


AsyncStorage was originaly included in [React Native itself](https://reactnative.dev/docs/asyncstorage). But it was deprecated by the React Native Team which recommends to use a community based package instead. There is a [community fork of AsyncStorage](https://github.com/react-native-async-storage/async-storage) that is actively maintained and open source.

AsyncStorage is fine when only a small amount of data needs to be stored and when no query capabilities besides the key-access are required. Complex queries or features are not supported which makes AsyncStorage not suitable for anything more then storing simple user settings data.


### SQLite

SQLite is a SQL based relational database written in C that was crafted to be embed inside of applications. Operations are written in the SQL query language and SQLite generally follows the PostgreSQL syntax.

To use SQLite in React Native, you first have to include the SQLite library itself as a plugin. There a different project out there that that can be used, but I would recommend to use the [react-native-quick-sqlite](https://github.com/ospfranco/react-native-quick-sqlite) project.

First you have to install the library into your React Native project via `npm install react-native-quick-sqlite`.
In your code you can then import the library and create a database connection:

```ts
import {open} from 'react-native-quick-sqlite';
const db = open('myDb.sqlite');
```

Notice that SQLite is a file based database where all data is stored directly in the filesystem of the OS. Therefore to create a connection, you have to provide a filename.

With the open connection you can then run SQL queries:

```ts
let { rows } = db.execute('SELECT somevalue FROM sometable');
```

If that does not work for you, you might want to try the [react-native-sqlite-storag](https://github.com/andpor/react-native-sqlite-storage) project instead which is also very popular.

The downside of SQLite is that it is lacking many features that are handfull when using a database together with an UI based application. For example it is not possible to observe queries or document fields.
Also there is no replication method. This makes SQLite a good solution when you want to solely store data on the client, but not when you want to sync data with a server or other clients.

### PouchDB

PouchDB is a JavaScript NoSQL database that follows the API of the [Apache CouchDB](https://couchdb.apache.org/) server database.
The core feature of PouchDB is the ability to do a two-way replication with any CouchDB compliant endpoint.
While PouchDB is pretty mature, it has some drawbacks that makes blocks it from being used in a client-side React Native application. For example it has to store all documents states over time which is required to replicate with CouchDB. Also it is not easily possible to fully purge documents and so it will fill up disc space over time. A big problem is also that PouchDB is not really maintained and major bugs like wrong query results are not fixed anymore. The performance of PouchDB is a general bottleneck which is caused by how it has to store and fetch documents while being compliant to CouchDB. The only real reason to use PouchDB in React Native, is when you want to replicate with a CouchDB or Couchbase server.

Because PouchDB is based on an adapter system for storage, there are two options to use it with React Native:

- Either use the [pouchdb-adapter-react-native-sqlite](https://github.com/craftzdog/pouchdb-react-native) adapter
- or the [pouchdb-adapter-asyncstorage](pouchdb-adapter-asyncstorage) adapter.

Because the `asyncstorage` adapter is no longer maintained, it is recommended to use the `native-sqlite` adapter:

First you have to install the adapter and other dependencies via `npm install pouchdb-adapter-react-native-sqlite react-native-quick-sqlite react-native-quick-websql`.

Then you have to craft a custom PouchDB class that combines these plugins:

```ts
import 'react-native-get-random-values';
import PouchDB from 'pouchdb-core';
import HttpPouch from 'pouchdb-adapter-http';
import replication from 'pouchdb-replication';
import mapreduce from 'pouchdb-mapreduce';
import SQLiteAdapterFactory from 'pouchdb-adapter-react-native-sqlite';
import WebSQLite from 'react-native-quick-websql';

const SQLiteAdapter = SQLiteAdapterFactory(WebSQLite);
export default PouchDB.plugin(HttpPouch)
  .plugin(replication)
  .plugin(mapreduce)
  .plugin(SQLiteAdapter);
```

This can then be used to create a PouchDB database instance which can store and query documents:

```ts
const db = new PouchDB('mydb.db', {
  adapter: 'react-native-sqlite'
});
```


## RxDB

[RxDB](./) is an offline-first, NoSQL-database for JavaScript Applications. Reactive means that you can not only query the current state, but subscribe to all state changes like the result of a query or even a single field of a document. This is great for UI-based realtime applications in a way that makes it easy to develop realtime applications like what you need in React Native.

There are multiple ways to use RxDB in React Native:

- Use the [memory RxStorage](./rx-storage-memory.md) that stores the data inside of the JavaScript memory without persistence
- Use the [LokiJS RxStorage](./rx-storage-lokijs.md) with the [react-native-lokijs](https://github.com/cawfree/react-native-lokijs) plugin
- Use the [PouchDB RxStorage](./rx-storage-pouchdb.md) with the SQLite plugin mentioned above.
- Use the [SQLite RxStorage](./rx-storage-sqlite.md) with the [react-native-quick-sqlite](https://github.com/ospfranco/react-native-quick-sqlite) plugin.

It is recommended to use the [SQLite RxStorage](./rx-storage-sqlite.md) because it has the best performance and is the easiest to set up. However it is part of the [Premium Plugins](./premium.md) which must be purchased, so to try out RxDB with React Native, you might want to use one of the other three options.

First you have to install all dependencies vai `npm install rxdb rxjs rxdb-premium react-native-quick-sqlite`.
Then you can assemble the RxStorage and create a database with it:

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageSQLite,
    getSQLiteBasicsQuickSQLite
} from 'rxdb-premium/plugins/sqlite';
import { openDatabase } from 'react-native-quick-sqlite';

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsQuickSQLite(openDatabase)
    })
});

const collections = await myRxDatabase.addCollections({
    humans: {
        /* ... */
    }
});

// insert document
await collections.humans.insert({id: 'foo', name: 'bar'});

// run a query
const result = await collections.humans.find({
    selector: {
        name: 'bar'
    }
}).exec();

// observe a query
const result = await collections.humans.find({
    selector: {
        name: 'bar'
    }
}).$.subscribe(results => {/* ... */});
```

Using the SQLite RxStorage is pretty fast, which is shown in the [performance comparison](./rx-storage.md#performance-comparison).

## WatermelonDB




## Firebase

- not really offline first

## Realm

- bound to mongodb cloud replication

## Using RxDB as React-Native Database



## Follow up

- If you haven't done yet, you should start learning about RxDB with the [Quickstart Tutorial](./quickstart.md).
- There is a followup list of other [client side database alternatives](./alternatives.md).
