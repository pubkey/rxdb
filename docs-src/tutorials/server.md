# Using the Server Plugin

In this tutorial you learn how to use the server plugin and replicate data from a node-process to the client.

The server plugin is usefull

- To simulate the couchdb in developer-mode without setting up a real one
- To replicate data between the renderer and the node-process in an electron-app
- To fast spin up a prototype-app without having to define an API

It should never be used openly accessible to the internet, use a couchdb-instance at production.

## In NodeJs

Because the server plugin only works in node, it is not part of the default rxdb-build. You have to import it before you can use it.

```typescript
import { addRxPlugin } from 'rxdb';

// add the server-plugin
import { RxDBServerPlugin } from 'rxdb/plugins/server';
addRxPlugin(RxDBServerPlugin);

// add the memory-adapter
import * as MemoryAdapter from 'pouchdb-adapter-memory';
addRxPlugin(MemoryAdapter);
```

You also have to install the module `express-pouchdb` which does not come with RxDB.

```bash
  npm install express-pouchdb --save
```


Now we can create a database and a collection.

```typescript
import { createRxDatabase } from 'rxdb';
// create database
const db = await createRxDatabase({
    name: 'mydb',
    adapter: 'memory'
});

// create collection
const mySchema = {
    version: 0,
    type: 'object',
    properties: {
        key: {
            type: 'string',
            primary: true
        },
        value: {
            type: 'string'
        }
    }
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
const {app, server} = db.server({
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
const {app, server} = db.server({
    path: '/', // omitted when startServer is false and force set to /
    port: 3000,  // omitted when startServer is false
    cors: false,  // disable CORS-headers (default) - you probably want to configure CORS in your main app
    startServer: false // do not start express server
});
```

Then you can mount rxdb server express app in your express app

```typescript
const {app, server} = db.server({
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
import { addRxPlugin, createRxDatabase } from 'rxdb';

// we need the http-plugin to relicate over http
import * as PouchHttpPlugin from 'pouchdb-adapter-http';
addRxPlugin(PouchHttpPlugin);


const clientDB = await createRxDatabase({
    name: 'clientdb',
    adapter: 'memory'
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
clientDB.items.sync({
    remote: 'http://localhost:3000/db/items'
});
```

After the replication worked, the client has the same document.

```typescript
const docs = await clientDB.items.find().exec();
```



--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](../contribute.md)
