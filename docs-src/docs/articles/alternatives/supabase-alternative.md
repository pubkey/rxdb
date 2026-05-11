---
title: RxDB as a Supabase Alternative - Offline-First, Local Storage, Reactive Queries
slug: alternatives/supabase-alternative.html
description: Compare RxDB and Supabase for local-first JavaScript applications. Learn why Supabase lacks offline support, how the RxDB Supabase replication plugin bridges that gap, and when to choose RxDB as a client-side database paired with a Supabase backend.
---

# RxDB as a Supabase Alternative

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

Supabase is a popular backend platform built on PostgreSQL. It provides authentication, storage, auto-generated REST APIs (PostgREST), and a realtime WebSocket layer. What Supabase does not provide is a client-side database. When the network is unavailable, standard Supabase queries fail. When a user opens your app in multiple tabs, each tab reads directly from the server. There is no local data layer, no offline queue, and no reactive query system built into the Supabase client SDK.

This page explains what Supabase is, where it falls short for local-first applications, and how [RxDB](https://rxdb.info) fills the gap as a client-side database that can sync with Supabase in the background.

---

## What is Supabase?

<p align="center">
  <img src="/files/alternatives/supabase.svg" alt="Supabase alternative" height="80" className="img-padding" />
</p>

Supabase was founded in 2020 by Paul Copplestone and Ant Wilson. The company describes its product as "an open source Firebase alternative." It is built around PostgreSQL and wraps it with several services:

- **PostgREST**: auto-generates a REST API from your database schema
- **GoTrue**: a JWT-based authentication service
- **Supabase Storage**: object storage built on S3-compatible APIs
- **Supabase Realtime**: an Elixir-based WebSocket server that reads PostgreSQL's logical replication stream (WAL) and broadcasts changes to subscribed clients
- **Edge Functions**: Deno-based serverless functions

Supabase grew rapidly. By 2024 it had reached roughly $30 million in annual recurring revenue and managed over one million hosted databases. In April 2025 it raised a Series D at a $2 billion valuation. It has become a default backend choice for many AI-assisted development tools and Y Combinator-backed projects.

The platform is genuinely open source. Its components (PostgREST, GoTrue, Realtime, Kong) can be self-hosted using Docker Compose. This sets it apart from Firebase, which is entirely proprietary.

### A Brief Timeline

- **2020** - Supabase is founded; initial public beta launches
- **2021** - Generally available; raises Series A of $30 million
- **2022** - Adds edge functions, database branching, and self-hosting documentation
- **2023** - Reaches hundreds of thousands of projects; launches Vector support (pgvector) positioning as an AI backend
- **2024** - Crosses one million hosted databases; Series C at $900 million valuation; becomes a default backend in AI coding tools (Bolt.new, Lovable, Cursor)
- **2025** - Series D at $2 billion valuation; adds Supabase AI assistant; changes default public schema security to protect new projects
- **2026** - Continues active development; estimated ARR reaches $70 million

### How Supabase Realtime Works

Supabase Realtime reads PostgreSQL's Write-Ahead Log (WAL) through logical replication. When a row changes, the Realtime server parses the WAL event and broadcasts it over WebSocket to subscribed clients. On the client, you subscribe like this:

```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const channel = supabase
    .channel('posts-changes')
    .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
            console.log('Change received:', payload);
        }
    )
    .subscribe();
```

This works well while the user is online and the WebSocket connection is open. However, there are several significant limitations for application development.

---

## Key Limitations of Supabase for Local-First Applications

### No Client-Side Database

Supabase does not include a local data store. Every query goes to the server:

```ts
// This call FAILS when the user is offline
const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true);
```

If the network is unavailable, `data` is `null` and `error` contains a fetch failure. The application has no fallback. Users who open the app while offline see a broken state.

Adding a meaningful offline experience requires you to choose a client-side database yourself, implement a synchronization protocol, handle conflict resolution, and manage the replication lifecycle. Supabase provides none of this.

### WebSocket Connections Are Not a Sync Engine

Supabase Realtime delivers changes to connected clients over WebSockets. This is not the same as synchronization:

- When a client disconnects and reconnects, it does not receive the changes that occurred during the gap. It must re-fetch data to determine the current state.
- WebSocket connections drop silently in several common situations: when a browser tab is moved to the background, when a mobile app goes to sleep, or when a network changes from Wi-Fi to cellular.
- There is no "catch-up" mechanism. Realtime is a streaming protocol, not a sync log.

For a true offline-first application, you need a sync engine that tracks a checkpoint, fetches all changes since the last checkpoint, and applies them to local storage in order. Supabase Realtime is not that.

### Vendor Dependency for Auth and Data Access

Supabase combines authentication and data access through Row Level Security (RLS). Your PostgreSQL RLS policies reference `auth.uid()` from the Supabase JWT. This is a tight coupling: the authorization model is baked into the database schema itself, and it only works if clients authenticate through Supabase Auth. Migrating to a different auth provider or a different backend later requires changes to every RLS policy in your database.

### No Observable Queries

The Supabase client SDK does not have a reactive query system. If you want your UI to update when data changes, you must combine the Realtime channel subscription with a manual re-fetch or state update:

```ts
// Without RxDB, you have to wire this yourself:
channel.on('postgres_changes', { event: 'INSERT', table: 'posts' }, async () => {
    // Re-fetch the entire list every time something changes
    const { data } = await supabase.from('posts').select('*');
    setPosts(data);
});
```

This approach re-fetches all matching rows on every change event. It does not know which specific documents changed, does not support sorted or filtered re-queries efficiently, and requires custom state management to avoid flickering or race conditions.

### Relational Model Does Not Map to UI Directly

Supabase is built on PostgreSQL. The data model is relational: tables, rows, foreign keys, joins. Modern web UIs work with JSON documents. When your schema involves multiple related tables, fetching data for a single UI component often requires joins that PostgREST must construct from query parameters. Deeply nested or polymorphic data shapes are awkward to express.

---

## How RxDB Addresses These Problems

[RxDB](https://rxdb.info) is a local-first JavaScript database. All reads and writes go to local storage first. Replication with a backend runs in the background. The application works offline by design, and data is synced when connectivity is available.

RxDB includes a dedicated [Supabase Replication Plugin](../../replication-supabase.md) that connects your RxDB collections to Supabase tables using PostgREST for pull and push, and Supabase Realtime for live streaming. This gives you the best of both: a locally cached, reactive database on the client, and a PostgreSQL backend in the cloud.

### Local-First Data Storage

When you use RxDB, every read and write goes to local storage (IndexedDB in browsers, SQLite on mobile). The application works offline immediately:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    posts: {
        schema: {
            title: 'post schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                title:     { type: 'string' },
                body:      { type: 'string' },
                authorId:  { type: 'string', maxLength: 100 },
                published: { type: 'boolean' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'title', 'body', 'authorId', 'published', 'updatedAt'],
            indexes: ['updatedAt', 'authorId']
        }
    }
});

