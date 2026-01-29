---
title: Efficient RxDB Queries via Query Cache
slug: query-cache.html
description: Learn how RxDB's Query Cache boosts performance by reusing queries. Discover its default replacement policy and how to define your own.
image: /headers/query-cache.jpg
---

# QueryCache

RxDB uses a `QueryCache` which optimizes the reuse of queries at runtime. This makes sense especially when RxDB is used in UI-applications where people move for- and backwards on different routes or pages and the same queries are used many times. Because of the [event-reduce algorithm](https://github.com/pubkey/event-reduce) cached queries are even valuable for optimization, when changes to the database occur between now and the last execution.

## Cache Replacement Policy

To not let RxDB fill up all the memory, a `cache replacement policy` is defined that clears up the cached queries. This is implemented as a function which runs regularly, depending on when queries are created and the database is idle. The default policy should be good enough for most use cases but defining custom ones can also make sense.


## The default policy

The default policy starts cleaning up queries depending on how much queries are in the cache and how much document data they contain.

* It will never uncache queries that have subscribers to their results
* It tries to always have less than 100 queries without subscriptions in the cache.
* It prefers to uncache queries that have never executed and are older than 30 seconds
* It prefers to uncache queries that have not been used for longer time

## Other references to queries

With JavaScript, it is not possible to count references to variables. Therefore it might happen that an uncached `RxQuery` is still referenced by the users code and used to get results. This should never be a problem, uncached queries must still work. Creating the same query again however, will result in having two `RxQuery` instances instead of one.

## Using a custom policy

A cache replacement policy is a normal JavaScript function according to the type `RxCacheReplacementPolicy`.
It gets the `RxCollection` as first parameter and the `QueryCache` as second. Then it iterates over the cached `RxQuery` instances and uncaches the desired ones with `uncacheRxQuery(rxQuery)`. When you create your custom policy, you should have a look at the [default](https://github.com/pubkey/rxdb/blob/master/src/query-cache.ts).

To apply a custom policy to a [RxCollection](./rx-collection.md), add the function as attribute `cacheReplacementPolicy`.

```ts
const collection = await myDatabase.addCollections({
    humans: {
        schema: mySchema,
        cacheReplacementPolicy: function(){ /* ... */ }
    }
});
```
