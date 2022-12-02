# Using the Server Plugin

In this tutorial you learn how to use the CouchDB server plugin and replicate data from a node-process to the client.
It starts a server that is compatible with the [CouchDB replication protocol](https://docs.couchdb.org/en/3.2.0/replication/protocol.html).

**NOTICE**: The CouchDB server plugin can only be used with the [PouchDB RxStorage](../rx-storage-pouchdb.md).

The CouchDB server plugin is useful

- To simulate the couchdb in developer-mode without setting up a real one
- To replicate data between the renderer and the node-process in an electron-app
- To fast spin up a prototype-app without having to define an API

It should never be used openly accessible to the internet, use a couchdb-instance at production.

## In NodeJs

Because the server plugin only works in node, it is not part of the default rxdb-build. You have to import it before you can use it.

```typescript
// run 'npm install express-pouchdb' before you use the server plugin.

// add the server-plugin
import { addRxPlugin } from 'rxdb';
import { RxDBServerCouchDBPlugin } from 'rxdb/plugins/server-couchdb';
addRxPlugin(RxDBServerCouchDBPlugin);

// add the PouchDB memory-adapter
import { addPouchPlugin } from 'rxdb/plugins/pouchdb';
import * as MemoryAdapter from 'pouchdb-adapter-memory';
addPouchPlugin(MemoryAdapter);
```

You also have to install the module `express-pouchdb` which does not come with RxDB.

```bash
  npm install express-pouchdb --save
```


Now we can create a database and a collection.

```typescript
import { createRxDatabase, getRxStoragePouch } from 'rxdb';

// create database
const db = await createRxDatabase({
    name: 'mydb',
    storage: getRxStoragePouch('memory')
});

// create collection
const mySchema = {
    version: 0,
    type: 'object',
    primaryKey: 'key',
    properties: {
        key: {
            type: 'string'
        },
        value: {
            type: 'string'
        }
    },
    required: ['key']
};
await db.addCollections({
    items: {
        schema: mySchema
    }
});

// insert one document
await db.items.insert({
    key: 'foo',
    value: 'bar'
});
```

Now we can spawn the server. Besides the RxDB specific options, you can set `pouchdbExpressOptions` which are [defined by the express-pouchdb module](https://github.com/pouchdb/pouchdb-server#api).

```typescript

/**
 * Start the server.
 */
const {app, server} = await db.serverCouchDB({
    path: '/db', // (optional)
    port: 3000,  // (optional)
    cors: true,   // (optional), enable CORS-headers
    startServer: true, // (optional), start express server
    // options of the pouchdb express server
    pouchdbExpressOptions: {
        inMemoryConfig: true, // do not write a config.json
        logPath: '/tmp/rxdb-server-log.txt' // save logs in tmp folder
    }
});

```

To ensure that everything is ok,

- Open http://localhost:3000/db to get the database-info
- Open http://localhost:3000/db/items to get the collection-info

### Server as a part of bigger Express app
You can create server without starting it. It allows to use server as a part of bigger Express app.

```typescript
const {app, server} = await db.serverCouchDB({
    path: '/', // omitted when startServer is false and force set to /
    port: 3000,  // omitted when startServer is false
    cors: false,  // disable CORS-headers (default) - you probably want to configure CORS in your main app
    startServer: false // do not start express server
});
```

Then you can mount rxdb server express app in your express app

```typescript
const { app, server } = await db.serverCouchDB({
    startServer: false
});
const mainApp = express();

// configure CORS, other middlewares...

mainApp.use('/db', app);
mainApp.use('/', (req, res) => res.send('hello'));
mainApp.listen(3000, () => console.log(`Server listening on port 3000`));
```

To ensure that everything is ok,

- Open http://localhost:3000/db to get the database-info
- Open http://localhost:3000/db/items to get the collection-info

## On the client

On the client you can now also create a database and replicate it with our server.

Start with creating the database and collection.
```typescript
import { createRxDatabase, getRxStoragePouch } from 'rxdb';
import { addPouchPlugin } from 'rxdb/plugins/pouchdb';

// we need the http-plugin to relicate over http
import * as PouchHttpPlugin from 'pouchdb-adapter-http';
addPouchPlugin(PouchHttpPlugin);


const clientDB = await createRxDatabase({
    name: 'clientdb',
    storage: getRxStoragePouch('memory')
});

// create a collection
await clientDB.addCollections({
    items: {
        schema: mySchema
    }
});
```

Now you replicate the client collection with the server.

```typescript
clientDB.items.syncCouchDB({
    remote: 'http://localhost:3000/db/items'
});
```

After the replication is in sync, the client has the same documents as the server.

```typescript
const docs = await clientDB.items.find().exec();
```

