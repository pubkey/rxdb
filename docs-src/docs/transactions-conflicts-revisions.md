---
title: Transactions, Conflicts and Revisions
slug: transactions-conflicts-revisions.html
description: Learn RxDB's approach to local and replication conflicts. Discover how incremental writes and custom handlers keep your app stable and efficient.
image: /headers/transactions-conflicts-revisions.jpg
---

# Transactions, Conflicts and Revisions

In contrast to most SQL databases, RxDB does not have the concept of relational ACID transactions. Instead, RxDB has to apply different techniques that better suit the offline-first, client-side world where it is not possible to create a transaction between multiple maybe-offline client devices.

## Why RxDB does not have transactions

When talking about transactions, we mean [ACID transactions](https://en.wikipedia.org/wiki/ACID) that guarantee the properties of atomicity, consistency, isolation and durability.
With an ACID transaction you can mutate data dependent on the current state of the database. It is ensured that no other database operations happen in between your transaction and after the transaction has finished, it is guaranteed that the new data is actually written to the disk.

To implement ACID transactions on a **single server**, the database has to keep track on who is running transactions and then schedule these transactions so that they can run in isolation.

As soon as you have to split your database on **multiple servers**, transaction handling becomes way more difficult. The servers have to communicate with each other to find a consensus about which transaction can run and which has to wait. Network connections might break, or one server might complete its part of the transaction and then be required to roll back its changes because of an error on another server. 

But with RxDB you have **multiple clients** that can go randomly online or offline. The users can have different devices and the clock of these devices can go off by any time. To support ACID transactions here, RxDB would have to make the whole world stand still for all clients, while one client is doing a write operation. And even that can only work when all clients are online. Implementing that might be possible, but at the cost of an unpredictable amount of performance loss and not being able to support [offline-first](./offline-first.md).

> A single write operation to a document is the only atomic thing you can do in [RxDatabase](./rx-database.md).

The benefits of not having to support transactions:

- Clients can read and write data without blocking each other.
- Clients can write data while being **offline** and then replicate with a server when they are **online** again, called [offline-first](./offline-first.md).
- Creating a compatible backend for the replication is easy so that RxDB can replicate with any existing infrastructure.
- Optimizations like [Sharding](./rx-storage-sharding.md) can be used.


## Revisions

Working without transactions leads to having undefined state when doing multiple database operations at the same time. Most client-side databases rely on a last-write-wins strategy on write operations. This might be a viable solution for some cases, but often this leads to strange problems that are hard to debug.

Instead, to ensure that the behavior of RxDB is **always predictable**, RxDB relies on **revisions** for version control. Revisions work similar to [Lamport Clocks](https://martinfowler.com/articles/patterns-of-distributed-systems/lamport-clock.html).

Each document is stored together with its revision string, that looks like `1-9dcca3b8e1a` and consists of:
- The revision height, a number that starts with `1` and is increased with each write to that document.
- The database instance token.

An operation to the RxDB data layer does not only contain the new document data, but also the previous document data with its revision string. If the previous revision matches the revision that is currently stored in the database, the write operation can succeed. If the previous revision is **different** than the revision that is currently stored in the database, the operation will throw a `409 CONFLICT` error.

## Conflicts

There are two types of conflicts in RxDB, the **local conflict** and the **replication conflict**.

### Local conflicts

A local conflict can happen when a write operation assumes a different previous document state, than what is currently stored in the database. This can happen when multiple parts of your application do simultaneous writes to the same document. This can happen on a single browser tab, or when multiple tabs write at once or when a write appears while the document gets replicated from a remote server replication.

When a local conflict appears, RxDB will throw a `409 CONFLICT` error. The calling code must then handle the error properly, depending on the application logic.

Instead of handling local conflicts, in most cases it is easier to ensure that they cannot happen, by using `incremental` database operations like [incrementalModify()](./rx-document.md), [incrementalPatch()](./rx-document.md) or [incrementalUpsert()](./rx-collection.md). These write operations have a built-in way to handle conflicts by re-applying the mutation functions to the conflicting document state.

## Replication conflicts

A replication conflict appears when multiple clients write to the same documents at once and these documents are then replicated to the backend server. 

When you replicate with the [GraphQL replication](./replication-graphql.md) and the [replication primitives](./replication.md), RxDB assumes that conflicts are **detected** and **resolved** at the client side.

When a document is sent to the backend and the backend detected a conflict (by comparing revisions or other properties), the backend will respond with the actual document state so that the client can compare this with the local document state and create a new, resolved document state that is then pushed to the server again. You can read more about the replication conflicts [here](./replication.md#conflict-handling).


## Custom conflict handler

A conflict handler is an object with two JavaScript functions:
- Detect if two document states are equal
- Solve existing conflicts

Because the conflict handler also is used for conflict detection, it will run many times on pull-, push- and write operations of RxDB. Most of the time it will detect that there is no conflict and then return.

Lets have a look at the [default conflict handler](https://github.com/pubkey/rxdb/blob/master/src/replication-protocol/default-conflict-handler.ts) of RxDB to learn how to create a custom one:

```ts
import { deepEqual } from 'rxdb/plugins/utils';
export const defaultConflictHandler: RxConflictHandler<any> = {
    isEqual(a, b) {
        /**
         * isEqual() is used to detect conflicts or to detect if a
         * document has to be pushed to the remote.
         * If the documents are deep equal,
         * we have no conflict.
         * Because deepEqual is CPU expensive, on your custom conflict handler you might only
         * check some properties, like the updatedAt time or revisions
         * for better performance.
         */
        return deepEqual(a, b);
    },
    resolve(i) {
        /**
         * The default conflict handler will always
         * drop the fork state and use the master state instead.
         * 
         * In your custom conflict handler you likely want to merge properties
         * of the realMasterState and the newDocumentState instead.
         */
        return i.realMasterState;
    }
};
```

To overwrite the default conflict handler, you have to specify a custom `conflictHandler` property when creating a collection with `addCollections()`.


```js
const myCollections = await myDatabase.addCollections({
  // key = collectionName
  humans: {
    schema: mySchema,
    conflictHandler: myCustomConflictHandler
  }
});
```
