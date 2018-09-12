# Using the Server Plugin

In this tutorial you learn how to use the server plugin and replicate data from a node-process to the client.

The server plugin is usefull

- To simulate the couchdb in develope-mode without setting up a real one
- To replicate data between the renderer and the node-process in an electron-app
- To fast spin up a prototype-app without having to define an API

It shell never be used open accessible to the internet, use a couchdb-instance at production.

## In NodeJs

Because the server plugin only works in node, it is not part of the default rxdb-build. You have to import it before you can use it.

```typescript
import RxDB from 'rxdb';

// add the server-plugin
import RxDBServerPlugin from 'rxdb/plugins/server';
RxDB.plugin(RxDBServerPlugin);

// add the memory-adapter
import * as MemoryAdapter from 'pouchdb-adapter-memory';
RxDB.plugin(MemoryAdapter);
```


Now we can create a database and a collection.

```typescript
// create database
const db = await RxDB.create({
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
await db.collection({
    name: 'items',
    schema: mySchema
});

// insert one document
await db.items.insert({
    key: 'foo',
    value: 'bar'
});
```

Now we can spawn the server.

```typescript
const serverState = db.server({
    path: '/db', // (optional)
    port: 3000,  // (optional)
    cors: true   // (optional), enable CORS-headers
});
```

To ensure that every thing is ok,

- Open http://localhost:3000/db to get the database-info
- Open http://localhost:3000/db/items to get the collection-info



## On the client

On the client you can now also create a database and replicate it with our server.

Start with creating the database and collection.
```typescript
import RxDB from 'rxdb';

// we need the http-plugin to relicate over http
import * as PouchHttpPlugin from 'pouchdb-adapter-http';
RxDB.plugin(PouchHttpPlugin);


const clientDB = await RxDB.create({
    name: 'clientdb',
    adapter: 'memory'
});

// create a collection
await clientDB.collection({
    name: 'items',
    schema: mySchema
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
