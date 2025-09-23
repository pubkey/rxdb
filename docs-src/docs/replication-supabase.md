---
title: Supabase Replication Plugin for RxDB - Real-Time, Offline-First Sync
slug: replication-supabase.html
description: Build real-time, offline-capable apps with RxDB + Supabase. Push/pull changes via PostgREST, stream updates with Realtime, and keep data in sync across devices.
---

import {Tabs} from '@site/src/components/tabs';
import {Steps} from '@site/src/components/steps';
import {VideoBox} from '@site/src/components/video-box';
import {RxdbMongoDiagramPlain} from '@site/src/components/mongodb-sync';


# Supabase Replication Plugin for RxDB - Real-Time, Offline-First Sync

<p align="center">
  <img src="./files/icons/supabase.svg" alt="Supabase" height="60" className="img-padding img-in-text-right" />
</p>

The **Supabase Replication Plugin** for RxDB delivers seamless, two-way synchronization between your RxDB collections and a Supabase (Postgres) table. It uses **PostgREST** for pull/push and **Supabase Realtime** (logical replication) to stream live updates, so your data stays consistent across devices with first-class [local-first](./articles/local-first-future.md), offline-ready support.

Under the hood, the plugin is powered by the RxDB [Sync Engine](./replication.md). It handles checkpointed incremental pulls, robust retry logic, and [conflict detection/resolution](./transactions-conflicts-revisions.md) for you. You focus on features—RxDB takes care of sync.

<center>
    <VideoBox videoId="zBZgdTb-dns" title="Supabase in 100 Seconds" duration="2:36" />
</center>


## Key Features of the RxDB-Supabase Plugin

- **Cloud Only Backend**: No self-hosted server required. Client devices directly sync with the Supabase Servers.
- **Two-way replication** between Supabase tables and RxDB [collections](./rx-collection.md)
- **Offline-first** with resumable, incremental sync
- **Live updates** via Supabase Realtime channels
- **Conflict resolution** handled by the [RxDB Sync Engine](./replication.md)
- **Works in browsers and Node.js** with `@supabase/supabase-js`

## Architecture Overview

<RxdbMongoDiagramPlain showServer={false} dbIcon="/files/icons/supabase.svg" dbLabel="Supabase" />


<br />
Clients connect **directly to Supabase** using the official JS client. The plugin:

- **Pulls** documents over PostgREST using a checkpoint `(modified, id)` and deterministic ordering.
- **Pushes** inserts/updates using optimistic concurrency guards.
- **Streams** new changes using Supabase Realtime so live replication stays up to date.


:::note
Because Supabase exposes Postgres over **HTTP/WebSocket**, you can safely replicate from browsers and mobile apps. Protect your data with **Row Level Security (RLS)** policies; use the **anon** key on clients and the **service role** key only on trusted servers.
:::


## Setting up RxDB ↔ Supabase Sync

<Steps>

### Install Dependencies

```bash
npm install rxdb @supabase/supabase-js
```

### Create a Supabase Project & Table

In your supabase project, create a new table. Ensure that:
- The primary key must have the type text (Primary keys must always be strings in RxDB)
- You have an modified field which stores the last modification timestamp of a row (default is `_modified`)
- You have a boolean field which stores if a row should is "deleted". You should not hard-delete rows in Supabase, because clients would miss the deletion if they haven't been online at the deletion time. Instead, use a deleted `boolean` to mark rows as deleted. This way all clients can still pull the deletion, and RxDB will hide the complexity on the client side.
- Enable the realtime observation of writes to the table.

Here is an example for a "human" table:

```sql
create extension if not exists moddatetime schema extensions;

create table "public"."humans" (
    "passportId" text primary key,
    "firstName" text not null,
    "lastName" text not null,
    "age" integer,

    "_deleted" boolean DEFAULT false NOT NULL,
    "_modified" timestamp with time zone DEFAULT now() NOT NULL
);

-- auto-update the _modified timestamp
CREATE TRIGGER update_modified_datetime BEFORE UPDATE ON public.humans FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('_modified');

-- add a table to the publication so we can subscribe to changes
alter publication supabase_realtime add table "public"."humans";
```