// This works offline. No network required.
const posts = await db.posts.find({
    selector: { published: true },
    sort: [{ updatedAt: 'desc' }]
}).exec();
```

Writes made while offline are stored locally and automatically pushed to Supabase when the connection is restored.

### The RxDB Supabase Replication Plugin

RxDB provides a dedicated plugin for syncing with Supabase:

```bash
npm install rxdb @supabase/supabase-js
```

First, create your Supabase table with the required fields:

```sql
create extension if not exists moddatetime schema extensions;

create table "public"."posts" (
    "id"        text primary key,
    "title"     text not null,
    "body"      text not null,
    "authorId"  text not null,
    "published" boolean DEFAULT false NOT NULL,

    "_deleted"  boolean DEFAULT false NOT NULL,
    "_modified" timestamp with time zone DEFAULT now() NOT NULL
);

-- Auto-update the _modified timestamp on every write
CREATE TRIGGER update_modified_datetime BEFORE UPDATE ON public.posts FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('_modified');

-- Enable realtime streaming for this table
alter publication supabase_realtime add table "public"."posts";
```

Then start the replication in your application:

```ts
import { createClient } from '@supabase/supabase-js';
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

const replication = replicateSupabase({
    tableName: 'posts',
    client: supabase,
    collection: db.posts,
    replicationIdentifier: 'posts-supabase-v1',
    live: true,
    pull: {
        batchSize: 50
    },
    push: {
        batchSize: 50
    }
});

// Wait for the initial sync to complete before showing data
await replication.awaitInitialReplication();

// Monitor sync errors
replication.error$.subscribe(err => {
    console.error('Replication error:', err);
});
```

The plugin uses PostgREST for incremental pull and push operations, and Supabase Realtime to trigger live updates. When a row changes in Supabase, the Realtime channel fires, the plugin pulls the latest changes from PostgREST, and the local RxDB collection updates automatically. Your UI reacts to the local change without any additional wiring.

### Reactive Queries Without Polling

RxDB queries return RxJS Observables. Every query re-emits whenever the matching documents change in the local database, whether the change came from a local write or from a sync event with Supabase:

```ts
// Subscribe to published posts, sorted by most recent
const publishedPosts$ = db.posts.find({
    selector: { published: true },
    sort: [{ updatedAt: 'desc' }]
}).$;

