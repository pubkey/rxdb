---
title: 'TanStack DB + Supabase: Adding True Offline Support'
slug: tanstack-db-supabase-offline.html
description: Supabase realtime needs a network connection. Add offline-first durability to TanStack DB with RxDB as a local store that replicates to Supabase Postgres.
image: /headers/tanstack-db-supabase-offline.jpg
---

import {Steps} from '@site/src/components/steps';

# TanStack DB + Supabase: Adding True Offline Support

**TanStack DB + Supabase** is a natural pairing: TanStack DB is an in-memory reactive client store with live queries and optimistic mutations, and Supabase provides hosted Postgres with realtime change streams. But TanStack DB delegates persistence and sync to the collection implementation, and Supabase apps typically load data through `supabase-js` queries and realtime channels, which need a network connection. [RxDB](https://rxdb.info/) closes that gap: the official `@tanstack/rxdb-db-collection` package described in the [TanStack DB + RxDB guide](./rxdb-collection-for-tanstack-db.md) puts a durable local database under TanStack DB, and the RxDB [Supabase Replication Plugin](../../replication-supabase.md) keeps that local data in sync with your Postgres tables. This page explains why plain Supabase setups stop working offline, how the RxDB layer fixes that, and walks through a complete runnable setup.

<RxdbLogo alt="TanStack DB Supabase offline sync" />

## Why Supabase Apps Stop Working Offline

There is no Supabase-published TanStack DB collection package on npm. So a Supabase app that adopts TanStack DB usually fills its collections from `supabase-js`: fetch rows with a PostgREST query, put them into a collection, and subscribe to a realtime channel for updates. This works well on a stable connection.

The trouble starts when the connection drops. The initial fetch fails on a cold start, writes cannot reach Postgres, and the realtime channel goes silent. TanStack DB itself keeps its collection data in memory, so a page reload in a subway tunnel leaves the user with an empty screen. Without a network there is no data.

TanStack ships its own building blocks for parts of this problem, like the SQLite persistence adapters and the `@tanstack/offline-transactions` package for queueing mutations. They cover reload survival and write queueing, but syncing with Supabase Postgres, resuming from checkpoints, and resolving conflicts remain your job. RxDB brings all of that in one layer.

## The Architecture: A Durable Local Copy of Your Postgres Data

With RxDB underneath, the data flow forms three layers:

- **Supabase Postgres** stays the server-side source of truth, protected by Row Level Security.
- **RxDB** holds a durable local copy of the rows in [IndexedDB](../../rx-storage-indexeddb.md), [localStorage](../../rx-storage-localstorage.md), or any other [RxStorage](../../rx-storage.md), and replicates it with Supabase through the [Supabase Replication Plugin](../../replication-supabase.md).
- **TanStack DB** mirrors the RxDB collection in memory and runs live queries and optimistic mutations against it.

The Supabase plugin is powered by the RxDB [Sync Engine](../../replication.md). It **pulls** documents over PostgREST using a checkpoint of `(modified, id)`, **pushes** local inserts and updates with optimistic concurrency guards, and **streams** new changes through Supabase Realtime so live replication stays up to date. Every read and write in your app goes against the local database first. The network is only involved in the background replication, which is why the app keeps working [offline](../../offline-first.md).

## Preparing the Supabase Table

The replication has requirements on the Postgres table, taken from the [plugin documentation](../../replication-supabase.md):

- The primary key must have the type `text`, because primary keys are always strings in RxDB.
- A modified field must store the last modification timestamp of a row (default name: `_modified`).
- A boolean field must mark rows as deleted (default name: `_deleted`). You should not hard-delete rows in Supabase, because clients that were offline at deletion time would miss the deletion. RxDB hides this complexity on the client side.
- Realtime observation of writes to the table must be enabled.

Here is a matching `todos` table:

```sql
create extension if not exists moddatetime schema extensions;

create table "public"."todos" (
    "id" text primary key,
    "text" text not null,
    "completed" boolean not null,

    "_deleted" boolean DEFAULT false NOT NULL,
    "_modified" timestamp with time zone DEFAULT now() NOT NULL
);

-- auto-update the _modified timestamp
CREATE TRIGGER update_modified_datetime BEFORE UPDATE ON public.todos FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('_modified');

-- add the table to the publication so we can subscribe to changes
alter publication supabase_realtime add table "public"."todos";
```

When your columns use different names, the plugin accepts `modifiedField` and `deletedField` overrides.

## Setup

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @supabase/supabase-js
npm install @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create the RxDatabase and RxCollection

The RxDB schema mirrors the Supabase table. The primary key must match the Postgres primary key column, with the same name and type, and fields should be top-level simple types. You do not have to model `_deleted` or `_modified` in the schema, the plugin maps them automatically.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'mydb',
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

### Create the Supabase Client

Make a single Supabase client and reuse it across your app. In the browser, use the anon key together with strict Row Level Security policies. Never ship the service role key to clients.

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    'https://xyzcompany.supabase.co',
    'eyJhbGciOi...' // anon key
);
```

### Start the Supabase Replication

```ts
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';

