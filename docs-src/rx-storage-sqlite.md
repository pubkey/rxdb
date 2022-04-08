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
    getRxStorageSQLite
} from 'rxdb-premium/plugins/sqlite';

/**
 * In Node.js, we get use the SQLite database
 * from the 'sqlite' npm module.
 * @link https://www.npmjs.com/package/sqlite3
 */
import sqlite3 from 'sqlite3';

/**
 * First, the SQLite RxStorage needs a databaseCreator function
 * that creates a new SQLite instance based on a given database name.
 * 
 * This is needed because different runtimes have different ways of loading
 * the SQLite library.
 */
const databaseCreator = (name) => Promise.resolve(new sqlite3.Database(name));

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageSQLite({
        /**
         * The SQLite RxStorage needs a databaseCreator function
         * that creates a new SQLite instance based on a given database name.
         * 
         * This is needed because different runtimes have different ways of loading
         * the SQLite library.
         */
        databaseCreator: (name) => Promise.resolve(new sqlite3.Database(name))
    })
});
```


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./rx-storage-worker.md)
