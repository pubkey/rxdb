# RxCollection
A collection stores documents of the same type.


## Creating a Collection
To create a collection you need a RxDatabase-Object which has the .collection()-method. Every colletion needs a collection-name and a RxSchema.

```js
myDatabase.collection({
  name: 'humans',
  schema: mySchema
})
  .then(collection => console.dir(collection));
```

### name
The name identifies the collection and should be used to refind the collection in the database. Two different collections in the same database can never have the same name.

### schema
The schema defines how your data looks and how it should be handled. You can pass a RxSchema-Object or a simple javascript-object from which the schema will be generated.


## get a collection from the database
To get an existing collection from the database, call the collection-name directly on the database:

```javascript
const collection = await db.collection('heroes');
const collection2 = db.heroes;

console.log(collection == collection2);
// true

```

## Functions

### Observe $
Calling this will return an [rxjs-Observable](http://reactivex.io/rxjs/manual/overview.html#observable) which streams every change to data of this collection.

```js
myCollection.$.subscribe(changeEvent => console.dir(changeEvent));
```

### insert()
Use this to insert new documents to the database. The collection will validate the schema and encrypt the encrypted fields by itself. Returns the new RxDocument.

```js
const doc = await myCollection.insert({
  name: 'foo',
  lastname: 'bar'
});
```

### upsert()
Inserts if documents does not exsits. Overwrites if document exists. Returns the new or overwritten RxDocument.
```js
const doc = await myCollection.upsert({
  name: 'foo',
  lastname: 'bar2'
});
```

### .find()
To find documents in your collection, use this method.
This will return a RxQuery-Object with the exec-function.

```js
// directly pass search-object
myCollection.find({name: {$eq: 'foo'}})
  .exec().then(documents => console.dir(documents));

// chain querys
myCollection.find().where('name').eq('foo')
  .exec().then(documents => console.dir(documents));
```

### .findOne()
This does basically what find() does, but it returns only a single document. You can pass a primary-value to esier find a single document.

```js
// get document with name:foobar
myCollection.findOne().where('name').eq('foo')
  .exec().then(doc => console.dir(doc));

// get document by primary
myCollection.findOne('foo')
  .exec().then(doc => console.dir(doc));
```

### dump()
Use this function to create a json-export from every document in the collection. You can pass true as parameter to decrypted the encrypted data-fields of your documents.
```js
myCollection.dump()
  .then(json => console.dir(json));

// decrypted dump
myCollection.dump(true)
  .then(json => console.dir(json));
```

### importDump()
To import the json-dump into your collection, use this function.
```js
// import the dump to the database
myCollection.importDump(json)
  .then(() => console.log('done'));
```

### sync()
To replicate the colletion with another server, use this function. It basically does the same as [pouchdb-sync](https://pouchdb.com/guides/replication.html) but also add event-handles to make sure that change-events will be recognized.
```js
mycollection.sync('http://localhost:10102/db/');
```

---------
If you are new to RxDB, you should continue [here](./RxDocument.md)
