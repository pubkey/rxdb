# RxQuery

A query allows to find documents in your collection.
Like most other noSQL-Databases, RxDB uses the [mango-query-syntax](https://github.com/cloudant/mango). It is also possible to use [chained methods](https://docs.mongodb.com/manual/reference/method/db.collection.find/#combine-cursor-methods).

## find()
To create a basic `RxQuery`, call `.find()` on a collection and insert selectors. The result-set of normal queries is an array with documents.

```js
// find all that are older then 18
const query = myCollection
    .find()
    .where('age')
    .gt(18);
```

## findOne()
A findOne-query has only a single `RxDocument` or `null` as result-set.

```js
// find alice
const query = myCollection
    .findOne({
      selector: {
        name: 'alice'
      }
    })
```

```js
// find the youngest one
const query = myCollection
    .findOne()
    .sort('age')
```

## exec()
Returns a `Promise` that resolves with the result-set of the query.

```js
const query = myCollection.find();
const results = await query.exec();
console.dir(results); // > [RxDocument,RxDocument,RxDocument..]
```

## Observe $
An `BehaviorSubject` [see](https://medium.com/@luukgruijs/understanding-rxjs-behaviorsubject-replaysubject-and-asyncsubject-8cc061f1cfc0) that always has the current result-set as value.
This is extremely helpful when used together with UIs that should always show the same state as what is written in the database.

```js
const query = myCollection.find();
query.$.subscribe(results => {
    console.log('got results: ' + results.length);
});
// > 'got results: 5'   // BehaviorSubjects emit on subscription

await myCollection.insert({/* ... */}); // insert one
// > 'got results: 6'   // $.subscribe() was called again with the new results
```

## update()
Runs and [update](./rx-document.md#update) on every RxDocument of the query-result.

```js
const query = myCollection.find().where('age').gt(18);
await query.update({
    $inc: {
        age: 1 // increases age of every found document by 1
    }
});
```

## remove()

Deletes all found documents. Returns a promise which resolves to the deleted documents.

```javascript
// All documents where the age is less than 18
const query = myCollection.find().where('age').lt(18);
// Remove the documents from the collection
const removedDocs = await query.remove();
```

## doesDocumentDataMatch()
Returns `true` if the given document data matches the query.

```js
const documentData = {
  id: 'foobar',
  age: 19
};

myCollection.find().where('age').gt(18).doesDocumentDataMatch(documentData); // > true

myCollection.find().where('age').gt(20).doesDocumentDataMatch(documentData); // > false
```

## Examples
Here some examples to fast learn how to write queries without reading the docs.
- [Pouch-find-docs](https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-find/README.md) - learn how to use mango-queries
- [mquery-docs](https://github.com/aheckmann/mquery/blob/master/README.md) - learn how to use chained-queries


```js
// directly pass search-object
myCollection.find({
  selector: {
    name: {$eq: 'foo'}
  }
})
.exec().then(documents => console.dir(documents));

// find by using sql equivalent '%like%' syntax
// This example will fe: match 'foo' but also 'fifoo' or 'foofa' or 'fifoofa'
myCollection.find({
  selector: {
    name: {$regex: '.*foo.*'}
  }
})
.exec().then(documents => console.dir(documents));

// find using a composite statement eg: $or
// This example checks where name is either foo or if name is not existant on the document
myCollection.find({
  selector: {$or: [ { name: { $eq: 'foo' } }, { name: { $exists: false } }]}
})
.exec().then(documents => console.dir(documents));

// do a case insensitive search
// This example will match 'foo' or 'FOO' or 'FoO' etc...
var regexp = new RegExp('^foo$', 'i');
myCollection.find({
  selector: {name: {$regex: regexp}}
})
.exec().then(documents => console.dir(documents));

// chained queries
myCollection.find().where('name').eq('foo')
.exec().then(documents => console.dir(documents));
```

## NOTICE: RxQuery's are immutable

Because RxDB is a reactive database, we can do heavy performance-optimisation on query-results which change over time. To be able to do this, RxQuery's have to be immutable.
This means, when you have a `RxQuery` and run a `.where()` on it, the original RxQuery-Object is not changed. Instead the where-function returns a new `RxQuery`-Object with the changed where-field. Keep this in mind if you create RxQuery's and change them afterwards.

Example:

```javascript
const queryObject = myCollection.find().where('age').gt(18);
// Creates a new RxQuery object, does not modify previous one
queryObject.sort('name');
const results = await queryObject.exec();
console.dir(results); // result-documents are not sorted by name

const queryObjectSort = queryObject.sort('name');
const results = await queryObjectSort.exec();
console.dir(results); // result-documents are now sorted
```

### isRxQuery
Returns true if the given object is an instance of RxQuery. Returns false if not.
```js
const is = isRxQuery(myObj);
```

---------
If you are new to RxDB, you should continue [here](./rx-attachment.md)
