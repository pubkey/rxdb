# RxQuery

> Master RxQuery in RxDB - find, update, remove documents using Mango syntax, chained queries, real-time observations, indexing, and more.

import {BetaBlock} from '@site/src/components/beta-block';
import {Faq, FaqItem} from '@site/src/components/faq';

# RxQuery

To find documents inside of an [RxCollection](./rx-collection.md), RxDB uses the RxQuery interface that handles all query operations: it serves as the main interface for fetching documents, relies on a MongoDB-like [Mango Query Syntax](./mango-query.md), and provides three types of queries: [find()](#find), [findOne()](#findOne) and [count()](#count). By caching and de-duplicating results, RxQuery ensures efficient in-memory handling, and when queries are observed or re-run, the [EventReduce algorithm](https://github.com/pubkey/event-reduce) speeds up updates for a fast real-time experience and queries that run more than once.

## find()
To create a basic `RxQuery`, call `.find()` on a collection and insert selectors. The result-set of normal queries is an array with documents.

```js
// find all todos with a priority greater than 5
const query = myDatabase.todos
    .find({
      selector: {
        priority: {
          $gt: 5
        }
      }
    });
const results = await query.exec();
// > [RxDocument[todo1], RxDocument[todo3]]
```

## findOne() {#findOne}
A findOne-query has only a single [RxDocument](./rx-document.md) or `null` as result-set.

```js
// find the todo with the name 'Buy groceries'
const query = myDatabase.todos
    .findOne({
      selector: {
        name: 'Buy groceries'
      }
    });
```

```js
// find the todo that is due first
const query = myDatabase.todos
    .findOne({
      selector: {},
      sort: [
        {dueAt: 'asc'}
      ]
    });
const doc = await query.exec();
// > RxDocument[todo1]
```

```js
// find one document by the primary key
const query = myDatabase.todos.findOne('todo1');
```
## exec()
Returns a `Promise` that resolves with the result-set of the query.

```js
const query = myDatabase.todos.find();
const results = await query.exec();
console.dir(results); // > [RxDocument,RxDocument,RxDocument,RxDocument]
```

On `.findOne()` queries, you can call `.exec(true)` to ensure your document exists and to make TypeScript handling easier:

```ts
// docOrUndefined can be RxDocument or null
// which then has to be handled to be typesafe.
const docOrUndefined = await myDatabase.todos.findOne().exec();

// with .exec(true), it will throw if the document
// cannot be found and always return type RxDocument
const doc = await myDatabase.todos.findOne().exec(true);
```

## Observe $ {#observe}
An `BehaviorSubject` [see](https://medium.com/@luukgruijs/understanding-rxjs-behaviorsubject-replaysubject-and-asyncsubject-8cc061f1cfc0) that always has the current result-set as value.
This is extremely helpful when used together with UIs that should always show the same state as what is written in the database.

```js
const query = myDatabase.todos.find();
const querySub = query.$.subscribe(results => {
    console.log('got results: ' + results.length);
});
// > 'got results: 4'   // BehaviorSubjects emit on subscription

await myDatabase.todos.insert({/* ... */}); // insert one
// > 'got results: 5'   // $.subscribe() was called again with the new results

// stop watching this query
querySub.unsubscribe()
```

## update()
Runs an [update](./rx-document.md#update) on every RxDocument of the query-result.

```js

// to use the update() method, you need to add the update plugin.
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
addRxPlugin(RxDBUpdatePlugin);

const query = myDatabase.todos.find({
  selector: {
    priority: {
      $gt: 5
    }
  }
});
await query.update({
    $inc: {
        priority: 1 // increases priority of every found document by 1
    }
});
```

## patch() / incrementalPatch()

Runs the [RxDocument.patch()](./rx-document.md#patch) function on every RxDocument of the query result.

```js
const query = myDatabase.todos.find({
  selector: {
    priority: {
      $gt: 5
    }
  }
});
await query.patch({
  done: true // set done of every found document to true
});
```

## modify() / incrementalModify()

Runs the [RxDocument.modify()](./rx-document.md#modify) function on every RxDocument of the query result.

```js
const query = myDatabase.todos.find({
  selector: {
    priority: {
      $gt: 5
    }
  }
});
await query.modify((docData) => {
  // increases priority of every found document by 1
  docData.priority = docData.priority + 1;
  return docData;
});
```

## remove() / incrementalRemove()

Deletes all found documents. Returns a promise which resolves to the deleted documents.

```javascript
// All todos that are done
const query = myDatabase.todos.find({
  selector: {
    done: {
      $eq: true
    }
  }
});
// Remove the documents from the collection
const removedDocs = await query.remove();
```

On `.findOne()` queries, `.remove()` returns `null` when no document matches. You can call `.remove(true)` to throw if the document is missing, similar to `.exec(true)`:

```ts
// returns null if no document matches
const removed = await myDatabase.todos.findOne('todo1').remove();

// throws if no document matches, return type is always RxDocument
const removed = await myDatabase.todos.findOne('todo1').remove(true);
```

## doesDocumentDataMatch()
Returns `true` if the given document data matches the query.

```js
const documentData = {
  id: 'todo1',
  name: 'Learn RxDB',
  priority: 8
};

myDatabase.todos.find({
  selector: {
    priority: {
      $gt: 5
    }
  }
}).doesDocumentDataMatch(documentData); // > true

myDatabase.todos.find({
  selector: {
    priority: {
      $gt: 9
    }
  }
}).doesDocumentDataMatch(documentData); // > false
```

## Mango Query Syntax

The `selector` of a query is written in the [Mango query syntax](./mango-query.md). The [Mango query page](./mango-query.md) shows every supported operator with examples, including nested fields, array fields, regex queries, sorting, and pagination.

```ts
const results = await myDatabase.todos.find({
  selector: {
    done: false,
    priority: { $gt: 5 }
  },
  sort: [{ priority: 'desc' }]
}).exec();
// > [RxDocument[todo3], RxDocument[todo1]]
```

## Query Builder Plugin

To use chained query methods, you can also use the [query builder plugin](./query-builder.md).

```ts
// add the query builder plugin
import { addRxPlugin } from 'rxdb';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
addRxPlugin(RxDBQueryBuilderPlugin);

// now you can use chained query methods

const query = myDatabase.todos.find().where('priority').gt(5);
const result = await query.exec();
```

The [query builder page](./query-builder.md) shows all chained methods with examples, including nested fields, array fields, logical operators, sorting, and pagination.

:::note RxDB will always append the primary key to the sort parameters
For several performance optimizations, like the [EventReduce algorithm](https://github.com/pubkey/event-reduce), RxDB expects all queries to return a deterministic sort order that does not depend on the insert order of the documents. To ensure a deterministic ordering, RxDB will always append the primary key as last sort parameter to all queries and to all indexes.
This works in contrast to most other databases where a query without sorting would return the documents in the order in which they had been inserted to the database.
:::

## Setting a specific index

By default, the query will be sent to the RxStorage, where a query planner will determine which one of the available indexes must be used. This is the step you would otherwise write by hand, as shown in [IndexedDB query](./articles/indexeddb/indexeddb-query.md).
But the query planner cannot know everything and sometimes will not pick the most optimal index.
To improve query performance, you can specify which index must be used, when running the query.

```ts
const query = myDatabase.todos
    .findOne({
      selector: {
        done: {
          $eq: false
        },
        dueAt: {
          $gt: '2026-01-03T00:00:00.000Z'
        }
      },
      /**
       * Because the developer knows that 50% of the todos are not done,
       * but only 10% are due after the given date,
       * it makes sense to enforce using the
       * 'dueAt' index to improve
       * performance.
       * This could not be known by the query
       * planner which might have chosen
       * ['done', 'priority'] instead.
       */
      index: ['dueAt']
    });
```

## Count

When you only need the amount of documents that match a query, but you do not need the document data itself, you can use a count query for **better performance**.
The performance difference compared to a normal query differs depending on which [RxStorage](./rx-storage.md) implementation is used.

```ts
const query = myDatabase.todos.count({
  selector: {
    done: {
      $eq: false
    },
    priority: {
      $gt: 5
    }
  }
  // 'limit' and 'skip' MUST NOT be set for count queries.
});

// get the count result once
const matchingAmount = await query.exec(); // > 2

// observe the result
query.$.subscribe(amount => {
  console.log('Currently has ' + amount + ' documents');
});
```

:::note
Count queries have a better performance than normal queries because they do not have to fetch the full document data out of the storage. Therefore it is **not** possible to run a `count()` query with a selector that requires fetching and comparing the document data. So if your query selector **does not** fully match an index of the schema, it is not allowed to run it. These queries would have no performance benefit compared to normal queries but have the tradeoff of not using the fetched document data for caching.
:::

```ts
/**
 * The following will throw an error because
 * the count operation cannot run on any specific index range
 * because the $regex operator is used.
 */
const query = myDatabase.todos.count({
  selector: {
    name: {
      $regex: 'groceries'
    }
  }
});

/**
 * The following will throw an error because
 * the count operation cannot run on any specific index range
 * because there is no ['priority', 'dueAt'] index
 * defined in the schema.
 */
const query = myDatabase.todos.count({
  selector: {
    priority: {
      $gt: 5
    },
    dueAt: {
      $gt: '2026-01-02T00:00:00.000Z'
    }
  }
});
```

If you want to count these kinds of queries, you should do a normal query instead and use the length of the result set as counter. This has the same performance as running a non-fully-indexed count which has to fetch all document data from the database and run a query matcher.

```ts
// get count manually once
const resultSet = await myDatabase.todos.find({
  selector: {
    name: {
      $regex: 'groceries'
    }
  }
}).exec();
const count = resultSet.length;

// observe count manually
const count$ = myDatabase.todos.find({
  selector: {
    name: {
      $regex: 'groceries'
    }
  }
}).$.pipe(
  map(result => result.length)
);

/**
 * To allow non-fully-indexed count queries,
 * you can also specify that by setting allowSlowCount: true
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
This is only recommended if the RxStorage is running remotely like in a WebWorker and you do not always want to send the document-data between the worker and the main thread. In this case you might only need the count-result instead to save performance.

## RxQuery instances are immutable
Because RxDB is a reactive database, we can do heavy performance-optimisation on query-results which change over time. To be able to do this, RxQueries have to be immutable.
This means, when you have a `RxQuery` and run a `.where()` on it, the original RxQuery object is not changed. Instead the where-function returns a new `RxQuery`-Object with the changed where-field. Keep this in mind if you create RxQueries and change them afterwards.

Example:

```javascript
const queryObject = myDatabase.todos.find().where('priority').gt(5);
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

## Query the Storage Directly

`exec()` returns `RxDocument` instances. RxDB creates and caches these instances, which costs time and memory when a query returns many documents that you only read once, for example for an export or a bulk computation. In that case you can skip the `RxDocument` layer and run the query against the [RxStorage](./rx-storage.md) instance of the collection with `collection.storageInstance.query()`.

`storageInstance.query()` needs a prepared query. Get it from a normal `RxQuery` with `getPreparedQuery()`. This normalizes the query, adds the `_deleted: false` condition so deleted documents are excluded, and calculates the query plan, the same way `exec()` does.

```ts
const rxQuery = myDatabase.todos.find({
    selector: { priority: { $gte: 8 } },
    sort: [{ priority: 'asc' }]
});
const preparedQuery = rxQuery.getPreparedQuery();

const result = await myDatabase.todos.storageInstance.query(preparedQuery);
console.log(result.documents);
/* > [{
    id: 'todo1',
    name: 'Learn RxDB',
    priority: 8,
    _deleted: false,
    _attachments: {},
    _meta: { lwt: 1791365224271 },
    _rev: '2-dwtwqbarqc'
}, ...] */

const countResult = await myDatabase.todos.storageInstance.count(preparedQuery);
console.log(countResult.count);
// > 2
```

To build the prepared query without an `RxQuery`, use `normalizeMangoQuery()` and `prepareQuery()` from `rxdb` together with the filled schema of the collection (`myDatabase.todos.schema.jsonSchema`). The selector must then contain `_deleted: { $eq: false }` yourself.

```ts
import { normalizeMangoQuery, prepareQuery } from 'rxdb';

const schema = myDatabase.todos.schema.jsonSchema;
const preparedQuery = prepareQuery(
    schema,
    normalizeMangoQuery(schema, {
        selector: {
            _deleted: { $eq: false },
            priority: { $gte: 8 }
        },
        sort: [{ priority: 'asc' }],
        limit: 100
    })
);
const result = await myDatabase.todos.storageInstance.query(preparedQuery);
```

Keep in mind what you lose when you query the storage directly:

- The results are plain `RxDocumentData` objects with the internal fields `_deleted`, `_attachments`, `_meta` and `_rev`. They have no [RxDocument](./rx-document.md) methods, no ORM methods and no getters for [population](./population.md).
- The results are not reactive and not cached. There is no `$` observable and every call runs the query on the storage again.
- The document cache of the collection is not used. Normally RxDB keeps one `RxDocument` instance per document revision and returns that same instance from every query. The storage returns new objects on every call instead, so when you run several raw queries, or mix them with normal queries, the same document can end up in memory multiple times.
- [Middleware](./middleware.md) hooks like `postCreate` do not run. Storage wrappers like [encryption](./encryption.md), [key compression](./key-compression.md) and schema validation still apply, because `collection.storageInstance` is the wrapped storage instance.

## liveQueryUpdateThrottleTime

<BetaBlock since="17.1.0" />

When set to a positive number (milliseconds), write-triggered live query updates are grouped with [RxJS auditTime](https://rxjs.dev/api/operators/auditTime) before `_ensureEqual()` runs. This limits how often RxDB re-evaluates a live query during write bursts, which avoids repeated full-result rebuilds for queries with large result sets.

The first query result is always emitted immediately so subscriptions still behave like a `BehaviorSubject` on startup. Only subsequent change-triggered reruns are throttled.

The value can be set at the database level (applies to all collections) or overridden per collection via `liveQueryUpdateThrottleTime` in `addCollections`.

```ts
// set at database level - applies to all collections
const myDatabase = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageLocalstorage(),
  liveQueryUpdateThrottleTime: 100 // ms
});

// or override per collection
await myDatabase.addCollections({
  todos: {
    schema: todoSchema,
    liveQueryUpdateThrottleTime: 200 // ms, overrides the database-level value
  }
});
```

## Design Decisions

Like most other noSQL-Databases, RxDB uses the [mango-query-syntax](https://github.com/cloudant/mango) similar to MongoDB and others.

- We use the JSON-based Mango Query Syntax because:
  - Mango Queries work better with TypeScript compared to SQL strings.
  - Mango Queries are composable and easy to transform by code without joining SQL strings.
  - Queries can be run very fast and efficient with only a minimal query planner to plan the best indexes and operations.
  - NoSQL queries can be optimized with the [EventReduce](https://github.com/pubkey/event-reduce) algorithm to improve performance of observed and cached queries.

## FAQ

<Faq>
<FaqItem question="Can I specify which document fields are returned by an RxDB query?">

  No, RxDB does not support partial document retrieval. Because RxDB is a client-side database with limited memory, it caches and de-duplicates entire documents across multiple queries. Even if you only need a few fields, most storages must still fetch the entire JSON data, so subselecting fields would not significantly improve performance. Therefore, RxDB always returns full documents. If you only need certain fields, you can filter them out in your application code or consider storing just the necessary data in a separate collection.

</FaqItem>
<FaqItem question="Why doesn't RxDB support aggregations on queries?">

  RxDB runs entirely on the client side. Any "aggregation" or data processing you might do within RxDB would still happen in the same JavaScript environment as your application code. Therefore, there's no real performance advantage or difference between doing the aggregation in RxDB vs. doing it in your own code after fetching the data. As a result, RxDB doesn't provide built-in aggregation methods. Instead, just query the documents you need and perform any calculations directly in your app's code.

</FaqItem>
<FaqItem question="Why does RxDB not support cross-collection queries?">

  RxDB is a client-side database and does not provide built-in cross-collection queries or transactions. Instead, you can execute multiple queries in your JavaScript code and combine their results as needed. Because everything runs in the same environment, this approach offers the same performance you would get if cross-collection queries were built in - without the added complexity.

</FaqItem>
<FaqItem question="Why Doesn't RxDB Support Case-Insensitive Search?">

  RxDB relies on various storage engines as its backend, and these storage engines generally do not support case-insensitive search natively, like [IndexedDB](./rx-storage-indexeddb.md) or [FoundationDB](./rx-storage-foundationdb.md). This limitation arises from the design of these engines, which prioritize efficiency and flexibility for specific types of queries rather than universal features like case-insensitivity. Although RxDB does not offer built-in support for case-insensitive search, there are two common workarounds:
  - **Store Data in a Meta-Field for Lowercase Search**: To enable case-insensitive search, you can store an additional field in your documents where the relevant text data is preprocessed and saved in lowercase.
```ts
const document = {
  id: 'todo1',
  name: 'Learn RxDB',
  nameLowercase: 'learn rxdb' // Meta-field
};
await myDatabase.todos.insert(document);

const query = myDatabase.todos.find({
  selector: {
    nameLowercase: { $eq: 'learn rxdb' }
  }
});
```
  - **Use a Regex Query**: Regular expressions can perform case-insensitive searches. For example:
```ts
const query = myDatabase.todos.find({
  selector: {
    name: { $regex: '^learn rxdb$', $options: 'i' } // Case-insensitive regex
  }
});
```
However, this method has a significant downside: regex queries often cannot leverage indexes efficiently. As a result, they may be slower, especially for large datasets.

</FaqItem>
</Faq>
