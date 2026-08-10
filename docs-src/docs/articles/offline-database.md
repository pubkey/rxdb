---
title: Offline Database - Local Data Storage and Sync with RxDB
slug: offline-database.html
description: An offline database stores data on the client and syncs it in the background. Learn how RxDB handles offline storage, realtime sync, and encryption.
image: /headers/offline-database.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';
import {CenteredImage} from '@site/src/components/centered-image';

# Offline Database - Local Data Storage and Sync with RxDB

An **offline database** stores your application data directly on the client device and syncs it with a server in the background. Instead of sending a request over the network for every read and write, your app talks to a [local database](./local-database.md) that responds in microseconds, no matter if the device is online or not. [RxDB](https://rxdb.info/) is a [local-first](./local-first-future.md), NoSQL database for JavaScript applications that was built for exactly this pattern. This page explains what an offline database is, how the RxDB [Sync Engine](../replication.md) replicates data with any backend, and how you can improve your offline database setup step by step.

<RxdbLogo alt="offline database" />

## What is an Offline Database?

An offline database keeps a full copy of the relevant data on the client, inside of a storage like [IndexedDB](../rx-storage-indexeddb.md), [OPFS](../rx-storage-opfs.md), or [SQLite](../rx-storage-sqlite.md). The app reads and writes against this local copy, and a replication process exchanges changes with the backend when a connection is available.

This is different from a cache. A cache holds a temporary subset of server responses and treats the server as the source of truth. An offline database makes the local data the source of truth for the client. Writes succeed locally first, the UI updates immediately, and the sync to the server happens later. This pattern is called [offline-first](../offline-first.md) or local-first.

## Why Your App Needs an Offline Database

Storing data on the client is not only about surviving network outages. It changes how the whole application behaves.

### 1. Zero Loading Spinners

Applications that call a remote server for every interaction show loading spinners while the user waits. With an offline database, reads and writes happen locally and respond in under a millisecond, which enables a [zero-latency user experience](./zero-latency-local-first.md). The user clicks, and the UI updates in the same frame. There is nothing to wait for.

<CenteredImage src="/files/loading-spinner-not-needed.gif" alt="loading spinner not needed" width={300} />

### 2. The App Works Without a Network

When the device is offline, in a tunnel, on a plane, or on a flaky mobile connection, the app keeps working. Users can read their data and make changes, and the [Sync Engine](../replication.md) pushes those changes to the server when the connection comes back. For field worker apps, point-of-sale systems, and mobile apps in general, this is the difference between a usable product and an error page.

### 3. Realtime UI Updates

RxDB queries are observable. When the underlying data changes, either through a local write or through incoming replicated data from the server, the query emits the new result set and the UI updates automatically. You get realtime behavior without building a separate push system, because the replication and the [reactivity](../reactivity.md) are part of the same database.

### 4. Multi-Tab Consistency

Many web apps mishandle data across multiple browser tabs. With an offline database, all tabs of the same origin share one local state. When the user completes a to-do item in one tab, every other tab reflects the change instantly. RxDB handles this out of the box, and its [leader election](../leader-election.md) makes sure that background work like replication runs in exactly one tab at a time.

<CenteredImage src="/files/multiwindow.gif" alt="RxDB multi tab" width={450} />

### 5. Reduced Server Load

In a traditional app, every user interaction triggers one or more requests to the backend. With an offline database, data is replicated once and then queried locally as often as the UI needs it. Your server load grows with the amount of changed data, not with the number of user interactions. This makes scaling cheaper and more predictable.

### 6. Simpler Code

When the local database is the single source of truth, you no longer need a separate client-side state management layer that mirrors server state. Components subscribe to queries, writes go to the database, and the Sync Engine handles the network. Fewer REST endpoints, no manual cache invalidation, no hand-written retry logic.

## RxDB as an Offline Database

**RxDB (Reactive Database)** is a local-first, NoSQL database for JavaScript applications. It runs in the browser, [Node.js](../nodejs-database.md), [Electron](../electron-database.md), [React Native](../react-native-database.md), [Capacitor](../capacitor-database.md), Deno, and Bun.

RxDB itself does not persist data. It uses a swappable [RxStorage](../rx-storage.md) layer, so the same database code runs on top of [IndexedDB](../rx-storage-indexeddb.md), [OPFS](../rx-storage-opfs.md), [SQLite](../rx-storage-sqlite.md), [in-memory](../rx-storage-memory.md), and others. Switching storages is a configuration change, not a rewrite. On top of that, RxDB provides MongoDB-style (Mango) queries, observable query results, [encryption](../encryption.md), [schema migration](../migration-schema.md), and replication with almost any backend.

## Quick Setup Example

The following code creates a [database](../rx-database.md), adds a [collection](../rx-collection.md), inserts a document, and subscribes to a [query](../rx-query.md).

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'myofflinedb',
    storage: getRxStorageLocalstorage()
});

