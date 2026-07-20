---
title: 'Multi-Tab Sync for TanStack DB with RxDB'
slug: tanstack-db-multi-tab.html
description: Keep TanStack DB consistent across browser tabs. RxDB adds multi-tab leader election and cross-tab reactivity so every tab shares one durable, synced store.
image: /headers/tanstack-db-multi-tab.jpg
---

import {Steps} from '@site/src/components/steps';

# Multi-Tab Sync for TanStack DB with RxDB

**TanStack DB** is an in-memory reactive client store with live queries and optimistic mutations, and it delegates persistence and sync to the collection type you choose. Because each browser tab runs its own JavaScript process, each tab also holds its own in-memory TanStack DB state. [RxDB](https://rxdb.info/) fixes the **multi-tab** problem underneath: with the official `@tanstack/rxdb-db-collection` package from the [TanStack DB + RxDB integration](./rxdb-collection-for-tanstack-db.md), every tab reads from the same durable store, changes stream between tabs, and [leader election](../../leader-election.md) makes sure replication runs in exactly one tab. This page explains why tabs drift apart, how the `multiInstance` option and leader election work, and walks through a runnable cross-tab setup.

<RxdbLogo alt="TanStack DB multi tab sync" />

## The Multi-Tab Problem

Users open web apps in more than one tab all the time. Before you read on, check how many of your own open browser tabs show the same website more than once. Count them, I will wait..

For an in-memory store, every one of those tabs is a separate world. When your TanStack DB collection lives only in memory, tab A and tab B each load their own copy of the data. A todo checked off in tab A stays open in tab B until that tab reloads. The tabs drift apart.

Sync makes it worse. When every tab opens its own connection to the backend and runs its own replication, the same documents are pulled and pushed once per tab. Five tabs mean five websockets or five polling loops that all transfer the same data. This wastes the client's battery and your server's resources, and concurrent pushes from multiple tabs can race against each other.

So a multi-tab setup needs two things: one shared source of truth that all tabs read from, and a rule that only one tab talks to the backend. RxDB provides both out of the box.

## One Durable Store for All Tabs

With the RxDB collection, TanStack DB no longer owns the data. RxDB stores the documents durably in [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), or any other [RxStorage](../../rx-storage.md), and each tab's TanStack DB collection is an in-memory mirror of that one store.

The bridge between the layers is RxDB's change feed. Changes applied to RxDB by replication, by other tabs, or by direct RxDB code stream into the TanStack DB collection automatically. When tab A inserts a todo, the write lands in the shared storage, RxDB emits a change event across tabs, and the TanStack DB collections in tab B and tab C update their in-memory state. Live queries in all tabs re-run. No reload needed.

## The multiInstance Option

Cross-tab event sharing is controlled by the `multiInstance` option of [createRxDatabase](../../rx-database.md). When you create more than one instance of the same database in a single JavaScript runtime, `multiInstance` should be set to `true`. This enables the event sharing between the instances, so when the user has opened multiple browser windows, events are shared between them and both windows react to the same changes.

`multiInstance` defaults to `true`, so browser apps get this behavior without extra configuration. It should be set to `false` when you have single instances like a single Node.js process, a React Native app, a Cordova app, or a single-window [Electron](./tanstack-db-electron.md) app. This can decrease the startup time because no instance coordination has to be done.

## Leader Election: One Tab Runs Replication

Sharing events solves reading. Replication needs the second rule: no matter how many tabs are opened or closed, there must be always exactly **one** leader that manages the remote data access. You could build a messaging system between your tabs, hand out which one is leader, and reassign a new leader when the old one 'dies'. Or just use RxDB which does all these things for you.

To enable it, add the [leader election plugin](../../leader-election.md):

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);
```

RxDB's [Sync Engine](../../replication.md) uses the plugin automatically. `replicateRxCollection()` has a `waitForLeadership` option that defaults to `true`: the replication waits until the current instance is leader before it starts. Every tab calls the same replication code, but only the elected leader opens connections to the backend. When the leader tab is closed, another tab is elected and takes over the replication from its checkpoint. Notice that in a multi-instance setting you have to import the leader election plugin so that RxDB can know how many instances exist and which browser tab should run the replication.

For your own leader-only work, like scheduled fetches or push notification handling, the database exposes `waitForLeadership()`:

```ts
db.waitForLeadership().then(() => {
    console.log('Long lives the king!'); // <- runs when this tab becomes leader
    // start work that must run in exactly one tab
});
```

## Full Example: Cross-Tab TanStack DB Setup

The following example wires everything together. The basics of the RxDB collection are covered in the [hub article](./rxdb-collection-for-tanstack-db.md), so the shared parts stay short.

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create a Multi-Instance Database

```ts
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);

