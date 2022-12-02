# SQLite RxStorage

This storage is based on [SQLite](https://www.sqlite.org/index.html) and is made to work with **Node.js**, **Electron**, **React Native**, **Cordova** and **Capacitor**.


### Pros

- Much faster compared to the PouchDB+SQLite `RxStorage`
- Small build size

### Cons

- It is part of [RxDB Premium](./premium.md)
- At the moment it is not possible to use regex queries with the SQLite RxStorage.

### Requirements

The SQlite RxStorage works on SQLite libraries that use SQLite in version `3.38.0` or higher, because it uses the [SQLite JSON](https://www.sqlite.org/json1.html) methods like `JSON_EXTRACT`. If you get an error like `[Error: no such function: JSON_EXTRACT (code 1 SQLITE_ERROR[1])`, you might have a too old version of SQLite.

## Usage with **Node.js SQLite**

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageSQLite,
    getSQLiteBasicsNode
} from 'rxdb-premium/plugins/sqlite';

/**
 * In Node.js, we get use the SQLite database
 * from the 'sqlite' npm module.
 * @link https://www.npmjs.com/package/sqlite3
 */
import sqlite3 from 'sqlite3';

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageSQLite({
        /**
         * Different runtimes have different interfaces to SQLite.
         * For example in node.js we have a callback API,
         * while in capacitor sqlite we have Promises.
         * So we need a helper object that is capable of doing the basic
         * sqlite operations.
         */
        sqliteBasics: getSQLiteBasicsNode(sqlite3)
    })
});
```

## Usage with **React Native**

1. Install the [react-native-quick-sqlite npm module](https://www.npmjs.com/package/react-native-quick-sqlite)
2. Import `getSQLiteBasicsQuickSQLite` from the SQLite plugin and use it to create a [RxDatabase](./rx-database.md):

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageSQLite,
    getSQLiteBasicsQuickSQLite
} from 'rxdb-premium/plugins/sqlite';
import { openDatabase } from 'react-native-quick-sqlite';

// create database
const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    multiInstance: false, // <- Set multiInstance to false when using RxDB in React Native
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsQuickSQLite(openDatabase)
    })
});
```


## Usage with **SQLite Capacitor**

1. Install the [sqlite capacitor npm module](https://github.com/capacitor-community/sqlite)
2. Add the iOS database location to your capacitor config

```json
{
    "plugins": {
        "CapacitorSQLite": {
            "iosDatabaseLocation": "Library/CapacitorDatabase"
        }
    }
}
```

3. Use the function `getSQLiteBasicsCapacitor` to get the capacitor sqlite wrapper.


```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageSQLite,
    getSQLiteBasicsCapacitor
} from 'rxdb-premium/plugins/sqlite';

/**
 * Import SQLite from the capacitor plugin.
 */
import {
    CapacitorSQLite,
    SQLiteConnection
} from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const sqlite = new SQLiteConnection(CapacitorSQLite);

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageSQLite({
        /**
         * Different runtimes have different interfaces to SQLite.
         * For example in node.js we have a callback API,
         * while in capacitor sqlite we have Promises.
         * So we need a helper object that is capable of doing the basic
         * sqlite operations.
         */
        sqliteBasics: getSQLiteBasicsCapacitor(sqlite, Capacitor)
    })
});
```


## Known Problems

- [expo-sqlite](https://www.npmjs.com/package/expo-sqlite) cannot be used on android (but it works on iOS) because it uses and [outdated SQLite version](https://expo.canny.io/feature-requests/p/expo-sqlite-ship-newer-sqlite3-version-on-android)


## Related
- [React Native Databases](./react-native-database.md)
