# SQLite RxStorage

This storage is based on [SQLite](https://www.sqlite.org/index.html) and is made to work with **Node.js**, **Electron**, **React Native**, **Cordova** and **Capacitor**.


### Pros

- Much faster compared to the PouchDB+SQLite `RxStorage`
- Small build size

### Cons

- It is part of [RxDB Premium](./premium.md)
- At the moment it is not possible to use regex queries with the SQLite RxStorage.
- Requires at least SQLite version `3.38.0` (2022-02-22).

## Usage (with Node.js SQLite)

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



## Usage (with SQLite Capacitor)

1. Install the [sqlite capacitor plugin](https://github.com/capacitor-community/sqlite)
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


