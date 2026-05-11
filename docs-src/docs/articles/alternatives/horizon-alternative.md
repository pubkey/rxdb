---
title: RxDB as a Horizon Alternative - Offline-First, Client-Side Reactive Database
slug: alternatives/horizon-alternative.html
description: Compare RxDB and Horizon (RethinkDB's client library) for realtime JavaScript applications. Learn why RxDB is a strong alternative with true offline-first support, client-side reactive queries, flexible backends, and active long-term maintenance.
---

# RxDB as a Horizon Alternative

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

Horizon was the official client-side library for RethinkDB, launched in 2016 to let developers build realtime JavaScript applications without writing server code. It offered a clean API for subscribing to live data, built-in authentication, and a permission system. But Horizon's life was short. The company behind RethinkDB shut down just months after Horizon launched, and offline support was never implemented. The project is now archived and receives no maintenance.

This page explains what Horizon was, where it failed to deliver for modern client-side applications, and why [RxDB](https://rxdb.info) is a strong replacement for teams that want the reactive, data-subscription model Horizon promised, with the offline-first architecture it never had.

---

## What Was Horizon?

Horizon (also written as horizon.io) was an open-source backend platform built on top of RethinkDB. It was launched by the RethinkDB company in May 2016. Its goal was to give frontend JavaScript developers a direct path to realtime data without needing to write or maintain a traditional REST or GraphQL API.

<center>
    <img src="/files/alternatives/rethinkdb.svg" alt="RethinkDB / Horizon alternative" height="60" className="img-padding" />
</center>

The Horizon client library connected directly to a Horizon server process, which in turn communicated with RethinkDB. Developers interacted with data through collections and a fluent API that returned RxJS Observables. A basic Horizon application looked like this:

```javascript
// Horizon: connect to the backend
const horizon = Horizon();

// Get a reference to a collection (table in RethinkDB)
const messages = horizon('messages');

// Store a document
messages.store({ id: 'msg-1', text: 'Hello, Horizon!', createdAt: new Date() });

// Watch for realtime changes - returns an RxJS Observable
messages.watch().subscribe(allMessages => {
    renderMessages(allMessages);
});

// Fetch once (not live)
messages.fetch().subscribe(allMessages => {
    console.log(allMessages);
});

// Order and limit
messages.order('createdAt', 'descending').limit(20).watch().subscribe(recent => {
    renderRecentMessages(recent);
});
```

The `watch()` method was the centerpiece: it connected to RethinkDB changefeeds and pushed updated result sets to the client whenever data changed. This was compelling in 2016, when building a realtime app without polling required significant infrastructure work.

Horizon also provided:

- **Authentication** via local username/password, GitHub OAuth, Google OAuth, and other providers.
- **A permission system** with rules that controlled which users could read or write which documents.
- **An `hz` command-line tool** for scaffolding projects and running a local development server.
- **Embedding into existing Node.js apps** for teams that needed custom server logic alongside Horizon's data layer.

### Horizon's Timeline

- **May 2016** - Horizon launches publicly with its `hz` CLI and the Horizon client library for JavaScript.
- **October 2016** - RethinkDB Inc. announces it is shutting down. The company failed to build a sustainable business competing against hosted databases and cloud services.
- **February 2017** - The Linux Foundation (via the Cloud Native Computing Foundation) acquires RethinkDB and relicenses it as Apache 2.0. Horizon does not receive the same treatment.
- **2016-present** - Horizon receives no meaningful updates. The GitHub repository is effectively archived. The `rethinkdb/horizon` repository shows no significant activity after 2016.

The shutdown happened almost immediately after launch. Horizon never had a chance to mature. Key features that were planned but never shipped included offline support, which was requested by the community in an [open GitHub issue from 2016](https://github.com/rethinkdb/horizon/issues/58) and never resolved before the project was abandoned.

### What Horizon Did Well

For the narrow use case of building a connected, online-only realtime web application, Horizon reduced the amount of code developers needed to write. Subscribing to a collection and rendering the result directly in the UI, without writing any server routes, was genuinely useful. The Observable-based API was ahead of its time in bringing reactive programming idioms to the client-server data layer.

---

## Where Horizon Falls Short

### No Offline Support

Horizon was never built for offline scenarios. Every query, read, and write required a live network connection to the Horizon server. When the connection dropped, the Observable streams from `watch()` would stop emitting, and any attempt to call `store()`, `update()`, or `remove()` would fail silently or throw.

The offline support issue was one of the most-requested features on the Horizon GitHub repository. The [issue thread](https://github.com/rethinkdb/horizon/issues/58) collected significant community discussion, but the feature was never designed, let alone implemented. When the company shut down, the issue was closed without resolution.

For most modern applications, offline capability is not a nice-to-have. Users expect applications to work in areas with poor connectivity, on public transport, in buildings with unreliable Wi-Fi, and in regions where mobile data is expensive. An application that fails when the network drops is a broken application.

### The Project Is Abandoned

Horizon is not maintained. There are no security updates, no compatibility fixes for modern Node.js versions, no TypeScript type definitions, and no response to open issues or pull requests. Installing Horizon in a new project in 2025 requires working around dependency conflicts with modern tooling.

The underlying RethinkDB project still receives occasional community maintenance releases, but Horizon is separate and does not benefit from that work. Any team that built on Horizon faced a migration problem at some point, and most already completed that migration years ago.

### Server-Side Architecture, No Client-Side Storage

Horizon did not store any data on the client. Every piece of data lived in RethinkDB on the server. The client library was a subscription mechanism, not a database. This means:

- The application cannot serve any data when offline.
- There is no local query cache. Changing the query parameters means a new network request.
- There is no way to write data locally and sync it later.
- Closing and reopening the application requires re-fetching all data from the server.

This architecture is fundamentally incompatible with the offline-first pattern, where the application treats local storage as the primary source of truth and treats the server as a sync target rather than a mandatory dependency.

### No Conflict Resolution

Horizon provided no mechanism for resolving conflicts when two users modified the same document concurrently. The server-authoritative model meant that RethinkDB's last-write-wins behavior determined the result. In practice, when two users modified the same document, one of their changes was silently overwritten without any notification to either user.

For collaborative applications, this is a significant limitation. The developer had no API to detect a conflict, inspect both versions, or apply a merge strategy.

### Highly Opinionated Structure

Horizon required a specific project structure, a specific server process (`hz serve`), and its own authentication system. Integrating Horizon into an existing backend, a non-Node.js server, or a project with an existing authentication layer required significant workarounds. The permission system was designed around Horizon's own user model and could not be easily adapted to existing user databases or role systems.

---

## How RxDB Covers the Same Ground (and More)

[RxDB](https://rxdb.info) shares Horizon's core idea: data changes should propagate automatically to the UI through a reactive, Observable-based API. But RxDB implements this on the client side, in a full local database, rather than as a subscription mechanism to a remote server.

### Reactive Queries on the Client

In RxDB, every query is Observable. When you subscribe to a query, you receive the current result set immediately, and the Observable emits again whenever the data changes, whether from a local write or from a replication event.

```typescript
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    messages: {
        schema: {
            title: 'message schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                text:      { type: 'string' },
                roomId:    { type: 'string' },
                createdAt: { type: 'number' }
            },
            required: ['id', 'text', 'roomId', 'createdAt'],
            indexes: ['createdAt']
        }
    }
});

// Subscribe to messages in a room, ordered by creation time
db.messages.find({
    selector: { roomId: 'room-42' },
    sort: [{ createdAt: 'asc' }]
}).$.subscribe(messages => {
    renderMessages(messages); // called immediately and on every change
});
```

This is equivalent to Horizon's `watch()` API, but the data comes from local IndexedDB storage, not a remote server. The UI works the same way whether the user is online or offline.

RxDB uses the [event-reduce algorithm](https://github.com/pubkey/event-reduce) to make reactive updates efficient. When a document changes, RxDB checks whether the existing query result can be updated by applying the change event directly without re-running the full query against storage. This keeps reactive UI updates fast even in write-heavy workloads.

### Full Offline-First Operation

When a user opens an RxDB application without network access, every feature works normally. Reads come from local storage. Writes go to local storage. There are no errors, no loading spinners waiting for a server, and no missing data.

When connectivity returns, RxDB's replication plugins synchronize local changes with the remote backend automatically. The application seamlessly transitions between offline and online states without any code change required for individual features.

<center>
    <img src="/files/offline-ready.png" alt="Offline-ready application with RxDB" width="400" />
</center>

This is the [offline-first architecture](../../offline-first.md). RxDB treats local storage as the primary source of truth. The server is a sync target, not a dependency for normal operation. Horizon's architecture was exactly the opposite: the server was the only source of data, and offline operation was not possible.

### Multi-Tab Support

Horizon ran as a single connection per browser window. If a user opened two tabs of the same application, each tab would maintain its own WebSocket connection to the server, and local state between tabs could diverge.

RxDB provides a [SharedWorker storage mode](../../rx-storage-shared-worker.md) that runs a single database instance in a shared worker. All tabs share that single instance, so a write in one tab is immediately reflected in reactive queries in all other tabs without any additional code:

```typescript
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

For background tasks that only one tab should perform (such as running replication), RxDB includes a [leader election plugin](../../leader-election.md). One tab is elected leader and handles background work. If the leader tab is closed, another tab takes over automatically:

```typescript
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { addRxPlugin } from 'rxdb/plugins/core';

addRxPlugin(RxDBLeaderElectionPlugin);

// Only the leader tab runs replication
await db.waitForLeadership();
startReplication(db);
```

### Flexible Replication to Any Backend

Horizon required a Horizon server, which required RethinkDB. The entire stack was prescribed and non-negotiable. RxDB separates storage from replication and makes both independently configurable.

RxDB stores data locally and replicates to a backend using a plugin system. You can replicate to any backend your application already uses:

```typescript
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = await replicateRxCollection({
    collection: db.messages,
    replicationIdentifier: 'messages-http-v1',
    pull: {
        handler: async (checkpoint, batchSize) => {
            const since = checkpoint?.updatedAt ?? 0;
            const response = await fetch(
                `/api/messages?since=${since}&limit=${batchSize}`
            );
            const data = await response.json();
            return {
                documents: data.documents,
                checkpoint: data.checkpoint
            };
        }
    },
    push: {
        handler: async (rows) => {
            const response = await fetch('/api/messages', {
                method: 'POST',
                body: JSON.stringify(rows),
                headers: { 'Content-Type': 'application/json' }
            });
            return response.json(); // returns conflicting docs or []
        }
    },
    live: true,
    retryTime: 5000
});

// Observable replication state
replicationState.active$.subscribe(active => console.log('Syncing:', active));
replicationState.error$.subscribe(err => console.error('Sync error:', err));
```

The pull handler fetches changes from the server since a checkpoint. The push handler sends local changes to the server. The replication protocol is simple enough that any backend language can implement the server side. There is no requirement to run a specific server process, use a specific database, or adopt a specific permission model.

For common backend setups, RxDB provides ready-made plugins:

| Plugin | Use case |
|---|---|
| [HTTP replication](../../replication-http.md) | Any REST API endpoint |
| [GraphQL replication](../../replication-graphql.md) | GraphQL APIs including AWS AppSync |
| [WebSocket replication](../../replication-websocket.md) | Low-latency server push |
| [CouchDB replication](../../replication-couchdb.md) | CouchDB or PouchDB server |
| [Firestore replication](../../replication-firestore.md) | Google Cloud Firestore |

### Pluggable Storage Backends

RxDB's storage layer is separate from its query and replication logic. The same application code runs with different storage engines depending on the environment:

| Environment | Storage Option |
|---|---|
| Browser (standard) | [IndexedDB](../../rx-storage-indexeddb.md) |
| Browser (high-throughput) | [OPFS (Origin Private File System)](../../rx-storage-opfs.md) |
| React Native / Expo | [SQLite via expo-sqlite or op-sqlite](../../rx-storage-sqlite.md) |
| Node.js / Electron | [SQLite (better-sqlite3)](../../rx-storage-sqlite.md) |
| Multi-tab browsers | [SharedWorker](../../rx-storage-shared-worker.md) |
| Testing / CI | [Memory](../../rx-storage-memory.md) |

Switching storage is a one-line change:

```typescript
import { getRxStorageOpfs } from 'rxdb/plugins/storage-opfs';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageOpfs() // use OPFS for higher throughput in the browser
});
```

Horizon offered no equivalent. Data always lived in RethinkDB on the server. There was no local storage, no storage abstraction, and no way to run the application without a running RethinkDB instance.

### Conflict Resolution

Horizon inherited RethinkDB's last-write-wins conflict model. Two concurrent writes to the same document produced a silent overwrite. The developer had no mechanism to detect, inspect, or merge conflicting versions.

RxDB provides a configurable conflict handler per collection. When two versions of the same document arrive during replication, the conflict handler is called with both versions and returns the resolved document:

```typescript
await db.addCollections({
    messages: {
        schema: messageSchema,
        conflictHandler: async ({ newDocumentState, realMasterState }) => {
            // Keep whichever version was updated more recently
            if (newDocumentState.updatedAt >= realMasterState.updatedAt) {
                return { documentData: newDocumentState };
            }
            return { documentData: realMasterState };
        }
    }
});
```

For collaborative editing where documents can be modified concurrently by multiple users, RxDB supports [CRDT-based conflict resolution](../../crdt.md). CRDTs merge concurrent edits deterministically without requiring a central authority to decide the winner:

```typescript
import { getCRDTSchemaPart, RxDBcrdtPlugin } from 'rxdb/plugins/crdt';
import { addRxPlugin } from 'rxdb/plugins/core';

addRxPlugin(RxDBcrdtPlugin);

const messageSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:     { type: 'string', maxLength: 100 },
        text:   { type: 'string' },
        roomId: { type: 'string' },
        crdts:  getCRDTSchemaPart()
    },
    crdt: { field: 'crdts' }
};
```

### Schema Validation and TypeScript Support

Horizon stored and returned plain JavaScript objects with no validation. If a client stored a document with the wrong field name or the wrong data type, RethinkDB accepted it without complaint, and that corrupted document propagated to all other clients through changefeeds.

RxDB validates every document against a [JSON Schema](../../rx-schema.md) before writing it to storage. Invalid documents are rejected at the write step, before they can reach the local store or propagate through replication:

```typescript
try {
    await db.messages.insert({
        id: 'msg-001',
        // 'text' field is required but missing
        roomId: 'room-42',
        createdAt: Date.now()
    });
} catch (err) {
    console.error(err); // Schema validation error: missing 'text'
}
```

RxDB generates TypeScript types automatically from the schema. Collection methods like `find()`, `insert()`, and `upsert()` are fully typed, giving you IDE autocompletion and compile-time safety for all database operations.

### Schema Migration

As an application evolves, the data model changes. Adding new required fields, renaming properties, or restructuring nested objects all require updating existing stored documents.

Horizon provided no migration system. If you changed the shape of your data, you were responsible for writing a migration script that connected to RethinkDB and updated every document manually, with no help from the framework.

RxDB has a built-in [schema migration system](../../migration-schema.md). When the schema version number increases, RxDB automatically runs migration strategies on all locally stored documents before making the database available to the application:

```typescript
await db.addCollections({
    messages: {
        schema: messageSchemaV2, // version: 1
        migrationStrategies: {
            1: (oldDoc) => {
                // Migrate from version 0: add 'threadId' with a default
                return {
                    ...oldDoc,
                    threadId: oldDoc.threadId ?? 'main'
                };
            }
        }
    }
});
```

Migrations run locally on each client independently. They do not require a coordinated server deployment or a manual database update script.

### Encryption at Rest

Horizon sent data between the browser and RethinkDB in plaintext (over WebSocket). Data in RethinkDB was stored as-is. If a user's device was compromised, the IndexedDB data from the browser session would be readable without decryption.

RxDB includes a built-in [encryption plugin](../../encryption.md) that encrypts individual document fields before writing them to local storage. The data is decrypted on read, so the application sees plaintext, but the underlying storage contains only ciphertext:

```typescript
import {
    wrappedKeyEncryptionCryptoJsStorage
} from 'rxdb/plugins/encryption-crypto-js';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'myapp',
    storage: wrappedKeyEncryptionCryptoJsStorage({
        storage: getRxStorageIndexedDB()
    }),
    password: 'your-encryption-passphrase'
});

