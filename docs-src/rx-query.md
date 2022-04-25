# RxQuery

A query allows to find documents in your collection.
Like most other noSQL-Databases, RxDB uses the [mango-query-syntax](https://github.com/cloudant/mango). It is also possible to use [chained methods](https://docs.mongodb.com/manual/reference/method/db.collection.find/#combine-cursor-methods) with the `query-builder` plugin.

## find()
To create a basic `RxQuery`, call `.find()` on a collection and insert selectors. The result-set of normal queries is an array with documents.

```js
// find all that are older then 18
const query = myCollection
    .find({
      selector: {
        age: {
          $gt: 18
        }
      }
    });
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
    });
```

```js
// find the youngest one
const query = myCollection
    .findOne({
      selector: {},
      sort: [
        {age: 'asc'}
      ]
    });
```

```js
// find one document by the primary key
const query = myCollection.findOne('foobar');
```
## exec()
Returns a `Promise` that resolves with the result-set of the query.

```js
const query = myCollection.find();
const results = await query.exec();
console.dir(results); // > [RxDocument,RxDocument,RxDocument..]
```

## Query Builder

To use chained query methods, you can use the `query-builder` plugin.

```ts

// add the query builder plugin
import { addRxPlugin } from 'rxdb';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
addRxPlugin(RxDBQueryBuilderPlugin);

// now you can use chained query methods

const query = myCollection.find().where('age').gt(18);
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

// to use the update() method, you need to add the update plugin.
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
addRxPlugin(RxDBUpdatePlugin);


const query = myCollection.find({
  selector: {
    age: {
      $gt: 18
    }
  }
});
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
const query = myCollection.find({
  selector: {
    age: {
      $lt: 18
    }
  }
});
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

myCollection.find({
  selector: {
    age: {
      $gt: 18
    }
  }
}).doesDocumentDataMatch(documentData); // > true

myCollection.find({
  selector: {
    age: {
      $gt: 20
    }
  }
}).doesDocumentDataMatch(documentData); // > false
```


## Setting a specific index

By default, the query will be send to the RxStorage, where a query planner will determine which one of the available indexes must be used.
But the query planner cannot know everything and sometimes will not pick the most optimal index.
To improve query performance, you can specify which index must be used, when running the query.

```ts
const query = myCollection
    .findOne({
      selector: {
        age: {
          $gt: 18
        },
        gender: {
          $eq: 'm'
        }
      },
      /**
       * Because the developer knows that 50% of the documents are 'male',
       * but only 20% are below age 18,
       * it makes sense to enforce using the ['gender', 'age'] index to improve performance.
       * This could not be known by the query planer which might have choosen ['age', 'gender'] instead.
       */
      index: ['gender', 'age']
    });
```


## Examples
Here some examples to fast learn how to write queries without reading the docs.
- [Pouch-find-docs](https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-find/README.md) - learn how to use mango-queries
- [mquery-docs](https://github.com/aheckmann/mquery/blob/master/README.md) - learn how to use chained-queries


```js
// directly pass search-object
myCollection.find({
  selector: {
    name: { $eq: 'foo' }
  }
})
.exec().then(documents => console.dir(documents));

// find by using sql equivalent '%like%' syntax
// This example will fe: match 'foo' but also 'fifoo' or 'foofa' or 'fifoofa'
myCollection.find({
  selector: {
    name: { $regex: '.*foo.*' }
  }
})
.exec().then(documents => console.dir(documents));

// find using a composite statement eg: $or
// This example checks where name is either foo or if name is not existant on the document
myCollection.find({
  selector: { $or: [ { name: { $eq: 'foo' } }, { name: { $exists: false } }] }
})
.exec().then(documents => console.dir(documents));

// do a case insensitive search
// This example will match 'foo' or 'FOO' or 'FoO' etc...
var regexp = new RegExp('^foo$', 'i');
myCollection.find({
  selector: { name: { $regex: regexp } }
})
.exec().then(documents => console.dir(documents));

// chained queries
myCollection.find().where('name').eq('foo')
.exec().then(documents => console.dir(documents));
```

## NOTICE: RxDB will always append the primary key to the sort parameters
For several performance optimizations, like the [EventReduce algoritm](https://github.com/pubkey/event-reduce), RxDB expects all queries to return a deterministic sort order that does not depend on the insert order of the documents. To ensure a deterministic odering, RxDB will always append the primary key as last sort parameter to all queries and to all indexes.
This works in contrast to most other databases where a query without sorting would return the documents in the order in which they had been inserted to the database.


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