await db.addCollections({
    tasks: {
        schema: {
            title: 'tasks schema',
            version: 0,
            type: 'object',
            primaryKey: 'id',
            properties: {
                id: { type: 'string', maxLength: 100 },
                title: { type: 'string' },
                done: { type: 'boolean' }
            },
            required: ['id', 'title', 'done']
        }
    }
});

await db.tasks.insert({
    id: 'task-1',
    title: 'buy milk',
    done: false
});

// Reactive query: emits a new array whenever a matching doc changes.
db.tasks
    .find({ selector: { done: false } })
    .$
    .subscribe(undoneTasks => {
        console.log('Currently undone tasks:', undoneTasks.length);
    });
```

The `tasks` collection now stores data offline. The next step is to sync it with a backend.

## How the RxDB Sync Engine Works

RxDB replicates data with its own [Sync Engine](../replication.md), a protocol that was designed so that the complex parts run inside of RxDB, not in your backend. The backend can stay 'dumb', which makes the Sync Engine compatible with almost any infrastructure, no matter if your server stores data in PostgreSQL, MongoDB, or anything else.

On the document level, the replication works like git. The client is a fork of the server state. Local writes pile up on the fork, and the client pushes them to the server together with the last known server state. When the server state has moved on in the meantime, the push is rejected and the client resolves the [conflict](../transactions-conflicts-revisions.md) locally before pushing again. **All conflicts are resolved on the client**, with a conflict handler you can customize per collection. The default handler drops the local state in favor of the server state, so a device that was offline for months cannot silently overwrite newer changes from other users.

On the transfer level, your backend only has to provide three endpoints:

- **Pull handler**: returns all documents that changed after a given checkpoint, in batches.
- **Push handler**: accepts batches of client writes and returns the current server state of any conflicting documents.
- **Pull stream**: an observable of ongoing server changes, for example over a WebSocket or server-sent events.

The replication runs in two modes. On startup, or when the client comes back online, it iterates checkpoints against the pull handler until the local state has caught up with the server. Then it switches to event observation and applies live changes from the pull stream. When the connection drops and recovers, the stream emits a `RESYNC` event and the replication falls back to checkpoint iteration to close the gap. You do not have to manage any of these offline-online switches yourself.

All transfers happen in batches. Batching means fewer requests, better compression, and faster processing on the client, because storages like IndexedDB and OPFS are faster when writing data in bulks.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = await replicateRxCollection({
    collection: db.tasks,
    replicationIdentifier: 'tasks-to-https://example.com/api/sync',
    live: true,
    pull: {
        async handler(checkpoint, batchSize) {
            const updatedAt = checkpoint ? checkpoint.updatedAt : 0;
            const id = checkpoint ? checkpoint.id : '';
            const url = 'https://example.com/api/sync/pull' +
                `?updatedAt=${updatedAt}&id=${id}&limit=${batchSize}`;
            const response = await fetch(url);
            const data = await response.json();
            return {
                documents: data.documents,
                checkpoint: data.checkpoint
            };
        }
    },
    push: {
        async handler(changeRows) {
            const response = await fetch('https://example.com/api/sync/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changeRows)
            });
            // Must return the current server state of all conflicting documents.
            return await response.json();
        }
    }
});
```

