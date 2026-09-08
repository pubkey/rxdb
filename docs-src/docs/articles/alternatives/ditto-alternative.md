---
title: RxDB as a Ditto Alternative for JavaScript and Browser Apps
slug: ditto-alternative.html
description: Compare Ditto and RxDB for offline-first apps. Ditto mesh runs on native SDKs only, its Web SDK is WebSockets-only, and RxDB core is Apache 2.0.
image: /headers/alternatives/ditto-alternative.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';
import {QuoteBlock} from '@site/src/components/quoteblock';

# RxDB as a Ditto Alternative for JavaScript and Browser Apps

Ditto solves a problem that most local-first databases do not even attempt. Its native SDKs let devices discover each other and sync over **Bluetooth LE, peer-to-peer WiFi, and LAN** with no server and no internet in between, which is genuinely hard to build and works in places where nothing else does. If your product is a fleet of native mobile devices that has to keep a shared state inside a plane, a store, or a vehicle with no infrastructure, Ditto is a serious answer and this page will not pretend otherwise.

The picture changes when the client is JavaScript. In the browser the mesh is not available, the engine is closed source, and the pricing meters device connections and transferred data. RxDB takes the other route: an [Apache 2.0](https://github.com/pubkey/rxdb/blob/master/LICENSE.txt) core, [pluggable storage](../../rx-storage.md), MongoDB-style queries, and a [replication protocol](../../replication.md) that syncs with a backend you own. This page compares the two honestly, including where Ditto is still the right choice.

<RxdbLogo alt="Ditto alternative" />

## A Short History of Ditto

Ditto was founded in 2018 by Adam Fish and Max Alexander, who had worked on database and sync products at Realm before it was acquired by MongoDB. That lineage shows in the product: an embedded document store with a sync engine, aimed at enterprises rather than at web developers.

The engine is written in Rust and shipped as compiled SDKs for Swift, Kotlin, JavaScript, C#, C++, and Rust. Ditto sells a cloud sync service on top, and the business is enterprise and sales-led, with airlines, retail, and defense as its named markets.

### A Brief Timeline

- **2018** - Ditto is founded by Adam Fish and Max Alexander.
- **2021** - The mesh SDKs go into production use with large airline and retail customers.
- **March 2025** - Ditto raises an [82 million USD Series B](https://techcrunch.com/2025/03/12/ditto-lands-82m-to-synchronize-data-from-the-edge-to-the-cloud/) to expand the edge sync platform.
- **2026** - The platform is positioned around edge sync in disconnected environments, with `@dittolive/ditto` at **25,688** npm downloads in the last 30 days (npm registry API, checked September 8, 2026).

## What is RxDB?

RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript applications. It runs in the browser, [Node.js](../../nodejs-database.md), [Electron](../../electron-database.md), [React Native](../../react-native-database.md), [Capacitor](../../capacitor-database.md), Deno, and Bun.

Each [collection](../../rx-collection.md) is defined by a JSON [schema](../../rx-schema.md), stored on a swappable [RxStorage](../../rx-storage.md), and queried with a Mango (MongoDB-style) API. Every [query](../../rx-query.md) is observable, so the UI re-renders when data changes, whether the change came from a local write or from an incoming sync. The core is Apache 2.0 with **23,376** GitHub stars and **278,111** npm downloads in the last 30 days (GitHub and npm registry APIs, checked September 8, 2026).

## Where Ditto Falls Short for JavaScript Teams

### The Mesh Does Not Exist in the Browser

This is the part that surprises teams who pick Ditto for its mesh and then build a web client. The Ditto documentation states it directly:

<QuoteBlock
  author="Ditto Documentation"
  year="2026"
  sourceLink="https://docs.ditto.live/key-concepts/mesh-networking"
>Web browsers do not support peer-to-peer transports (Bluetooth LE, LAN, or P2P Wi-Fi). The browser-based Web SDK can only connect to Ditto Server over WebSockets.</QuoteBlock>

So in a browser you get a client that syncs to a server over WebSockets. That is the same shape as [RxDB WebSocket replication](../../replication-websocket.md), without the open source engine underneath it. The mesh is a native-SDK capability, and it should be evaluated as one.

### The Engine Is Closed Source

Ditto does not publish the source of its sync engine, and the SDKs are distributed as compiled packages. For a database that holds your users' data on their devices, that means the storage format, the merge semantics, and the failure behavior are only observable from the outside. You cannot read the conflict resolution, patch a bug yourself, or keep running a fork if the vendor relationship ends. RxDB is Apache 2.0 with no field-of-use restriction, so all of that stays available to you.

### Pricing Grows With the Fleet

Ditto Cloud is metered. The free tier is **10 cloud device connections, 2 GB of storage, and 5 GB of data transfer with no SLA**. Pro includes **1,000 connections, 50 GB of storage, and 250 GB of transfer** with a 99% uptime SLA and business-hours support, and charges overage per additional 1,000 connections, per 50 GB of storage, and per 50 GB of transfer. Enterprise is custom with a 99.95% SLA (ditto.com pricing page, checked September 8, 2026).

For a fixed fleet of a few hundred devices this is predictable. For a consumer app with a large user base it means cost grows with every device that connects. RxDB has no per-device metering, because the replication endpoint is your own server.

### The Backend Is Ditto

Ditto syncs into Ditto Cloud, with a MongoDB connector on the Pro tier and above. RxDB replicates with whatever you already run, over [HTTP](../../replication-http.md), [GraphQL](../../replication-graphql.md), [WebSocket](../../replication-websocket.md), [CouchDB](../../replication-couchdb.md), [Firestore](../../replication-firestore.md), or a custom transport. The protocol needs a pull handler, a push handler, and an optional event stream. Everything else is yours.

### Queries Are a Second Language

Ditto queries are written in DQL, a SQL-like language embedded in strings. RxDB queries are plain JavaScript objects, checked against the schema, and composable at runtime:

```ts
const query = db.reports.find({
    selector: {
        status: 'open',
        priority: { $gt: 2 }
    },
    sort: [{ updatedAt: 'desc' }]
});

// The query is observable. It re-emits on every matching change.
query.$.subscribe(reports => {
    console.log('open reports: ' + reports.length);
});
```

## Why RxDB Works Well as a Ditto Alternative

### Storage Is a Configuration Choice

RxDB does not persist data itself. The same application code runs on [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [Dexie](../../rx-storage-dexie.md), [SQLite](../../rx-storage-sqlite.md), or [memory](../../rx-storage-memory.md). Switching storages is a configuration change, not a rewrite.

### Conflicts Are Resolved Where You Can See Them

When two clients write the same document while both are offline, the first push wins and the second is rejected. RxDB then calls the [conflict handler](../../transactions-conflicts-revisions.md) of that collection on the losing client. You write that function, so the merge rule is code in your repository. The [CRDT plugin](../../crdt.md) merges field by field when you want automatic convergence instead.

### Multi-Tab Is Built In

Web apps run in several tabs at once. RxDB shares one local state across all tabs of an origin, and [leader election](../../leader-election.md) makes sure the replication runs in exactly one of them, so one device means one sync stream.

### Encryption at Rest on Any Storage

The [encryption plugins](../../encryption.md) encrypt marked fields on top of whatever storage you picked. Encrypted fields cannot be used inside of query selectors, so keep the fields you query against unencrypted.

## Code Sample: Replication With Your Own Backend

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { replicateRxCollection } from 'rxdb/plugins/replication';

const db = await createRxDatabase({
    name: 'fielddb',
    storage: getRxStorageDexie()
});

await db.addCollections({
    reports: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                title: { type: 'string' },
                status: { type: 'string' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'title', 'status', 'updatedAt']
        }
    }
});

const replicationState = await replicateRxCollection({
    collection: db.reports,
    replicationIdentifier: 'reports-sync-to-https://example.com/api/sync',
    live: true,
    pull: {
        batchSize: 25,
        async handler(checkpointOrNull, batchSize) {
            const updatedAt = checkpointOrNull ? checkpointOrNull.updatedAt : 0;
            const url = 'https://example.com/api/sync'
                + `?updatedAt=${updatedAt}&limit=${batchSize}`;
            const response = await fetch(url);
            const data = await response.json();
            return { documents: data.documents, checkpoint: data.checkpoint };
        }
    },
    push: {
        batchSize: 25,
        async handler(changeRows) {
            const response = await fetch('https://example.com/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changeRows)
            });
            // Return conflicts so RxDB can resolve them on the client.
            return await response.json();
        }
    }
});
```

## When Ditto Still Makes Sense

Ditto is the better tool when:

- Devices have to sync **without any server and without any internet**, discovering each other over Bluetooth LE or peer-to-peer WiFi. RxDB has nothing equivalent. The [WebRTC replication](../../replication-webrtc.md) plugin is peer-to-peer over standard web transports and still needs a signaling server.
- The clients are **native** Swift, Kotlin, C#, C++, or Rust applications, and a JavaScript runtime is not acceptable.
- You want a **managed cloud sync service with a 24x7 SLA** and a vendor to call, rather than running the sync endpoint yourself.
- The fleet is a **fixed, known number of enterprise devices**, so per-connection pricing stays predictable.

If instead your client is a browser or a JavaScript runtime, you want to keep the backend you already have, or you need the source of the database you ship, RxDB fits better.

## FAQ

<Faq>
<FaqItem question="Does Ditto mesh networking work in a web browser?">

No. The Ditto documentation states that web browsers do not support the peer-to-peer transports and that the Web SDK can only connect to Ditto Server over [WebSockets](https://docs.ditto.live/key-concepts/mesh-networking). Bluetooth LE, LAN, and peer-to-peer WiFi are native-SDK capabilities. For a browser client the connection shape is the same as [RxDB WebSocket replication](../../replication-websocket.md).

</FaqItem>
<FaqItem question="Is Ditto open source?">

No. Ditto does not publish the source of its sync engine, and the SDKs ship as compiled packages under a commercial agreement. **[RxDB](../../rx-database.md)** core is Apache 2.0 on [GitHub](/code/), so you can read the storage and replication code, fork it, and keep using it without a vendor relationship. Some RxDB plugins are [👑 premium](/premium/) and closed, but the database and the [Sync Engine](../../replication.md) are not.

</FaqItem>
<FaqItem question="How much does Ditto cost compared to RxDB?">

Ditto Cloud is metered per device connection, storage, and data transfer. The free tier covers 10 cloud device connections and 2 GB of storage, Pro includes 1,000 connections and 50 GB with overage charges above that, and Enterprise is custom (ditto.com, checked September 8, 2026). RxDB core is free under Apache 2.0 with no per-device metering, and the paid part is an optional [premium plugin](/premium/) license that does not scale with the number of users.

</FaqItem>
<FaqItem question="Can RxDB sync between devices without a server?">

Partly. The [WebRTC replication](../../replication-webrtc.md) plugin replicates directly between peers, but the peers still find each other through a signaling server. RxDB has no Bluetooth LE, peer-to-peer WiFi, or MANET transport, so a fully infrastructure-free mesh is out of scope and Ditto covers that case better.

</FaqItem>
<FaqItem question="What database should I use for disconnected or DDIL environments?">

It depends on the client. For JavaScript and browser clients that sync with a backend you control, use **[RxDB](../ddil-database.md)**, which keeps the working set local, resumes replication from a checkpoint after a dropped link, and runs over any transport. For native device fleets that have to form an ad-hoc radio mesh with no server at all, Ditto is built for that specific case.

</FaqItem>
<FaqItem question="Does RxDB support Swift, Kotlin, or C++?">

No. RxDB targets JavaScript and TypeScript runtimes, which covers the browser, Node.js, Electron, Capacitor, and [React Native](../../react-native-database.md). Ditto ships native SDKs for Swift, Kotlin, C#, C++, and Rust, so a project that has to run inside a native app without a JavaScript layer is a better fit for Ditto.

</FaqItem>
</Faq>

## Comparison Table

| Feature | Ditto | RxDB |
| --- | --- | --- |
| License | Proprietary, compiled SDKs | Apache 2.0 core, optional [premium plugins](/premium/) |
| Source access | Sync engine not published | Full client and replication source on [GitHub](/code/) |
| Peer-to-peer mesh | ✅ Bluetooth LE, P2P WiFi, LAN on native SDKs | ❌ [WebRTC](../../replication-webrtc.md) only, needs signaling |
| Mesh in the browser | ❌ WebSockets to Ditto Server only | ❌ not offered |
| Client storage | Ditto engine | Pluggable: [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [Dexie](../../rx-storage-dexie.md), [SQLite](../../rx-storage-sqlite.md), memory |
| Query language | DQL, SQL-like strings | Mango (MongoDB-style) JSON queries |
| Backend | Ditto Cloud, MongoDB connector on Pro and above | Bring your own over [HTTP](../../replication-http.md), [GraphQL](../../replication-graphql.md), [WebSocket](../../replication-websocket.md), [CouchDB](../../replication-couchdb.md), [Firestore](../../replication-firestore.md) |
| Conflict resolution | Handled inside the closed engine | Per-collection [handler](../../transactions-conflicts-revisions.md) you write, or [CRDTs](../../crdt.md) |
| Pricing model | Per device connection, storage, and transfer | Free core, flat premium license, no per-device metering |
| Native SDKs | ✅ Swift, Kotlin, C#, C++, Rust | ❌ JavaScript and TypeScript runtimes only |
| npm downloads, last 30 days | 25,688 | 278,111 |

Both npm figures were read from the npm registry API on September 8, 2026.

## Follow Up

If your client is a browser or a JavaScript runtime, the mesh that makes Ditto special is not part of what you would be buying, and the rest of the comparison is about licensing, storage choice, and who owns the backend. Start with the [RxDB Quickstart](../../quickstart.md), read how the [Sync Engine](../../replication.md) works, and see the [DDIL database](../ddil-database.md) page for the disconnected-environment case in detail. If you do need a radio mesh across native devices, use Ditto.

More resources:

- [RxDB Sync Engine](../../replication.md)
- [Offline-First Database for DDIL Environments](../ddil-database.md)
- [WebRTC Replication](../../replication-webrtc.md)
- [RxStorage overview](../../rx-storage.md)
- [The Local-First Future](../local-first-future.md)
- [RxDB GitHub Repository](/code/)