publishedPosts$.subscribe(posts => {
    console.log('Published posts updated:', posts.length);
    renderPostList(posts);
});
```

When a remote user publishes a post and that change reaches this client through Supabase Realtime and the RxDB replication plugin, the observable emits the updated list immediately. There is no polling, no manual re-fetch, and no separate state management layer needed.

RxDB uses the [event-reduce](https://github.com/pubkey/event-reduce) algorithm to update query results efficiently. When a single document changes, RxDB checks whether the change affects the current query result and updates only what is necessary, rather than re-running the full query against storage.

You can subscribe to individual documents or specific fields:

```ts
// Subscribe to a single document
const doc = await db.posts.findOne('post-001').exec();

doc.get$('title').subscribe(newTitle => {
    console.log('Title changed to:', newTitle);
});

// Watch the entire change stream of a collection
db.posts.$.subscribe(changeEvent => {
    console.log(changeEvent.operation, changeEvent.documentId);
});
```

### Conflict Resolution

When the same document is modified on different clients while one is offline, a conflict occurs when they reconnect. The Supabase client SDK has no mechanism for handling this. RxDB includes a configurable conflict handler:

```ts
await db.addCollections({
    posts: {
        schema: postSchema,
        conflictHandler: async (input) => {
            const { newDocumentState, realMasterState } = input;

            // Last-write-wins by updatedAt timestamp
            if (newDocumentState.updatedAt >= realMasterState.updatedAt) {
                return { documentData: newDocumentState };
            }
            return { documentData: realMasterState };
        }
    }
});
```

For collaborative applications where concurrent edits from different users should be merged rather than one discarding the other, RxDB supports [CRDTs (Conflict-free Replicated Data Types)](../../crdt.md):

```ts
import { getCRDTSchemaPart, RxDBcrdtPlugin } from 'rxdb/plugins/crdt';
import { addRxPlugin } from 'rxdb/plugins/core';

addRxPlugin(RxDBcrdtPlugin);

const postSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:        { type: 'string', maxLength: 100 },
        title:     { type: 'string' },
        body:      { type: 'string' },
        published: { type: 'boolean' },
        crdts:     getCRDTSchemaPart()
    },
    crdt: { field: 'crdts' }
};
```

With CRDTs, concurrent writes to the same document are merged deterministically when clients sync. No custom conflict handler logic is needed.

### Multiple Storage Backends

RxDB's storage layer is pluggable. You choose the storage engine based on the platform and performance requirements. The rest of your application code remains unchanged:

| Environment | Storage Option |
|---|---|
| Browser | [IndexedDB](../../rx-storage-indexeddb.md) |
| Browser (high-throughput writes) | [OPFS (Origin Private File System)](../../rx-storage-opfs.md) |
| React Native / Expo | [SQLite via expo-sqlite or op-sqlite](../../rx-storage-sqlite.md) |
| Node.js / Electron | [SQLite (better-sqlite3)](../../rx-storage-sqlite.md) |
| Multiple browser tabs | [SharedWorker](../../rx-storage-shared-worker.md) |
| Tests | [Memory](../../rx-storage-memory.md) |

Switching storage is a one-line change:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';
// For React Native:
// import { getRxStorageSQLite } from 'rxdb/plugins/storage-sqlite';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
    // React Native: storage: getRxStorageSQLite({ sqliteBasics })
});
```

The [OPFS storage](../../rx-storage-opfs.md) option is worth noting specifically for applications that Supabase users might build. OPFS gives browsers access to a private file system with low-level read and write operations. This is significantly faster than IndexedDB for write-heavy workloads, because IndexedDB transactions carry significant overhead per operation.

### Multi-Tab Support in the Browser

When a user opens a web application in multiple browser tabs, each tab typically has its own JavaScript runtime. Without coordination, each tab would have its own copy of the local database, and writes from one tab would not appear in others.

RxDB solves this with the [SharedWorker storage](../../rx-storage-shared-worker.md):

```ts
import { getRxStorageSharedWorker } from 'rxdb/plugins/storage-shared-worker';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageSharedWorker({
        workerInput: new SharedWorker(
            new URL('rxdb/plugins/storage-shared-worker/worker.js', import.meta.url),
            { type: 'module' }
        )
    })
});
```

All tabs share one database instance running in the SharedWorker. A write from tab A appears in tab B's reactive queries immediately, without any additional IPC or state management code.

