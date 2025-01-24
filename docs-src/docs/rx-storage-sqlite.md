---
title: RxDB SQLite RxStorage for Hybrid Apps
slug: rx-storage-sqlite.html
description: Unlock seamless persistence with SQLite RxStorage. Explore usage in hybrid apps, compare performance, and leverage advanced features like attachments.
---

# SQLite RxStorage

This [RxStorage](./rx-storage.md) is based on [SQLite](https://www.sqlite.org/index.html) and is made to work with **Node.js**, [Electron](./electron-database.md), [React Native](./react-native-database.md) and [Capacitor](./capacitor-database.md) or SQLite via webassembly in the browser. It can be used with different so called `sqliteBasics` adapters to account for the differences in the various SQLite bundles and libraries that exist.

## Performance comparison with other storages

The SQLite storage is a bit slower compared to other Node.js based storages like the [Filesystem Storage](./rx-storage-filesystem-node.md) because wrapping SQLite has a bit of overhead and sending data from the JavaScript process to SQLite and backwards increases the latency. However for most hybrid apps the SQLite storage is the best option because it can leverage the SQLite version that comes already installed on the smartphones OS (iOS and android). Also for desktop electron apps it can be a viable solution because it is easy to ship SQLite together inside of the electron bundle.

<p align="center">
  <img src="./files/rx-storage-performance-node.png" alt="SQLite performance - Node.js" width="700" />
</p>


## Using the SQLite RxStorage 

To use the SQLite storage you have to import `getRxStorageSQLite` from the [RxDB Premium 👑](/premium/) package and then add the correct `sqliteBasics` adapter depending on which sqlite module you want to use. This can then be used as storage when creating the [RxDatabase](./rx-database.md). In the following you can see some examples for some of the most common SQLite packages.

## Usage with the **sqlite3 npm package**

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageSQLite,
    getSQLiteBasicsNode
} from 'rxdb-premium/plugins/storage-sqlite';

/**
 * In Node.js, we use the SQLite database
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

## Usage with the **node:sqlite** package

With Node.js version 22 and newer, you can use the "native" [sqlite module](https://nodejs.org/api/sqlite.html) that comes shipped with Node.js.

```ts
import { createRxDatabase } from 'rxdb';
import {
    getRxStorageSQLite,
    getSQLiteBasicsNodeNative
} from 'rxdb-premium/plugins/storage-sqlite';
import sqlite from 'node:sqlite';
const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsNodeNative(sqlite.DatabaseSync)
    })
});
```

## Usage with Webassembly in the Browser

In the browser you can use the [wa-sqlite](https://github.com/rhashimoto/wa-sqlite) package to run sQLite in Webassembly. The wa-sqlite module also allows to use persistence with IndexedDB or OPFS. Notice that in general SQLite via Webassembly is slower compared to other storages like [IndexedDB](./rx-storage-indexeddb.md) or [OPFS](./rx-storage-opfs.md) because sending data from the main thread to wasm and backwards is slow in the browser. Have a look the [performance comparison](./rx-storage-performance.md).

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageSQLite,
    getSQLiteBasicsWasm
} from 'rxdb-premium/plugins/storage-sqlite';

/**
 * In the Browser, we use the SQLite database
 * from the 'wa-sqlite' npm module. This contains the SQLite library
 * compiled to Webassembly
 * @link https://www.npmjs.com/package/wa-sqlite
 */
import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import SQLite from 'wa-sqlite';
const sqliteModule = await SQLiteESMFactory();
const sqlite3 = SQLite.Factory(module);

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsWasm(sqlite3)
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
} from 'rxdb-premium/plugins/storage-sqlite';
import { open } from 'react-native-quick-sqlite';

// create database
const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    multiInstance: false, // <- Set multiInstance to false when using RxDB in React Native
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsQuickSQLite(open)
    })
});
```

If `react-native-quick-sqlite` does not work for you, as alternative you can use the [react-native-sqlite-2](https://www.npmjs.com/package/react-native-sqlite-2) library instead:

```ts
import {
    getRxStorageSQLite,
    getSQLiteBasicsWebSQL
} from 'rxdb-premium/plugins/storage-sqlite';
import SQLite from 'react-native-sqlite-2';
const storage = getRxStorageSQLite({
  sqliteBasics: getSQLiteBasicsWebSQL(SQLite.openDatabase)
});
```

## Usage with **Expo SQLite**

Notice that [expo-sqlite](https://www.npmjs.com/package/expo-sqlite) cannot be used on android (but it works on iOS) if you use Expo SDK version 50 or older. Please update to Version 50 or newer to use it.

In the latest expo SDK version, use the `getSQLiteBasicsExpoSQLiteAsync()` method:

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageSQLite,
    getSQLiteBasicsExpoSQLiteAsync
} from 'rxdb-premium/plugins/storage-sqlite';
import * as SQLite from 'expo-sqlite';

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    multiInstance: false,
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsExpoSQLiteAsync(SQLite.openDatabaseAsync)
    })
});
```

In older Expo SDK versions, you might have to use the non-async API:

```ts
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageSQLite,
    getSQLiteBasicsExpoSQLite
} from 'rxdb-premium/plugins/storage-sqlite';
import { openDatabase } from 'expo-sqlite';

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    multiInstance: false,
    storage: getRxStorageSQLite({
        sqliteBasics: getSQLiteBasicsExpoSQLite(openDatabase)
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
} from 'rxdb-premium/plugins/storage-sqlite';

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

## Database Connection

If you need to access the database connection for any reason you can use `getDatabaseConnection` to do so:

```ts
import { getDatabaseConnection } from 'rxdb-premium/plugins/storage-sqlite'
```

It has the following signature:

```ts
getDatabaseConnection(
    sqliteBasics: SQLiteBasics<any>,
    databaseName: string
): Promise<SQLiteDatabaseClass>;
```

## Known Problems of SQLite in JavaScript apps

- Some JavaScript runtimes do not contain a `Buffer` API which is used by SQLite to store binary attachments data as `BLOB`. You can set `storeAttachmentsAsBase64String: true` if you want to store the attachments data as base64 string instead. This increases the database size but makes it work even without having a `Buffer`.

- The SQlite RxStorage works on SQLite libraries that use SQLite in version `3.38.0 (2022-02-22)` or newer, because it uses the [SQLite JSON](https://www.sqlite.org/json1.html) methods like `JSON_EXTRACT`. If you get an error like `[Error: no such function: JSON_EXTRACT (code 1 SQLITE_ERROR[1])`, you might have a too old version of SQLite.

- To debug all SQL operations, you can pass a log function to `getRxStorageSQLite()` like this:
```ts
const storage = getRxStorageSQLite({
    sqliteBasics: getSQLiteBasicsCapacitor(sqlite, Capacitor),
    // pass log function
    log: console.log.bind(console)
});
```



## Related
- [React Native Databases](./react-native-database.md)