### Create an RxDB Database & Collection

Create a normal RxDB database, then add a collection whose **schema mirrors your Supabase table**. The **primary key must match** (same column name and type), and fields should be **top-level simple types** (string/number/boolean). You don’t need to model server internals: the plugin maps the server’s \_deleted flag to doc.\_deleted automatically, and \_modified is optional in your schema (the plugin strips it on push and will include it on pull only if you define it). For browsers use a persistent storage like Localstorage or IndexedDB. For tests you can use the [in-memory storage](./rx-storage-memory.md).

```ts
// client
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

export const db = await createRxDatabase({
  name: 'mydb',
  storage: getRxStorageLocalstorage()
});

await db.addCollections({
  humans: {
    schema: {
      version: 0,
      primaryKey: 'passportId',
      type: 'object',
      properties: {
        passportId: { type: 'string', maxLength: 100 },
        firstName:   { type: 'string' },
        lastName:    { type: 'string' },
        age: { type: 'number' }
      },
      required: ['passportId', 'firstName', 'lastName']
    }
  }
});
```

### Create the Supabase Client

Make a single Supabase client and reuse it across your app. In the browser, use the anon key (RLS-protected). On trusted servers you may use the service role key—but never ship that to clients.


<Tabs>

#### Production

```ts
//> client

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://xyzcompany.supabase.co',
  'eyJhbGciOi...'
);
```

#### Vite

```ts
//> client

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,       // e.g. https://xyzcompany.supabase.co
  import.meta.env.VITE_SUPABASE_ANON_KEY!   // anon key for browsers
  // optional options object here
);
```

#### Local Development

```ts
//> client

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);
```

</Tabs>

### Start Replication

Connect your RxDB collection to the Supabase table to start the replication.

```ts
//> client

import { replicateSupabase } from 'rxdb/plugins/replication-supabase';

const replication = replicateSupabase({
  tableName: 'humans',
  client: supabase,
  collection: db.humans,
  replicationIdentifier: 'humans-supabase',
  live: true,
  pull: {
    batchSize: 50,
    // optional: shape incoming docs
    modifier: (doc) => {
      // map nullable age-field
      if (!doc.age) delete doc.age;
      return doc;
    }
  },
  push: {
    batchSize: 50
  },
  // optional overrides if your column names differ:
  // modifiedField: '_modified',
  // deletedField: '_deleted'
});

// (optional) observe errors and wait for the first sync barrier
replication.error$.subscribe(err => console.error('[replication]', err));
await replication.awaitInitialReplication();
```

:::note Nullable values must be mapped
Supabase returns `null` for nullable columns, but in RxDB you often model those fields as optional (i.e., they can be undefined/missing). To avoid schema errors, map `null` → `undefined` in the `pull.modifier` (usually by deleting the key).
:::


### Do other things with the replication state

The `RxSupabaseReplicationState` which is returned from `replicateSupabase()` allows you to run all functionality of the normal [RxReplicationState](./replication.md).



</Steps>


:::note Beta
The Supabase Replication Plugin for RxDB is currently in **beta**.  
While it is production-capable, the API and internal behavior may change before the stable release. We recommend thoroughly testing your integration and reviewing the changelog when upgrading to newer versions.
:::


## Follow Up

- **Replication API Reference:** Learn the core concepts and lifecycle hooks — [Replication](./replication.md)
- **Offline-First Guide:** Caching, retries, and conflict strategies — [Local-First](./articles/local-first-future.md)
- **Supabase Essentials:**
  - Row Level Security (RLS) — https://supabase.com/docs/guides/auth/row-level-security
  - Realtime — https://supabase.com/docs/guides/realtime
  - Local dev with the Supabase CLI — https://supabase.com/docs/guides/cli
- **Community:** Questions or feedback? Join our Discord — [Chat](./chat)
