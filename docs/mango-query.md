# Mango Query Syntax - Operators and Examples for RxDB

> Learn the Mango query syntax of RxDB with examples for every supported operator, nested fields, arrays, regex, sorting, and pagination.

# Mango Query Syntax

[RxDB](https://rxdb.info/) queries are written in the **Mango query syntax**, a JSON-based query language that works like MongoDB queries. You pass a Mango query to `find()`, `findOne()` or `count()` of an [RxCollection](./rx-collection.md) and get back an [RxQuery](./rx-query.md). Because a Mango query is a plain JSON object, it can be typed with TypeScript, composed by code, and optimized by the [EventReduce algorithm](https://github.com/pubkey/event-reduce). If you prefer chained methods like `.where('priority').gt(5)`, use the [query builder](./query-builder.md), which creates the same Mango queries.

All examples on this page use the `todos` collection and the example documents from the [example schema](./rx-schema.md#example-schema).

## The Query Object

A Mango query is an object with these fields:

| Field | Description |
| --- | --- |
| `selector` | The conditions a document must match. An empty selector `{}` matches all documents. |
| `sort` | An array of `{ field: 'asc' \| 'desc' }` objects. |
| `skip` | The number of documents to skip. |
| `limit` | The maximum number of documents to return. |
| `index` | Forces the query to use a specific index. See [setting a specific index](./rx-query.md#setting-a-specific-index). |

```ts
const results = await myDatabase.todos.find({
    selector: {
        done: false
    },
    sort: [{ priority: 'desc' }],
    skip: 0,
    limit: 10
}).exec();
// > [RxDocument[todo3], RxDocument[todo1], RxDocument[todo4]]
```

## Selectors

A selector maps field names to conditions. A plain value is a shorthand for `$eq`:

```ts
// same as { name: { $eq: 'Learn RxDB' } }
const results = await myDatabase.todos.find({
    selector: {
        name: 'Learn RxDB'
    }
}).exec();
// > [RxDocument[todo1]]
```

When a selector has multiple fields, a document must match all of them:

```ts
// open todos with a priority greater than 5
const results = await myDatabase.todos.find({
    selector: {
        done: false,
        priority: { $gt: 5 }
    }
}).exec();
// > [RxDocument[todo1], RxDocument[todo3]]
```

### Nested Fields

Fields inside nested objects are selected with the dot notation. The field path has to be quoted:

```ts
const results = await myDatabase.todos.find({
    selector: {
        'assignee.name': 'Alice'
    }
}).exec();
// > [RxDocument[todo1]]
```

Notice that a document without the nested object also matches negated conditions like `$ne`. The query `{ 'assignee.name': { $ne: 'Alice' } }` returns `todo2`, `todo3` and `todo4`, because `todo3` and `todo4` have no `assignee` at all. Add `{ assignee: { $exists: true } }` when you only want documents that have the field.

## Comparison Operators

| Operator | Matches when the field value | Example | Result |
| --- | --- | --- | --- |
| `$eq` | is equal to the value | `{ done: { $eq: true } }` | `todo2` |
| `$ne` | is not equal to the value | `{ done: { $ne: true } }` | `todo1`, `todo3`, `todo4` |
| `$gt` | is greater than the value | `{ priority: { $gt: 5 } }` | `todo1`, `todo3` |
| `$gte` | is greater than or equal to the value | `{ priority: { $gte: 8 } }` | `todo1`, `todo3` |
| `$lt` | is less than the value | `{ priority: { $lt: 3 } }` | `todo4` |
| `$lte` | is less than or equal to the value | `{ priority: { $lte: 3 } }` | `todo2`, `todo4` |
| `$in` | is one of the values in the array | `{ name: { $in: ['Learn RxDB', 'Buy groceries'] } }` | `todo1`, `todo2` |
| `$nin` | is none of the values in the array | `{ name: { $nin: ['Learn RxDB', 'Buy groceries'] } }` | `todo3`, `todo4` |

Multiple operators on the same field are combined with AND. This is how you query a range:

```ts
// priority between 3 and 8
const results = await myDatabase.todos.find({
    selector: {
        priority: { $gte: 3, $lte: 8 }
    }
}).exec();
// > [RxDocument[todo1], RxDocument[todo2]]
```

The same works for dates. The `dueAt` field stores ISO 8601 strings, and ISO strings sort in chronological order, so a string comparison is a date comparison:

```ts
// todos that are due on January 2 or January 3
const results = await myDatabase.todos.find({
    selector: {
        dueAt: {
            $gte: '2026-01-02T00:00:00.000Z',
            $lt: '2026-01-04T00:00:00.000Z'
        }
    }
}).exec();
// > [RxDocument[todo2], RxDocument[todo3]]
```

## Element Operators

`$exists` checks whether an optional field is set:

```ts
// todos that have a note
const withNote = await myDatabase.todos.find({
    selector: { note: { $exists: true } }
}).exec();
// > [RxDocument[todo2]]

// todos without a note
const withoutNote = await myDatabase.todos.find({
    selector: { note: { $exists: false } }
}).exec();
// > [RxDocument[todo1], RxDocument[todo3], RxDocument[todo4]]
```

`$type` matches the JSON type of a field, for example `'string'`, `'number'`, `'boolean'`, `'object'`, `'array'` or `'null'`:

```ts
const results = await myDatabase.todos.find({
    selector: { assignee: { $type: 'object' } }
}).exec();
// > [RxDocument[todo1], RxDocument[todo2]]
```

## Regex Queries

`$regex` matches string fields against a regular expression. Flags like `i` for case insensitive matching go into `$options`. The regex has to be a string. A `RegExp` instance is not allowed, because it cannot be serialized with `JSON.stringify()` and it is mutable, which would cause undefined behavior when the `RegExp` is changed after the query was created.

```ts
// sql equivalent of LIKE '%RxDB%'
const containsRxDB = await myDatabase.todos.find({
    selector: { name: { $regex: '.*RxDB.*' } }
}).exec();
// > [RxDocument[todo1]]

// names that start with 'Set'
const startsWithSet = await myDatabase.todos.find({
    selector: { name: { $regex: '^Set' } }
}).exec();
// > [RxDocument[todo3]]

// case insensitive: matches 'learn rxdb', 'LEARN RXDB', 'Learn RxDB' and so on
const caseInsensitive = await myDatabase.todos.find({
    selector: { name: { $regex: '^learn rxdb$', $options: 'i' } }
}).exec();
// > [RxDocument[todo1]]
```

Keep in mind that regex queries cannot use an index in most cases, so they have to scan all documents. For large collections it is faster to store a lowercase copy of the field and query it with `$eq`, as shown in the [RxQuery FAQ](./rx-query.md#faq).

## Array Fields

When a field contains an array, a plain value or `$eq` matches documents where the array contains that value:

```ts
// todos tagged with 'rxdb'
const results = await myDatabase.todos.find({
    selector: { tags: 'rxdb' }
}).exec();
// > [RxDocument[todo1], RxDocument[todo3]]
```

`$in` matches when at least one element is in the given list, and `$nin` matches when no element is in the list:

```ts
const homeOrBackend = await myDatabase.todos.find({
    selector: { tags: { $in: ['home', 'backend'] } }
}).exec();
// > [RxDocument[todo2], RxDocument[todo3]]

const notRxdb = await myDatabase.todos.find({
    selector: { tags: { $nin: ['rxdb'] } }
}).exec();
// > [RxDocument[todo2], RxDocument[todo4]]
```

To find documents where the array contains multiple values, use `$and` with one condition per value:

```ts
// todos that have both the 'rxdb' and the 'learning' tag
const results = await myDatabase.todos.find({
    selector: {
        $and: [
            { tags: 'rxdb' },
            { tags: 'learning' }
        ]
    }
}).exec();
// > [RxDocument[todo1]]
```

`$size` matches arrays with an exact number of elements:

```ts
// todos without any tags
const results = await myDatabase.todos.find({
    selector: { tags: { $size: 0 } }
}).exec();
// > [RxDocument[todo4]]
```

`$elemMatch` matches when at least one element of the array fulfills all given conditions. On an array of objects, the conditions are written like a selector for one element, for example `{ items: { $elemMatch: { name: 'foo', amount: { $gt: 2 } } } }`. On an array of strings, the conditions apply to the element itself:

```ts
// todos with at least one tag that starts with 'back'
const results = await myDatabase.todos.find({
    selector: { tags: { $elemMatch: { $regex: '^back' } } }
}).exec();
// > [RxDocument[todo3]]
```

## Logical Operators

| Operator | Matches when |
| --- | --- |
| `$and` | all selectors in the array match |
| `$or` | at least one selector in the array matches |
| `$nor` | none of the selectors in the array match |
| `$not` | the operator expression does not match |

```ts
// todos that are done or have a priority of 9 or higher
const doneOrUrgent = await myDatabase.todos.find({
    selector: {
        $or: [
            { done: true },
            { priority: { $gte: 9 } }
        ]
    }
}).exec();
// > [RxDocument[todo2], RxDocument[todo3]]

// todos that are neither done nor have a priority below 2
const openAndImportant = await myDatabase.todos.find({
    selector: {
        $nor: [
            { done: true },
            { priority: { $lt: 2 } }
        ]
    }
}).exec();
// > [RxDocument[todo1], RxDocument[todo3]]
```

`$not` is placed on a field and negates the operator expression inside of it:

```ts
// todos with a priority that is not greater than 5
const results = await myDatabase.todos.find({
    selector: {
        priority: { $not: { $gt: 5 } }
    }
}).exec();
// > [RxDocument[todo2], RxDocument[todo4]]
```

Logical operators can be combined with field conditions. The field conditions and the `$or` must all match:

```ts
// open todos that are assigned to Alice or have a priority of 9 or higher
const results = await myDatabase.todos.find({
    selector: {
        done: false,
        $or: [
            { 'assignee.name': 'Alice' },
            { priority: { $gte: 9 } }
        ]
    }
}).exec();
// > [RxDocument[todo1], RxDocument[todo3]]
```

## $mod

`$mod` takes a `[divisor, remainder]` array and matches numbers where `value % divisor === remainder`:

```ts
// todos with an even priority
const results = await myDatabase.todos.find({
    selector: { priority: { $mod: [2, 0] } }
}).exec();
// > [RxDocument[todo1], RxDocument[todo3]]
```

## Sorting

`sort` is an array of objects, each with one field and the direction `'asc'` or `'desc'`. The documents are sorted by the first entry, and the later entries decide the order when the earlier fields are equal:

```ts
const byPriority = await myDatabase.todos.find({
    selector: {},
    sort: [{ priority: 'desc' }]
}).exec();
// > [RxDocument[todo3], RxDocument[todo1], RxDocument[todo2], RxDocument[todo4]]

// open todos first, then the ones with the latest due date
const byDoneAndDueDate = await myDatabase.todos.find({
    selector: {},
    sort: [
        { done: 'asc' },
        { dueAt: 'desc' }
    ]
}).exec();
// > [RxDocument[todo4], RxDocument[todo3], RxDocument[todo1], RxDocument[todo2]]
```

To sort by an element of an array, write the array index with the dot notation. Documents where the element does not exist are sorted first in ascending order:

```ts
// sort by the first tag
const byFirstTag = await myDatabase.todos.find({
    selector: {},
    sort: [{ 'tags.0': 'asc' }]
}).exec();
// > [RxDocument[todo4], RxDocument[todo2], RxDocument[todo1], RxDocument[todo3]]
```

The bracket notation like `{ 'tags[0]': 'asc' }` is not supported, because RxDB resolves nested fields only by the dot notation. In [dev-mode](./dev-mode.md) such a sort throws [`QU20`](./errors.md#QU20).

RxDB always appends the primary key as last sort field, so the result order is deterministic and never depends on the insert order. When a query has no `sort`, RxDB picks a sort order that fits the best [index](./rx-schema.md#indexes). Set `sort` explicitly when your code depends on the order. Sorting is fastest when the sort fields are part of an index.

## Pagination with Skip and Limit

`skip` and `limit` return one page of the sorted result:

```ts
// the second page with 2 todos per page, ordered by due date
const results = await myDatabase.todos.find({
    selector: {},
    sort: [{ dueAt: 'asc' }],
    skip: 2,
    limit: 2
}).exec();
// > [RxDocument[todo3], RxDocument[todo4]]
```

`findOne()` sets `limit: 1` by itself and returns the first document of the sorted result, or `null`:

```ts
// the open todo with the highest priority
const doc = await myDatabase.todos.findOne({
    selector: { done: false },
    sort: [{ priority: 'desc' }]
}).exec();
// > RxDocument[todo3]
```

`count()` queries do not allow `skip` and `limit`. See [count()](./rx-query.md#count).

## Query Rules

RxDB validates queries in [dev-mode](./dev-mode.md) to catch mistakes early:

- **Fields must be in the schema**: Top level fields in the `selector` and in `sort` must be defined in the [schema](./rx-schema.md). Otherwise the query throws [`QU13`](./errors.md#QU13).
- **No `undefined` values**: A query must not contain fields with the value `undefined`, because JSON serialization would drop them silently and change the meaning of the query. This throws [`QU19`](./errors.md#QU19).
- **No `RegExp` instances**: Use a `$regex` string instead. This throws [`QU16`](./errors.md#QU16).
- **Only the known query fields**: The query object may only contain `selector`, `sort`, `skip`, `limit` and `index`. This throws [`QU11`](./errors.md#QU11).

RxDB supports the operators `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`, `$type`, `$regex` (with `$options`), `$size`, `$mod`, `$elemMatch`, `$and`, `$or`, `$nor` and `$not`. Queries always return full documents. There are no projections or aggregations, because the documents are already in the same JavaScript process as your application code. Read more in the [RxQuery FAQ](./rx-query.md#faq).

## Adding Query Operators

RxDB runs queries with the [mingo](https://github.com/kofrasa/mingo) library. Mingo implements most MongoDB query operators, but RxDB only loads the operators listed above, because every loaded operator adds to the bundle size of your app. A query with any other operator fails with `unknown query operator`. There is no option to load more operators at runtime. To add one, change the RxDB source code and open a pull request:

1. **Load the operator** in `src/rx-query-mingo.ts`. Import it from `mingo/operators/query` and add it to the `query` object of `Context.init()`:

```ts
import { Context } from 'mingo/core';
import {
    $eq,
    /* ... the other loaded operators ... */
    $myOperator // <- the new operator
} from 'mingo/operators/query';

context = Context.init({
    query: {
        $eq,
        /* ... the other loaded operators ... */
        $myOperator
    }
});
```

2. **Add the typing** to `MangoQueryOperators` in `src/types/rx-query.d.ts`, so that TypeScript accepts the operator in a selector.
3. **Add a test** with `testCorrectQueries()` in `test/unit/rx-storage-query-correctness.test.ts`. These tests run against every [RxStorage](./rx-storage.md), so they also catch storages that do not use mingo for the given query.
4. **Check the bundle size** with `npm run build` and `npm run test:bundle-size`. If the size increase is intended, run `npm run bundle-size:update` and commit the updated limits.

The [contribution guide](./contribute.md) explains how to set up the repository and run the tests.
