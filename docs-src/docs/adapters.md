---
title: PouchDB Adapters
slug: adapters.html
image: /headers/adapters.jpg
---

# PouchDB Adapters



When you use PouchDB `RxStorage`, there are many adapters that define where the data has to be stored.
Depending on which environment you work in, you can choose between different adapters. For example, in the browser you want to store the data inside of [IndexedDB](./rx-storage-indexeddb.md) but on [NodeJS](./nodejs-database.md) you want to store the data on the filesystem.

This page is an overview over the different adapters with recommendations on what to use where.

---------------------- 

:::warning
The PouchDB RxStorage [is removed from RxDB](./rx-storage-pouchdb.md) and can no longer be used in new projects. You should switch to a different [RxStorage](./rx-storage.md).
:::

---------------------- 


Please always ensure that your pouchdb adapter-version is the same as `pouchdb-core` in the [rxdb package.json](https://github.com/pubkey/rxdb/blob/master/package.json). Otherwise, you might have strange problems.


# Any environment

## Memory
In any environment, you can use the memory-adapter. It stores the data in the javascript runtime memory. This means it is not persistent and the data is lost when the process terminates.

Use this adapter when:
  - You want to have really good performance
  - You do not want persistent state, for example in your test suite

```js
import {
    createRxDatabase
} from 'rxdb'
import {
    getRxStoragePouch
} from 'rxdb/plugins/pouchdb';
// npm install pouchdb-adapter-memory --save
addPouchPlugin(require('pouchdb-adapter-memory'));

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStoragePouch('memory')
});
```

## Memdown
With RxDB you can also use adapters that implement [abstract-leveldown](https://github.com/Level/abstract-leveldown) like the memdown-adapter.

```js
// npm install memdown --save
// npm install pouchdb-adapter-leveldb --save
addPouchPlugin(require('pouchdb-adapter-leveldb')); // leveldown adapters need the leveldb plugin to work

const memdown = require('memdown');

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStoragePouch(memdown) // the full leveldown-module
});
```


# Browser


## IndexedDB

The IndexedDB adapter stores the data inside of [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) use this in browsers environments as default.

```js
// npm install pouchdb-adapter-idb --save
addPouchPlugin(require('pouchdb-adapter-idb'));

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStoragePouch('idb')
});
```

## IndexedDB

A reimplementation of the indexeddb adapter which uses native secondary indexes. Should have a much better performance but can behave [different on some edge cases](https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules/pouchdb-adapter-indexeddb#differences-between-couchdb-and-pouchdbs-find-implementations-under-indexeddb).

:::note
Multiple users have reported problems with this adapter. It is **not** recommended to use this adapter.
:::

```js
// npm install pouchdb-adapter-indexeddb --save
addPouchPlugin(require('pouchdb-adapter-indexeddb'));

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStoragePouch('indexeddb')
});
```

## Websql

This adapter stores the data inside of websql. It has a different performance behavior. [Websql is deprecated](https://softwareengineering.stackexchange.com/questions/220254/why-is-web-sql-database-deprecated). You should not use the websql adapter unless you have a really good reason.

```js
// npm install pouchdb-adapter-websql --save
addPouchPlugin(require('pouchdb-adapter-websql'));

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStoragePouch('websql')
});
```

# NodeJS

## leveldown

This adapter uses a [LevelDB C++ binding](https://github.com/Level/leveldown) to store that data on the filesystem. It has the best performance compared to other filesystem adapters. This adapter can **not** be used when multiple nodejs-processes access the same filesystem folders for storage.

```js
// npm install leveldown --save
// npm install pouchdb-adapter-leveldb --save
addPouchPlugin(require('pouchdb-adapter-leveldb')); // leveldown adapters need the leveldb plugin to work
const leveldown = require('leveldown');

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStoragePouch(leveldown) // the full leveldown-module
});

// or use a specific folder to store the data
const database = await createRxDatabase({
    name: '/root/user/project/mydatabase',
    storage: getRxStoragePouch(leveldown) // the full leveldown-module
});
```

## Node-Websql

This adapter uses the [node-websql](https://github.com/nolanlawson/node-websql)-shim to store data on the filesystem. Its advantages are that it does not need a leveldb build and it can be used when multiple nodejs-processes use the same database-files.

```js
// npm install pouchdb-adapter-node-websql --save
addPouchPlugin(require('pouchdb-adapter-node-websql'));

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStoragePouch('websql') // the name of your adapter
});

// or use a specific folder to store the data
const database = await createRxDatabase({
    name: '/root/user/project/mydatabase',
    storage: getRxStoragePouch('websql') // the name of your adapter
});
```

# React-Native

## react-native-sqlite

Uses ReactNative SQLite as storage. Claims to be much faster than the asyncstorage adapter.
To use it, you have to do some steps from [this tutorial](https://dev.to/craftzdog/hacking-pouchdb-to-use-on-react-native-1gjh).

First install `pouchdb-adapter-react-native-sqlite` and `react-native-sqlite-2`.
```bash
npm install pouchdb-adapter-react-native-sqlite react-native-sqlite-2
```

Then you have to [link](https://facebook.github.io/react-native/docs/linking-libraries-ios) the library.
```bash
react-native link react-native-sqlite-2
```

You also have to add some polyfills which are need but not included in react-native.

```bash
npm install base-64 events
```

```js
import { decode, encode } from 'base-64'

if (!global.btoa) {
    global.btoa = encode;
}

if (!global.atob) {
    global.atob = decode;
}

// Avoid using node dependent modules
process.browser = true;
```

Then you can use it inside of your code.

```js
import { createRxDatabase } from 'rxdb';
import { addPouchPlugin, getRxStoragePouch } from 'rxdb/plugins/pouchdb';
import SQLite from 'react-native-sqlite-2'
import SQLiteAdapterFactory from 'pouchdb-adapter-react-native-sqlite'

const SQLiteAdapter = SQLiteAdapterFactory(SQLite)

addPouchPlugin(SQLiteAdapter);
addPouchPlugin(require('pouchdb-adapter-http'));

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStoragePouch('react-native-sqlite') // the name of your adapter
});
```

## asyncstorage

Uses react-native's [asyncstorage](https://facebook.github.io/react-native/docs/asyncstorage).

:::note
There are [known problems](https://github.com/pubkey/rxdb/issues/2286) with this adapter and it is **not** recommended to use it.
:::

```js
// npm install pouchdb-adapter-asyncstorage --save
addPouchPlugin(require('pouchdb-adapter-asyncstorage'));

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStoragePouch('node-asyncstorage') // the name of your adapter
});
```

## asyncstorage-down
A leveldown adapter that stores on asyncstorage.

```js
// npm install pouchdb-adapter-asyncstorage-down --save
addPouchPlugin(require('pouchdb-adapter-leveldb')); // leveldown adapters need the leveldb plugin to work

const asyncstorageDown = require('asyncstorage-down');

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStoragePouch(asyncstorageDown) // the full leveldown-module
});
```

# Cordova / Phonegap / Capacitor

## cordova-sqlite

Uses cordova's global `cordova.sqlitePlugin`. It can be used with cordova and [capacitor](./capacitor-database.md).

```js
// npm install pouchdb-adapter-cordova-sqlite --save
addPouchPlugin(require('pouchdb-adapter-cordova-sqlite'));

/**
 * In capacitor/cordova you have to wait until all plugins are loaded and 'window.sqlitePlugin'
 * can be accessed.
 * This function waits until document deviceready is called which ensures that everything is loaded.
 * @link https://cordova.apache.org/docs/de/latest/cordova/events/events.deviceready.html
 */
export function awaitCapacitorDeviceReady(): Promise<void> {
    return new Promise(res => {
        document.addEventListener('deviceready', () => {
            res();
        });
    });
}

async function getDatabase(){

    // first wait until the deviceready event is fired
    await awaitCapacitorDeviceReady();

    const database = await createRxDatabase({
        name: 'mydatabase',
        storage: getRxStoragePouch(
            'cordova-sqlite',
            // pouch settings are passed as second parameter
            {
                // for ios devices, the cordova-sqlite adapter needs to know where to save the data.
                iosDatabaseLocation: 'Library'
            }
        )
    });
}
```
