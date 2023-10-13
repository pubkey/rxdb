# RxDB Quickstart

Welcome to the RxDB Quickstart. Here we'll create a simple realtime TODO-app with RxDB to demonstrate the basic concepts.

## Installation

RxDB is distributed via npm and uses rxjs as a dependency. Install both with:

`npm install rxjs rxdb --save`

## Enable dev-mode

When you use RxDB in development, you should enable the [dev-mode plugin](./dev-mode.md) which adds helpful checks and validations and tells you if you do something wrong.

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);
```

## Creating an RxDatabase

### Choose an RxStorage adapter

RxDB can be used in a range of JavaScript runtime environments, and depending on the runtime the appropriate [RxStorage adapter](./rx-storage.md) must be used. For **browser** applications it is recommended to start with the [Dexie.js RxStorage adapter](./rx-storage-dexie.md) which is bundled with RxDB.

```ts
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
```

### Create the RxDatabase

You can now create the [RxDatabase](./rx-database.md) instance:

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const myDatabase = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageDexie()
});
```

### Create an RxCollection

An RxDatabase contains [RxCollection](./rx-collection.md)s for storing and querying data. A collection is similar to a SQL table, and individual records are stored in the collection as JSON documents. An RxDatabase can have as many collections as you need.

#### Creating a schema for a collection

RxDB uses [JSON Schema](https://json-schema.org){:target="_blank"} to describe the documents stored in each collection. For our example app we create a simple schema that describes a todo document:

```ts
const todoSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100 // <- the primary key must have set maxLength
        },
        name: {
            type: 'string'
        },
        done: {
            type: 'boolean'
        },
        timestamp: {
            type: 'date-time'
        }
    },
    required: ['id', 'name', 'done', 'timestamp']
}
```

#### Adding an RxCollection to the RxDatabase

With this schema we can now add the `todos` collection to the database:

```ts
await myDatabase.addCollections({
  todos: {
    schema: todoSchema
  }
});
```


## Write Operations

Now that we have an RxCollection we can store some documents in it.

### Inserting a document

```ts
const myDocument = await myDatabase.todos.insert({
    id: 'todo1',
    name: 'Learn RxDB',
    done: false,
    timestamp: new Date().toISOString()
});
```

### Updating a document

There are multiple ways to update an RxDocument. The simplest is with `patch`:

```ts
await myDocument.patch({
    done: true
});
```

You can also use `modify` which takes a plain JavaScript function that mutates the document state and returns the mutated version.

```ts
await myDocument.modify(docData => {
    docData.done = true;
    return docData;
});
```

### Delete a document

You can soft delete an RxDocument by calling `myDocument.remove()`. This will set the document's state to `DELETED` which ensures that it will not be returned in query results. RxDB keeps deleted documents in the database so that it is able to sync the deleted state to other instances during database [replication](./replication.md). Deleted documents can be purged in a later point with the [cleanup plugin](./cleanup.md) if needed.


## Query Operations

### Simple Query

Like many NoSQL databases, RxDB uses the [Mango syntax](https://github.com/cloudant/mango){:target="_blank"} for query operations. To run a query, you first create an RxQuery object with `myCollection.find()` and then call `.exec()` on that object to fetch the query results.

```ts
const foundDocuments = await myDatabase.todos.find({
    selector: {
        done: {
            $eq: false
        }
    }
}).exec();
```

More Mango query examples can be found [here](./rx-query.html#examples). In addition to the `.find()` RxQuery, RxDB has additional query methods for fetching the documents you need:

- [findOne()](./rx-collection.md#findone)
- [findByIds()](./rx-collection.md#findByIds)


## Observing data

You might want to subscribe to data changes so that your UI is always up-to-date with the data stored on disc. RxDB allows you to subscribe to data changes even when the change happens in another part of your application, another browser tab, or during database [replication/synchronization](./replication.md).


### Observing queries

To observe changes to records returned from a query, instead of calling `.exec()` you get the observable of the RxQuery object via `.$` and then subscribe to it.

```ts
const observable = myDatabase.todos.find({
    selector: {
        done: {
            $eq: false
        }
    }
}).$;
observable.subscribe(notDone => {
    console.log('Currently have ' + notDone.length + 'things to do');
});
```

### Subscribe to a document value

You can also subscribe to the fields of a single RxDocument. Add the `$` sign to the desired field and then subscribe to the returned observable.

```ts
myDocument.done$.subscribe(isDone => {
    console.log('done: ' + isDone);
});
```

## Next steps

You are now ready to dive deeper into RxDB. Please continue reading the documentation, and join the community to ask questions on our [Discord chat](./chat.html). If you like RxDB please star the [GitHub repository](https://github.com/pubkey/rxdb), and if you are using RxDB in a production environment and able to support its continued development, please consider becoming a [sponsor on GitHub](https://github.com/sponsors/pubkey) or [OpenCollective](https://opencollective.com/rxdbjs).