const db = await createRxDatabase({
    name: 'multitabdb',
    storage: getRxStorageLocalstorage(),
    multiInstance: true // default: true, shares change events between tabs
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
                completed: { type: 'boolean' }
            },
            required: ['id', 'text', 'completed']
        }
    }
});
```

### Wrap It in a TanStack DB Collection

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos
    })
);
```

### Start Replication in Every Tab, Run It in One

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    collection: db.todos,
    replicationIdentifier: 'todos-multi-tab-sync',
    live: true,
    /**
     * (optional) [default=true]
     * The replication waits until this tab is elected leader.
     * All tabs run this code, exactly one tab replicates.
     */
    waitForLeadership: true,
    pull: {
        handler: async (checkpoint, batchSize) => {
            /* fetch changes from your backend, see the sync guide */
        }
    },
    push: {
        handler: async (rows) => {
            /* send changes to your backend, see the sync guide */
        }
    }
});
```

The pull and push handlers are explained in [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).

### Observe the Cross-Tab Updates

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function OpenTodos() {
    // Re-renders when a matching document changes, in ANY tab.
    const { data: openTodos } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );
    return <ul>{openTodos.map((t) => <li key={t.id}>{t.text}</li>)}</ul>;
}

// Insert in one tab, watch it appear in the other:
todosCollection.insert({ id: 'todo-1', text: 'buy milk', completed: false });
```

To see it in action, open your app in two browser tabs side by side and insert a todo in the first tab. The list in the second tab updates without a reload, because the write goes into the shared RxDB storage and streams into the other tab's TanStack DB collection through the change feed.

</Steps>

## Pitfalls in Multi-Tab Setups

- **Do not block the app on `awaitInitialReplication()`**: When `multiInstance: true` and `waitForLeadership: true` and another tab is already running the replication, `awaitInitialReplication()` and `awaitInSync()` will not resolve in the non-leader tabs until the other tab is closed and the replication starts there. Showing a loading spinner until they resolve breaks non-leader tabs. Store the last in-sync time in a [local document](../../rx-local-document.md) instead and observe it in all tabs.
- **Hidden tabs**: Browsers hibernate background tabs to save battery, which can make a leader tab stale. The `toggleOnDocumentVisible` option of the [Sync Engine](../../replication.md) (default: `true`) pauses replication when the tab becomes hidden and resumes it when the tab becomes visible again or the instance becomes leader.
- **Duplicate leaders**: On rare occasions, more than one leader can be elected, for example when the CPU is at 100% and the JavaScript process is blocked for a long time. For most cases this is not a problem because both tabs then replicate with the same backend. The [leader election page](../../leader-election.md) shows how to handle the duplicate leader event.

## Advanced: SharedWorker Storage

Instead of running one storage instance per tab, the [SharedWorker RxStorage](../../rx-storage-shared-worker.md) (part of [RxDB Premium 👑](/premium/)) runs the storage in a single JavaScript process that all tabs share, which removes duplicate database connections and improves performance in tab-heavy apps.

## FAQ

<details>
    <summary>Does TanStack DB sync across multiple browser tabs on its own?</summary>

No. TanStack DB keeps collection data in memory, and each tab holds its own independent copy. Cross-tab consistency comes from the collection implementation. The **[RxDB collection](./rxdb-collection-for-tanstack-db.md)** stores data in a shared durable storage and streams changes from one tab into the TanStack DB collections of all other tabs.

</details>

<details>
    <summary>Does RxDB replication run in every open tab?</summary>

No, not by default. With `waitForLeadership: true` (the default), the **[Sync Engine](../../replication.md)** waits until the tab is elected leader before it starts replicating, so exactly one tab talks to the backend. When you set `waitForLeadership: false`, each tab runs its own replication cycles.

</details>

<details>
    <summary>Do I need the leader election plugin for TanStack DB cross-tab sync?</summary>

Yes, when replication is involved. In a multi-instance setting you have to import the **[leader election plugin](../../leader-election.md)** so that RxDB can know how many instances exist and which browser tab should run the replication. Plain cross-tab reactivity without replication only needs `multiInstance: true`, which is the default.

</details>

<details>
    <summary>Should I set multiInstance to false in the browser?</summary>

No, not for normal web apps. `multiInstance: true` is the default and enables event sharing between tabs. Set it to `false` only for single-instance environments like a Node.js process, React Native, or a single-window Electron app, where skipping the instance coordination decreases the startup time. See the **[RxDatabase](../../rx-database.md)** documentation for details.

</details>

## Follow Up

- Read the [TanStack DB + RxDB overview](./rxdb-collection-for-tanstack-db.md) for the full integration guide.
- Learn how [leader election](../../leader-election.md) works under the hood.
- Set up backend replication with [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).
- Build a fully offline-capable app with [TanStack DB and RxDB offline-first](./tanstack-db-offline-first.md).
- Start from zero with the [RxDB Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your multi-tab setup.
