---
title: Master Data - Create and Manage RxCollections
slug: rx-collection.html
description: Discover how to create, manage, and migrate documents in RxCollections. Harness real-time data flows, secure encryption, and powerful performance in RxDB.
image: /headers/rx-collection.jpg
---

import { NON_PREMIUM_COLLECTION_LIMIT } from '../src/constants';
import {Faq, FaqItem} from '@site/src/components/faq';

# RxCollection
A collection stores documents of the same type.


## Creating a Collection
To create one or more collections you need an [RxDatabase](./rx-database.md) object which has the `.addCollections()` method. Every collection needs a collection name and a valid [RxJsonSchema](./rx-schema.md). Other attributes are optional.

```js
const myCollections = await myDatabase.addCollections({
  // key = collectionName
  todos: {
    schema: todoSchema,
    statics: {},                       // (optional) ORM-functions
                                         // for this collection
    methods: {},                          // (optional) ORM-functions for documents
    attachments: {},                      // (optional) ORM-functions for attachments
    options: {},                       // (optional) Custom parameters
                                         // that might be used in plugins
    migrationStrategies: {},              // (optional)
    autoMigrate: true,                    // (optional) [default=true]
    cacheReplacementPolicy: function(){}, // (optional) custom
                                         // cache replacement policy
    conflictHandler: function(){}         // (optional) custom
                                         // conflict handler
  },
  // you can create multiple collections at once
  projects: {
    // ...
  }
});
```

