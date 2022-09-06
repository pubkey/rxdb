# Transactions, Conflicts and Revisions

In contrast to most SQL databases, RxDB does not have the concept of relational, ACID transactions. Instead, RxDB has to apply different techniques that better suite the offline-first, client side world.

## Why RxDB does not have transactions

When talking about transactions, we mean [ACID transactions](https://en.wikipedia.org/wiki/ACID) that guarantee the properties of atomicity, consistency, isolation and durability.
With an ACID transaction you can mutate data dependent on the current state of the database. It is ensured that no other database operations happen in between your transaction and after the transaction has finished, it is guaranteed that the new data is actually written to the disc.

To implement ACID transactions on a **single server**, the database has to keep track on who is running transactions and then schedule these transactions so that they can run in isolation.

As soon as you have to split your database on **multiple servers**, transaction handling becomes way more difficult. The servers have to communicate with each other to find a consens about which transaction can run and which has to wait. Network connections might break, or one server might complete its part of the transaction and then be required to roll back its changes because of an error on another server. 

But with RxDB you have **multiple clients** that can go randomly online or offline. The users can have different devices and the clock of these devices can go off by any time. To support ACID transactions here, RxDB would have to make the whole world stand still for all clients, while one client is doing a write operation. And even that can only work when all clients are online. Implementing that might be possible, but at the cost of an unpredictable amount of performance loss and not beaing able to support [offline-first](./offline-first.md).

> A single write operation to a document is the only atomic thing you can do in RxDB.

The benefits of not having to support transactions:

- Clients can read and write data without blocking each other.
- Clients can write data while being **offline** and then replicate with a server when they are **online** again, called [offline-first](./offline-first.md).
- Creating a compatible backend for the replication is easy so that RxDB can replicate with any existing infrastructure.
- Optimizations like [Sharding](./rx-storage-sharding.md) can be used.


## Revisions

Working without transactions leads to having undefined state when doing multiple database operations at the same time. Most client side databases rely on a last-write-wins stategy on write operations. This might be a viable solution for some cases, but often this leads to strange problems that are hard to debug.

Instead, to ensure that the behavior of RxDB is **always predictable**, RxDB relies on **revisions** for version control.

Each document is stored together with its revision string, that looks like `1-12080c42d471e3d2625e49dcca3b8e1a` and consists of:
- The revision height, a number that starts with `1` and is increased with each write to that document.
- A revision hash that is a hash string of the documents data. Different [RxStorage](./rx-storage.md) implementations might use different hashing methods.

An operation to the RxDB data layer does not only contain the new document data, but also the previous document data with its revision string. If the previous revision matches the revision that is currently stored in the database, the write operation can succeed. If the previous revision is **different** than the revision that is currently stored in the database, the operation will throw a `local conflict` error.

## Conflicts

There are two types of conflicts in RxDB, the **local conflict** and the **replication conflict**.

### Local conflicts

A local conflict can happen when a write operation assumes a different previous document state, then what is currently stored in the database. This can happen when multiple parts of your application do simultaneous writes to the same document. This can happen on a single browser tab, or even when multiple tabs write at once or when a write appears while the document gets replicated from a remote server replication.

When a local conflict appears, RxDB will throw an error. The calling code must then handle the error properly, depending on the application logic.

Instead of handling local conflicts, in most cases it is easier to ensure that they cannot happen, by using `atomic` database operations like [atomicUpdate()](./rx-document.md), [atomicPatch()](./rx-document.md) or [atomicUpsert()](./rx-collection.md). These write operations have a build in way to handle conflicts by re-applying the mutation functions to the conflicting document state.

## Replication conflicts

A replication conflict appears when mutliple clients write to the same documents at once and these documents are then replicated to the backend server. 

When you replicate with the [Graphql replication](./replication-graphql.md) and the [replication primitives](./replication.md), RxDB assumes that conflicts are **detected** and **resolved** at the client side.

When a document is send to the backend and the backend detected a conflict (by comparing revisions or other properties), the backend will respond with the actual document state so that the client can compare this with the local document state and create a new, resolved document state that is then pushed to the server again. [read more about the replication protocol here](./replication.md#conflict-handling)
