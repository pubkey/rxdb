---
title: Query Builder - Chained Queries in RxDB
slug: query-builder.html
description: Learn how to use the RxDB query builder plugin to write chained queries with where(), comparison operators, nested fields, arrays, sorting, and pagination.
image: /headers/query-builder.jpg
---

# Query Builder

With the `query-builder` plugin you can write [RxQuery](./rx-query.md) selectors with chained methods instead of passing a JSON object. Each chained call adds one condition, and the result is a normal `RxQuery` with a normal mango query underneath. This means everything on the [RxQuery page](./rx-query.md) (`exec()`, `$`, `update()`, `remove()`, indexes, the [query cache](./query-cache.md)) works the same for chained queries.

All examples on this page use the `todos` collection and the example documents from the [example schema](./rx-schema.md#example-schema).

## Add the Plugin

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
addRxPlugin(RxDBQueryBuilderPlugin);
```

Now you can chain query methods on any `find()` or `findOne()` call:

```ts
// selector: { priority: { $gt: 5 } }
const query = myDatabase.todos.find().where('priority').gt(5);
const results = await query.exec();
// > [RxDocument[todo1], RxDocument[todo3]]
```

## Selecting a Field with where()

`where(path)` sets the field that the following operator method applies to. The selected field stays active until the next `where()` call, so you can chain multiple operators on the same field.

```ts
// selector: { priority: { $gte: 3, $lte: 8 }, done: { $eq: false } }
const results = await myDatabase.todos.find()
    .where('priority').gte(3).lte(8)
    .where('done').eq(false)
    .exec();
// > [RxDocument[todo1]]
```

Nested fields are selected with the dot notation:

```ts
// selector: { 'assignee.name': { $eq: 'Alice' } }
const results = await myDatabase.todos.find()
    .where('assignee.name').eq('Alice')
    .exec();
// > [RxDocument[todo1]]
```

You can also pass a plain selector object to `where()`. It is merged into the existing selector:

```ts
// selector: { done: false, priority: { $gt: 5 } }
const results = await myDatabase.todos.find()
    .where({
        done: false,
        priority: { $gt: 5 }
    })
    .exec();
// > [RxDocument[todo1], RxDocument[todo3]]
```

## Comparison Operators

Each operator method maps to the mango operator with the same name:

| Method | Mango operator | Example | Result |
| --- | --- | --- | --- |
| `eq(value)` / `equals(value)` | `$eq` | `.where('done').eq(true)` | `todo2` |
| `ne(value)` | `$ne` | `.where('done').ne(true)` | `todo1`, `todo3`, `todo4` |
| `gt(value)` | `$gt` | `.where('priority').gt(5)` | `todo1`, `todo3` |
| `gte(value)` | `$gte` | `.where('priority').gte(8)` | `todo1`, `todo3` |
| `lt(value)` | `$lt` | `.where('priority').lt(3)` | `todo4` |
| `lte(value)` | `$lte` | `.where('priority').lte(3)` | `todo2`, `todo4` |
| `in(array)` | `$in` | `.where('tags').in(['home', 'backend'])` | `todo2`, `todo3` |
| `nin(array)` | `$nin` | `.where('tags').nin(['rxdb'])` | `todo2`, `todo4` |
| `exists(boolean)` | `$exists` | `.where('note').exists(true)` | `todo2` |
| `regex(value)` | `$regex` | `.where('name').regex('.*RxDB.*')` | `todo1` |
| `mod([divisor, remainder])` | `$mod` | `.where('priority').mod([2, 0])` | `todo1`, `todo3` |

On an array field like `tags`, `in()` matches when at least one element of the array is in the given list, and `nin()` matches when no element is in the list.

`exists(false)` finds documents where an optional field is missing:

```ts
// selector: { assignee: { $exists: false } }
const results = await myDatabase.todos.find()
    .where('assignee').exists(false)
    .exec();
// > [RxDocument[todo3], RxDocument[todo4]]
```

Notice that on an `RxQuery`, each chained method takes exactly one argument and applies to the field that was selected with `where()` before. The two-argument forms like `.gt('priority', 5)` or `.exists('note')` are not supported. Always select the field with `where()` first.

## Regex Queries

`regex()` takes a regex string, or an object with `$regex` and `$options` when you need flags. Passing a `RegExp` instance throws an error, because a `RegExp` is not JSON-serializable and is mutable.

```ts
// sql equivalent of LIKE '%RxDB%'
const results = await myDatabase.todos.find()
    .where('name').regex('.*RxDB.*')
    .exec();
// > [RxDocument[todo1]]

// case insensitive: matches 'learn rxdb', 'LEARN RXDB', 'Learn RxDB' and so on
const caseInsensitiveResults = await myDatabase.todos.find()
    .where('name').regex({ $regex: '^learn rxdb$', $options: 'i' })
    .exec();
// > [RxDocument[todo1]]
```

## Array Fields

`size()` matches arrays with an exact number of elements:

```ts
// selector: { tags: { $size: 2 } }
const results = await myDatabase.todos.find()
    .where('tags').size(2)
    .exec();
// > [RxDocument[todo1], RxDocument[todo3]]
```

`elemMatch()` matches documents where at least one element of the array fulfills all given conditions:

```ts
// todos with at least one tag that starts with 'back'
// selector: { tags: { $elemMatch: { $regex: '^back' } } }
const results = await myDatabase.todos.find()
    .where('tags').elemMatch({ $regex: '^back' })
    .exec();
// > [RxDocument[todo3]]
```

For arrays of objects, `elemMatch()` also accepts a function instead of a selector. The function receives a nested query builder, so the element conditions can be chained with `where()` as well: `.where('items').elemMatch(elem => { elem.where('name').eq('foo'); })`.

To find documents where an array contains multiple values, use `and()` with one condition per value:

```ts
// todos that have both the 'rxdb' and the 'learning' tag
// selector: { $and: [ { tags: 'rxdb' }, { tags: 'learning' } ] }
const results = await myDatabase.todos.find()
    .and([
        { tags: 'rxdb' },
        { tags: 'learning' }
    ])
    .exec();
// > [RxDocument[todo1]]
```

## Logical Operators

`or()`, `and()` and `nor()` take an array of selectors and add them to the `$or`, `$and` and `$nor` lists of the query:

```ts
// todos that are done or have a priority of 9 or higher
// selector: { $or: [ { done: true }, { priority: { $gte: 9 } } ] }
const results = await myDatabase.todos.find()
    .or([
        { done: true },
        { priority: { $gte: 9 } }
    ])
    .exec();
// > [RxDocument[todo2], RxDocument[todo3]]
```

They can be combined with `where()` conditions:

```ts
// open todos that are neither tagged 'home' nor have a priority below 2
/**
 * selector: {
 *   done: { $eq: false },
 *   $nor: [ { tags: 'home' }, { priority: { $lt: 2 } } ]
 * }
 */
const results = await myDatabase.todos.find()
    .where('done').eq(false)
    .nor([
        { tags: 'home' },
        { priority: { $lt: 2 } }
    ])
    .exec();
// > [RxDocument[todo1], RxDocument[todo3]]
```

## Sorting

`sort()` accepts a space-separated string where a `-` prefix means descending, or an object with `'asc'`, `'desc'`, `1` or `-1` as values. Both queries below produce the sort `[{ priority: 'desc' }, { name: 'asc' }]`:

```ts
const results = await myDatabase.todos.find()
    .sort('-priority name')
    .exec();
// > [RxDocument[todo3], RxDocument[todo1], RxDocument[todo2], RxDocument[todo4]]

const sameResults = await myDatabase.todos.find()
    .sort({ priority: 'desc', name: 'asc' })
    .exec();
```

Same as with JSON queries, RxDB appends the primary key as last sort field to get a deterministic order.

## Limit and Skip

`limit()` and `skip()` set the number of returned documents and the offset. Together with `sort()` this is the way to paginate:

```ts
// the second page with 2 todos per page
const results = await myDatabase.todos.find()
    .sort('-priority')
    .skip(2)
    .limit(2)
    .exec();
// > [RxDocument[todo2], RxDocument[todo4]]
```

The chained methods also work with `findOne()`:

```ts
// the todo with the highest priority above 5
const doc = await myDatabase.todos.findOne()
    .where('priority').gt(5)
    .sort('-priority')
    .exec();
// > RxDocument[todo3]
```

## Chaining on an Existing Query

The query builder methods also work on queries that were created with a JSON selector. Each call returns a new `RxQuery` and does not modify the original one, because [RxQuery instances are immutable](./rx-query.md#rxquery-instances-are-immutable). This makes it possible to derive multiple queries from a base query:

```ts
const openTodosQuery = myDatabase.todos.find({
    selector: {
        done: false
    }
});

// selector: { done: false, priority: { $gte: 8 } }
const urgentOpenTodos = await openTodosQuery
    .where('priority').gte(8)
    .exec();
// > [RxDocument[todo1], RxDocument[todo3]]

// openTodosQuery is unchanged
```

## Full Example

The following example combines most of the methods. The comment shows the mango query that RxDB runs under the hood:

```ts
/**
 * {
 *   selector: {
 *     done: { $eq: false },
 *     priority: { $gte: 5 },
 *     tags: { $in: ['rxdb'] },
 *     $or: [ { 'assignee.name': 'Alice' }, { note: { $exists: false } } ]
 *   },
 *   sort: [ { priority: 'desc' } ],
 *   limit: 10
 * }
 */
const query = myDatabase.todos.find()
    .where('done').eq(false)
    .where('priority').gte(5)
    .where('tags').in(['rxdb'])
    .or([
        { 'assignee.name': 'Alice' },
        { note: { $exists: false } }
    ])
    .sort('-priority')
    .limit(10);

// emits the current results and again whenever they change
query.$.subscribe(todos => console.dir(todos));
// > [RxDocument[todo3], RxDocument[todo1]]
```

You can always inspect the generated mango query with `query.mangoQuery`. This helps when a chained query does not return the documents you expect.
