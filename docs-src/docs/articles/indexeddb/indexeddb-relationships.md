---
title: IndexedDB Relationships - Modeling Relations in the Browser
slug: indexeddb-relationships.html
description: IndexedDB has no joins and no foreign keys. Learn how to model one-to-many and many-to-many relations with indexes, junction stores, and RxDB references.
image: /headers/indexeddb-relationships.jpg
---

import {QuoteBlock} from '@site/src/components/quoteblock';
import {ComparisonTable} from '@site/src/components/comparison-table';
import {Faq, FaqItem} from '@site/src/components/faq';

# IndexedDB Relationships

So you have a JavaScript web application that stores its data in [IndexedDB](../../rx-storage-indexeddb.md), and the data is not flat. Users write posts, posts carry comments, comments belong to users, and posts have tags. On the server you would write a `JOIN` and move on. In the browser you cannot.

IndexedDB has no joins, no foreign keys, and no referential integrity. It stores JSON values in object stores and looks them up by key. Everything above that is your job.

This page explains how to model **one-to-one**, **one-to-many**, and **many-to-many** relations on top of IndexedDB, where the naive implementation falls apart, and how a database like [RxDB](https://rxdb.info/) turns the pattern into a schema field.

<RxdbLogo alt="IndexedDB Relationships" />

## What IndexedDB Gives You and What It Does Not

IndexedDB is a key-value store with indexes. Each object store has a primary key, optionally some indexes, and that is the whole data model. There is no query planner that can walk from one store into another.

The gap is old and known. Nolan Lawson opened [w3c/IndexedDB#92](https://github.com/w3c/IndexedDB/issues/92) on September 22, 2016 asking for join queries across object stores, and described the workaround everyone still uses:

<QuoteBlock
  author="Nolan Lawson"
  year="2016"
  sourceLink="https://github.com/w3c/IndexedDB/issues/92"
>in IDB we have to use cursors to iterate through two objectStores, using an object value in one store as the foreign key in the other store.</QuoteBlock>

The issue is closed, labeled as a duplicate and a feature request. Ten years later, there is still no join in the API.

What IndexedDB does give you is the two primitives a relation needs:

- **Indexes**: an index on a non-unique field lets you fetch every record that points at a given key with one call. `IDBIndex.getAll()` has been available in all major browsers since January 2020 ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/IDBIndex/getAll)).
- **Multi-store transactions**: one transaction can span several object stores, so a read across both sides of a relation sees one consistent snapshot.

The scope of a transaction has to be declared when you open it, and it cannot grow later:

```js
// Both stores are in scope. Reads across them are consistent.
const tx = db.transaction(['users', 'posts'], 'readonly');
const users = tx.objectStore('users');
const posts = tx.objectStore('posts');
```

Calling `tx.objectStore('comments')` here throws a `NotFoundError`, because `comments` is not in the scope. So you have to know upfront which stores your relation touches. Keep in mind that a wide scope blocks other transactions on those stores, which is why the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction) tell you to specify only the stores you need.

## One-to-Many With a Foreign Key

The standard model is the same one you would use in SQL. The **many** side stores the key of the **one** side, and that field gets an index.

Object stores and indexes can only be created inside `onupgradeneeded`, so the relation is part of your schema version:

```js
const request = indexedDB.open('blog', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;

  db.createObjectStore('users', { keyPath: 'id' });

  const posts = db.createObjectStore('posts', { keyPath: 'id' });
  // The foreign key. Not unique, because one user has many posts.
  posts.createIndex('by-author', 'authorId', { unique: false });
};
```

A **one-to-one** relation is the same thing with `{ unique: true }` on the index, which is the only integrity check IndexedDB will run for you: a second record with the same key fails the write with a `ConstraintError`.

Reading one user's posts is then a single index lookup:

```js
function getPostsOfUser(db, userId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('posts', 'readonly');
    const request = tx.objectStore('posts').index('by-author').getAll(userId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

This is fast and it is the part IndexedDB does well. The trouble starts when you go the other way.

## The N+1 Problem

Loading 100 posts and then the author of each post is the obvious code to write:

```js
// Do not do this.
const posts = await promisify(db.transaction('posts').objectStore('posts').getAll());

