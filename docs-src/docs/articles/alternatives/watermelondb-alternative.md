---
title: RxDB as a WatermelonDB Alternative - Cross-Platform, Observable, Offline-First
slug: alternatives/watermelondb-alternative.html
description: Compare RxDB and WatermelonDB for offline-first JavaScript and React Native applications. Learn why RxDB is a strong alternative with built-in replication, flexible storage, and framework-agnostic reactive queries.
---

# RxDB as a WatermelonDB Alternative

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

WatermelonDB set out to solve a real problem: React Native apps slowed down under the weight of large datasets loaded entirely into the JavaScript thread. If you are evaluating WatermelonDB for a new project or looking for alternatives to it, this page explains what WatermelonDB does well, where it falls short, and why RxDB covers more ground for teams building offline-first applications across web and mobile.

---

## What is WatermelonDB?

WatermelonDB is a reactive, asynchronous database library created by [Nozbe](https://nozbe.com), a productivity software company. The library was built to solve a specific performance problem inside Nozbe's own React Native apps: as the number of tasks, projects, and comments grew, loading all that data into JavaScript memory at startup made the app feel sluggish. WatermelonDB's answer was **lazy loading**: data is never loaded unless explicitly requested, and all database queries run on a native thread separate from the JavaScript UI thread.

The project was open-sourced around 2018. On React Native, WatermelonDB wraps SQLite with a native bridge (and later a JSI adapter) so that queries execute natively. On the web, it uses LokiJS as an in-memory adapter backed by IndexedDB. WatermelonDB's data model is relational: you define models and associations, and the library generates an Objective-C/Java model layer on native platforms.

### A Brief Timeline

- **2018** - WatermelonDB is open-sourced by Nozbe, targeting React Native performance.
- **2019** - Adoption grows in the React Native community. Web support via LokiJS adapter is added.
- **2020-2021** - A JSI-based SQLite adapter is introduced to remove the async bridge bottleneck on native platforms.
- **2022-2023** - The React Native ecosystem shifts toward the New Architecture (Fabric, TurboModules). WatermelonDB's integration with this new architecture becomes an ongoing compatibility challenge.
- **2024-2025** - Community reports accumulate about stagnant maintenance, build failures on recent React Native versions (0.76+), and unresolved issues with the New Architecture. Developers begin migrating to alternatives.

### How WatermelonDB Works

WatermelonDB uses a **record-based**, relational data model. You define models with typed fields and associations:

```js
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

class Post extends Model {
    static table = 'posts';
    static associations = {
        comments: { type: 'has_many', foreignKey: 'post_id' }
    };

    @field('title') title;
    @field('body') body;
    @readonly @date('created_at') createdAt;
}
```

Queries return observables that re-emit when the underlying records change:

```js
const posts = database.collections
    .get('posts')
    .query(Q.where('published', true))
    .observe();

posts.subscribe(results => {
    console.log('Published posts:', results.length);
});
```

The synchronization layer provides a pull/push protocol that your backend must implement:

```js
import { synchronize } from '@nozbe/watermelondb/sync';

await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
        const response = await fetch(`/api/sync/pull?lastPulledAt=${lastPulledAt}`);
        const { changes, timestamp } = await response.json();
        return { changes, timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
        await fetch('/api/sync/push', {
            method: 'POST',
            body: JSON.stringify({ changes }),
        });
    },
});
```

---

## Key Limitations of WatermelonDB

### Sync Is Your Problem to Solve

WatermelonDB's documentation is explicit: implementing synchronization is one of the hardest parts of building with the library. The built-in `synchronize()` helper defines a protocol (pull changes since `lastPulledAt`, push local changes), but you must build and maintain every part of the server side yourself.

The protocol has several documented edge cases:

- If a record is modified on the server between the client's pull and push steps, the push may fail or produce incorrect results.
- The protocol pushes entire updated records rather than just changed fields, which is wasteful for large objects.
- There is no built-in mechanism to prevent pulled records from being pushed back to the server on the next cycle, requiring additional logic in your backend.
- The default conflict resolution is "client-wins" for modified columns, which is not suitable for all applications.

For teams without a dedicated backend engineer comfortable with these trade-offs, the sync implementation is a significant time investment that WatermelonDB does not reduce.

### React Native New Architecture Compatibility

WatermelonDB was designed before the React Native New Architecture (Fabric renderer, TurboModules, Bridgeless mode). As React Native 0.76 and later made the New Architecture the default, WatermelonDB users began reporting build failures, Gradle configuration errors, and runtime instability. The library's JSI adapter helps performance but does not resolve the architectural mismatch.

Community discussions through 2024 and into 2025 show that many teams working on React Native 0.76+ encountered issues they could not resolve without reverting to older React Native versions, applying unofficial patches, or switching to a different database library entirely.

### Browser/Web Support Is a Secondary Concern

In the browser, WatermelonDB falls back to the LokiJS adapter, an in-memory JavaScript database backed by IndexedDB. LokiJS is no longer actively maintained. This means the web version of WatermelonDB is built on an unmaintained dependency, and it does not take advantage of modern browser storage APIs like the [Origin Private File System (OPFS)](../../rx-storage-opfs.md), which offers significantly faster persistent storage than IndexedDB for write-heavy workloads.

For teams building apps that run on both web and mobile, WatermelonDB's web support feels like an afterthought compared to the optimized native experience.

### Relational Model Requires Native Code Generation

WatermelonDB generates native model code (Objective-C for iOS, Java/Kotlin for Android) from your schema. This means adding a new table or field to your schema requires a native rebuild of your application. For teams using managed Expo workflows, this is a barrier because native code generation is not compatible with Expo Go.

The tight coupling to native code generation also makes schema migrations more complex. WatermelonDB has a migration system, but it must be coordinated with native builds, which slows down iteration.

### React-Centric API

WatermelonDB's observable and reactive helpers are primarily designed for React hooks. While the core observables are framework-agnostic, the ergonomic layer (such as `withObservables` and the newer `useQuery` hooks) targets React and React Native specifically. Teams building on Vue, Angular, Svelte, or plain JavaScript do not have the same quality of integration helpers.

---

## How RxDB Addresses These Problems

[RxDB](https://rxdb.info) is a local-first JavaScript database built around the principle that all reads and writes happen against the local storage first, and replication with a server runs in the background. It has been in active development since 2016 and runs on browsers, React Native, Electron, and Node.js with the same API.

### Built-In Replication Protocols

RxDB includes a replication system with ready-made plugins for common backends. You do not need to design a sync protocol from scratch:

| Plugin | Backend |
|---|---|
| [HTTP replication](../../replication-http.md) | Any REST API |
| [CouchDB replication](../../replication-couchdb.md) | CouchDB or compatible (e.g., PouchDB sync server) |
| [GraphQL replication](../../replication-graphql.md) | Any GraphQL API |
| [Firestore replication](../../replication-firestore.md) | Google Firebase Firestore |
| [WebSocket replication](../../replication-websocket.md) | WebSocket-based backends |
| [WebRTC replication](../../replication-webrtc.md) | Peer-to-peer, no server required |
| [Supabase replication](../../replication-http.md) | Supabase Postgres backend |

For a custom backend, the replication interface requires only a pull handler and an optional push handler:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = await replicateRxCollection({
    collection: db.posts,
    replicationIdentifier: 'posts-sync-v1',
    pull: {
        handler: async (checkpoint, batchSize) => {
            const since = checkpoint?.updatedAt ?? 0;
            const response = await fetch(
                `/api/posts/changes?since=${since}&limit=${batchSize}`
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
            const response = await fetch('/api/posts/push', {
                method: 'POST',
                body: JSON.stringify(rows),
                headers: { 'Content-Type': 'application/json' }
            });
            // Return conflicting documents (server wins) or empty array
            return response.json();
        }
    },
    live: true,
    retryTime: 5000
});

// Monitor replication status
replicationState.active$.subscribe(active => {
    console.log('Replication active:', active);
});

replicationState.error$.subscribe(error => {
    console.error('Replication error:', error);
});
```

The replication layer handles offline queuing automatically. Writes made while offline are persisted locally and pushed once the network is available again. No data is lost during offline periods.

### Conflict Handling You Control

WatermelonDB's built-in sync uses a simple "client-wins" strategy for field-level conflicts. RxDB gives you a configurable conflict handler that runs whenever a document exists in different states on the client and server simultaneously:

```ts
await db.addCollections({
    posts: {
        schema: postSchema,
        conflictHandler: async (input) => {
            const { newDocumentState, realMasterState } = input;

            // Merge strategy: keep the most recently updated version
            if (newDocumentState.updatedAt >= realMasterState.updatedAt) {
                return { documentData: newDocumentState };
            }
            return { documentData: realMasterState };
        }
    }
});
```

For collaborative editing scenarios, RxDB also supports [CRDTs (Conflict-free Replicated Data Types)](../../crdt.md), which resolve conflicts automatically and deterministically without custom handler logic:

```ts
import { getCRDTSchemaPart, RxDBcrdtPlugin } from 'rxdb/plugins/crdt';
import { addRxPlugin } from 'rxdb/plugins/core';

addRxPlugin(RxDBcrdtPlugin);

const taskSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        title: { type: 'string' },
        completed: { type: 'boolean' },
        crdts: getCRDTSchemaPart()
    },
    crdt: { field: 'crdts' }
};
```

With CRDTs, concurrent writes to the same document from different clients are merged automatically when they sync. This is useful for applications where users work offline for extended periods and their changes should be preserved rather than overwritten.

### Cross-Platform Storage That Matches the Environment

RxDB's storage system is pluggable. You choose the storage engine based on your deployment target, and the rest of your application code stays the same:

| Environment | Storage Option |
|---|---|
| Browser | [IndexedDB](../../rx-storage-indexeddb.md) |
| Browser (high-throughput) | [OPFS (Origin Private File System)](../../rx-storage-opfs.md) |
| React Native / Expo | [SQLite via op-sqlite or expo-sqlite](../../rx-storage-sqlite.md) |
| Node.js / Electron | [SQLite (better-sqlite3)](../../rx-storage-sqlite.md) |
| Multi-tab browsers | [SharedWorker](../../rx-storage-shared-worker.md) |
| Tests / CI | [Memory](../../rx-storage-memory.md) |

Switching storage is a one-line change to the `storage` parameter when creating the database:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';
// Or for React Native:
// import { getRxStorageSQLite } from 'rxdb/plugins/storage-sqlite';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
    // storage: getRxStorageSQLite({ sqliteBasics: sqliteBasics })
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
                authorId:  { type: 'string', maxLength: 100 },
                published: { type: 'boolean' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'title', 'authorId', 'published', 'updatedAt'],
            indexes: ['updatedAt', 'authorId']
        }
    }
});
```

The OPFS storage option is particularly relevant for teams moving away from WatermelonDB's web adapter. OPFS gives browsers access to a private file system with low-level read and write operations that are [significantly faster](../../rx-storage-opfs.md) than standard IndexedDB for bulk reads and sequential writes. Unlike the LokiJS adapter in WatermelonDB, OPFS is a modern, browser-native API maintained by the W3C.

### Framework-Agnostic Reactive Queries

RxDB builds its reactive layer on [RxJS](https://rxjs.dev), the industry-standard library for reactive programming in JavaScript. Every query exposes an Observable via the `$` property. The Observable emits the current result set on subscription and re-emits whenever the underlying data changes, without polling:

```ts
// Subscribe to published posts sorted by most recent
const publishedPosts$ = db.posts
    .find({
        selector: { published: true },
        sort: [{ updatedAt: 'desc' }]
    })
    .$;

publishedPosts$.subscribe(posts => {
    renderPostList(posts);
});
```

Because this is a standard RxJS Observable, you can use it in React, Vue, Angular, Svelte, SolidJS, or plain JavaScript without any framework-specific adapter. In React:

```tsx
import { useRxQuery } from 'rxdb-hooks';

function PostList({ db }) {
    const { result: posts, isFetching } = useRxQuery(
        db.posts.find({
            selector: { published: true },
            sort: [{ updatedAt: 'desc' }]
        })
    );

    if (isFetching) return <p>Loading...</p>;
    return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

RxDB also lets you subscribe at a more granular level: individual documents, specific fields on a document, or the collection's change stream:

```ts
// Watch a single field on a single document
const doc = await db.posts.findOne('post-001').exec();

doc.get$('title').subscribe(newTitle => {
    console.log('Title changed to:', newTitle);
});

// Watch the entire collection change stream
db.posts.$.subscribe(changeEvent => {
    console.log(changeEvent.operation, changeEvent.documentId);
});
```

RxDB uses the [event-reduce](https://github.com/pubkey/event-reduce) algorithm to update observable query results efficiently. When a document is written, RxDB checks whether the change can update the existing query result directly, without re-running the full query against storage. This keeps UI updates fast even in write-heavy scenarios.

### React Native Support Without Native Code Generation

RxDB on React Native uses the [SQLite storage plugin](../../rx-storage-sqlite.md), which supports multiple underlying SQLite drivers including `expo-sqlite` (for Expo managed workflows) and `op-sqlite` (a high-performance JSI-based driver). No custom Objective-C or Java code generation is required. You define your schema in TypeScript and the library handles everything else:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageSQLite } from 'rxdb/plugins/storage-sqlite';
import { sqliteBasics } from 'rxdb/plugins/storage-sqlite/expo-sqlite';
import * as ExpoSQLite from 'expo-sqlite';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageSQLite({
        sqliteBasics: sqliteBasics(ExpoSQLite)
    })
});
```

This works in Expo managed workflows without ejecting or running a prebuild. The same schema, query code, and replication configuration that runs in your web application can be reused in the React Native app, because the storage layer is swapped independently of the application logic.

RxDB also runs correctly on the React Native New Architecture (Fabric, TurboModules, Bridgeless mode) without the compatibility issues that WatermelonDB users have encountered on recent React Native versions.

### Schema Validation and TypeScript

RxDB validates every document against a [JSON Schema](../../rx-schema.md) before it is written. Invalid documents are rejected at the database level, not by application-layer checks:

```ts
try {
    await db.posts.insert({
        id: 'post-002',
        // 'title' is a required field but is missing
        authorId: 'user-1',
        published: true,
        updatedAt: Date.now()
    });
} catch (err) {
    // Caught: document does not match schema
    console.error(err.message);
}
```

RxDB also generates TypeScript types automatically from the schema, so you get IDE autocompletion and compile-time type checking for all collection operations. WatermelonDB provides TypeScript support through decorators, but the type safety is not as tight because the field types come from JavaScript property decorators rather than a formal schema definition.

### Multi-Tab Support in the Browser

When a user opens your web application in multiple browser tabs, each tab needs access to the same data. RxDB handles this with its [SharedWorker storage](../../rx-storage-shared-worker.md): all tabs connect to a single database instance running in a SharedWorker, so writes from any tab are immediately visible in all others:

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

WatermelonDB's web adapter does not have a multi-tab coordination mechanism because LokiJS is an in-memory database: each tab has its own independent in-memory store. Keeping those stores in sync requires additional application-level logic.

### Encryption

RxDB has a [built-in encryption plugin](../../encryption.md) that encrypts document fields at rest. This is particularly relevant for mobile applications that store sensitive data locally. You can mark individual schema fields as encrypted:

```ts
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';

const db = await createRxDatabase({
    name: 'myapp',
    storage: wrappedKeyEncryptionCryptoJsStorage({
        storage: getRxStorageIndexedDB()
    }),
    password: 'your-encryption-passphrase'
});

// Fields marked as encrypted in the schema are stored as ciphertext
const schema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:    { type: 'string', maxLength: 100 },
        token: { type: 'string' }
    },
    encrypted: ['token']
};
```

---

## Positioning: When to Choose RxDB

WatermelonDB is most valuable for React Native applications with very large datasets (tens of thousands of records) where the primary requirement is fast query execution on the native thread and you have the engineering capacity to build and maintain a custom sync backend.

RxDB is a better fit when:

- You need a sync layer that works out of the box against a common backend (CouchDB, GraphQL, Firestore, or a custom REST API).
- Your application must run on both web and mobile with shared code.
- You are using the React Native New Architecture and need stable support.
- You are using Expo managed workflows and cannot add native modules.
- You want a single database library that works in browsers (including with OPFS for performance), React Native, Electron, and Node.js.
- Your conflict resolution requirements go beyond "client-wins" and you want control over how concurrent edits are merged.
- Your team builds with Vue, Angular, Svelte, or plain JavaScript and needs framework-agnostic reactive queries.

---

## Getting Started with RxDB

Install RxDB and RxJS:

```bash
npm install rxdb rxjs
```

Create a database, define a collection, and subscribe to reactive queries:

```ts
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

addRxPlugin(RxDBDevModePlugin);

const db = await createRxDatabase({
    name: 'taskapp',
    storage: getRxStorageIndexedDB()
});

await db.addCollections({
    tasks: {
        schema: {
            title: 'task schema',
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:        { type: 'string', maxLength: 100 },
                title:     { type: 'string' },
                completed: { type: 'boolean' },
                projectId: { type: 'string', maxLength: 100 },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'title', 'completed', 'projectId', 'updatedAt'],
            indexes: ['projectId', 'updatedAt']
        }
    }
});

// Insert a task
await db.tasks.insert({
    id: 'task-001',
    title: 'Write documentation',
    completed: false,
    projectId: 'proj-rxdb',
    updatedAt: Date.now()
});

// Subscribe to all incomplete tasks in a project
db.tasks.find({
    selector: { projectId: 'proj-rxdb', completed: false },
    sort: [{ updatedAt: 'desc' }]
}).$.subscribe(tasks => {
    console.log('Pending tasks:', tasks.map(t => t.title));
});
```

To add replication with your backend, import `replicateRxCollection` and point it at your API endpoints. The local database continues to work offline regardless of the replication state.

---

## Comparison Summary

| Aspect | WatermelonDB | RxDB |
|---|---|---|
| **Primary focus** | React Native performance with large datasets | Offline-first across web, mobile, Node.js |
| **Data model** | Relational (SQLite-based, decorators) | Document-based (JSON, JSON Schema) |
| **Reactive queries** | Observables (React-focused helpers) | RxJS Observables (framework-agnostic) |
| **Built-in replication** | Pull/push protocol scaffold only | HTTP, CouchDB, GraphQL, WebSocket, WebRTC |
| **Conflict handling** | Client-wins by default | Configurable handler, CRDT support |
| **Browser storage** | LokiJS in-memory (unmaintained dependency) | IndexedDB, OPFS (modern, fast) |
| **React Native storage** | SQLite via JSI adapter | SQLite (expo-sqlite, op-sqlite) |
| **Expo managed workflow** | Requires prebuild / native modules | Supported without prebuild |
| **React Native New Arch** | Compatibility issues (2024-2025) | Works with New Architecture |
| **Multi-tab browser support** | None (in-memory per tab) | SharedWorker for unified state |
| **Schema validation** | None built-in | JSON Schema enforced on every write |
| **TypeScript** | Decorators-based (partial) | Auto-generated from schema (full) |
| **Encryption** | Not built-in | Built-in encryption plugin |
| **Cross-framework** | Primarily React / React Native | React, Vue, Angular, Svelte, plain JS |
| **Maintenance status** | Reduced activity, New Arch issues | Active development since 2016 |
| **Backend requirement** | You build it | Optional; many ready-made plugins |
| **License** | MIT | Apache 2.0 |

---

## FAQ

<details>
<summary>Can RxDB match WatermelonDB's performance for large datasets on React Native?</summary>

RxDB on React Native uses SQLite through drivers like `op-sqlite`, which is a JSI-based SQLite driver. This puts RxDB in the same performance class as WatermelonDB's native SQLite adapter for most workloads. RxDB also runs queries outside the UI thread when using the [Worker storage plugin](../../rx-storage-worker.md), which prevents database work from blocking React Native's JavaScript thread.

</details>

<details>
<summary>Does RxDB work with Expo managed workflows?</summary>

Yes. RxDB supports `expo-sqlite` as a storage backend through the SQLite plugin. This works in Expo managed workflows without ejecting or running `expo prebuild`. You can also use the [Memory storage](../../rx-storage-memory.md) for tests in a Node.js environment without any native dependencies.

</details>

<details>
<summary>How does RxDB handle schema migrations?</summary>

RxDB has a built-in [migration system](../../migration-schema.md). When you increment the schema `version` number, you provide migration strategies that transform documents from the old shape to the new shape. RxDB runs these migrations automatically when the database is opened with a newer schema version. No native rebuild is required, and migrations run against the stored documents in the local database.

</details>

<details>
<summary>Can I replicate RxDB with an existing REST API that I cannot modify?</summary>

Yes, as long as the API can express the two operations RxDB needs: a way to fetch documents changed since a given checkpoint, and a way to submit local changes. The exact endpoint shape and authentication are entirely up to you. The `pull.handler` and `push.handler` functions in the replication config are plain async JavaScript functions that can call any API using `fetch`, Axios, or any other HTTP client.

</details>

<details>
<summary>Does RxDB support offline-first on the web the same way it does on mobile?</summary>

Yes. On the web, RxDB stores all data in IndexedDB or OPFS, both of which are persistent browser storage mechanisms. If the user goes offline, the application continues to read and write data normally. When the connection returns, replication resumes automatically from the last checkpoint. The experience is identical regardless of whether the storage backend is IndexedDB in a browser or SQLite on a mobile device.

</details>