const schema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:       { type: 'string', maxLength: 100 },
        text:     { type: 'string' },
        sensitiveData: { type: 'string' }
    },
    encrypted: ['sensitiveData'] // stored as ciphertext in IndexedDB
};
```

### Observable Change Streams

Horizon's `watch()` method pushed complete updated result sets from the server. RxDB provides observable change streams at both the collection and document level, giving fine-grained access to change events locally:

```typescript
// Subscribe to all changes in the messages collection
db.messages.$.subscribe(changeEvent => {
    console.log('Operation:', changeEvent.operation); // INSERT, UPDATE, DELETE
    console.log('Document ID:', changeEvent.documentId);
    console.log('Document data:', changeEvent.documentData);
});

// Subscribe to changes on a specific document
const doc = await db.messages.findOne('msg-001').exec();
doc.$.subscribe(updatedDoc => {
    console.log('Document updated:', updatedDoc?.text);
});
```

These events originate from the local database. They fire for writes made locally and for documents that arrive through replication. They fire while the user is offline. There is no server connection required.

---

## Getting Started with RxDB

Install RxDB and RxJS:

```bash
npm install rxdb rxjs
```

Create a database, add a collection, write documents, and subscribe to reactive queries:

```typescript
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

addRxPlugin(RxDBDevModePlugin);