for (const post of posts) {
  // A fresh transaction per post. 100 posts means 101 transactions.
  const tx = db.transaction('users', 'readonly');
  post.author = await promisify(tx.objectStore('users').get(post.authorId));
}
```

Each `await` here opens its own transaction, and transaction setup is what IndexedDB is slow at. The [RxDB IndexedDB performance analysis](../../slow-indexeddb.md) measured inserting `1k` documents in a single transaction at about **80 milliseconds**, and the same `1k` documents with one transaction per write at about **2 seconds**. Same data, same disk, **25x** slower. The bottleneck is transaction handling, not throughput.

The fix has two halves. Open one transaction for the whole operation, and do the join in memory:

```js
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPostsWithAuthors(db) {
  // One transaction for both stores, opened once.
  const tx = db.transaction(['posts', 'users'], 'readonly');
  const [posts, users] = await Promise.all([
    promisify(tx.objectStore('posts').getAll()),
    promisify(tx.objectStore('users').getAll())
  ]);

  const usersById = new Map(users.map(u => [u.id, u]));
  return posts.map(post => ({
    ...post,
    author: usersById.get(post.authorId)
  }));
}
```

Two reads instead of 101, and the `Map` lookup is free. When the `users` store is too big to load whole, collect the distinct `authorId` values first and fetch only those, still inside the one transaction. The rule is the same either way: **batch the reads, join in JavaScript**.

Notice that both requests are created before the first `await`. An IndexedDB transaction commits itself as soon as the microtask queue drains without a pending request, so issuing a second round of requests after an `await` fails with a `TransactionInactiveError`. This is the reason the two-phase shape above is not optional: read what you need in one go, then join outside the transaction.

## Many-to-Many With a Junction Store

A post has many tags, and a tag belongs to many posts. There are two ways to model this, and the right one depends on cardinality.

**A junction store** is the relational answer. A third object store holds the pairs, keyed by both sides:

```js
request.onupgradeneeded = (event) => {
  const db = event.target.result;

  db.createObjectStore('posts', { keyPath: 'id' });
  db.createObjectStore('tags', { keyPath: 'id' });

  // Compound primary key, so a pair can only exist once.
  const postTags = db.createObjectStore('post_tags', {
    keyPath: ['postId', 'tagId']
  });
  postTags.createIndex('by-post', 'postId', { unique: false });
  postTags.createIndex('by-tag', 'tagId', { unique: false });
};
```

Both directions are now one index lookup, and the compound key makes a duplicate pair impossible. Use this when either side can grow without a bound, for example posts per tag.

**An array of keys** on one side is the cheaper answer:

```js
const post = {
  id: 'post-1',
  title: 'Hello',
  tagIds: ['tag-a', 'tag-b']
};
```

With a `multiEntry` index on `tagIds` you can still query posts by tag, and reading a post's tags costs no extra lookup at all. It works when one side has a natural owner and limited cardinality. A post with twelve tags is fine. A tag with 40,000 posts is not, because you would rewrite that array on every single write.

## Nothing Enforces Any of This

The relation exists only in your code. IndexedDB will not stop you from breaking it.

- **No cascade delete.** Deleting a user leaves their posts pointing at a key that no longer resolves. You have to delete or re-parent them yourself, in the same `readwrite` transaction, or the cleanup can fail halfway.
- **No existence check.** An `authorId` that never pointed at a real user is a valid value, and nothing complains until a render finds `undefined`.
- **No validation.** IndexedDB stores whatever structured-cloneable value you hand it, so a typo in a foreign key field is written without complaint.
- **No integrity across schema versions.** A [migration](../../migration-schema.md) that renames a field has to rewrite both sides.

So every relation in an IndexedDB app is a convention that lives in application code, and it breaks the first time someone writes to the store from a path that does not know about it.

## Doing It With a Wrapper

Wrappers help with different parts of the problem, and none of the popular ones adds a join.

- **[idb](https://github.com/jakearchibald/idb)** wraps the callback API in promises and types your stores. Relations are still hand-written, but the promise API makes the batch-and-join pattern above readable. See [IndexedDB with TypeScript](./indexeddb-typescript.md) for the typing side.
- **[RxDB](https://rxdb.info/)** puts the reference into the schema and resolves it for you, which is the next section.

Compare the full feature matrix in [the best IndexedDB wrapper](./best-indexeddb-wrapper.md).

## Relationships in RxDB

RxDB is a local-first database that runs on top of IndexedDB and other [storages](../../rx-storage-indexeddb.md). It is NoSQL, so it has no joins either. What it has is [population](../../population.md), the same pattern Mongoose uses: a field declares which collection its value points into, and RxDB resolves it on access.

The relation is part of the [schema](../../rx-schema.md):

```js
const postSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    title: { type: 'string' },
    authorId: {
      type: 'string',
      // Points at the primary key of the 'users' collection.
      ref: 'users'
    },
    tagIds: {
      type: 'array',
      ref: 'tags',
      items: { type: 'string' }
    }
  },
  required: ['id', 'title', 'authorId']
};
```

A `ref` value MUST be a string or `['string', 'null']`, because it holds the primary key of the foreign document. Resolving it is one call:

```js
const post = await db.posts.findOne('post-1').exec();