When you do not want to build the endpoints yourself, RxDB ships replication plugins for many backends:

- [HTTP](../replication-http.md) for plain REST endpoints
- [GraphQL](../replication-graphql.md)
- [WebSocket](../replication-websocket.md)
- [CouchDB](../replication-couchdb.md)
- [Firestore](../replication-firestore.md)
- [MongoDB](../replication-mongodb.md)
- [Supabase](../replication-supabase.md)
- [Appwrite](../replication-appwrite.md)
- [NATS](../replication-nats.md)
- [WebRTC](../replication-webrtc.md) for [peer-to-peer](../replication-p2p.md) sync without a central server
- [RxServer](../rx-server.md), a Node.js server built on RxDB itself

In a multi-tab browser app, the replication respects the [leader election](../leader-election.md). Only one tab runs the replication at any given time, which saves client resources and backend connections. When that tab closes, another tab takes over.

## Encrypting the Offline Database

Data on a client device can be extracted when the device is lost or stolen. When you store sensitive fields, you should encrypt them at rest with one of the [encryption plugins](../encryption.md). The encryption wraps the storage, so it works with any RxStorage.

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import {
    wrappedKeyEncryptionCryptoJsStorage
} from 'rxdb/plugins/encryption-crypto-js';

const encryptedStorage = wrappedKeyEncryptionCryptoJsStorage({
    storage: getRxStorageLocalstorage()
});

const db = await createRxDatabase({
    name: 'secureofflinedb',
    storage: encryptedStorage,
    password: 'myTopSecretPassword'
});