### Schema Validation and TypeScript Support

RxDB validates every document against a [JSON Schema](../../rx-schema.md) before writing it to storage. Invalid documents are rejected at the database level:

```ts
try {
    await db.posts.insert({
        id: 'post-002',
        // 'title' is required but missing
        authorId: 'user-1',
        published: true,
        updatedAt: Date.now()
    });
} catch (err) {
    // Rejected: document does not match schema
    console.error(err.message);
}
```

RxDB also infers TypeScript types from the schema automatically. You get compile-time type checking and IDE autocompletion for all collection operations:

```ts
// TypeScript knows the shape of this document
const post = await db.posts.findOne('post-001').exec();
if (post) {
    console.log(post.title);   // string
    console.log(post.published); // boolean
}
```

### Schema Migrations

When your data model changes, RxDB's [migration system](../../migration-schema.md) handles the transition automatically. You increment the schema version number and provide a migration strategy:

```ts
await db.addCollections({
    posts: {
        schema: {
            title: 'post schema',
            version: 1,  // incremented from 0
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                title:     { type: 'string' },
                body:      { type: 'string' },
                authorId:  { type: 'string', maxLength: 100 },
                published: { type: 'boolean' },
                slug:      { type: 'string' },  // new field
                updatedAt: { type: 'number' }
            },
            required: [
                'id',
                'title',
                'body',
                'authorId',
                'published',
                'slug',
                'updatedAt'
            ]
        },
        migrationStrategies: {
            1: (oldDoc) => {
                // Generate a slug from the title
                oldDoc.slug = oldDoc.title.toLowerCase().replace(/\s+/g, '-');
                return oldDoc;
            }
        }
    }
});
```

When the database is opened with the new schema version, RxDB migrates the existing local documents automatically before the application starts.

### Encryption at Rest

RxDB includes a [built-in encryption plugin](../../encryption.md) for encrypting document fields before writing them to local storage. This is important for mobile applications that store sensitive user data locally:

```ts
import {
    wrappedKeyEncryptionCryptoJsStorage
} from 'rxdb/plugins/encryption-crypto-js';

const db = await createRxDatabase({
    name: 'myapp',
    storage: wrappedKeyEncryptionCryptoJsStorage({
        storage: getRxStorageIndexedDB()
    }),
    password: 'user-specific-passphrase'
});

// Fields marked 'encrypted' in the schema are stored as ciphertext
const schema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:          { type: 'string', maxLength: 100 },
        sensitiveData: { type: 'string' }
    },
    encrypted: ['sensitiveData']
};
```

Supabase has no client-side encryption. All data written to the browser's local storage (if you implement local caching yourself) would be stored in plaintext unless you add a separate encryption layer.

---

## RxDB + Supabase as a Stack

RxDB and Supabase are not necessarily alternatives. They work together well:

- **Supabase** serves as the PostgreSQL backend: hosted, accessible, with auth and storage
- **RxDB** serves as the client-side database: local-first, reactive, offline-capable

This combination gives you a complete local-first application stack. The RxDB Supabase replication plugin handles the sync protocol between the two.

```
[User Device]
   RxDB (IndexedDB / SQLite)
      |
      | Supabase Replication Plugin
      | (PostgREST pull/push + Realtime WebSocket)
      |
[Supabase Cloud]
   PostgreSQL
   Row Level Security
   Auth (GoTrue)
```

You can also add custom backends or migrate away from Supabase later. RxDB supports [HTTP replication](../../replication-http.md), [GraphQL replication](../../replication-graphql.md), [CouchDB replication](../../replication-couchdb.md), [WebSocket replication](../../replication-websocket.md), and [WebRTC replication](../../replication-webrtc.md) without changing any of the application logic that works against the local database.

---

## When to Use Supabase Without RxDB

Supabase alone is appropriate when:

- The application is fully online-only and users will never need data when disconnected
- The data changes infrequently and does not need reactive UI updates
- You need PostgreSQL's relational model and SQL queries on the server without a client-side abstraction
- You are building a backend-heavy application where most logic runs in edge functions or server-side code

For applications that require any of the following, you need a client-side layer like RxDB in addition to Supabase:

- Offline support (the user can read and write data without a network connection)
- Reactive queries that update the UI automatically when data changes
- Multi-tab consistency without full page reloads
- Fast local reads without round-trips to the server for every query

---

## Getting Started

Install RxDB, RxJS, and the Supabase client:

```bash
npm install rxdb rxjs @supabase/supabase-js
```

Create a database and start the replication:

