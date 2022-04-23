# SQLite RxStorage (beta)

This storage is based on [SQLite](https://www.sqlite.org/index.html) and is made to work with **Node.js**, **Electron**, **React Native**, **Cordova** and **Capacitor**.


### Pros

- Much faster compared to the PouchDB+SQLite `RxStorage`
- Small build size

### Cons

- It is part of [RxDB Premium](./premium.md)
- Does not support CouchDB replication.
- Does not support attachments.


## Usage

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


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./rx-storage-worker.md)