// Explicit.
const author = await post.populate('authorId');

// Or the underscore getter, which does the same thing.
const sameAuthor = await post.authorId_;
```

The getter also works on nested fields, so `await myDocument.family.mother_` resolves a reference inside an object.

### One-to-Many With an Array of Refs

`tagIds` above is the interesting one. When you put `ref` on an **array of strings**, the field becomes a one-to-many reference: the parent document holds the primary keys of its children, and the getter resolves the whole list at once.

```js
const userSchema = {
  version: 0,
  primaryKey: 'name',
  type: 'object',
  properties: {
    name: { type: 'string', maxLength: 100 },
    postIds: {
      type: 'array',
      // Every entry is the primary key of a document in 'posts'.
      ref: 'posts',
      items: { type: 'string' }
    }
  },
  required: ['name']
};
```

Writing the relation is writing an array of strings:

```js
await db.users.insert({
  name: 'Alice',
  postIds: ['post-1', 'post-2', 'post-3']
});
```

And reading it back gives you documents, not keys:

```js
const alice = await db.users.findOne('Alice').exec();

const posts = await alice.postIds_;
console.dir(posts); // > Array.<RxDocument>

// The explicit form does the same.
const samePosts = await alice.populate('postIds');
```

Adding a child means rewriting the parent's array, so use an [incremental write](../../rx-document.md) to avoid a conflict when two tabs do it at the same time:

```js
await alice.incrementalModify(docData => {
  docData.postIds.push('post-4');
  return docData;
});
```

This shape is worth it when the parent owns a **bounded** list: a user's three addresses, a post's twelve tags, a playlist's tracks. It keeps the relation in one document, so reading it costs one lookup plus one populate, and there is no query to index.

It falls over on unbounded lists, for two reasons. Every added child rewrites the parent document, which creates a new revision and a [conflict](../../transactions-conflicts-revisions.md) point for every writer touching that parent. And the array cannot be indexed: RxDB allows indexes only on fields of type `string`, `integer`, and `number` ([schema docs](../../rx-schema.md)), so there is no efficient way to ask the reverse question of the array itself.

So for the unbounded direction, put the `ref` on the child and index it, exactly like the raw IndexedDB foreign key from earlier:

```js
const postSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    title: { type: 'string' },
    authorId: { type: 'string', maxLength: 100, ref: 'users' }
  },
  required: ['id', 'title', 'authorId'],
  // Indexable, because the field is a plain string.
  indexes: ['authorId']
};

// One indexed query, any number of posts.
const postsOfAlice = await db.posts.find({
  selector: { authorId: 'Alice' }
}).exec();
```

The rule of thumb: **array of refs when the parent owns a short list, `ref` on the child when the list can grow.** Both are one-to-many, and they cost different things.

### Populate Is Not a Join

Population does not delete the N+1 problem, it moves it. Populating inside a loop over 100 posts still runs 100 lookups. When you need the other side of a relation in bulk, query it once with `$in`:

```js
const posts = await db.posts.find().exec();
const authorIds = [...new Set(posts.map(p => p.authorId))];

const authors = await db.users.find({
  selector: { id: { $in: authorIds } }
}).exec();