:::note
Without the Premium Plugins, RxDB allows up to {NON_PREMIUM_COLLECTION_LIMIT} open collections in parallel. If you hit that limit, see the [FAQ on how to remove it](/rx-collection.html#faq).
:::

### name

The name uniquely identifies the collection and should be used to refine the collection in the database. Two different collections in the same database can never have the same name. Collection names must match the following regex: `^[a-z][a-z0-9]*$`.

### schema

The schema defines how the documents of the collection are structured. RxDB uses a schema format, similar to [JSON schema](https://json-schema.org/). Read more about the RxDB schema format [here](./rx-schema.md).

### ORM-functions
With the parameters `statics`, `methods` and `attachments`, you can define ORM functions that are applied to each of these objects that belong to this collection. See [ORM/DRM](./orm.md).

### liveQueryUpdateThrottleTime

Overrides `liveQueryUpdateThrottleTime` set at the database level for this specific collection. See [liveQueryUpdateThrottleTime](./rx-query.md#livequeryupdatethrottletime).

### Migration
With the parameters `migrationStrategies` and `autoMigrate` you can specify how migration between different schema-versions should be done. [See Migration](./migration-schema.md).

## Get a collection from the database
To get an existing collection from the database, call the collection name directly on the database:

```javascript
// newly created collection
const collections = await myDatabase.addCollections({
  todos: {
    schema: todoSchema
  }
});
const collection2 = myDatabase.todos;
console.log(collections.todos === collection2); //> true
```

## Functions

### Observe $
Calling this will return an [rxjs-Observable](https://rxjs.dev/guide/observable) which streams every change to data of this collection.

```js
myDatabase.todos.$.subscribe(changeEvent => console.dir(changeEvent));

// you can also observe single event-types with insert$ update$ remove$
myDatabase.todos.insert$.subscribe(changeEvent => console.dir(changeEvent));
myDatabase.todos.update$.subscribe(changeEvent => console.dir(changeEvent));
myDatabase.todos.remove$.subscribe(changeEvent => console.dir(changeEvent));

```

### insert()
Use this to insert new documents into the database. The collection will validate the schema and automatically encrypt any encrypted fields. Returns the new RxDocument.

```js
const doc = await myDatabase.todos.insert({
  id: 'todo4',
  name: 'Clean the kitchen',
  dueAt: '2026-01-04T18:00:00.000Z',
  priority: 1
});
```

### insertIfNotExists()

The insertIfNotExists() method attempts to insert a new document into the collection only if a document with the same primary key does not already exist. This is useful for ensuring uniqueness without having to manually check for existing records before inserting or handling [conflicts](./transactions-conflicts-revisions.md).

Returns either the newly added [RxDocument](./rx-document.md) or the previous existing document.

```js
const doc = await myDatabase.todos.insertIfNotExists({
  id: 'todo4',
  name: 'Clean the kitchen',
  dueAt: '2026-01-04T18:00:00.000Z',
  priority: 1
});
```

### bulkInsert()

When you have to insert many documents at once, use bulk insert. This is much faster than calling `.insert()` multiple times.
Returns an object with a `success` and `error` arrays.

```js
const result = await myDatabase.todos.bulkInsert([
  {
    id: 'todo3',
    name: 'Set up replication',
    dueAt: '2026-01-03T14:15:00.000Z',
    priority: 10,
    tags: ['rxdb', 'backend']
  },
  {
    id: 'todo4',
    name: 'Clean the kitchen',
    dueAt: '2026-01-04T18:00:00.000Z',
    priority: 1
  }
]);

// > {
//   success: [RxDocument, RxDocument],
//   error: []
// }
```

:::note
`bulkInsert` will not fail on update conflicts and you cannot expect that on failure the other documents are not inserted. Also, the call to `bulkInsert()` will not throw if a single document errors because of validation errors. Instead it will return the error in the `.error` property of the returned object.
:::

### bulkRemove()

When you want to remove many documents at once, use bulk remove. Returns an object with a `success`- and `error`-array.

```js
const result = await myDatabase.todos.bulkRemove([
  'todo3',
  'todo4'
]);

// > {
//   success: [RxDocument, RxDocument],
//   error: []
// }
```

Instead of providing the document ids, you can also use the [RxDocument](./rx-document.md) instances. This can have better performance if your code knows them already at the moment of removing them:
```js
const result = await myDatabase.todos.bulkRemove([
  myRxDocument1,
  myRxDocument2,
  /* ... */
]);
```

### upsert()
Inserts the document if it does not exist within the collection, otherwise it will overwrite it. Returns the new or overwritten RxDocument.

When the document already exists, any [inline attachments](./rx-attachment.md#inline-attachments-on-insert-and-upsert) in the upsert data are **merged** with existing attachments by default. Pass `{ deleteExistingAttachments: true }` as the second argument to replace all existing attachments instead.

```js
const doc = await myDatabase.todos.upsert({
  id: 'todo4',
  name: 'Clean the kitchen',
  done: true,
  dueAt: '2026-01-04T18:00:00.000Z',
  priority: 1
});

// with options
const doc2 = await myDatabase.todos.upsert(docData, {
  deleteExistingAttachments: true
});
```

### bulkUpsert()
Same as `upsert()` but runs over multiple documents. Improves performance compared to running many `upsert()` calls.
Returns an `error` and a `success` array. Accepts an optional second argument for [upsert options](./rx-attachment.md#upsert-behavior-with-attachments).

```js
const docs = await myDatabase.todos.bulkUpsert([
  {
    id: 'todo3',
    name: 'Set up replication',
    done: true,
    dueAt: '2026-01-03T14:15:00.000Z',
    priority: 10
  },
  {
    id: 'todo4',
    name: 'Clean the kitchen',
    done: true,
    dueAt: '2026-01-04T18:00:00.000Z',
    priority: 1
  }
]);
/**
 * {
 *   success: [RxDocument, RxDocument]
 *   error: [],
 * }
 */
```

### incrementalUpsert()

When you run many upsert operations on the same RxDocument in a very short timespan, you might get a `409 Conflict` error.
This means that you tried to run a `.upsert()` on the document, while the previous upsert operation was still running.
To prevent these types of errors, you can run incremental upsert operations.
The behavior is similar to [RxDocument.incrementalModify](./rx-document.md#incrementalModify).

```js
const docData = {
    id: 'todo4', // primary
    name: 'Clean the kitchen',
    dueAt: '2026-01-04T18:00:00.000Z',
    priority: 1
};

myDatabase.todos.upsert(docData);
myDatabase.todos.upsert(docData);
// -> throws because of parallel update to the same document

myDatabase.todos.incrementalUpsert(docData);
myDatabase.todos.incrementalUpsert(docData);
myDatabase.todos.incrementalUpsert(docData);

// wait until last upsert finished
await myDatabase.todos.incrementalUpsert(docData);
// -> works
```

### find()
To find documents in your collection, use this method. [See RxQuery.find()](./rx-query.md#find). Queries are written in the [Mango query syntax](./mango-query.md) or with the chained methods of the [query builder](./query-builder.md).

```js
// find all todos with a priority greater than 5
const importantTodos = await myDatabase.todos
    .find()
    .where('priority')
    .gt(5)
    .exec(); // execute
// > [RxDocument[todo1], RxDocument[todo3]]
```

### findOne()
This does basically what find() does, but it returns only a single document. You can pass a primary value to find a single document more easily.

To find documents in your collection, use this method. [See RxQuery.find()](./rx-query.md#findOne).


```js
// get document with id:todo1
myDatabase.todos.findOne({
  selector: {
    id: 'todo1'
  }
}).exec().then(doc => console.dir(doc));

// get document by primary, functionally identical to above query
myDatabase.todos.findOne('todo1')
  .exec().then(doc => console.dir(doc));
```


### findByIds()

Find many documents by their id (primary value). This has a way better performance than running multiple `findOne()` or a `find()` with a big `$or` selector.

Returns a `Map` where the primary key of the document is mapped to the document. Documents that do not exist or are deleted, will not be inside of the returned Map.

```js
const ids = [
  'todo1',
  'todo2',
  /* ... */
];
const docsMap = await myDatabase.todos.findByIds(ids);

console.dir(docsMap); // Map(2)
```

:::note
The `Map` returned by `findByIds` is not guaranteed to return elements in the same order as the list of ids passed to it.
:::

### exportJSON()

Creates a JSON export of every document in the collection. Needs the `json-dump` plugin. [Read more](./json-import-export.md)

```js
const json = await myDatabase.todos.exportJSON();
```

### importJSON()

Imports a previously exported JSON dump back into the collection. [Read more](./json-import-export.md)

```js
await myDatabase.todos.importJSON(json);
```

### remove()

Removes all known data of the collection and its previous versions.
This removes the documents, the schemas, and older schemaVersions.

```js
await myDatabase.todos.remove();
// collection is now removed and can be re-created
```

### close()
Removes the collection's object instance from the [RxDatabase](./rx-database.md). This is to free up memory and stop all observers and replications. It will not delete the collection's data. When you create the collection again with `database.addCollections()`, the newly added collection will still have all data.
```js
await myDatabase.todos.close();
```

### onClose / onRemove()
With these you can add a function that is run when the collection was closed or removed.
This works even across multiple browser tabs so you can detect when another tab removes the collection
and your application can behave accordingly.

```js
await myDatabase.todos.onClose(() => console.log('I am closed'));
await myDatabase.todos.onRemove(() => console.log('I am removed'));
```




### isRxCollection
Returns true if the given object is an instance of RxCollection. Returns false if not.
```js
const is = isRxCollection(myObj);
```


## FAQ

<Faq>
<FaqItem question="When I reload the browser window, will my collections still be in the database?">

    <div>
    No, the javascript instance of the collections will not automatically load into the database on page reloads.
    You have to call the `addCollections()` method each time you create your database. This will create the JavaScript object instance of the RxCollection so that you can use it in the RxDatabase. The persisted data will automatically be available in your RxCollection each time you create it.
    </div>

</FaqItem>
<FaqItem question={'How to remove the limit of ' + NON_PREMIUM_COLLECTION_LIMIT + ' collections?'}>

    <div>
    In the open-source version of RxDB, the amount of RxCollections that can be open in parallel is limited to <code>{NON_PREMIUM_COLLECTION_LIMIT}</code>. The value comes from the `NON_PREMIUM_COLLECTION_LIMIT` constant in [`src/plugins/utils/utils-premium.ts`](https://github.com/pubkey/rxdb/blob/master/src/plugins/utils/utils-premium.ts).
    The limit counts all open collections of all databases in the same JavaScript process. Closed collections do not count. When the limit is reached, RxDB waits a short time for other collections to close and then throws the error [`COL23`](./errors.md#COL23).

    To remove the limit:

    1. Purchase the [Premium Plugins 👑](/premium/) and install the `rxdb-premium` package.
    2. Call `setPremiumFlag()` once, before you create the first database.
    3. Create your databases and collections as usual.

    ```ts
    import { setPremiumFlag } from 'rxdb-premium/plugins/shared';
    setPremiumFlag();

    const myDatabase = await createRxDatabase({ /* ... */ });
    ```

    Before you remove the limit, check whether you need that many collections. Each RxCollection opens its own storage instance (for example its own IndexedDB object store or SQLite table) and keeps its own change stream and query cache. So the startup time and memory usage grow with every collection. When many collections store documents with a similar shape, store them in one collection with a `type` field and an index on it.
    </div>

</FaqItem>
</Faq>
