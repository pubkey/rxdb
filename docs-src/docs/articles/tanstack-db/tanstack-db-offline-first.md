---
title: 'Building an Offline-First App with TanStack DB and RxDB'
slug: tanstack-db-offline-first.html
description: Make TanStack DB survive reloads and long offline stretches. Use RxDB for durable local-first persistence and replication that resumes once you're back online.
image: /headers/tanstack-db-offline-first.jpg
---

import {Steps} from '@site/src/components/steps';

# Building an Offline-First App with TanStack DB and RxDB

An **offline-first** app with **TanStack DB** keeps working when the network is gone: queries read from local data, writes are stored locally and pushed to the server later. TanStack DB itself is an in-memory reactive client store with live queries and optimistic mutations, and it delegates persistence and networking to the collection type you choose. The official `@tanstack/rxdb-db-collection` package puts [RxDB](https://rxdb.info/) underneath, as described in the [TanStack DB + RxDB overview](./rxdb-collection-for-tanstack-db.md). This page explains the full offline-first pattern: durable storage across reloads, replication that resumes from a checkpoint, queued offline writes, and the downsides you have to plan for.

<RxdbLogo alt="TanStack DB offline first" />

## What Offline-First Means for TanStack DB

[Offline-first](../../offline-first.md) is a software paradigm where the app stores data locally on the client's device and must work as well offline as it does online. Notice that offline-first is not about having no internet connection. The same pattern removes loading spinners, makes multi-tab usage consistent, and gives you [realtime](../realtime-database.md) UI updates out of the box, because every read and write goes against a local database instead of a remote server.

A plain TanStack DB collection covers the reactive part of this. It runs live queries in memory and applies mutations optimistically, so the UI never waits for the network. But two gaps remain:

- **Durability**: The in-memory state is gone when the user reloads the page or the browser kills the tab. An offline user who reloads would face an empty app.
- **Sync**: TanStack DB does not talk to your backend. Something has to pull server changes down, queue local writes while offline, and push them when the connection returns.

Both jobs belong to the collection implementation. The RxDB collection fills them with a real database underneath: documents are persisted through an [RxStorage](../../rx-storage.md) like [localStorage](../../rx-storage-localstorage.md) or [IndexedDB](../../rx-storage-indexeddb.md), and replication runs through RxDB's [Sync Engine](../../replication.md).

## Local-First: The Local Database Is the Source of Truth

Offline-first has evolved into the broader idea of [local-first](../local-first-future.md) software: the primary copy of the data lives on the client, not on a remote server. The server is a replication endpoint and backup, not the gateway for every user interaction.

With RxDB under TanStack DB, your app follows this model without extra work:

- Every write on the TanStack DB collection is persisted to RxDB and lands on disk. The write succeeds while offline because no server is involved.
- Every read runs against the in-memory mirror of the RxDB collection. When the app starts, that mirror is filled from disk, so the user sees their data instantly, even with no connection at all.
- Replication runs in the background and merges local and remote changes. When it cannot reach the backend, the app does not notice. It keeps reading and writing locally.

This is the difference between a cache and a local-first setup. A cache answers some reads while offline. A local database answers all reads, accepts all writes, and reconciles with the server later.

## Replication That Resumes When You Come Back Online

RxDB's [Sync Engine](../../replication.md) was designed for clients that go offline for minutes or weeks. Three mechanisms make the offline-online switch work:

- **Checkpoints**: The pull replication iterates over the backend data in batches and stores a checkpoint after each batch, keyed by the `replicationIdentifier`. When the client comes back online, or when the user reloads the app, the replication does not start over. It continues from the last stored checkpoint and only fetches documents that changed since then.
- **Queued offline writes**: Local writes are tracked by RxDB. While the push handler fails because the network is gone, the writes stay safely on disk. When a push succeeds again, all pending writes are sent to the backend in batches. Closing the tab in between loses nothing, because the queue lives in the storage, not in memory.
- **Retries and reconnect detection**: When a pull or push request fails, RxDB retries it after `retryTime` (default: 5 seconds). The wait time is skipped when an offline-to-online switch is detected via `navigator.onLine`, so the app syncs immediately after the connection returns instead of waiting for the next retry cycle.

When your backend provides an event stream, the stream should emit a `RESYNC` event on reconnect. This tells RxDB to run one more checkpoint iteration to catch up on events the client missed while offline. The details are described in the [Sync Engine documentation](../../replication.md#event-observation).

TanStack DB is not involved in any of this. Documents that arrive through replication are written to RxDB and stream into the TanStack DB collection automatically, and your live queries update.

## When @tanstack/offline-transactions Is Enough

TanStack ships its own package for offline writes: `@tanstack/offline-transactions` queues mutations while the client is offline so they can be applied later. When your collections load their data from a server-backed source anyway and the only thing you need is that outgoing mutations survive a lost connection, that package is a good fit and you do not need RxDB.

The full local database becomes the better choice when offline is a first-class mode of your app instead of an error state: when users must read all of their data with no connection, when sync has to resume from a checkpoint against [any backend](./sync-tanstack-db.md), when concurrent edits need [conflict resolution](./tanstack-db-conflict-resolution.md), and when [multiple tabs](./tanstack-db-multi-tab.md) must share one durable state. RxDB gives you all of that in one place.

## Example: An Offline-First Todo App

The following setup uses the free [localStorage-based storage](../../rx-storage-localstorage.md) and the generic [replication protocol](../../replication.md) with custom pull and push handlers. The comments mark which parts keep working while offline.

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create the Database and Collection

The schema contains an `updatedAt` field so the backend can sort documents by their last write time. This field is used as part of the replication checkpoint.

```ts
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// (optional) dev-mode checks, recommended during development
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);

const db = await createRxDatabase({
    name: 'offlinedb',
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
                // last write time, part of the replication checkpoint
                updatedAt: { type: 'number' }
            },
            required: ['id', 'text', 'completed', 'updatedAt']
        }
    }
});
```

### Start the Replication

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { lastOfArray } from 'rxdb';

const replicationState = replicateRxCollection({
    collection: db.todos,
    /**
     * RxDB stores the replication checkpoint under this id.
     * After a reload or a long offline stretch, the replication
     * resumes where it stopped instead of starting over.
     */
    replicationIdentifier: 'todos-to-https://example.com/api/sync',
    live: true,
    /**
     * Retry failed requests after 5 seconds.
     * The wait time is skipped when an offline->online switch
     * is detected via navigator.onLine.
     */
    retryTime: 5 * 1000,
    pull: {
        handler: async (checkpoint, batchSize) => {
            // Fails while offline. RxDB retries and continues
            // from the last checkpoint when the network is back.
            const response = await fetch(
                `https://example.com/api/sync/pull?checkpoint=${encodeURIComponent(
                    JSON.stringify(checkpoint)
                )}&limit=${batchSize}`
            );
            const documents = await response.json();
            return {
                documents,
                checkpoint: documents.length === 0 ? checkpoint : {
                    id: lastOfArray(documents).id,
                    updatedAt: lastOfArray(documents).updatedAt
                }
            };
        }
    },
    push: {
        handler: async (rows) => {
            // Offline writes queue up in the local storage.
            // When this handler succeeds again, all pending
            // writes are pushed in batches.
            const response = await fetch('https://example.com/api/sync/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rows)
            });
            // Return the conflicting documents, or an empty array.
            return await response.json();
        }
    }
});
```

Keep in mind that client-side clocks can never be trusted. The backend should overwrite the `updatedAt` value when it receives a pushed document.

### Wrap the RxCollection in a TanStack DB Collection

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos
    })
);
```

### Query and Write, Online or Offline

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function TodoList() {
    // Works offline: the live query runs against the in-memory
    // state that was loaded from localStorage. No network involved.
    const { data: openTodos } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );

    return (
        <ul>
            {openTodos.map((todo) => (
                <li key={todo.id}>{todo.text}</li>
            ))}
        </ul>
    );
}

