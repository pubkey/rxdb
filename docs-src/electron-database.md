# Electron Database

[Electron](https://www.electronjs.org/) (aka Electron.js) is a framework developed by github which is designed to create desktop applications with the Web technology stack consisting of HTML, CSS and JavaScript.
Because the desktop application runs on the clients device, it is suitable to use a database that can store and query data locally. This allows to create so called [offline first](./offline-first.md) apps that even work when to user has no internet connection.

**NOTICE:** You are reading this inside of the [RxDB](https://rxdb.info/) documentation, so everything might be opinionated.

<p align="center">
  <img src="./files/icons/electron.svg" alt="Electron" width="70" />
</p>

## Databases for Electron

An Electron runtime can be divided in two parts:
- The "main" process which is a Node.js JavaScript process that runs without a UI in the background.
- One or multiple "renderer" processes that consist of a Chrome browser engine and runs the user interface. Each renderer process represents one "browser tab".

This is important to understand because choosing the right database depends on your use case and on which of these JavaScript runtimes you want to keep the data.


### Server Side Databases

Because Electron runs on a desktop computer, you might think that it should be possible to use a common "server" database like MySQL, PostgreSQL or MongoDB. In theory you could ship the correct database server binaries with your electron application and start a process on the clients device which exposes a port to the database that can be consumed by Electron. In practice this is not a viable way to go because shipping the correct binaries and opening ports is way to complicated and troublesome. Instead you should use a database that can be bundled and run **inside** of Electron, either in the *main* or in the *renderer* process.


### Localstorage/IndexedDB/WebSQL

Because Electron uses a common Chrome web browser in the renderer process, you can access the common Web Storage APIs like Localstorage, IndexedDB and WebSQL. This is easy to setup and storing small sets of data can be archieved in a short span of time. 

But as soon as your application goes beyond a simple TODO-app, there are multiple obstacles that come in your way. One thing is the bad multi-tab support. If you have more then one *renderer* process, it becomes hard to manage database writes between them. Each *browser tab* could modify the database state while the others do not know of the changes and keep an outdated UI.

Another thing is performance. [IndexedDB is slow](./slow-indexeddb.md) mostly because it has to go through layers of browser security and abstractions. Storing and querying much data might become your performance bottleneck. Localstorage and WebSQL are even slower by the way.

Using the Web Storage APIs is generally only recommend when you know for sure that there will be always only **one rendnering process** and performance is not that relevant.

### SQLite

SQLite is a SQL based relational database written in the C programming language that was crafted to be embed inside of applications and stores data locally. Operations are written in the SQL query language similar to the PostgreSQL syntax.

Using SQLite in Electron is not possible in the *renderer process*, only in the *main process*. To communicate data operations between your main and your renderer processes, you have to use either [@electron/remote](https://github.com/electron/remote) (not recommended) or the [ipcRenderer](https://www.electronjs.org/de/docs/latest/api/ipc-renderer) (recommended). So you start up SQLite in your main process and whenever you want to read or write data, you send the SQL queries to the main process and retrieve the result back as JSON data.

To install SQLite, use the [SQLite3](https://github.com/TryGhost/node-sqlite3) package which is a native Node.js module. Also you need the [@electron/rebuild](https://github.com/electron/rebuild) package to rebuild the SQLite module against the currently installed Electron version.

Install them with `npm install sqlite3 @electron/rebuild`.
Then you can rebuild SQLite with `./node_modules/.bin/electron-rebuild  -f -w sqlite3`
In the JavaScript code of your main process you can now create a database:

```ts
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/path/to/database/file.db');
// create a table and insert a row
db.serialize(() => {
  db.run("CREATE TABLE Users (name, lastName)");
  db.run("INSERT INTO Users VALUES (?, ?)", ['foo', 'bar']);
});
```

Also you have to set up the ipcRenderer so that message from the renderer process are handled:

```ts
ipcMain.handle('db-query', async (event, sqlQuery) => {
  return new Promise(res => {
      db.all(sqlQuery, (err, rows) => {
        res(rows);
      });
  });
});
```
In your renderer process you can now call the ipcHandler and fetch data from SQLite:

```ts
const rows = await ipcRenderer.invoke('db-query', "SELECT * FROM Users");
```

The downside of SQLite is that it is lacking many features that are handful when using a database together with UI based applications. It is not possible to observe queries or document fields and there is no replication method to sync data with a server. This makes SQLite a good solution when you just want to store data on the client, but it is not suitable for more complex operations like two-way replication, encryption, compression and so on. Also developer helpers like TypeScript type safety are totally out of reach.

### RxDB

<p align="center">
  <img src="./files/logo/logo_text.svg" alt="RxDB" width="70" />
</p>


[RxDB](https://rxdb.info/) is a NoSQL database for JavaScript applications. It has manny features that come in handy when RxDB is used with UI based applications like you Electron app. For example it is able to subscribe to query results of single fields of document. It has encryption and compression features and most important it has a battle tested [replication plugin](https://rxdb.info/replication.html) that can be used to do a realtime sync with your backend.

Because of the [flexible storage](https://rxdb.info/rx-storage.html) layer of RxDB, there are many options on how to use it with Electron:

- The [memory RxStorage](./rx-storage-memory.md) that stores the data inside of the JavaScript memory without persistence
- The [SQLite RxStorage](./rx-storage-sqlite.md)
- The [PouchDB RxStorage](./rx-storage-pouchdb.md) with the SQLite adapter mentioned above.
- The [IndexedDB RxStorage](./rx-storage-indexeddb.md)
- The [Dexie.js RxStorage](./rx-storage-dexie.md)

It is recommended to use the [SQLite RxStorage](./rx-storage-sqlite.md) because it has the best performance and is the easiest to set up. However it is part of the [Premium Plugins](https://rxdb.info/premium.html) which must be purchased, so to try out RxDB with Electron, you might want to use one of the other options. To start with RxDB, I would recommend to use the Dexie.js RxStorage in the renderer processes. Because RxDB is able to broadcast the database state between browser tabs, having multiple renderer processes is not a problem like it would be when you use plain IndexedDB without RxDB.
In production you would always run the RxStorage in the main process with the [RxStorage Electron IpcRenderer & IpcMain](./electron.md#rxstorage-electron-ipcrenderer--ipcmain) plugins.

First you have to install all dependencies via `npm install rxdb rxjs`.
Then you can assemble the RxStorage and create a database with it:

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// create database
const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageDexie()
});

// create collections
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
await collections.humans.find({
    selector: {
        name: 'bar'
    }
}).$.subscribe(result => {/* ... */});
```

For having a better performance in the renderer tab, you can later switch to the [IndexedDB RxStorage](./rx-storage-indexeddb.md). But in production it is recommended to use the [SQLite RxStorage](./rx-storage-sqlite.md) in the main process so that database operations do not block the rendering of the UI.
To learn more about using RxDB with Electron, you might want to check out [this example project](https://github.com/pubkey/rxdb/tree/master/examples/electron).


## Follow up

- Check out the [RxDB Electron example](https://github.com/pubkey/rxdb/tree/master/examples/electron)
- If you haven't done yet, you should start learning about RxDB with the [Quickstart Tutorial](./quickstart.md).
- There is a followup list of other [client side database alternatives](./alternatives.md) that you can try to use with Electron.
