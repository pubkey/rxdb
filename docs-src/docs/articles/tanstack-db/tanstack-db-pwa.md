---
title: 'Building an Offline PWA with TanStack DB and RxDB'
slug: tanstack-db-pwa.html
description: Make your PWA work offline with TanStack DB. Use RxDB for durable IndexedDB/OPFS storage and sync so data persists across sessions, reloads, and no network.
image: /headers/tanstack-db-pwa.jpg
---

import {Steps} from '@site/src/components/steps';

# Building an Offline PWA with TanStack DB and RxDB

Building an **offline PWA with TanStack DB** means solving a problem that TanStack DB alone does not cover: TanStack DB is an in-memory reactive client store with live queries and optimistic mutations, and persistence comes from the collection implementation you choose. [RxDB](https://rxdb.info/) is a [local-first](../local-first-future.md) NoSQL database with durable browser storage and a [Sync Engine](../../replication.md), and the official `@tanstack/rxdb-db-collection` package puts it underneath TanStack DB, as described in the [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md) overview. This page explains what a PWA needs to work offline, how RxDB keeps your TanStack DB data alive across reloads and home-screen restarts, and how replication, multiple tabs, and browser storage limits behave in an installed app.

<RxdbLogo alt="TanStack DB offline PWA" />

## What a PWA Needs to Work Offline

A [Progressive Web App](../progressive-web-app-database.md) that opens without a network connection needs two separate things:

- **Cached assets**: The HTML, JavaScript, CSS, and icons must load from the device. This is the job of a service worker with the Cache API, configured through your build tool or a library like Workbox. It is out of RxDB's scope and not covered here.
- **Durable data**: The documents your UI shows must survive the app being closed and reopened, and writes made offline must reach the backend later. This is the part this article covers.

Many teams ship the service worker and stop there. The app shell then loads offline, but every collection is empty because the data only lived in memory. The trouble starts when a user opens the installed app from the home screen in airplane mode and sees a spinner instead of their documents. Durable data needs a database under the store.

## Data That Survives Reloads and Home-Screen Restarts

TanStack DB keeps collection data in memory by design. When the user closes the installed PWA, or the OS kills it to free resources, the memory is gone. With the [RxDB collection](https://tanstack.com/db/latest/docs/collections/rxdb-collection), every document is written to a real database on disk, and on the next start the TanStack DB collection loads its state from that database before your live queries run. No network request is needed. This is what makes the app usable from the home screen with no connection at all.

RxDB abstracts the storage layer behind the [RxStorage](../../rx-storage.md) interface, so you can pick the browser storage that fits your app:

- **[localStorage-based storage](../../rx-storage-localstorage.md)**: Free and part of the RxDB core. Zero configuration, good for demos, prototypes, and small datasets. The example below uses it.
- **[IndexedDB RxStorage](../../rx-storage-indexeddb.md)** (part of [RxDB Premium 👑](/premium/)): The recommended choice for professional PWAs. It stores data asynchronously and handles larger datasets.
- **[OPFS RxStorage](../../rx-storage-opfs.md)** (part of [RxDB Premium 👑](/premium/)): Built on the Origin Private File System, a browser API for file access inside a sandboxed, origin-specific filesystem. It runs inside a WebWorker and reads up to 4x faster than IndexedDB in the [RxDB storage benchmarks](../../rx-storage-performance.md).

Switching storages is a configuration change, not a rewrite. You can start with localStorage today and move to IndexedDB or OPFS when your data grows.

TanStack DB also ships its own persistence option, the `@tanstack/db-sqlite-persistence-core` package with a browser adapter based on wa-sqlite. When surviving a reload is your only requirement, that can be enough. The RxDB collection is the better fit when you also want replication with your own backend, multi-tab coordination, and [encryption](./tanstack-db-encryption.md) from the same package.

## Replication That Resumes When the Network Returns

An installed PWA lives through constant connectivity changes: airplane mode, elevators, and flaky mobile networks. RxDB's [Sync Engine](../../replication.md) is built for this. All writes go to the local database first, and replication runs in the background. When a push or pull fails, RxDB retries after the configured `retryTime`, and it skips the waiting time when it detects an offline-to-online switch via `navigator.onLine`. Because the replication stores a checkpoint under its `replicationIdentifier`, it resumes where it stopped, on reconnect and on app restart. Offline writes are pushed, missed server changes are pulled, and the results stream into your TanStack DB collections automatically.

The general pattern is described in [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md), and [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md) shows the backend endpoints in detail.

## Multiple Tabs of the Same PWA

A PWA can run installed from the home screen and in normal browser tabs at the same time, against the same origin and the same storage. RxDB shares one durable store across all these instances, and with [leader election](../../leader-election.md) exactly one of them runs the replication. This prevents duplicate connections to your backend. Changes made in one tab or window stream into the TanStack DB collections of all others through RxDB's change feed. By default, `replicateRxCollection()` waits for leadership (`waitForLeadership: true`), and when the leading instance is closed, another one takes over. See [Multi-Tab Sync for TanStack DB with RxDB](./tanstack-db-multi-tab.md) for the full behavior.

## Browser Storage Limits in a PWA

Browsers cap how much data an origin can store, and the caps differ a lot. According to the [IndexedDB max storage limit guide](../indexeddb-max-storage-limit.md), Chromium-based browsers allow up to about 80% of free disk space, Firefox sits around 2 GB on desktop, and Safari on iOS often caps an origin near 1 GB. The localStorage API is much smaller, [around 5 MB per domain](../localstorage.md#understanding-the-limitations-of-local-storage), which is why the free localStorage-based storage fits small datasets only. Keep in mind that Safari is known to evict data of sites that have not been used for a while.

For an installed PWA you should do two things. Call `navigator.storage.persist()` to request persistent storage so the browser does not clear your data under disk pressure, and handle `QuotaExceededError` when a write fails because the quota is reached. The [limits guide](../indexeddb-max-storage-limit.md) shows how to test both cases.

## Example: Offline Todo Collection for a PWA

The following example is the data layer of an offline PWA. It uses the free [localStorage-based storage](../../rx-storage-localstorage.md). Swapping in IndexedDB or OPFS changes only the `storage` field. The basics of the integration are explained in the [TanStack DB + RxDB overview](./rxdb-collection-for-tanstack-db.md).

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create the RxDatabase with a Browser Storage

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'pwadb',
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

On every app start, including offline starts from the home screen, the collection loads its state from disk.

### Query and Mutate in Your Components

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function TodoList() {
    // Live query: re-renders whenever a matching document changes.
    const { data: openTodos } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );

    return (
        <ul>
            {openTodos.map((todo) => (
                <li
                    key={todo.id}
                    onClick={() =>
                        todosCollection.update(todo.id, (draft) => {
                            draft.completed = true;
                        })
                    }
                >
                    {todo.text}
                </li>
            ))}
        </ul>
    );
}

// Works with or without a network connection:
todosCollection.insert({ id: 'todo-1', text: 'water the plants', completed: false });
```

Writes land in the local database first. The UI never waits for the network.

### Add Replication That Survives Being Offline

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    collection: db.todos,
    replicationIdentifier: 'todos-to-https://example.com/api/sync',
    live: true,
    // Retry failed requests after 5 seconds. The wait is skipped
    // when an offline->online switch is detected via navigator.onLine.
    retryTime: 5 * 1000,
    pull: {
        handler: async (checkpoint, batchSize) => {
            const response = await fetch(
                `https://example.com/api/sync/pull?checkpoint=${encodeURIComponent(
                    JSON.stringify(checkpoint)
                )}&limit=${batchSize}`
            );
            return await response.json();
        }
    },
    push: {
        handler: async (rows) => {
            const response = await fetch('https://example.com/api/sync/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rows)
            });
            return await response.json();
        }
    }
});
```