```ts
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';
import { createClient } from '@supabase/supabase-js';
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';

addRxPlugin(RxDBDevModePlugin);

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    posts: {
        schema: {
            title: 'post schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                title:     { type: 'string' },
                body:      { type: 'string' },
                published: { type: 'boolean' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'title', 'body', 'published', 'updatedAt'],
            indexes: ['updatedAt']
        }
    }
});

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const replication = replicateSupabase({
    tableName: 'posts',
    client: supabase,
    collection: db.posts,
    replicationIdentifier: 'posts-sync-v1',
    live: true,
    pull: { batchSize: 50 },
    push: { batchSize: 50 }
});

await replication.awaitInitialReplication();

// All local queries work offline automatically
db.posts.find({
    selector: { published: true },
    sort: [{ updatedAt: 'desc' }]
}).$.subscribe(posts => {
    console.log('Posts ready:', posts.length);
});
```

From this point, the application reads and writes to IndexedDB, and the replication plugin keeps it in sync with Supabase in the background. Going offline does not break the app.

---

## Comparison Summary

| Aspect | Supabase (alone) | RxDB + Supabase |
|---|---|---|
| **Data location** | Server (PostgreSQL) | Client (IndexedDB/SQLite) + Server |
| **Offline support** | None | Full offline-first |
| **Reactive queries** | Manual re-fetch on WebSocket event | RxJS Observables, auto-updating |
| **Multi-tab consistency** | None (separate fetch per tab) | SharedWorker with unified local DB |
| **Conflict handling** | None built-in | Configurable handler, CRDT support |
| **Query performance** | Network latency on every query | Local storage, sub-millisecond reads |
| **Data model** | Relational (SQL) | Document-based (JSON) |
| **Schema validation** | Database constraints | JSON Schema enforced on every write |
| **TypeScript** | Generated types from schema | Inferred types from JSON Schema |
| **Encryption** | Server-side only | Client-side field encryption |
| **Schema migrations** | SQL ALTER TABLE | Automatic via versioned migration strategies |
| **Backend flexibility** | Supabase only | Supabase, CouchDB, GraphQL, HTTP, WebRTC |
| **Vendor lock-in** | Auth + DB tightly coupled | Swap backend without changing app code |

---

## FAQ

<details>
<summary>Does RxDB replace Supabase?</summary>

No. RxDB is a client-side database and does not replace a backend. It stores data locally in the browser or on the device. Supabase provides the PostgreSQL backend, authentication, and storage. The two are designed to work together: RxDB handles local data and sync logic, Supabase handles server-side persistence and auth. If you want to sync RxDB with Supabase, use the [Supabase Replication Plugin](../../replication-supabase.md).

</details>

<details>
<summary>Can I use RxDB with a self-hosted Supabase instance?</summary>

Yes. The Supabase replication plugin uses the official `@supabase/supabase-js` client, which works with both hosted and self-hosted Supabase. Point the client at your self-hosted instance URL and the replication plugin will work without any changes.

</details>

<details>
<summary>How does conflict resolution work when two clients write to the same document offline?</summary>

When both clients reconnect, RxDB detects that the local version and the server version differ. It calls the conflict handler you defined when creating the collection. You decide the resolution strategy: last-write-wins by timestamp, field-level merge, or server-always-wins. For complex collaborative scenarios, RxDB's [CRDT plugin](../../crdt.md) can merge changes from multiple clients automatically without a custom handler.

</details>

<details>
<summary>Does RxDB work with Supabase Row Level Security?</summary>

Yes. The Supabase replication plugin uses the official Supabase JS client, which sends the user's JWT with every request. Your RLS policies apply normally. The plugin does not bypass or override RLS. Each user's RxDB instance only pulls and pushes the rows that their RLS policies permit.

</details>

<details>
<summary>How does RxDB handle changes from Supabase Realtime?</summary>

The replication plugin subscribes to the Supabase Realtime channel for the table. When a row changes in PostgreSQL, Realtime broadcasts the event over WebSocket. The plugin receives the event and triggers a pull from PostgREST to fetch the latest changes since the last checkpoint. This approach is robust: even if the WebSocket event is missed, the next scheduled pull will catch the change. No data is lost during temporary disconnections.

</details>

<details>
<summary>Can I migrate from Supabase to a different backend later?</summary>

Yes. Your application code reads and writes against the local RxDB collection. The replication plugin is configured separately and can be swapped. If you replace Supabase with a different backend (a custom REST API, CouchDB, or a GraphQL server), you change only the replication configuration. The schema, queries, and UI code remain unchanged.

</details>