// Works offline: the insert is persisted to localStorage instantly
// and survives a page reload. RxDB pushes it to the backend
// as soon as the client is online again.
todosCollection.insert({
    id: 'todo-1',
    text: 'works without network',
    completed: false,
    updatedAt: Date.now()
});
```

</Steps>

The localStorage storage is limited to a few megabytes and is meant for small datasets and prototypes. For production apps, switch to the [IndexedDB storage](./persist-tanstack-db-indexeddb.md). Switching storages is a configuration change, not a rewrite.

## The Downsides You Have to Plan For

Offline-first is not the right approach for every app, and it would be dishonest to skip its costs. The [downsides of offline-first](../../downsides-of-offline-first.md) page covers them in depth. The short version:

- **Conflicts**: When two users, or two devices of the same user, edit the same document while offline, the replication produces a conflict. The default handler in RxDB drops the local state and keeps the server state, so a client that was offline for weeks does not overwrite newer changes. When that is not acceptable, you have to write a custom [conflict handler](./tanstack-db-conflict-resolution.md) that merges the states.
- **Storage limits**: Browser storage is capped, and the cap differs per browser and device. localStorage holds only a few megabytes, IndexedDB reaches from hundreds of megabytes to many gigabytes. You cannot predict the exact limit for a given user, so offline-first only works when the dataset per user stays small enough to fit and to be downloaded on first start.
- **Storage is not guaranteed to persist**: Browsers can evict local data, and Safari deletes it when the site was not used for 7 days. The backend stays the durable copy, and the app must be able to rebuild its local state through replication.
- **Eventual consistency**: While a client is offline, its data diverges from the server. Users can act on stale state. For most apps this is fine, but data like financial transactions is too important to be eventually consistent. Show the sync state in the UI when it matters.

## FAQ

<details>
    <summary>Does TanStack DB work offline?</summary>

Yes, with the right collection type. TanStack DB queries and mutations run in memory, so they work without a network by design, but the state is lost on reload and nothing syncs. The **[RxDB collection](./rxdb-collection-for-tanstack-db.md)** adds durable storage and a replication that queues offline writes and resumes when the client is back online.

</details>

<details>
    <summary>Is TanStack DB local-first?</summary>

No, not on its own. TanStack DB is an in-memory store and delegates persistence and sync to the collection implementation. When you back it with **[RxDB](../../rx-database.md)**, the local database becomes the source of truth and the setup follows the [local-first](../local-first-future.md) model: all reads and writes are local, the server is a replication endpoint.

</details>

<details>
    <summary>Are offline writes lost when the user closes the tab?</summary>

No. Writes on the TanStack DB collection are persisted to the RxDB storage on disk, and the **[Sync Engine](../../replication.md)** tracks which of them still have to be pushed. After a reload, the replication resumes from its stored checkpoint and sends the pending writes to the backend.

</details>

<details>
    <summary>Do I need @tanstack/offline-transactions when using RxDB?</summary>

No. The `@tanstack/offline-transactions` package queues mutations while offline, which is useful when your data comes from a server-backed collection. With the RxDB collection, offline writes are already persisted locally and pushed later by **[RxDB's replication](../../replication.md)**, so a separate mutation queue is not needed.

</details>

<details>
    <summary>Does the replication resume from a checkpoint after being offline?</summary>

Yes. RxDB stores a checkpoint for each replication, identified by the `replicationIdentifier`. When the client reconnects, the **[Sync Engine](../../replication.md)** runs a checkpoint iteration that fetches only the documents changed since that checkpoint, and failed requests are retried after `retryTime` or immediately when `navigator.onLine` reports the connection is back.

</details>

## Follow Up

- Read the [TanStack DB + RxDB overview](./rxdb-collection-for-tanstack-db.md) for the full integration guide.
- Start with the [RxDB Quickstart](../../quickstart.md).
- Learn how to [sync TanStack DB with your backend](./sync-tanstack-db.md).
- Handle concurrent edits with [conflict resolution](./tanstack-db-conflict-resolution.md).
- Ship the pattern as an installable app: [Building an Offline PWA with TanStack DB and RxDB](./tanstack-db-pwa.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