When the device reconnects, the replication resumes from its checkpoint, pushes the offline writes, and pulls the missed changes. The updated documents stream into `todosCollection` without extra code.

</Steps>

## FAQ

<details>
    <summary>Does TanStack DB work offline in a PWA?</summary>

Yes, when the collection implementation persists data. TanStack DB itself keeps collections in memory, so a reload or app restart clears them. With the **[RxDB collection](./rxdb-collection-for-tanstack-db.md)** the data is stored durably in the browser and loads back on every start, with or without a network connection.

</details>

<details>
    <summary>Which storage should a TanStack DB offline PWA use?</summary>

For professional apps, IndexedDB or OPFS. The free **[localStorage-based storage](../../rx-storage-localstorage.md)** is the simplest start but is limited to around 5 MB. The [IndexedDB](../../rx-storage-indexeddb.md) and [OPFS](../../rx-storage-opfs.md) storages from [RxDB Premium 👑](/premium/) handle larger datasets and perform better.

</details>

<details>
    <summary>Do I still need a service worker when I use RxDB?</summary>

Yes. RxDB makes your data available offline, but the app shell itself, HTML, JavaScript, and CSS, must be cached by a service worker so the **[PWA](../progressive-web-app-database.md)** can load without a network. The two work independently and cover different halves of the offline experience.

</details>

<details>
    <summary>What happens when the user opens the PWA in several tabs?</summary>

All tabs share the same RxDB storage, and **[leader election](../../leader-election.md)** makes sure that only one tab runs the replication. Changes from any tab stream into the TanStack DB collections of all other tabs. See the [multi-tab guide](./tanstack-db-multi-tab.md) for details.

</details>

<details>
    <summary>Can the browser delete my PWA's local data?</summary>

Yes, under disk pressure or after long inactivity, and Safari is the most aggressive here. Request persistent storage with `navigator.storage.persist()` and treat the backend as the **[source of truth](../../replication.md)** so the client can re-sync when local data was evicted. The [storage limit guide](../indexeddb-max-storage-limit.md) covers quotas per browser.

</details>

## Follow Up

- Read the [TanStack DB + RxDB overview](./rxdb-collection-for-tanstack-db.md) for how the integration works in detail.
- Learn the offline patterns in [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md).
- Set up backend sync with [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).
- See why RxDB fits PWAs in [RxDB as a Database for Progressive Web Apps](../progressive-web-app-database.md).
- Start with the [RxDB Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
