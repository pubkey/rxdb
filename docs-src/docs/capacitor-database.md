---
title: Capacitor Database Guide - SQLite, RxDB & More
slug: capacitor-database.html
description: Explore Capacitor's top data storage solutions - from key-value to real-time databases. Compare SQLite, RxDB, and more in this in-depth guide.
---


import {Tabs} from '@site/src/components/tabs';
import {Steps} from '@site/src/components/steps';

# Capacitor Database - SQLite, RxDB and others

[Capacitor](https://capacitorjs.com/) is an open source native JavaScript runtime to build Web based Native apps. You can use it to create cross-platform iOS, Android, and Progressive Web Apps with the web technologies JavaScript, HTML, and CSS.
It is developed by the Ionic Team and provides a great alternative to create hybrid apps. Compared to [React Native](./react-native-database.md), Capacitor is more Web-Like because the JavaScript runtime supports most Web APIs like IndexedDB, fetch,  and so on.

To read and write persistent data in Capacitor, there are multiple solutions which are shown in the following.

<p align="center">
  <img src="./files/icons/capacitor.svg" alt="Capacitor" width="50" />
</p>



## Database Solutions for Capacitor



### Preferences API

Capacitor comes with a native [Preferences API](https://capacitorjs.com/docs/apis/preferences) which is a simple, persistent key->value store for lightweight data, similar to the browsers localstorage or React Native [AsyncStorage](./react-native-database.md#asyncstorage).

To use it, you first have to install it from npm `npm install @capacitor/preferences` and then you can import it and write/read data.
Notice that all calls to the preferences API are asynchronous so they return a `Promise` that must be `await`-ed.

```ts
import { Preferences } from '@capacitor/preferences';


// write
await Preferences.set({
  key: 'foo',
  value: 'baar',
});

// read
const { value } = await Preferences.get({ key: 'foo' }); // > 'bar'

// delete
await Preferences.remove({ key: 'foo' });
```

The preferences API is good when only a small amount of data needs to be stored and when no query capabilities besides the key access are required. Complex queries or other features like indexes or replication are not supported which makes the preferences API not suitable for anything more than storing simple data like user settings.

### Localstorage/IndexedDB/WebSQL

Since Capacitor apps run in a web view, Web APIs like IndexedDB, [Localstorage](./articles/localstorage.md) and WebSQL are available. But the default browser behavior is to clean up these storages regularly when they are not in use for a long time or the device is low on space. Therefore you cannot 100% rely on the persistence of the stored data and your application needs to expect that the data will be lost eventually.

Storing data in these storages can be done in browsers, because there is no other option. But in Capacitor iOS and Android, you should not rely on these.

### SQLite

SQLite is a SQL based relational database written in C that was crafted to be embed inside of applications. Operations are written in the SQL query language and SQLite generally follows the PostgreSQL syntax.

To use SQLite in Capacitor, there are three options:

- The [@capacitor-community/sqlite](https://github.com/capacitor-community/sqlite) package
- The [cordova-sqlite-storage](https://github.com/storesafe/cordova-sqlite-storage) package
- The non-free [Ionic](./articles/ionic-database.md) [Secure Storage](https://ionic.io/products/secure-storage) which comes at **999$** per month.


It is recommended to use the `@capacitor-community/sqlite` because it has the best maintenance and is open source. Install it first `npm install --save @capacitor-community/sqlite` and then set the storage location for iOS apps:

```json
{
    "plugins": {
        "CapacitorSQLite": {
            "iosDatabaseLocation": "Library/CapacitorDatabase"
        }
    }
}
```

Now you can create a database connection and use the SQLite database.

```ts
import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite, SQLiteDBConnection, SQLiteConnection, capSQLiteSet,
  capSQLiteChanges, capSQLiteValues, capEchoResult, capSQLiteResult,
  capNCDatabasePathResult
} from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);
const database: SQLiteDBConnection = await this.sqlite.createConnection(
    databaseName,
    encrypted,
    mode,
    version,
    readOnly
);
let { rows } = database.query('SELECT somevalue FROM sometable');
```


The downside of SQLite is that it is lacking many features that are handful when using a database together with an UI based application like your Capacitor app. For example it is not possible to observe queries or document fields. Also there is no realtime replication feature, you can only import json files. This makes SQLite a good solution when you just want to store data on the client, but when you want to sync data with a server or other clients or create big complex realtime applications, you have to use something else.



### RxDB

<p align="center">
  <img src="./files/logo/rxdb_javascript_database.svg" alt="RxDB" width="170" />
</p>


[RxDB](https://rxdb.info/) is an local first, NoSQL database for JavaScript Applications like hybrid apps. Because it is reactive, you can subscribe to all state changes like the result of a query or even a single field of a document. This is great for UI-based realtime applications in a way that makes it easy to develop realtime applications like what you need in Capacitor.

Because RxDB is made for Web applications, most of the [available RxStorage](./rx-storage.md) plugins can be used to store and query data in a Capacitor app. However it is recommended to use the [SQLite RxStorage](./rx-storage-sqlite.md) because it stores the data on the filesystem of the device, not in the JavaScript runtime (like IndexedDB). Storing data on the filesystem ensures it is persistent and will not be cleaned up by any process. Also the performance of SQLite is [much faster](./rx-storage.md#performance-comparison) compared to IndexedDB, because SQLite does not have to go through a browsers permission layers. For the SQLite binding you should use the [@capacitor-community/sqlite](https://github.com/capacitor-community/sqlite) package.

Because the SQLite RxStorage is part of the [👑 Premium Plugins](/premium/) which must be purchased, it is recommended to use the [Dexie.js RxStorage](./rx-storage-dexie.md) while testing and prototyping your Capacitor app.


To use the SQLite RxStorage in Capacitor you have to install all dependencies via `npm install rxdb rxjs rxdb-premium @capacitor-community/sqlite`.

For iOS apps you should add a database location in your Capacitor settings:

```json
{
    "plugins": {
        "CapacitorSQLite": {
            "iosDatabaseLocation": "Library/CapacitorDatabase"
        }
    }
}
```

Then you can assemble the RxStorage and create a database with it:


<Steps>


### Import RxDB and SQLite

```ts
import {
    createRxDatabase
} from 'rxdb/plugins/core';
import {
    CapacitorSQLite,
    SQLiteConnection
} from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
const sqlite = new SQLiteConnection(CapacitorSQLite);
```

### Import the RxDB SQLite Storage

<Tabs>

#### RxDB Core

```ts
import {
    getRxStorageSQLiteTrial,
    getSQLiteBasicsCapacitor
} from 'rxdb/plugins/storage-sqlite';
```

#### RxDB Premium 👑

```ts
import {
    getRxStorageSQLite,
    getSQLiteBasicsCapacitor
} from 'rxdb-premium/plugins/storage-sqlite';
```

</Tabs>

### Create a Database with the Storage

<Tabs>

#### RxDB Core

```ts
// create database
const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageSQLiteTrial({
        sqliteBasics: getSQLiteBasicsCapacitor(sqlite, Capacitor)
    })
});
```

#### RxDB Premium 👑

```ts
// create database
const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsCapacitor(sqlite, Capacitor)
    })
});
```

</Tabs>


### Add a Collection

```ts
// create collections
const collections = await myRxDatabase.addCollections({
    humans: {
        schema: {
            version: 0,
            type: 'object',
            primaryKey: 'id',
            properties: {
                id: { type: 'string', maxLength: 100 },
                name: { type: 'string' },
                age: { type: 'number' }
              },
            required: ['id', 'name']
        }
    }
});
```

### Insert a Document

```ts
await collections.humans.insert({id: 'foo', name: 'bar'});
```

### Run a Query

```ts
const result = await collections.humans.find({
    selector: {
        name: 'bar'
    }
}).exec();
```

### Observe a Query

```ts
await collections.humans.find({
    selector: {
        name: 'bar'
    }
}).$.subscribe(result => {/* ... */});
```


</Steps>


## Follow up

- If you haven't done yet, you should start learning about RxDB with the [Quickstart Tutorial](./quickstart.md).
- There is a followup list of other [client side database alternatives](./alternatives.md).