const replication = replicateSupabase({
    tableName: 'todos',
    client: supabase,
    collection: db.todos,
    replicationIdentifier: 'todos-supabase',
    live: true,
    pull: {
        batchSize: 50
    },
    push: {
        batchSize: 50
    }
    // optional overrides if your column names differ:
    // modifiedField: '_modified',
    // deletedField: '_deleted'
});

// (optional) observe errors and wait for the first sync barrier
replication.error$.subscribe(err => console.error('[replication]', err));
await replication.awaitInitialReplication();
```

Notice that nullable Postgres columns return `null`, while optional RxDB fields are undefined. When your table has nullable columns, map `null` to `undefined` in a `pull.modifier`, usually by deleting the key.

### Wrap the RxCollection in a TanStack DB Collection

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos,
        startSync: true
    })
);
```

`todosCollection` loads its initial state from the local storage, not from the network. This is what makes cold starts work offline.

### Query and Mutate from Your Components

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function TodoList() {
    // Live query: re-renders whenever a matching document changes,
    // no matter if the change came from the UI or from Supabase.
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

// Inserts work offline too. RxDB pushes them to Supabase later.
todosCollection.insert({ id: 'todo-1', text: 'buy milk', completed: false });
```

</Steps>

## Realtime Changes Stream into TanStack DB

When another user updates a row in Postgres, Supabase Realtime notifies the plugin over its WebSocket channel, the plugin pulls the changed rows over PostgREST, and RxDB persists them locally. From there, RxDB's change feed streams the update into the TanStack DB collection, and every `useLiveQuery` that matches the document re-renders. Your components never talk to Supabase directly. They only see the local collection.

The same path handles changes from other browser tabs and from direct RxDB code. When the app runs in multiple tabs, RxDB's [leader election](../../leader-election.md) makes sure the Supabase replication runs in exactly one tab while all tabs receive the changes, see [Multi-Tab Sync for TanStack DB](./tanstack-db-multi-tab.md).

## Offline Writes and Conflicts

While offline, mutations on the TanStack DB collection are persisted to the local RxDB storage and survive reloads. When the client comes back online, the [Sync Engine](../../replication.md) resumes from its last checkpoint: it pushes the pending local writes to Supabase and pulls everything it missed.

It can happen that the same row was changed on the server in the meantime. The push then fails the optimistic concurrency guard and RxDB resolves the conflict on the client. The default conflict handler drops the local state and keeps the server state, so that a client that was offline for a long time does not overwrite other people's changes. You can set a custom `conflictHandler` on the collection to merge both states instead. The patterns are described in [Conflict Resolution in TanStack DB with RxDB](./tanstack-db-conflict-resolution.md) and in the [conflicts documentation](../../transactions-conflicts-revisions.md).

## FAQ

<details>
    <summary>Is there an official Supabase collection for TanStack DB?</summary>

No. As of July 2026 there is no Supabase-published TanStack DB collection package on npm. Supabase apps load TanStack DB collections through `supabase-js` by hand, or they put **[RxDB](../../rx-database.md)** underneath with the `@tanstack/rxdb-db-collection` package and let the [Supabase Replication Plugin](../../replication-supabase.md) handle the Postgres sync.

</details>

<details>
    <summary>Does TanStack DB work offline with Supabase?</summary>

Yes, with RxDB in between. TanStack DB reads from the local **[RxDB](../../rx-database.md)** database instead of the network, so queries and writes keep working without a connection. The [Sync Engine](../../replication.md) pushes pending writes to Supabase when the client is online again. See [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md) for the full pattern.

</details>

<details>
    <summary>Can TanStack DB receive Supabase realtime updates?</summary>

Yes. The **[Supabase Replication Plugin](../../replication-supabase.md)** subscribes to Supabase Realtime channels and pulls changed rows over PostgREST. RxDB persists them locally and its change feed streams every update into the TanStack DB collection, so live queries re-render automatically.

</details>

<details>
    <summary>Do I have to change my Postgres tables for TanStack DB Supabase sync?</summary>

Yes, slightly. The table needs a `text` primary key, a timestamp column for the last modification (default `_modified`), a boolean column that marks rows as deleted (default `_deleted`), and realtime must be enabled for the table. The **[plugin documentation](../../replication-supabase.md)** contains the full SQL setup.

</details>

<details>
    <summary>Are conflicts resolved on the Supabase server?</summary>

No. RxDB resolves all conflicts on the client: a rejected push triggers the collection's conflict handler, which by default keeps the server state. Custom merge strategies are described in **[Conflict Resolution in TanStack DB with RxDB](./tanstack-db-conflict-resolution.md)**.

</details>

## Follow Up

- Read the full [TanStack DB + RxDB integration guide](./rxdb-collection-for-tanstack-db.md).
- Learn all options of the [Supabase Replication Plugin](../../replication-supabase.md).
- See the general pattern in [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).
- Go deeper with [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md).
- Start with the [RxDB Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
