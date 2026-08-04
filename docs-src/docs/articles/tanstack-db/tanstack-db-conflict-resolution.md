---
title: 'Conflict Resolution in TanStack DB with RxDB'
slug: tanstack-db-conflict-resolution.html
description: TanStack DB handles optimistic rollback but delegates server-side conflict resolution. Learn how RxDB's conflict handler resolves offline sync conflicts.
image: /headers/tanstack-db-conflict-resolution.jpg
---

import {Steps} from '@site/src/components/steps';

# Conflict Resolution in TanStack DB with RxDB

**TanStack DB conflict resolution** works on two levels that are easy to mix up. TanStack DB is an in-memory reactive client store with live queries and optimistic mutations, and when a local write fails to persist, it rolls the optimistic state back on its own. But when two offline clients change the same document and later sync, someone has to decide which state wins. That decision belongs to the persistence layer, and with the official `@tanstack/rxdb-db-collection` package described in [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md), that layer is [RxDB](https://rxdb.info/) with its [Sync Engine](../../replication.md) and a pluggable conflict handler. This page separates the two failure modes, explains how RxDB detects and resolves replication conflicts, and shows a runnable custom conflict handler.

<RxdbLogo alt="TanStack DB conflict resolution with RxDB" />

## Two Failure Modes, Two Owners

A write in a [TanStack DB + RxDB setup](./rxdb-collection-for-tanstack-db.md) can fail in two different places:

- **Local persistence failure**: The optimistic mutation cannot be written to the local database, for example because of a schema validation error. TanStack DB handles this itself by rolling back the in-memory state.
- **Replication conflict**: The write persisted fine on this client, but another client changed the same document in the meantime. The server rejects the push, and RxDB's conflict handler resolves the clash.

The first case is local and immediate. The second case only appears during [sync with a backend](./sync-tanstack-db.md), sometimes hours after the original write. Keeping the two apart makes conflict behavior in an [offline-first app](./tanstack-db-offline-first.md) predictable.

## Failure Mode 1: Optimistic Rollback

Writes on the TanStack DB collection are persisted to RxDB through fixed handlers: inserts use `bulkUpsert()`, updates use `incrementalPatch()`, and deletes use `bulkRemove()`. The mutation applies to the in-memory state instantly, and persistence runs in the background. When persisting fails, TanStack DB rolls the optimistic state back, and your UI returns to the last known good state.

This is TanStack DB's own feature. It works without a network connection, there is nothing to configure, and no conflict handler is involved. The rest of this page is about the second failure mode.

## Failure Mode 2: Replication Conflicts

Imagine two of your users modify the same document, while both are offline. Each write succeeds locally, because a single write operation to a document is the only atomic thing you can do in an [RxDatabase](../../rx-database.md). The trouble starts when both clients come back online and push their changes to the same server.

On the document level, RxDB's [Sync Engine](../../replication.md) works like git, where the fork/client contains all new writes and must be merged with the master/server before it can push its new state:

```
A---B1---C1---X    master/server state
     \       /
      B1---C2      fork/client state
```

The client tells the master to move the document from state `B1` to its new state `C2` by calling the push handler. But the actual master state is `C1`, because the other client was faster. The master detects this during the push, by comparing revisions or other properties, and rejects the write by sending back the actual master state `C1`.

**RxDB resolves all conflicts on the client.** It calls the conflict handler of the [RxCollection](../../rx-collection.md) with both states, creates a new resolved document state `D`, and pushes that to the master again:

```
A---B1---C1---X---D    master/server state
     \       / \ /
      B1---C2---D      fork/client state
```

So detection happens on the master side during push, resolution happens on the client. This split keeps the backend simple, because the server never needs merge logic. The resolved document then streams from RxDB into the TanStack DB collection through the change feed, and your live queries re-render with the winning state.

Under the hood, RxDB tracks document versions with **revisions**. Each document is stored with a revision string like `1-9dcca3b8e1a` that consists of a revision height and the database instance token. A write that assumes an outdated revision throws a `409 CONFLICT` error. The [Transactions, Conflicts and Revisions](../../transactions-conflicts-revisions.md) page explains this in detail.

## The Default Conflict Handler

Out of the box, RxDB ships a default conflict handler. It will always drop the fork state and use the master state instead. This ensures that clients that were offline for a long time do not accidentally overwrite other people's changes when they go online again.

This default is safe but lossy. The offline user's change to a conflicting document is discarded. For many apps that is acceptable. When it is not, you write a custom handler.

## Writing a Custom Conflict Handler

A conflict handler is an object with two JavaScript functions:

- `isEqual(a, b)` detects if two document states are equal.
- `resolve(i)` solves existing conflicts.

Because the conflict handler is also used for conflict detection, it runs many times on pull-, push-, and write operations. Most of the time it detects that there is no conflict and returns. This is what the [default conflict handler](../../transactions-conflicts-revisions.md#custom-conflict-handler) looks like:

```ts
import { deepEqual } from 'rxdb/plugins/utils';
export const defaultConflictHandler: RxConflictHandler<any> = {
    isEqual(a, b) {
        /**
         * isEqual() is used to detect conflicts or to detect if a
         * document has to be pushed to the remote.
         * If the documents are deep equal,
         * we have no conflict.
         * Because deepEqual is CPU expensive, on your
         * custom conflict handler you might only
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

The input of `resolve()` contains the `realMasterState` and the `newDocumentState`, so your handler can compare both and return a merged result. The following example builds a last-write-wins handler and wires it under TanStack DB.

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Define a Custom Conflict Handler

This handler keeps whichever state has the newer `updatedAt` value instead of dropping the client changes:

```ts
export const lastWriteWinsHandler = {
    isEqual(a, b) {
        /**
         * isEqual() runs many times during pull-, push- and
         * write operations of RxDB. Comparing a single field
         * is cheaper than a deep equal check.
         */
        return a.updatedAt === b.updatedAt;
    },
    resolve(i) {
        /**
         * resolve() runs when the server has rejected a pushed
         * document because its master state changed in between.
         * Merge or pick a winner from realMasterState
         * and newDocumentState here.
         */
        return i.newDocumentState.updatedAt > i.realMasterState.updatedAt
            ? i.newDocumentState
            : i.realMasterState;
    }
};
```

### Create the Database and Wire the Handler

The custom `conflictHandler` is set per collection when calling `addCollections()`:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'conflictdemo',
    storage: getRxStorageLocalstorage()
});

await db.addCollections({
    todos: {
        schema: {
            title: 'todos',
            version: 0,
            type: 'object',
            primaryKey: 'id',
            properties: {
                id: { type: 'string', maxLength: 100 },
                text: { type: 'string' },
                completed: { type: 'boolean' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'text', 'completed', 'updatedAt']
        },
        /**
         * The conflict handler runs during replication, when the
         * server rejects a pushed document because another client
         * changed it first. It does not run for plain local UI writes.
         */
        conflictHandler: lastWriteWinsHandler
    }
});
```

### Wrap the RxCollection for TanStack DB

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos
    })
);
```

Your components query and mutate `todosCollection` with `useLiveQuery()` as shown in the [setup guide](./rxdb-collection-for-tanstack-db.md). Nothing conflict-related happens on this layer.

### Replicate and Observe Conflicts

Replication is configured on the RxDB collection. The `conflict$` observable of the replication state lets you log or display resolved conflicts:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    collection: db.todos,
    replicationIdentifier: 'todos-sync-example-com',
    live: true,
    pull: { handler: /* ... */ },
    push: { handler: /* ... */ }
});

// emits each conflict that was reported by the remote in the response
// of the push handler, together with the output of the conflictHandler
// that resolved it.
replicationState.conflict$.subscribe(conflict => console.dir(conflict));
```

