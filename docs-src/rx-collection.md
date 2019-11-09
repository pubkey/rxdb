# RxCollection
A collection stores documents of the same type.


## Creating a Collection
To create a collection you need a RxDatabase object which has the .collection()-method. Every collection needs a collection name and a valid RxSchema. Other attributes are optional.

```js
myDatabase.collection({
  name: 'humans',
  schema: mySchema,
  pouchSettings: {} // (optional)
  statics: {}, // (optional) // ORM-functions for this collection
  methods: {}, // (optional) ORM-functions for documents
  attachments: {}, // (optional) ORM-functions for attachments
  options: {}, // (optional) Custom paramters that might be used in plugins
  migrationStrategies: {}, // (optional)
  autoMigrate: true, // (optional)
})
  .then(collection => console.dir(collection));
```

### name
The name uniquely identifies the collection and should be used to refind the collection in the database. Two different collections in the same database can never have the same name. Collection names must match the following regex: `^[a-z][a-z0-9]*$`.

### schema
The schema defines how your data looks and how it should be handled. You can pass a RxSchema object or a simple javascript-object from which the schema will be generated.

### pouchSettings
You can pass settings directly to the [pouchdb database create options](https://pouchdb.com/api.html#options) through this property.

### ORM-functions
With the parameters `statics`, `methods` and `attachments`, you can defined ORM-functions that are applied to each of these objects that belong to this collection. See [ORM/DRM](./orm.md).

### Migration
With the parameters `migrationStrategies` and `autoMigrate` you can specify how mirgration between different schema-versions should be done. [See Migration](./data-migration.md).

## Get a collection from the database
To get an existing collection from the database, call the collection name directly on the database:

```javascript
// newly created collection
const collection = await db.collection({
  name: 'heroes',
  schema: mySchema
});
const collection2 = db.heroes;
// or
// const collection2 = db['heroes']

console.log(collection == collection2);
// true

```

## Functions

### Observe $
Calling this will return an [rxjs-Observable](http://reactivex.io/rxjs/manual/overview.html#observable) which streams every change to data of this collection.

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

### bulkInsert()

When you have to insert many documents at once, use bulk insert. This is much faster then calling `.insert()` multiple times.
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

NOTICE: `bulkInsert` will not fail on update conflicts and you cannot expect that on failure the other documents are not inserted.

### newDocument()
Sometimes it can be helpful to spawn and use documents before saving them into the database.
This is useful especially when you want to use the ORM methods or prefill values from form data.
You can create temporary documents by calling `RxCollection.newDocument(initalData)`.

```js
const tempDoc = myCollection.newDocument({
    firstName: 'Bob'
});

// fill in data later
tempDoc.lastName = 'Kelso';
tempDoc.age = 77;

// saving a temporary document will transform it to a standard RxDocument
await tempDoc.save();
```


### upsert()
Inserts the document if it does not exist within the collection, otherwise it will overwrite it. Returns the new or overwritten RxDocument.
```js
const doc = await myCollection.upsert({
  name: 'foo',
  lastname: 'bar2'
});
```

### atomicUpsert()

When you run many upsert operations on the same RxDocument in a very short timespan, you might get a `409 Conflict` error.
This means that you tried to run a `.upsert()` on the document, while the previous upsert operation was still running.
To prevent these types of errors, you can run atomic upsert operations.
The behavior is similar to [RxDocument.atomicUpdate](./rx-document.md#atomicUpdate).

```js
const docData = {
    name: 'Bob', // primary
    lastName: 'Kelso'
};

myCollection.upsert(docData);
myCollection.upsert(docData);
// -> throws because of parrallel update to the same document

myCollection.atomicUpsert(docData);
myCollection.atomicUpsert(docData);
myCollection.atomicUpsert(docData);

// wait until last upsert finished
await myCollection.atomicUpsert(docData);
// -> works
```

### find()
To find documents in your collection, use this method. [See RxQuery.find()](./rx-query.md#find).

```js
// find all that are older then 18
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
myCollection.findOne().where('name').eq('foo')
  .exec().then(doc => console.dir(doc));

// get document by primary, functionally identical to above query
myCollection.findOne('foo')
  .exec().then(doc => console.dir(doc));
```

### dump()
Use this function to create a json export from every document in the collection. You can pass true as parameter to decrypt the encrypted data fields of your documents.
```js
myCollection.dump()
  .then(json => console.dir(json));

// decrypted dump
myCollection.dump(true)
  .then(json => console.dir(json));
```

### importDump()
To import the json dump into your collection, use this function.
```js
// import the dump to the database
myCollection.importDump(json)
  .then(() => console.log('done'));
```

### sync()
This method allows you to replicate data between other RxCollections, pouchdb instances or remote servers which support the couchdb-sync-protocol.
Full documentation on how to use replication is [here](./replication.md).

### remove()

Removes all known data of the collection and its previous versions.
This removes the documents, the schemas, and older schemaVersions.

```js
await myCollection.remove();
// collection is now removed and can be re-created
```

### destroy()
Destroys the collection's object instance. This is to free up memory and stop all observings and replications.
```js
await myCollection.destroy();
```


### isRxCollection
Returns true if the given object is an instance of RxCollection. Returns false if not.
```js
const is = RxDB.isRxCollection(myObj);
```

---------
If you are new to RxDB, you should continue [here](./rx-document.md)