const authorsById = new Map(authors.map(a => [a.id, a]));
```

Two things come for free that raw IndexedDB does not give you. The `ref` field is [validated](../../schema-validation.md) against the schema on every write, so a reference field cannot silently become a number. And queries are [reactive](../../reactivity.md), so a view that lists a user's posts re-renders when a post is written, from any tab.

What RxDB does not do is enforce the relation. There is no cascade delete and no check that the referenced document exists. Deleting a user still leaves dangling `authorId` values, and cleaning them up is your code, best placed in a [middleware hook](../../middleware.md) on the collection.

## Comparison

<ComparisonTable>

| | Native IndexedDB | idb | RxDB |
| --- | --- | --- | --- |
| Relation declared in schema | ❌ | ❌ | ✅ `ref` |
| One-to-many in the schema | ❌ | ❌ | ✅ array of `ref` |
| Resolve a reference | manual `get()` | manual `get()` | ✅ `populate()` |
| Index on foreign key | ✅ | ✅ | ✅ |
| Multi-store transaction | ✅ | ✅ | ⚠️ per-collection writes |
| Foreign key validated | ❌ | ❌ | ✅ schema validation |
| Cascade delete | ❌ | ❌ | ❌ |
| Reactive query results | ❌ | ❌ | ✅ RxJS |

</ComparisonTable>

## When to Denormalize Instead

Normalizing is the default for a reason. It keeps one copy of each fact, and an update touches one document. But a browser database is not a server database, and the read path is what your user waits on.

Embed instead of referencing when all of this holds:

- the embedded data is **small and bounded**, like an author's name and avatar URL on a post,
- it changes **rarely** compared to how often it is read,
- and you can accept that a change means rewriting every document that copies it.

A comment list that renders 200 comments with author names is a good case for embedding the name. A post that embeds its full author document is not, because a renamed user leaves 400 stale copies behind.

It is recommended to keep the reference as the source of truth and embed only the fields you render. So the post keeps `authorId` and also carries `authorName`, and a rename fixes both. Read more in [why NoSQL](../../why-nosql.md) and the [NoSQL performance tips](../../nosql-performance-tips.md).

## FAQ

<Faq>
<FaqItem question="Does IndexedDB support joins?">

No. IndexedDB has no join operation and no query language that spans object stores. You fetch from each store and combine the results in JavaScript. A join across two stores was requested in [w3c/IndexedDB#92](https://github.com/w3c/IndexedDB/issues/92) in 2016 and the issue was closed without an API.

</FaqItem>
<FaqItem question="How do I model a one-to-many relationship in IndexedDB?">

Store the parent's primary key on every child record and put a non-unique index on that field. Then `objectStore.index('by-author').getAll(userId)` returns all children of one parent in a single call. This is the same foreign key pattern used in SQL, without the constraint.

</FaqItem>
<FaqItem question="Does IndexedDB have foreign keys?">

No. There are no foreign key constraints, no referential integrity, and no cascade delete. A key that points at a deleted record stays in the store and resolves to `undefined`. Cleaning up after a delete is application code, and it should run in the same `readwrite` transaction as the delete.

</FaqItem>
<FaqItem question="Can one IndexedDB transaction read from multiple object stores?">

Yes. Pass an array of store names to `db.transaction(['users', 'posts'], 'readonly')` and all of them are readable within one consistent snapshot. The scope has to be declared when the transaction is created and cannot be extended afterwards, so accessing a store outside it throws a `NotFoundError`.

</FaqItem>
<FaqItem question="How do I model many-to-many in IndexedDB?">

Use a junction object store whose primary key is the compound key `['postId', 'tagId']`, with an index on each side. That gives you both directions in one lookup and makes duplicate pairs impossible. When one side has few entries and a natural owner, an array of keys with a `multiEntry` index is cheaper.

</FaqItem>
<FaqItem question="How do I model a one-to-many relationship in RxDB?">

Two ways, and the choice is about size. For a bounded list, put `ref` on an array of strings in the parent schema (`{ type: 'array', ref: 'posts', items: { type: 'string' } }`) and read it with the underscore getter, which resolves to an array of `RxDocument`. For a list that can grow, put `ref` on a string field of the child and add that field to the collection's `indexes`, then query it. RxDB indexes only `string`, `integer`, and `number` fields, so an array of refs cannot be indexed.

</FaqItem>
<FaqItem question="Why is loading related records from IndexedDB slow?">

Because of transaction overhead, not data volume. Fetching a related record per row opens one transaction per row, and RxDB's [IndexedDB benchmarks](../../slow-indexeddb.md) measured `1k` writes at about 80ms in one transaction against about 2 seconds with one transaction each. Read both stores inside a single transaction and join them with a `Map`.

</FaqItem>
</Faq>

## Follow Up

- Learn how [RxDB population](../../population.md) resolves references from the schema
- Understand [why IndexedDB is slow](../../slow-indexeddb.md) and what to do about it
- Read the [IndexedDB tutorial](./indexeddb-tutorial.md) for the API basics
- Compare the [best IndexedDB wrappers](./best-indexeddb-wrapper.md)
- Start with the [RxDB Quickstart](../../quickstart.md)
- Check the [RxDB code on GitHub](/code/) and leave a star ⭐
