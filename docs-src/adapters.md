# Adapters

RxDB itself is not a self-contained database. It uses adapters that define where the data is stored. Depending on which environment you work in, you can choose between different adapters. For example in the browser you want to store the data inside of IndexedDB but on NodeJs you want to store the data on the filesystem.

This page is an overview over the different adapters with recommendations on what to use where.

**Please always ensure that your pouchdb adapter-version is the same as `pouchdb-core` in the [rxdb package.json](https://github.com/pubkey/rxdb/blob/master/package.json). Otherwise you might have strange problems**

# Any environment

## Memory
In any environment, you can use the memory-adapter. It stores the data in the javascript runtime memory. This means it is not persistent and the data is lost when the process terminates.

Use this adapter when:
  - You want to have a really good performance
  - You do not want persistent state, for example in your test suite

```js
// npm install pouchdb-adapter-memory --save
addRxPlugin(require('pouchdb-adapter-memory'));

const database = await createRxDatabase({
    name: 'mydatabase',
    adapter: 'memory' // the name of your adapter
});
```

## Memdown
With RxDB you can also use adapters that implement [abstract-leveldown](https://github.com/Level/abstract-leveldown) like the memdown-adapter.

```js
// npm install memdown --save
// npm install pouchdb-adapter-leveldb --save
addRxPlugin(require('pouchdb-adapter-leveldb')); // leveldown adapters need the leveldb plugin to work

const memdown = require('memdown');

const database = await createRxDatabase({
    name: 'mydatabase',
    adapter: memdown // the full leveldown-module
});
```


# Browser


## IndexedDB

The IndexedDB adapter stores the data inside of [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) use this in browsers environments as default.

```js
// npm install pouchdb-adapter-idb --save
addRxPlugin(require('pouchdb-adapter-idb'));

const database = await createRxDatabase({
    name: 'mydatabase',
    adapter: 'idb' // the name of your adapter
});
```

## IndexedDB (new)

A reimplementation of the indexeddb adapter which uses native secondary indexes. Should have a much better performance but can behave [different on some edge cases](https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules/pouchdb-adapter-indexeddb#differences-between-couchdb-and-pouchdbs-find-implementations-under-indexeddb).

```js
// npm install pouchdb-adapter-indexeddb --save
addRxPlugin(require('pouchdb-adapter-indexeddb'));

const database = await createRxDatabase({
    name: 'mydatabase',
    adapter: 'indexeddb' // the name of your adapter
});
```

## Websql

This adapter stores the data inside of websql. It has a different performance behavior. [Websql is deprecated](https://softwareengineering.stackexchange.com/questions/220254/why-is-web-sql-database-deprecated). You should not use the websql adapter unless you have a really good reason.

```js
// npm install pouchdb-adapter-websql --save
addRxPlugin(require('pouchdb-adapter-websql'));

const database = await createRxDatabase({
    name: 'mydatabase',
    adapter: 'websql' // the name of your adapter
});
```

# NodeJS

## leveldown

This adapter uses a [LevelDB C++ binding](https://github.com/Level/leveldown) to store that data on the filesystem. It has the best performance compared to other filesystem adapters. This adapter can **not** be used when multiple nodejs-processes access the same filesystem folders for storage.

```js
// npm install leveldown --save
// npm install pouchdb-adapter-leveldb --save
addRxPlugin(require('pouchdb-adapter-leveldb')); // leveldown adapters need the leveldb plugin to work
const leveldown = require('leveldown');

const database = await createRxDatabase({
    name: 'mydatabase',
    adapter: leveldown // the full leveldown-module
});

// or use a specific folder to store the data
const database = await createRxDatabase({
    name: '/root/user/project/mydatabase',
    adapter: leveldown // the full leveldown-module
});
```

## Node-Websql

This adapter uses the [node-websql](https://github.com/nolanlawson/node-websql)-shim to store data on the filesystem. It's advantages are that it does not need a leveldb build and it can be used when multiple nodejs-processes use the same database-files.

```js
// npm install pouchdb-adapter-node-websql --save
addRxPlugin(require('pouchdb-adapter-node-websql'));

const database = await createRxDatabase({
    name: 'mydatabase',
    adapter: 'websql' // the name of your adapter
});

// or use a specific folder to store the data
const database = await createRxDatabase({
    name: '/root/user/project/mydatabase',
    adapter: 'websql' // the name of your adapter
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
import { addRxPlugin, createRxDatabase } from 'rxdb';
import SQLite from 'react-native-sqlite-2'
import SQLiteAdapterFactory from 'pouchdb-adapter-react-native-sqlite'

const SQLiteAdapter = SQLiteAdapterFactory(SQLite)

addRxPlugin(SQLiteAdapter);
addRxPlugin(require('pouchdb-adapter-http'));

const database = await createRxDatabase({
    name: 'mydatabase',
    adapter: 'react-native-sqlite' // the name of your adapter
});
```

## asyncstorage

Uses react-native's [asyncstorage](https://facebook.github.io/react-native/docs/asyncstorage).

**Notice**: There are [known problems](https://github.com/pubkey/rxdb/issues/2286) with this adapter and it is **not** recommended to use it.

```js
// npm install pouchdb-adapter-asyncstorage --save
addRxPlugin(require('pouchdb-adapter-asyncstorage'));

const database = await createRxDatabase({
    name: 'mydatabase',
    adapter: 'node-asyncstorage' // the name of your adapter
});
```

## asyncstorage-down
A leveldown adapter that stores on asyncstorage.

```js
// npm install pouchdb-adapter-asyncstorage-down --save
addRxPlugin(require('pouchdb-adapter-leveldb')); // leveldown adapters need the leveldb plugin to work

const asyncstorageDown = require('asyncstorage-down');

const database = await createRxDatabase({
    name: 'mydatabase',
    adapter: asyncstorageDown // the full leveldown-module
});
```

# Cordova / Phonegap

## cordova-sqlite

Uses cordova's global `cordova.sqlitePlugin`.

```js
// npm install pouchdb-adapter-cordova-sqlite --save
addRxPlugin(require('pouchdb-adapter-cordova-sqlite'));

const database = await createRxDatabase({
    name: 'mydatabase',
    adapter: 'cordova-sqlite' // the name of your adapter
});
```

--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./tutorials/typescript.md)
