---
title: RxQuery
slug: rx-query.html
description: Master RxQuery in RxDB - find, update, remove documents using Mango syntax, chained queries, real-time observations, indexing, and more.
---

# RxQuery

To find documents inside of an [RxCollection](./rx-collection.md), RxDB uses the RxQuery interface that handles all query operations: it serves as the main interface for fetching documents, relies on a MongoDB-like [Mango Query Syntax](https://github.com/cloudant/mango), and provides three types of queries: [find()](#find), [findOne()](#findone) and [count()](#count). By caching and de-duplicating results, RxQuery ensures efficient in-memory handling, and when queries are observed or re-run, the [EventReduce algorithm](https://github.com/pubkey/event-reduce) speeds up updates for a fast real-time experience and queries that run more than once.

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
A findOne-query has only a single `[RxDocument](./rx-document.md)` or `null` as result-set.

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

On `.findOne()` queries, you can call `.exec(true)` to ensure your document exists and to make TypeScript handling easier:

```ts
// docOrUndefined can be the type RxDocument or null which then has to be handled to be typesafe.
const docOrUndefined = await myCollection.findOne().exec();

// with .exec(true), it will throw if the document cannot be found and always have the type RxDocument
const doc = await myCollection.findOne().exec(true);
```


## Observe $
An `BehaviorSubject` [see](https://medium.com/@luukgruijs/understanding-rxjs-behaviorsubject-replaysubject-and-asyncsubject-8cc061f1cfc0) that always has the current result-set as value.
This is extremely helpful when used together with UIs that should always show the same state as what is written in the database.

```js
const query = myCollection.find();
const querySub = query.$.subscribe(results => {
    console.log('got results: ' + results.length);
});
// > 'got results: 5'   // BehaviorSubjects emit on subscription

await myCollection.insert({/* ... */}); // insert one
// > 'got results: 6'   // $.subscribe() was called again with the new results

// stop watching this query
querySub.unsubscribe()
```

## update()
Runs an [update](./rx-document.md#update) on every RxDocument of the query-result.

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

## patch() / incrementalPatch()

Runs the [RxDocument.patch()](./rx-document.md#patch) function on every RxDocument of the query result.

```js
const query = myCollection.find({
  selector: {
    age: {
      $gt: 18
    }
  }
});
await query.patch({
  age: 12 // set the age of every found to 12
});
```

## modify() / incrementalModify()

Runs the [RxDocument.modify()](./rx-document.md#modify) function on every RxDocument of the query result.

```js
const query = myCollection.find({
  selector: {
    age: {
      $gt: 18
    }
  }
});
await query.modify((docData) => {
  docData.age = docData.age + 1; // increases age of every found document by 1
  return docData;
});
```


## remove() / incrementalRemove()

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


## Query Builder Plugin

To use chained query methods, you can also use the `query-builder` plugin.

```ts
// add the query builder plugin
import { addRxPlugin } from 'rxdb';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
addRxPlugin(RxDBQueryBuilderPlugin);

// now you can use chained query methods

const query = myCollection.find().where('age').gt(18);
const result = await query.exec();
```


## Query Examples
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

/*
 * find by using sql equivalent '%like%' syntax
 * This example will fe: match 'foo' but also 'fifoo' or 'foofa' or 'fifoofa'
 * Notice that in RxDB queries, a regex is represented as a $regex string with the $options parameter for flags.
 * Using a RegExp instance is not allowed because they are not JSON.stringify()-able and also
 * RegExp instances are mutable which could cause undefined behavior when the RegExp is mutated
 * after the query was parsed.
 */
myCollection.find({
  selector: {
    name: { $regex: '.*foo.*' }
  }
})
.exec().then(documents => console.dir(documents));

// find using a composite statement eg: $or
// This example checks where name is either foo or if name is not existent on the document
myCollection.find({
  selector: { $or: [ { name: { $eq: 'foo' } }, { name: { $exists: false } }] }
})
.exec().then(documents => console.dir(documents));

// do a case insensitive search
// This example will match 'foo' or 'FOO' or 'FoO' etc...
myCollection.find({
  selector: { name: { $regex: '^foo$', $options: 'i' } }
})
.exec().then(documents => console.dir(documents));

// chained queries
myCollection.find().where('name').eq('foo')
.exec().then(documents => console.dir(documents));
```

:::note RxDB will always append the primary key to the sort parameters
For several performance optimizations, like the [EventReduce algorithm](https://github.com/pubkey/event-reduce), RxDB expects all queries to return a deterministic sort order that does not depend on the insert order of the documents. To ensure a deterministic ordering, RxDB will always append the primary key as last sort parameter to all queries and to all indexes.
This works in contrast to most other databases where a query without sorting would return the documents in the order in which they had been inserted to the database.
:::


## Setting a specific index

By default, the query will be sent to the RxStorage, where a query planner will determine which one of the available indexes must be used.
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
       * This could not be known by the query planer which might have chosen ['age', 'gender'] instead.
       */
      index: ['gender', 'age']
    });
```

## Count

When you only need the amount of documents that match a query, but you do not need the document data itself, you can use a count query for **better performance**.
The performance difference compared to a normal query differs depending on which [RxStorage](./rx-storage.md) implementation is used.

```ts
const query = myCollection.count({
  selector: {
    age: {
      $gt: 18
    }
  }
  // 'limit' and 'skip' MUST NOT be set for count queries.
});

// get the count result once
const matchingAmount = await query.exec(); // > number

// observe the result
query.$.subscribe(amount => {
  console.log('Currently has ' + amount + ' documents');
});
```

:::note
Count queries have a better performance than normal queries because they do not have to fetch the full document data out of the storage. Therefore it is **not** possible to run a `count()` query with a selector that requires to fetch and compare the document data. So if your query selector **does not** fully match an index of the schema, it is not allowed to run it. These queries would have no performance benefit compared to normal queries but have the tradeoff of not using the fetched document data for caching.
:::

```ts
/**
 * The following will throw an error because
 * the count operation cannot run on any specific index range
 * because the $regex operator is used.
 */
const query = myCollection.count({
  selector: {
    age: {
      $regex: 'foobar'
    }
  }
});

/**
 * The following will throw an error because
 * the count operation cannot run on any specific index range
 * because there is no ['age' ,'otherNumber'] index
 * defined in the schema.
 */
const query = myCollection.count({
  selector: {
    age: {
      $gt: 20
    },
    otherNumber: {
      $gt: 10
    }
  }
});
```

If you want to count these kinds of queries, you should do a normal query instead and use the length of the result set as counter. This has the same performance as running a non-fully-indexed count which has to fetch all document data from the database and run a query matcher.

```ts
// get count manually once
const resultSet = await myCollection.find({
  selector: {
    age: {
      $regex: 'foobar'
    }
  }
}).exec();
const count = resultSet.length;

// observe count manually
const count$ = myCollection.find({
  selector: {
    age: {
      $regex: 'foobar'
    }
  }
}).$.pipe(
  map(result => result.length)
);

/**
 * To allow non-fully-indexed count queries,
 * you can also specify that by setting allowSlowCount=true
 * when creating the database.
 */
const database = await createRxDatabase({
    name: 'mydatabase',
    allowSlowCount: true, // set this to true [default=false]
    /* ... */
});
```

### `allowSlowCount`
To allow non-fully-indexed count queries, you can also specify that by setting `allowSlowCount: true` when creating the database.
Doing this is mostly not wanted, because it would run the counting on the storage without having the document stored in the RxDB document cache.
This is only recommended if the RxStorage is running remotely like in a WebWorker and you not always want to send the document-data between the worker and the main thread. In this case you might only need the count-result instead to save performance.



## RxQuery's are immutable
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

## Design Decisions

Like most other noSQL-Databases, RxDB uses the [mango-query-syntax](https://github.com/cloudant/mango) similar to MongoDB and others.

- We use the JSON based Mango Query Syntax because:
  - Mango Queries work better with TypeScript compared to SQL strings.
  - Mango Queries are composable and easy to transform by code without joining SQL strings.
  - Queries can be run very fast and efficient with only a minimal query planer to plan the best indexes and operations.
  - NoSQL queries can be optimized with the [EventReduce](https://github.com/pubkey/event-reduce) algorithm to improve performance of observed and cached queries.


## FAQ


<details>
    <summary>Can I specify which document fields are returned by an RxDB query?</summary>
<div>
  No, RxDB does not support partial document retrieval. Because RxDB is a client-side database with limited memory, it caches and de-duplicates entire documents across multiple queries. Even if you only need a few fields, most storages must still fetch the entire JSON data, so subselecting fields would not significantly improve performance. Therefore, RxDB always returns full documents. If you only need certain fields, you can filter them out in your application code or consider storing just the necessary data in a separate collection.
</div>
</details>


<details>
    <summary>Why doesn't RxDB support aggregations on queries?</summary>
<div>
  RxDB runs entirely on the client side. Any "aggregation" or data processing you might do within RxDB would still happen in the same JavaScript environment as your application code. Therefore, there's no real performance advantage or difference between doing the aggregation in RxDB vs. doing it in your own code after fetching the data. As a result, RxDB doesn't provide built-in aggregation methods. Instead, just query the documents you need and perform any calculations directly in your app's code.
</div>
</details>


<details>
    <summary>Why does RxDB not support cross-collection queries?</summary>
<div>
  RxDB is a client-side database and does not provide built-in cross-collection queries or transactions. Instead, you can execute multiple queries in your JavaScript code and combine their results as needed. Because everything runs in the same environment, this approach offers the same performance you would get if cross-collection queries were built in - without the added complexity.
</div>
</details>

<details>
    <summary>Why Doesn't RxDB Support Case-Insensitive Search?</summary>
<div>
  RxDB relies on various storage engines as its backend, and these storage engines generally do not support case-insensitive search natively, like [IndexedDB](./rx-storage-indexeddb.md) or [FoundationDB](./rx-storage-foundationdb.md). This limitation arises from the design of these engines, which prioritize efficiency and flexibility for specific types of queries rather than universal features like case-insensitivity. Although RxDB does not offer built-in support for case-insensitive search, there are two common workarounds:
  - **Store Data in a Meta-Field for Lowercase Search**: To enable case-insensitive search, you can store an additional field in your documents where the relevant text data is preprocessed and saved in lowercase.
```ts
const document = {
  name: 'John Doe',
  nameLowercase: 'john doe' // Meta-field
};
await myCollection.insert(document);

const query = myCollection.find({
  selector: {
    nameLowercase: { $eq: 'john doe' }
  }
});
```
  - **Use a Regex Query**: Regular expressions can perform case-insensitive searches. For example:
```ts
const query = myCollection.find({
  selector: {
    name: { $regex: '^john doe$', $options: 'i' } // Case-insensitive regex
  }
});
```
However, this method has a significant downside: regex queries often cannot leverage indexes efficiently. As a result, they may be slower, especially for large datasets.
</div>
</details>
