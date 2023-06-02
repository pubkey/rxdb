# RxDB Quickstart

Welcome to the RxDB Quickstart. In a few minutes you will be shown how to create a simple realtime TODO-app with RxDB.

## Installation

RxDB is distributed via npm and can be installed with the command:

`npm install rxdb`

RxDB uses the rxjs library as peerDependency which must also be installed:

`npm install rxjs`

## Enable dev-mode

When you use RxDB in development mode, you should enable the [dev-mode plugin](./dev-mode.md) which adds helpful checks and validations to RxDB and tells you if you do something wrong.

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);
```

## Create a RxDatabase

### Choose a RxStorage

RxDB can used in different JavaScript runtimes which have different options to store persistend data. Depending on the runtime, a different [RxStorage](./rx-storage.md) must be used. For **browser** applications it is recommended to start with the [Dexie.js RxStorage](./rx-storage-dexie.md) which comes directly with the RxDB npm package.

```ts
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
```

### Create the RxDatabase

With the `storage` and a picked database `name`, you can now create the [RxDatabase](./rx-database.md) instance:

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const myDatabase = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageDexie()
});
```

### Create a RxCollection

On top of the RxDatabase, you can add any amount of collections. A [RxCollection](./rx-collection.md) can then be used to store and query the actual documents.

#### Create a schema for a collection

RxDB requires a json schema for each collection that defines how the stored documents of that collection look like.
For the example app, we create a simple schema that stores todo-document:

```ts
const mySchema = {
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

#### Add a RxCollection to the RxDatabase

With that schema we can now add the `todos` collection to the database:

```ts
await myDatabase.addCollections({
  todos: {
    schema: mySchema
  }
});
```


## Write Operations

Now that we have a RxCollection, we can store some documents in it.

### Insert a document

```ts
const myDocument = await myDatabase.todos.insert({
    id: 'todo1',
    name: 'Learn RxDB',
    done: false,
    timestamp: new Date().toISOString()
});
```

### Update a document

There are multiple ways to update a RxDocument. The simplest one is the `modify` method that takes a plain JavaScript function
which mutates the document state and returns the mutated version.

```ts
await myDocument.modify(docData => {
    docData.done = true;
    return docData;
});
```

For the other methods to change a documents data, [see here](./rx-document.md#update)

### Delete a document

Delete a RxDocument by calling `myDocument.remove()`. This will set the documents state to `DELETED` which ensures that it will be no longer found in query results. RxDB stores even deleted documents so that it is able to sync the deleted state to other instances during [replication](./replication.md). The deleted document will be purged in a later point in time with the [cleanup plugin](./cleanup.md).



## Query Operations

### Normal Query

Like many NoSQL databases, RxDB uses the Mango syntax for query operations.
To run a query, you first create an RxQuery object with `myCollection.find()` and then call `.exec()` on that object to fetch the query results.

```ts
const foundDocuments = await myDatabase.todos.find({
    selector: {
        done: {
            $eq: false
        }
    }
}).exec();
```

Other examples for the Mango Query syntax can be found [here](./rx-query.html#examples).
In addition to the `.find()` RxQuery, RxDB has additional query objects that can be used to find the desired documents:

- [findOne()](./rx-collection.md#findone)
- [findByIds()](./rx-collection.md#findByIds)



## Observing data

When you build a modern realtime application with RxDB, you do not only need data once, but instead you might want to subscribe to the data so that your UI is always up-to-date with the data stored on disc.
RxDB allows to subscribe to data which is then updated even when it was changed in an other part of your application, an other browser tab or by the [replication](./replication.md).


### Observing queries

To observe a query, instead of calling `.exec()` you get the observable of the RxQuery object via `.$` and then subscribe to it.

```ts
const observable = myDatabase.todos.find({
    selector: {
        done: {
            $eq: false
        }
    }
}).$;
observable.subscribe(allNonDoneTodos => {
    console.log('Currently have ' + allNonDoneTodos.length + 'things to do');
});
```

### Subscribe to a document value

In addition to queries, you can also subscribe to the fields of a single RxDocument. Therefore you add the `$` sign to the desired field and then subscribe to the returned observable.

```ts
myDocument.done$.subscribe(isDone => {
    console.log('done: ' + isDone);
});
```


## Follow Up

You are now prepared to dive deeper into RxDB. If you have any questions, you can ask the community at the [RxDB Chat](./chat.html). Also do not forget to leave a star at the [RxDB github repository](https://github.com/pubkey/rxdb).
