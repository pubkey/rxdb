# Master Data - Create and Manage RxCollections

> Discover how to create, manage, and migrate documents in RxCollections. Harness real-time data flows, secure encryption, and powerful performance in RxDB.

# RxCollection
A collection stores documents of the same type.

## Creating a Collection
To create one or more collections you need a RxDatabase object which has the `.addCollections()`-method. Every collection needs a collection name and a valid `RxJsonSchema`. Other attributes are optional.

```js
const myCollections = await myDatabase.addCollections({
  // key = collectionName
  humans: {
    schema: mySchema,
    statics: {},                          // (optional) ORM-functions for this collection
    methods: {},                          // (optional) ORM-functions for documents
    attachments: {},                      // (optional) ORM-functions for attachments
    options: {},                          // (optional) Custom parameters that might be used in plugins
    migrationStrategies: {},              // (optional)
    autoMigrate: true,                    // (optional) [default=true]
    cacheReplacementPolicy: function(){}, // (optional) custom cache replacement policy
    conflictHandler: function(){}         // (optional) a custom conflict handler can be used
  },
  // you can create multiple collections at once
  animals: {
    // ...
  }
});
```

### name

The name uniquely identifies the collection and should be used to refine the collection in the database. Two different collections in the same database can never have the same name. Collection names must match the following regex: `^[a-z][a-z0-9]*$`.

### schema