const db = await createRxDatabase({
    name: 'chatapp',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    messages: {
        schema: {
            title: 'message schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                text:      { type: 'string' },
                roomId:    { type: 'string' },
                createdAt: { type: 'number' }
            },
            required: ['id', 'text', 'roomId', 'createdAt'],
            indexes: ['roomId', 'createdAt']
        }
    }
});

// Write a message
await db.messages.insert({
    id: 'msg-001',
    text: 'Hello from RxDB!',
    roomId: 'room-42',
    createdAt: Date.now()
});

// Reactive query: emits current state immediately and on every change
db.messages.find({
    selector: { roomId: 'room-42' },
    sort: [{ createdAt: 'asc' }]
}).$.subscribe(messages => {
    console.log('Current messages:', messages.map(m => m.text));
});
```

This works entirely offline. Connect a replication plugin when you need server sync.

---

## Comparison Summary

| Aspect | Horizon | RxDB |
|---|---|---|
| **Project status** | Abandoned since 2016 | Actively maintained since 2016 |
| **Where it runs** | Client connects to server | Full database on the client |
| **Offline support** | None (network required for all operations) | Full offline-first operation |
| **Reactive queries** | `watch()` pushes from RethinkDB | Observable queries from local storage |
| **Data location** | Remote RethinkDB server | Local storage (IndexedDB, OPFS, SQLite) |
| **Backend dependency** | Must run Horizon + RethinkDB | Any backend or no backend |
| **Replication** | Horizon-proprietary protocol | Pluggable (HTTP, WebSocket, CouchDB, GraphQL, custom) |
| **Conflict resolution** | Last-write-wins (silent overwrite) | Configurable handler or CRDT-based merging |
| **Schema validation** | None | JSON Schema enforced on every write |
| **Schema migration** | Manual scripts | Built-in versioned migration strategies |
| **Multi-tab support** | Separate connections per tab | SharedWorker (shared state across all tabs) |
| **Encryption at rest** | None | Built-in field-level encryption plugin |
| **TypeScript support** | None (JavaScript only) | Auto-generated types from schema |
| **Authentication** | Built-in OAuth providers (now outdated) | Handled by your existing backend; no lock-in |
| **Permissions** | Horizon-specific rule system | Handled by your existing backend |
| **Security updates** | None (abandoned) | Ongoing with active development |
| **License** | Apache 2.0 | Apache 2.0 |

---

## FAQ

<details>
<summary>Can RxDB replace Horizon for an existing RethinkDB-based application?</summary>

Yes. RxDB can take over the client-side data layer. You keep RethinkDB on the server and build a thin API (REST or WebSocket) in front of it. Then use RxDB's [custom replication](../../replication.md) or [WebSocket replication](../../replication-websocket.md) plugin to sync data between RxDB on the client and RethinkDB on the server.

The main difference is that Horizon was the entire client-server protocol, while with RxDB you own the API layer. That gives you full control over authentication, rate limiting, and data access rules, instead of depending on Horizon's specific permission model.

</details>

<details>
<summary>How does RxDB's reactive model compare to Horizon's watch() API?</summary>

Horizon's `watch()` connected to RethinkDB's changefeed system and pushed updated result sets to the client. When any document in a collection changed, Horizon sent the entire updated array to the subscriber.

RxDB works similarly at the API level: subscribing to a query gives you the current result set immediately, and the Observable re-emits the updated array whenever relevant data changes. The difference is where the data comes from. Horizon pulled from a remote server, so `watch()` required a live connection. RxDB emits from local storage, so reactive queries work identically online and offline.

RxDB uses the [event-reduce algorithm](https://github.com/pubkey/event-reduce) to compute result set updates efficiently without re-running the full query on every change, keeping reactive updates fast even in write-heavy applications.

</details>

<details>
<summary>Does RxDB work with React, Vue, Angular, and other frameworks?</summary>

Yes. RxDB is framework-agnostic. Its reactive queries return RxJS Observables, which integrate with any framework. RxDB provides convenience hooks for React (`useRxQuery`, `useRxDocument`) that wrap Observable subscriptions in React's state model. For Angular, RxJS Observables can be used directly with the async pipe. For Vue, plain Observable subscriptions work with `ref` and `reactive`.

Horizon was also framework-agnostic at the API level, but the outdated state of its dependencies makes integration with modern framework versions difficult without forking the library.

</details>

<details>
<summary>How does RxDB handle reconnection after going offline?</summary>

RxDB's replication plugins run continuously with automatic retry. When the network is unavailable, the pull and push handlers fail, and RxDB waits for `retryTime` milliseconds before retrying. When the network returns, replication resumes from the last successful checkpoint. No writes are lost: documents written while offline are stored locally and pushed to the server when the connection is re-established. The reactive queries in the UI stay up to date throughout, reflecting local writes immediately without waiting for server confirmation.

</details>

<details>
<summary>Is RxDB suitable for production use?</summary>

RxDB has been in active development since 2016 and is used by companies in production applications. It has a working business model through [premium plugins](/premium/), which funds ongoing maintenance. The project has close to zero open bugs and receives regular releases. Unlike Horizon, which has had no maintenance since 2016, RxDB continues to add new storage backends, fix browser compatibility issues, and improve performance.

</details>