await db.addCollections({
    usersecrets: {
        schema: {
            title: 'encrypted user data',
            version: 0,
            type: 'object',
            primaryKey: 'id',
            properties: {
                id: { type: 'string', maxLength: 100 },
                secretData: { type: 'string' }
            },
            required: ['id'],
            encrypted: ['secretData']
        }
    }
});
```

The `secretData` field is now unreadable without the password, even when someone copies the raw database files from the device. For production apps, the 👑 [RxDB Premium](/premium/) Web Crypto encryption plugin is recommended because it is faster and uses the browser's native crypto APIs.

## How to Improve Your Offline Database Setup

A working setup is the start, not the end. The following steps make an offline database faster, smaller, and safer in production.

### 1. Pick the Right Storage

Storage performance differs a lot between environments. In the browser, [IndexedDB](../rx-storage-indexeddb.md) is the default choice, while [OPFS](../rx-storage-opfs.md) is 3x-4x faster for many workloads. On native platforms like React Native or Capacitor, the [SQLite storage](../rx-storage-sqlite.md) is the fastest option. Compare the numbers on the [storage performance page](../rx-storage-performance.md) and remember that switching storages later is a configuration change, not a rewrite.

### 2. Sync Only the Data You Need

Replicating the whole dataset to every client wastes bandwidth, disk space, and initial sync time. With [partial sync](../partial-sync.md) you filter the replication so each client only receives the documents it needs, for example only the current user's documents or only data from the last month.

### 3. Clean Up Deleted Documents

Replicated documents are never physically removed, they are marked with a `_deleted` flag so the deletion can sync to other instances. Over time these tombstones slow down queries. The [cleanup plugin](../cleanup.md) purges deleted documents after a safe time window.

### 4. Compress Stored Data

The [key compression](../key-compression.md) plugin replaces field names with shorter tokens before writing to disk, which saves up to 40% storage space without changing how you query the data.

### 5. Move Database Work Off the Main Thread

Heavy queries and writes on the main thread can block rendering. With the [Worker](../rx-storage-worker.md) and [SharedWorker](../rx-storage-shared-worker.md) storages you run the whole database in a background thread and keep the UI responsive, while all tabs share one database process.

### 6. Plan Schema Migrations

Shipped clients keep old data in old formats. When your schema changes, the [schema migration plugin](../migration-schema.md) transforms existing documents on the client to the new schema version. Define migration strategies from the first release, because an offline database without a migration path corners you later.

### 7. Handle Conflicts Deliberately

The default conflict handler drops local changes in favor of the server state. This is a safe default, but for collaborative apps you should write a [custom conflict handler](../transactions-conflicts-revisions.md#custom-conflict-handler) that merges fields, or use the [CRDT plugin](../crdt.md) for deterministic merges of concurrent changes.

### 8. Know the Tradeoffs

Offline-first is not free. Conflicts can happen, initial replication takes time on large datasets, and client storage is limited by [browser quotas](./indexeddb-max-storage-limit.md). Read the [downsides of offline-first](../downsides-of-offline-first.md) before you commit, so the known limits do not bite back in production.

## FAQ

<Faq>
<FaqItem question="What is the difference between an offline database and a cache?">

A cache stores temporary copies of server responses and treats the server as the source of truth. An offline database like **[RxDB](../rx-database.md)** makes the local data the source of truth for the client. Writes succeed locally without a network connection, and the [Sync Engine](../replication.md) merges local and remote changes in the background, including conflict resolution.

</FaqItem>
<FaqItem question="Is IndexedDB an offline database?">

No, not on its own. [IndexedDB](../rx-storage-indexeddb.md) is a low-level browser storage API without sync, observable queries, or a schema. An offline database builds these features on top of a storage. RxDB uses IndexedDB as one of several [RxStorage](../rx-storage.md) options and adds replication, reactivity, encryption, and Mango queries.

</FaqItem>
<FaqItem question="How does an offline database sync data with the server?">

RxDB syncs through its [Sync Engine](../replication.md), which needs only three endpoints on the backend: a pull handler for changed documents after a checkpoint, a push handler for client writes, and an event stream for live changes. All transfers run in batches, and conflicts are resolved on the client. This works with any backend, from a REST API over [GraphQL](../replication-graphql.md) to services like [Supabase](../replication-supabase.md) or [Firestore](../replication-firestore.md).

</FaqItem>
<FaqItem question="What happens when two users edit the same document while offline?">

The first push to the server wins. The second client's push is rejected, and RxDB calls the collection's conflict handler on that client to produce a merged state, which is then pushed again. By default the server state wins, but a [custom conflict handler](../transactions-conflicts-revisions.md#custom-conflict-handler) or the [CRDT plugin](../crdt.md) can merge both changes field by field.

</FaqItem>
<FaqItem question="Can I encrypt data in an offline database?">

Yes. RxDB provides [encryption plugins](../encryption.md) that encrypt marked fields at rest, on top of any storage. The data is only readable with the database password. Encrypted fields cannot be used inside of query selectors, so keep fields you need to query against unencrypted.

</FaqItem>
<FaqItem question="Which offline database should I use for web and mobile apps?">

RxDB is a strong choice when you need one codebase across platforms, because it runs in the browser, [React Native](../react-native-database.md), [Capacitor](../capacitor-database.md), [Electron](../electron-database.md), and Node.js, and it can sync with any backend. Firebase fits when you want a fully managed cloud backend and accept vendor lock-in. Plain [SQLite](../rx-storage-sqlite.md) fits native apps that need SQL but no automatic sync.

</FaqItem>
</Faq>

## Follow Up

- Start building with the [RxDB Quickstart](../quickstart.md).
- Read how the [Sync Engine](../replication.md) replicates with any backend.
- Learn why [offline-first](../offline-first.md) improves user experience and where it has [downsides](../downsides-of-offline-first.md).
- Explore the [local-first movement](./local-first-future.md) and [zero-latency apps](./zero-latency-local-first.md).
- Ask questions in the [RxDB Chat](/chat/) and leave a star ⭐ on [GitHub](/code/).
