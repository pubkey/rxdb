# RxCollection
A collection stores documents of the same type.


## Creating a Collection
To create a collection you need a RxDatabase object which has the .collection()-method. Every collection needs a collection name and a valid RxSchema.

```js
myDatabase.collection({
  name: 'humans',
  schema: mySchema
})
  .then(collection => console.dir(collection));
```

### name
The name uniquely identifies the collection and should be used to refind the collection in the database. Two different collections in the same database can never have the same name. Collection names must match the following regex: `^[a-z][a-z0-9]*$`.

### schema
The schema defines how your data looks and how it should be handled. You can pass a RxSchema object or a simple javascript-object from which the schema will be generated.

### pouchSettings
You can pass settings directly to the [pouchdb database create options](https://pouchdb.com/api.html#options) through this property.

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
To find documents in your collection, use this method.
This will return a RxQuery object with the exec function.

```js
// directly pass search-object
myCollection.find({name: {$eq: 'foo'}})
  .exec().then(documents => console.dir(documents));

// find by using sql equivalent '%like%' syntax
// This example will fe: match 'foo' but also 'fifoo' or 'foofa' or 'fifoofa'
myCollection.find({name: {$regex: '.*foo.*'}})
  .exec().then(documents => console.dir(documents));
 
// find using a composite statement eg: $or
// This example checks where name is either foo or if name is not existant on the document
myCollection.find({$or: [ { name: { $eq: 'foo' } }, { name: { $exists: false } }})
  .exec().then(documents => console.dir(documents));
 
// do a case insensitive search
// This example will match 'foo' or 'FOO' or 'FoO' etc...
var regexp = new RegExp('^foo$', 'i');
myCollection.find({name: {$regex: regexp}})
  .exec().then(documents => console.dir(documents));
  
// chained queries
myCollection.find().where('name').eq('foo')
  .exec().then(documents => console.dir(documents));
```

### findOne()
This does basically what find() does, but it returns only a single document. You can pass a primary value to find a single document more easily.

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

### destroy()
Destroys the collection's object instance. This is to free up memory and stop all observings and replications.
```js
myDatabase.destroy();
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

### isRxCollection
Returns true if the given object is an instance of RxCollection. Returns false if not.
```js
const is = RxDB.isRxCollection(myObj);
```

---------
If you are new to RxDB, you should continue [here](./rx-document.md)
