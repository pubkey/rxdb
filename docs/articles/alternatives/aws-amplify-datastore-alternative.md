# RxDB as an AWS Amplify DataStore Alternative - Backend-Agnostic, Offline-First

> Compare RxDB and AWS Amplify DataStore for offline-first JavaScript applications. Learn why RxDB is a strong alternative with pluggable backends, flexible storage, reactive queries, and no vendor lock-in.

# RxDB as an AWS Amplify DataStore Alternative

<center>
    
        
    
</center>

AWS Amplify DataStore offered an appealing promise: define a GraphQL schema, run a CLI command, and get automatic offline sync to DynamoDB via AWS AppSync. For teams already embedded in the AWS ecosystem, that promise was compelling. But DataStore was deprecated in Amplify Gen 2, is scheduled for end-of-life on May 1, 2027, and had well-documented limitations around query flexibility, local performance, and its tight coupling to AWS infrastructure. This page explains what DataStore does, where it falls short, and why [RxDB](https://rxdb.info) is a practical alternative for teams building offline-first applications.

---

## What is AWS Amplify DataStore?

AWS Amplify is a collection of tools and libraries for building web and mobile frontends that connect to AWS cloud services. It covers authentication (Cognito), file storage (S3), analytics, and APIs. DataStore is the component that added a client-side offline database layer to the Amplify stack.

DataStore was officially launched in **December 2019**. Its core idea was to give developers a local-first programming model: you write data to a local DataStore on the device, and it synchronizes that data to AWS AppSync (a managed GraphQL service) and DynamoDB in the background. The client SDK stored data in SQLite on mobile and IndexedDB on web.

To define data models, developers wrote a GraphQL schema and then ran the Amplify CLI to generate platform-specific model classes:

```graphql
type Post @model {
  id: ID!
  title: String!
  body: String
  status: PostStatus!
  rating: Int
}

enum PostStatus {
  PUBLISHED
  DRAFT
}
```

After running `amplify push`, the CLI created the AppSync API, DynamoDB tables, and generated the client model classes. Querying data used a function-based predicate syntax:

```ts
// A DataStore OR query
const posts = await DataStore.query(Post, c => c.or(
  c => c.rating('gt', 4).status('eq', PostStatus.PUBLISHED)
));

// A DataStore sort query
const posts = await DataStore.query(Post, Predicates.ALL, {
  sort: s => s.rating(SortDirection.ASCENDING).title(SortDirection.DESCENDING)
});
```

DataStore handled conflict resolution server-side via AWS AppSync using one of three strategies: Auto Merge (default), Optimistic Concurrency, or a custom AWS Lambda function.

### A Brief Timeline

- **December 2019** - DataStore launches as part of AWS Amplify. It targets mobile (iOS, Android) and JavaScript applications.
- **2020-2021** - Adoption grows among teams building React Native and React apps on AWS. DataStore becomes the recommended offline pattern for Amplify apps.
- **2022-2023** - AWS begins working on Amplify Gen 2, a ground-up rethink of the Amplify framework built on top of the AWS CDK. DataStore is not included in Gen 2.
- **2024** - AWS confirms that Amplify Gen 1 (which includes DataStore) has entered maintenance mode. New features are no longer being added.
- **May 2027** - Amplify Gen 1 reaches end-of-life. DataStore will no longer receive security patches or support.

This trajectory means that applications built on DataStore today are accumulating technical debt. Teams must plan a migration before May 2027, with no direct drop-in replacement from AWS.

---

## Key Limitations of AWS Amplify DataStore

### Locked to the AWS Infrastructure Stack

The most fundamental limitation of DataStore is its complete dependence on AWS services. DataStore only synchronizes with AWS AppSync. AppSync only writes to the data sources AWS supports (primarily DynamoDB, Aurora Serverless, and Lambda resolvers). This means:

- You cannot sync DataStore to a self-hosted PostgreSQL or MongoDB instance without building a custom Lambda resolver for every operation.
- You cannot switch your backend from AWS to another provider without rewriting the entire data layer.
- Your application's data costs are determined by DynamoDB pricing, regardless of whether DynamoDB's access patterns match your data.
- Local development requires the `amplify mock` command to simulate AppSync, but that mock does not support real-time subscriptions, making end-to-end offline/online testing difficult on a developer machine.

RxDB has no required backend. You can replicate to CouchDB, any GraphQL endpoint (including AppSync), a custom REST API, Firebase Firestore, or a WebSocket server. You can also run RxDB with no backend at all for purely local applications. Switching backends is a configuration change, not a rewrite.

### Query Language Inflexibility

DataStore's predicate syntax is a custom function-based API that maps to AppSync GraphQL queries. This design has a hard limitation: complex queries combining multiple `AND` and `OR` conditions in arbitrary nesting are not expressible in the standard predicate API. In practice, this forces developers to either fetch more data than needed and filter in JavaScript, or write custom resolvers on the AppSync side.

RxDB uses [Mango queries](../../rx-query.md), a MongoDB-compatible JSON query syntax. These run entirely client-side against the local storage, so they are not limited by what the server can express:

```ts
// Complex query in RxDB: posts that are published AND (rating > 4 OR featured = true)
const results = await db.posts.find({
  selector: {
    status: 'published',
    $or: [
      { rating: { $gt: 4 } },
      { featured: true }
    ]
  },
  sort: [{ rating: 'desc' }, { title: 'asc' }]
}).exec();
```

This query runs against local IndexedDB or SQLite with no network round-trip. Because local queries are not constrained by the sync backend's query language, RxDB can support complex filtering that would require custom resolver logic in DataStore.

### "Black Box" Synchronization

DataStore abstracts the sync process entirely. When sync works, this is convenient. When it breaks (stuck sync loops, version conflicts, large dataset startup delays), debugging is difficult because the internals are not exposed.

Common issues reported by DataStore users include:

- Sync loops where the same record is pushed and pulled repeatedly without settling.
- Performance degradation at startup when the local database contains thousands of records, because DataStore performs a full reconciliation scan.
- Sync silently failing when network conditions are intermittent, with no observable status indicator in the default setup.
- Difficulty testing sync behavior because the local mock does not faithfully replicate AppSync's real-time behavior.

RxDB exposes the full replication state as observables. You can subscribe to replication status, active state, errors, and individual document conflicts:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = await replicateRxCollection({
    collection: db.posts,
    replicationIdentifier: 'posts-http-v1',
    pull: {
        handler: async (checkpoint, batchSize) => {
            const response = await fetch(
                `/api/posts/changes?since=${checkpoint?.updatedAt ?? 0}` +
                `&limit=${batchSize}`
            );
            const data = await response.json();
            return { documents: data.documents, checkpoint: data.checkpoint };
        }
    },
    push: {
        handler: async (rows) => {
            const response = await fetch('/api/posts/push', {
                method: 'POST',
                body: JSON.stringify(rows),
                headers: { 'Content-Type': 'application/json' }
            });
            return response.json(); // Returns conflicting docs or []
        }
    },
    live: true,
    retryTime: 5000
});

// Monitor everything
replicationState.active$.subscribe(active => console.log('Syncing:', active));
replicationState.error$.subscribe(err => console.error('Sync error:', err));
replicationState.sent$.subscribe(docs => console.log('Pushed:', docs.length));
replicationState.received$.subscribe(docs => console.log('Pulled:', docs.length));
```

Nothing is hidden. If sync is failing, you see exactly why.

### Rigid Schema Evolution

DataStore's schema is defined in GraphQL and code-generated by the Amplify CLI. Adding a field means editing the schema, running `amplify push` to update the cloud backend, and regenerating the model classes. Removing or renaming a field requires careful migration planning because old clients with stale code may still be running against the new schema.

Amplify does provide a migration flow, but coordinating client updates with backend schema changes in a production app with many concurrent users is a known source of operational complexity.

RxDB has a built-in [schema migration system](../../migration-schema.md). You increment the schema version number and provide a migration strategy:

```ts
await db.addCollections({
    posts: {
        schema: postSchemaV2, // version: 1 (incremented from 0)
        migrationStrategies: {
            // Transform documents from version 0 to version 1
            1: (oldDoc) => {
                return {
                    ...oldDoc,
                    status: oldDoc.published ? 'published' : 'draft',
                    rating: oldDoc.rating ?? 0
                };
            }
        }
    }
});
```

When the database opens with a higher schema version, RxDB runs the migration automatically on the local data. The backend schema is independent of the client schema, so client migrations do not require a coordinated backend deployment.

### No Reactive Queries

DataStore provides a subscription API to observe model changes:

```ts
const subscription = DataStore.observe(Post).subscribe(msg => {
    console.log(msg.opType, msg.element);
});
```

However, this notifies you that something changed, not what the current query results are. You must re-query after each notification to get the updated result set. There is no equivalent of a live query that re-emits the full current result on every relevant change.

RxDB queries are observable by default. Every query exposes a `$` property that emits the current result set and re-emits automatically whenever the underlying data changes, without polling and without a separate re-query step:

```ts
// This observable emits immediately with current results,
// then re-emits whenever matching posts change
db.posts.find({
    selector: { status: 'published' },
    sort: [{ rating: 'desc' }]
}).$.subscribe(posts => {
    // posts is always the current, up-to-date result set
    renderUI(posts);
});
```

RxDB uses the [event-reduce](https://github.com/pubkey/event-reduce) algorithm internally. When a document write occurs, RxDB checks whether the existing query result can be updated by applying the change event directly, without re-executing the full query against storage. This keeps reactive updates fast even in write-heavy workloads.

---

## How RxDB Covers the DataStore Use Case

### Replicating with AWS AppSync via GraphQL

If your existing backend is AWS AppSync, RxDB can replicate with it directly using the [GraphQL replication plugin](../../replication-graphql.md). You keep AppSync as your sync backend but replace the DataStore client with RxDB:

```ts
import { replicateGraphQL } from 'rxdb/plugins/replication-graphql';

const replicationState = await replicateGraphQL({
    collection: db.posts,
    url: {
        http:
            'https://your-appsync-endpoint.appsync-api.us-east-1.amazonaws.com' +
            '/graphql'
    },
    headers: {
        'x-api-key': 'your-api-key'
    },
    pull: {
        queryBuilder: (checkpoint, limit) => ({
            query: `
                query SyncPosts($lastSync: AWSTimestamp, $limit: Int) {
                    syncPosts(lastSync: $lastSync, limit: $limit) {
                        items { id title body status rating _deleted _lastChangedAt }
                        nextToken
                    }
                }
            `,
            variables: {
                lastSync: checkpoint?.updatedAt ?? 0,
                limit
            }
        }),
        responseModifier: (response) => {
            return {
                documents: response.data.syncPosts.items,
                checkpoint: { updatedAt: Date.now() }
            };
        }
    },
    push: {
        queryBuilder: (rows) => ({
            query: `
                mutation CreateOrUpdatePost($input: CreatePostInput!) {
                    createPost(input: $input) { id title body status rating }
                }
            `,
            variables: { input: rows[0].newDocumentState }
        })
    },
    live: true
});
```

This means you can migrate from DataStore to RxDB incrementally: keep AppSync running, replace the client SDK, and gain RxDB's reactive queries, flexible storage, and observable replication state without touching the backend.

### Pluggable Storage for Any Environment

DataStore used SQLite on mobile and IndexedDB on web. RxDB supports both of these and adds more options:

| Environment | Storage Option |
|---|---|
| Browser (standard) | [IndexedDB](../../rx-storage-indexeddb.md) |
| Browser (high-throughput) | [OPFS (Origin Private File System)](../../rx-storage-opfs.md) |
| React Native / Expo | [SQLite via expo-sqlite or op-sqlite](../../rx-storage-sqlite.md) |
| Node.js / Electron | [SQLite (better-sqlite3)](../../rx-storage-sqlite.md) |
| Multi-tab browsers | [SharedWorker](../../rx-storage-shared-worker.md) |
| Testing / CI | [Memory](../../rx-storage-memory.md) |

Switching storage is a single parameter change:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageIndexedDB()
});
```

The OPFS storage option is worth highlighting for web applications. The [Origin Private File System](../../rx-storage-opfs.md) is a modern browser API that gives web pages access to a private file system with significantly faster read and write throughput than IndexedDB. For applications that previously experienced DataStore's startup performance problems with large local datasets, OPFS offers a meaningful improvement.

### Conflict Resolution You Own

DataStore handled conflicts on the server using Auto Merge, Optimistic Concurrency, or a Lambda function. The client had no direct role in conflict resolution.

RxDB runs conflict resolution on the client. When the pull handler returns a document that conflicts with a locally modified version, RxDB calls your conflict handler synchronously:

```ts
await db.addCollections({
    posts: {
        schema: postSchema,
        conflictHandler: async ({ newDocumentState, realMasterState }) => {
            // Example: keep whichever version was updated more recently
            if (newDocumentState.updatedAt >= realMasterState.updatedAt) {
                return { documentData: newDocumentState };
            }
            return { documentData: realMasterState };
        }
    }
});
```

For applications where users edit the same documents from multiple devices simultaneously, RxDB also supports [CRDT-based conflict resolution](../../crdt.md). CRDTs merge concurrent edits automatically and deterministically, without requiring a server-side Lambda or custom conflict handler:

```ts
import { getCRDTSchemaPart, RxDBcrdtPlugin } from 'rxdb/plugins/crdt';
import { addRxPlugin } from 'rxdb/plugins/core';

addRxPlugin(RxDBcrdtPlugin);

const postSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:      { type: 'string', maxLength: 100 },
        title:   { type: 'string' },
        body:    { type: 'string' },
        status:  { type: 'string' },
        crdts:   getCRDTSchemaPart()
    },
    crdt: { field: 'crdts' }
};
```

With CRDTs, two users editing the same post while offline will have their changes merged field-by-field when they reconnect, rather than one edit overwriting the other.

### Multi-Tab Support in the Browser

DataStore on the web stored data in IndexedDB per-tab. Multiple browser tabs each had their own DataStore instance, and keeping them in sync required additional subscription logic.

RxDB solves this with its [SharedWorker storage](../../rx-storage-shared-worker.md). All browser tabs share a single database instance running in a SharedWorker, so writes from any tab are immediately visible in all others with no extra code:

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

### Encryption at Rest

RxDB includes a built-in [encryption plugin](../../encryption.md) that encrypts individual document fields before they are written to the local storage. This is relevant for applications that store user data locally and need to comply with data protection requirements:

```ts
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
        id:    { type: 'string', maxLength: 100 },
        token: { type: 'string' },
        email: { type: 'string' }
    },
    encrypted: ['token', 'email'] // These fields are stored as ciphertext
};
```

### Full TypeScript and JSON Schema Validation

RxDB validates every document against a [JSON Schema](../../rx-schema.md) before it is written. Invalid documents are rejected at the database level:

```ts
try {
    await db.posts.insert({
        id: 'post-001',
        // 'title' is required but missing
        status: 'published',
        updatedAt: Date.now()
    });
} catch (err) {
    console.error(err); // Schema validation error
}
```

RxDB also generates TypeScript types from the schema automatically, giving you IDE autocompletion and type checking for all collection operations. DataStore's code generation produced TypeScript classes, but the types came from the Amplify CLI rather than a portable JSON Schema definition, making them harder to share or validate outside the Amplify toolchain.

---

## Migrating from DataStore to RxDB

Teams using DataStore in Amplify Gen 1 applications face a migration before May 2027. The migration path to RxDB involves three steps:

**1. Replace the client data model definitions.**

DataStore used GraphQL schemas processed by the Amplify CLI. RxDB uses JSON Schema defined in TypeScript:

```ts
// DataStore model (generated from GraphQL)
import { Post } from './models';

// RxDB equivalent
const postSchema = {
    title: 'post schema',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:        { type: 'string', maxLength: 100 },
        title:     { type: 'string' },
        body:      { type: 'string' },
        status:    { type: 'string', enum: ['PUBLISHED', 'DRAFT'] },
        rating:    { type: 'number' },
        updatedAt: { type: 'number' }
    },
    required: ['id', 'title', 'status', 'updatedAt'],
    indexes: ['updatedAt', 'status']
};
```

**2. Replace DataStore reads and writes with RxDB collection operations.**

```ts
// DataStore
await DataStore.save(
    new Post({ title: 'Hello', status: PostStatus.DRAFT, rating: 0 })
);
const posts = await DataStore.query(Post, c => c.status('eq', PostStatus.PUBLISHED));

// RxDB equivalent
await db.posts.insert({
    id: uuid(),
    title: 'Hello',
    status: 'DRAFT',
    rating: 0,
    updatedAt: Date.now()
});
const posts = await db.posts.find({ selector: { status: 'PUBLISHED' } }).exec();
```

**3. Replace DataStore subscriptions with RxDB reactive queries.**

```ts
// DataStore
const sub = DataStore.observe(Post).subscribe(msg => {
    refetchPosts(); // Manual re-query needed
});

// RxDB equivalent: result set updates automatically
db.posts.find({ selector: { status: 'PUBLISHED' } }).$.subscribe(posts => {
    updateUI(posts); // posts is always current
});
```

The backend can remain AppSync during migration. Point the RxDB GraphQL replication plugin at the same AppSync endpoint and the data keeps flowing while you replace the client layer.

---

## Getting Started with RxDB

Install RxDB and RxJS:

```bash
npm install rxdb rxjs
```

Create a database with a collection and start using reactive queries:

```ts
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

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
                status:    { type: 'string' },
                rating:    { type: 'number' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'title', 'status', 'updatedAt'],
            indexes: ['updatedAt', 'status', 'rating']
        }
    }
});

// Write data
await db.posts.insert({
    id: 'post-001',
    title: 'Getting started with RxDB',
    status: 'PUBLISHED',
    rating: 5,
    updatedAt: Date.now()
});

// Reactive query: subscribes to published posts sorted by rating
db.posts.find({
    selector: { status: 'PUBLISHED' },
    sort: [{ rating: 'desc' }]
}).$.subscribe(posts => {
    console.log('Current published posts:', posts.map(p => p.title));
});
```

---

## Comparison Summary

| Aspect | AWS Amplify DataStore | RxDB |
|---|---|---|
| **Current status** | Deprecated (Gen 1 EOL: May 2027) | Actively maintained since 2016 |
| **Backend requirement** | AWS AppSync + DynamoDB only | Any backend or no backend |
| **Vendor lock-in** | High (AWS ecosystem) | None (open source, pluggable) |
| **Query language** | Function-based predicates (limited nesting) | Mango/MongoDB-style JSON (full $or/$and nesting) |
| **Reactive queries** | Change notifications only (no live result sets) | Full live queries via RxJS Observables |
| **Conflict resolution** | Server-side via AppSync (Auto Merge, Lambda) | Client-side configurable handler or CRDTs |
| **Sync observability** | Black box; limited error exposure | Full observable state (active$, error$, sent$, received$) |
| **Browser storage** | IndexedDB | IndexedDB, OPFS (faster) |
| **Mobile storage** | SQLite | SQLite (expo-sqlite, op-sqlite) |
| **Multi-tab support** | No (separate IndexedDB instances per tab) | SharedWorker (shared instance across tabs) |
| **Schema migration** | Amplify CLI + backend deployment | Client-side migration strategies |
| **Encryption at rest** | Not built-in | Built-in encryption plugin |
| **Schema validation** | None at runtime | JSON Schema enforced on every write |
| **TypeScript** | Generated classes from CLI | Auto-generated types from JSON Schema |
| **Local development** | Amplify mock (no real-time support) | Full functionality, memory storage for tests |
| **Framework support** | React, React Native, iOS, Android | Any JS framework + React Native + Electron |
| **License** | Apache 2.0 (client SDK) | Apache 2.0 |

---

## FAQ

<details>
<summary>Can RxDB replicate to AWS AppSync?</summary>

Yes. RxDB's [GraphQL replication plugin](../../replication-graphql.md) can connect to any GraphQL endpoint, including AWS AppSync. You configure the pull and push query builders to match your AppSync schema, and RxDB handles the sync loop, checkpoint tracking, and conflict resolution. This means you can keep AppSync as your backend while replacing the DataStore client with RxDB.

</details>

<details>
<summary>Is RxDB suitable for applications that require a login before data syncs?</summary>

Yes. RxDB's replication pull and push handlers are plain async functions, so you can include authentication headers (JWT, API key, Cognito tokens) in each request. The local database works without authentication; only the replication to the remote backend requires it. If a user's session expires, replication pauses and resumes once valid credentials are available again.

</details>

<details>
<summary>How does RxDB handle offline-first on the web?</summary>

All reads and writes go to the local storage (IndexedDB or OPFS) first. The application works fully offline. When network connectivity is available, replication runs in the background and syncs local changes to the server. When the user goes offline again, the local database continues to work normally and RxDB queues any changes for the next sync. See the [offline-first documentation](../../offline-first.md) for details.

</details>

<details>
<summary>What replaces DataStore in Amplify Gen 2?</summary>

AWS Amplify Gen 2 does not include a DataStore replacement. AWS recommends building offline-first features manually using a local storage library and a GraphQL client like Apollo that connects directly to AppSync. RxDB fills that gap: it provides the local database and the sync engine that Gen 2 does not include.

</details>

<details>
<summary>How does RxDB perform for large datasets compared to DataStore?</summary>

DataStore's startup performance degrades with large local datasets because it performs a full reconciliation scan on initialization. RxDB starts by loading no data; collections are queried on demand. The [OPFS storage](../../rx-storage-opfs.md) option provides significantly faster bulk read and write throughput compared to IndexedDB, which addresses the performance issues many DataStore users experienced with growing local datasets.

</details>
