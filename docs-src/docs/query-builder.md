---
title: Query Builder - Chained Queries in RxDB
slug: query-builder.html
description: Learn how to use the RxDB query builder plugin to write chained queries with where(), and compare each chained method with its Mango query operator.
image: /headers/query-builder.jpg
---

# Query Builder

With the `query-builder` plugin you can write [RxQuery](./rx-query.md) selectors with chained methods instead of passing a JSON object. Each chained call adds one condition, and the result is a normal `RxQuery` with a normal [Mango query](./rx-query-examples.md) underneath. This means everything on the [RxQuery page](./rx-query.md) (`exec()`, `$`, `update()`, `remove()`, indexes, the [query cache](./query-cache.md)) works the same for chained queries.

The query builder adds no new operators. Every operator is explained with examples on the [RxQuery Examples](./rx-query-examples.md) page, and the table below shows the chained method for each of them.

## Add the Plugin

```ts
import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
addRxPlugin(RxDBQueryBuilderPlugin);

const myDatabase = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageLocalstorage()
});
await myDatabase.addCollections({
    // todoSchema and the inserted documents are from the example schema
    todos: { schema: todoSchema }
});
await myDatabase.todos.bulkInsert([ /* todo1, todo2, todo3, todo4 */ ]);

// selector: { done: { $eq: false }, priority: { $gte: 5 } }, sort: [{ priority: 'desc' }]
const query = myDatabase.todos.find()
    .where('done').eq(false)
    .where('priority').gte(5)
    .sort('-priority');

const results = await query.exec();
// > [RxDocument[todo3], RxDocument[todo1]]

// emits the current results and again whenever they change
query.$.subscribe(todos => console.dir(todos));
```

The documents are the ones from the [example schema](./rx-schema.md#example-schema). You can inspect the generated Mango query with `query.mangoQuery` when a chained query does not return the documents you expect.

## Mango Query vs. Query Builder

| Mango query | Query builder | Explained in |
| --- | --- | --- |
| `{ done: true }`, `{ done: { $eq: true } }` | `.where('done').eq(true)` or `.equals(true)` | [Selectors](./rx-query-examples.md#selectors) |
| `{ 'assignee.name': 'Alice' }` | `.where('assignee.name').eq('Alice')` | [Nested Fields](./rx-query-examples.md#nested-fields) |
| `{ priority: { $gt: 5 } }` | `.where('priority').gt(5)` | [Comparison Operators](./rx-query-examples.md#comparison-operators) |
| `$gte`, `$lt`, `$lte` | `.gte(8)`, `.lt(3)`, `.lte(3)` | [Comparison Operators](./rx-query-examples.md#comparison-operators) |
| `{ done: { $ne: true } }` | `.where('done').ne(true)` | [Comparison Operators](./rx-query-examples.md#comparison-operators) |
| `{ tags: { $in: ['home', 'backend'] } }`, `$nin` | `.where('tags').in(['home', 'backend'])`, `.nin([...])` | [Comparison Operators](./rx-query-examples.md#comparison-operators) |
| `{ note: { $exists: true } }` | `.where('note').exists(true)` | [Element Operators](./rx-query-examples.md#element-operators) |
| `{ name: { $regex: '.*RxDB.*' } }` | `.where('name').regex('.*RxDB.*')` | [Regex Queries](./rx-query-examples.md#regex-queries) |
| `{ tags: { $size: 2 } }` | `.where('tags').size(2)` | [Array Fields](./rx-query-examples.md#array-fields) |
| `{ tags: { $elemMatch: { $regex: '^back' } } }` | `.where('tags').elemMatch({ $regex: '^back' })` | [Array Fields](./rx-query-examples.md#array-fields) |
| `{ $or: [...] }`, `{ $and: [...] }`, `{ $nor: [...] }` | `.or([...])`, `.and([...])`, `.nor([...])` | [Logical Operators](./rx-query-examples.md#logical-operators) |
| `{ priority: { $not: { $gt: 5 } } }` | `.where({ priority: { $not: { $gt: 5 } } })` | [Logical Operators](./rx-query-examples.md#logical-operators) |
| `{ priority: { $mod: [2, 0] } }` | `.where('priority').mod(2, 0)` | [$mod](./rx-query-examples.md#mod) |
| `sort: [{ priority: 'desc' }, { name: 'asc' }]` | `.sort('-priority name')` or `.sort({ priority: 'desc', name: 'asc' })` | [Sorting](./rx-query-examples.md#sorting) |
| `skip: 2`, `limit: 2` | `.skip(2).limit(2)` | [Pagination with Skip and Limit](./rx-query-examples.md#pagination-with-skip-and-limit) |
| `find({ selector: { done: false } })` plus more conditions | `myDatabase.todos.find({ selector: { done: false } }).where('priority').gte(8)` | [RxQuery instances are immutable](./rx-query.md#rxquery-instances-are-immutable) |

## Rules of the Query Builder

- **`where()` selects the field**: `where(path)` sets the field that the following operator methods apply to. The field stays active until the next `where()` call, so `.where('priority').gte(3).lte(8)` creates `{ priority: { $gte: 3, $lte: 8 } }`. Nested fields use the dot notation.
- **`where()` with an object**: a plain selector object passed to `where()` is merged into the existing selector. Use this for operators without their own method, like `$not`.
- **One argument per method**: each operator method takes exactly one argument and applies to the field selected with `where()` before. The two-argument forms like `.gt('priority', 5)` or `.exists('note')` are not supported. The only exception is `mod()`, which accepts `mod([divisor, remainder])`, `mod(divisor, remainder)` and `mod('priority', 2, 0)` with the field as first argument.
- **Arrays with `in()` and `nin()`**: on an array field like `tags`, `in()` matches when at least one element is in the given list, and `nin()` matches when no element is in the list. To require multiple values in one array, use `.and([{ tags: 'rxdb' }, { tags: 'learning' }])`.
- **`exists(false)`** finds documents where an optional field is missing, for example `.where('assignee').exists(false)` returns `todo3` and `todo4`.
- **Regex**: `regex()` takes a regex string, or an object with `$regex` and `$options` for flags: `.regex({ $regex: '^learn rxdb$', $options: 'i' })`. Passing a `RegExp` instance throws an error, because a `RegExp` is not JSON-serializable and is mutable.
- **`elemMatch()` with a function**: for arrays of objects, `elemMatch()` also accepts a function that receives a nested query builder: `.where('items').elemMatch(elem => { elem.where('name').eq('foo'); })`.
- **Sorting**: `sort()` takes a space-separated string where a `-` prefix means descending, or an object with `'asc'`, `'desc'`, `1` or `-1` as values. Same as with JSON queries, RxDB appends the primary key as last sort field to get a deterministic order.
- **Limit**: `limit(0)` makes the query return zero documents and a negative value like `limit(-1)` throws [`QU23`](./errors.md#QU23).
- **`findOne()`**: the chained methods also work on `findOne()`, for example `myDatabase.todos.findOne().where('priority').gt(5).sort('-priority')` returns `todo3`.
- **Immutable queries**: each chained call returns a new `RxQuery` and does not modify the query it was called on, so you can derive multiple queries from one base query.
- **No `findByIds()`**: chained methods cannot be used on the `RxQuery` of `findByIds()`. In [dev-mode](./dev-mode.md) this throws [`QU17`](./errors.md#QU17). Use `find()` instead.