When a conflict is resolved, RxDB pushes the resolved state to the server, and the same state streams into the TanStack DB collection. All open live queries re-render with the winner. This is done.

</Steps>

## CRDTs as a Conflict-Free Alternative

For some apps, writing merge logic by hand is the wrong tool. With the [RxDB CRDT plugin](../../crdt.md), document writes are represented as CRDT operations in plain JSON, using NoSQL update operators like `$inc` and `$push`. The operations are stored together with the document, and each time a conflict arises, the CRDT conflict handler merges the operations in a deterministic way.

Two offline users incrementing the same counter is the classic case: a last-write-wins handler loses one increment, a CRDT `$inc` operation keeps both. When you use the CRDT plugin, you must NOT set a custom conflict handler, because the plugin brings its own. Read the [CRDT plugin docs](../../crdt.md) for the schema setup and the list of supported operators.

## FAQ

<details>
    <summary>Does TanStack DB resolve sync conflicts on its own?</summary>

No. TanStack DB rolls back the optimistic in-memory state when a local write fails to persist, but it does not talk to your backend. Replication and conflict resolution belong to the collection implementation, and with the RxDB collection they are handled by the **[RxDB Sync Engine](../../replication.md)** and the collection's conflict handler.

</details>

<details>
    <summary>Does the server resolve conflicts in RxDB replication?</summary>

No. The server only detects the conflict during a push, by comparing the assumed master state with its actual state, and responds with the actual document state. RxDB then resolves the conflict on the client by calling the conflict handler of the **[RxCollection](../../rx-collection.md)** and pushes the resolved state again. Your backend never needs merge logic.

</details>

<details>
    <summary>Can I use last-write-wins for TanStack DB conflict resolution?</summary>

Yes. Set a custom `conflictHandler` on the collection that compares a field like `updatedAt` and returns the newer of `realMasterState` and `newDocumentState`. Keep in mind that the **[default conflict handler](../../transactions-conflicts-revisions.md)** drops the fork state on purpose, so that clients that were offline for a long time do not overwrite other people's changes.

</details>

<details>
    <summary>Do CRDTs remove the need for a custom conflict handler?</summary>

Yes. The **[RxDB CRDT plugin](../../crdt.md)** stores each write as a CRDT operation and merges conflicting operations deterministically with its own built-in handler. You must not set a custom conflict handler when the CRDT plugin is enabled.

</details>

## Follow Up

- Learn how the whole integration works in [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md).
- Read [Transactions, Conflicts and Revisions](../../transactions-conflicts-revisions.md) for the full conflict model.
- Build the complete pattern in [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md).
- Connect a backend with [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).
- Start with the [RxDB Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your conflict strategy.