The schema defines how the documents of the collection are structured. RxDB uses a schema format, similar to [JSON schema](https://json-schema.org/). Read more about the RxDB schema format [here](./rx-schema.md).

### ORM-functions
With the parameters `statics`, `methods` and `attachments`, you can define ORM-functions that are applied to each of these objects that belong to this collection. See [ORM/DRM](./orm.md).

### Migration
With the parameters `migrationStrategies` and `autoMigrate` you can specify how migration between different schema-versions should be done. [See Migration](./migration-schema.md).

## Get a collection from the database
To get an existing collection from the database, call the collection name directly on the database:

```javascript
// newly created collection
const collections = await db.addCollections({
  heroes: {
    schema: mySchema
  }
});
const collection2 = db.heroes;
console.log(collections.heroes === collection2); //> true
```

## Functions

### Observe $
Calling this will return an [rxjs-Observable](https://rxjs.dev/guide/observable) which streams every change to data of this collection.

```js
myCollection.$.subscribe(changeEvent => console.dir(changeEvent));

// you can also observe single event-types with insert$ update$ remove$
myCollection.insert$.subscribe(changeEvent => console.dir(changeEvent));
myCollection.update$.subscribe(changeEvent => console.dir(changeEvent));
myCollection.remove$.subscribe(changeEvent => console.dir(changeEvent));

```

### insert()
Use this to insert new documents into the database. The collection will validate the schema and automatically encrypt any encrypted fields. Returns the new RxDocument.

```js
const doc = await myCollection.insert({
  name: 'foo',
  lastname: 'bar'
});
```

### insertIfNotExists()

The insertIfNotExists() method attempts to insert a new document into the collection only if a document with the same primary key does not already exist. This is useful for ensuring uniqueness without having to manually check for existing records before inserting or handling [conflicts](./transactions-conflicts-revisions.md).

Returns either the newly added [RxDocument](./rx-document.md) or the previous existing document.

```js
const doc = await myCollection.insertIfNotExists({
  name: 'foo',
  lastname: 'bar'
});
```

### bulkInsert()

When you have to insert many documents at once, use bulk insert. This is much faster than calling `.insert()` multiple times.
Returns an object with a `success`- and `error`-array.

```js
const result = await myCollection.bulkInsert([{
  name: 'foo1',
  lastname: 'bar1'
},
{
  name: 'foo2',
  lastname: 'bar2'
}]);

// > {
//   success: [RxDocument, RxDocument],
//   error: []
// }
```

:::note
`bulkInsert` will not fail on update conflicts and you cannot expect that on failure the other documents are not inserted. Also the call to `bulkInsert()` it will not throw if a single document errors because of validation errors. Instead it will return the error in the `.error` property of the returned object.
:::

### bulkRemove()

When you want to remove many documents at once, use bulk remove. Returns an object with a `success`- and `error`-array.

```js
const result = await myCollection.bulkRemove([
  'primary1',
  'primary2'
]);

// > {
//   success: [RxDocument, RxDocument],
//   error: []
// }
```

Instead of providing the document ids, you can also use the [RxDocument](./rx-document.md) instances. This can have better performance if your code knows them already at the moment of removing them:
```js
const result = await myCollection.bulkRemove([
  myRxDocument1,
  myRxDocument2,
  /* ... */
]);
```

### upsert()
Inserts the document if it does not exist within the collection, otherwise it will overwrite it. Returns the new or overwritten RxDocument.
```js
const doc = await myCollection.upsert({
  name: 'foo',
  lastname: 'bar2'
});
```

### bulkUpsert()
Same as `upsert()` but runs over multiple documents. Improves performance compared to running many `upsert()` calls.
Returns an `error` and a `success` array.

```js
const docs = await myCollection.bulkUpsert([
  {
    name: 'foo',
    lastname: 'bar2'
  },
  {
    name: 'bar',
    lastname: 'foo2'
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
    name: 'Bob', // primary
    lastName: 'Kelso'
};

myCollection.upsert(docData);
myCollection.upsert(docData);
// -> throws because of parallel update to the same document

myCollection.incrementalUpsert(docData);
myCollection.incrementalUpsert(docData);
myCollection.incrementalUpsert(docData);

// wait until last upsert finished
await myCollection.incrementalUpsert(docData);
// -> works
```

### find()
To find documents in your collection, use this method. [See RxQuery.find()](./rx-query.md#find).

```js
// find all that are older than 18
const olderDocuments = await myCollection
    .find()
    .where('age')
    .gt(18)
    .exec(); // execute
```

### findOne()
This does basically what find() does, but it returns only a single document. You can pass a primary value to find a single document more easily.

To find documents in your collection, use this method. [See RxQuery.find()](./rx-query.md#findOne).

```js
// get document with name:foobar
myCollection.findOne({
  selector: {
    name: 'foo'
  }
}).exec().then(doc => console.dir(doc));

// get document by primary, functionally identical to above query
myCollection.findOne('foo')
  .exec().then(doc => console.dir(doc));
```

### findByIds()

Find many documents by their id (primary value). This has a way better performance than running multiple `findOne()` or a `find()` with a big `$or` selector.

Returns a `Map` where the primary key of the document is mapped to the document. Documents that do not exist or are deleted, will not be inside of the returned Map.

```js
const ids = [
  'alice',
  'bob',
  /* ... */
];
const docsMap = await myCollection.findByIds(ids);

console.dir(docsMap); // Map(2)
```

:::note
The `Map` returned by `findByIds` is not guaranteed to return elements in the same order as the list of ids passed to it.
:::

### exportJSON()
Use this function to create a json export from every document in the collection.

Before `exportJSON()` and `importJSON()` can be used, you have to add the `json-dump` plugin.

```javascript
import { addRxPlugin } from 'rxdb';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
addRxPlugin(RxDBJsonDumpPlugin);
```

```js
myCollection.exportJSON()
  .then(json => console.dir(json));
```

### importJSON()
To import the json dump into your collection, use this function.
```js
// import the dump to the database
myCollection.importJSON(json)
  .then(() => console.log('done'));
```
Note that importing will fire events for each inserted document.

### remove()

Removes all known data of the collection and its previous versions.
This removes the documents, the schemas, and older schemaVersions.

```js
await myCollection.remove();
// collection is now removed and can be re-created
```

### close()
Removes the collection's object instance from the [RxDatabase](./rx-database.md). This is to free up memory and stop all observers and replications. It will not delete the collections data. When you create the collection again with `database.addCollections()`, the newly added collection will still have all data.
```js
await myCollection.close();
```

### onClose / onRemove()
With these you can add a function that is run when the collection was closed or removed.
This works even across multiple browser tabs so you can detect when another tab removes the collection
and you application can behave accordingly.

```js
await myCollection.onClose(() => console.log('I am closed'));
await myCollection.onRemove(() => console.log('I am removed'));
```

### isRxCollection
Returns true if the given object is an instance of RxCollection. Returns false if not.
```js
const is = isRxCollection(myObj);
```

## FAQ

<details>
    <summary>When I reload the browser window, will my collections still be in the database?</summary>
    
    No, the javascript instance of the collections will not automatically load into the database on page reloads.
    You have to call the `addCollections()` method each time you create your database. This will create the JavaScript object instance of the RxCollection so that you can use it in the RxDatabase. The persisted data will be automatically in your RxCollection each time you create it.
    
</details>
<details>
    <summary>How to remove the limit of 16 collections?</summary>
    
    In the open-source version of RxDB, the amount of RxCollections that can exist in parallel is limited to `16`.
    To remove this limit, you can purchase the [Premium Plugins](/premium/) and call the `setPremiumFlag()` function before creating a database:
    ```ts
    import { setPremiumFlag } from 'rxdb-premium/plugins/shared';
    setPremiumFlag();
    ```
    
</details>
