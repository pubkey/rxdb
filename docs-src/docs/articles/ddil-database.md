---
title: Offline-First Database for DDIL Environments - Sync Without a Network
slug: ddil-database.html
description: In DDIL environments the network is denied, disrupted, intermittent, or limited. Learn how an offline-first database like RxDB keeps your app usable.
image: /headers/ddil-database.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';

# Offline-First Database for DDIL Environments

So you have an application that has to keep working when the network does not. **DDIL** stands for **Denied, Disrupted, Intermittent, and Limited**, and it is the label that defense, maritime, aviation, mining, and emergency-response teams use for exactly this condition. An app built on request and response falls apart there, because every screen depends on a round trip that may never complete. [RxDB](https://rxdb.info/) is a [local-first](./local-first-future.md), NoSQL database for JavaScript applications that keeps the working data on the device and treats the network as an optional background process. This page explains what DDIL means, what a client database has to do to survive it, how the RxDB [Sync Engine](../replication.md) handles a link that keeps dying, and where RxDB is the wrong tool.

<RxdbLogo alt="DDIL database" />

## What DDIL Means

DDIL is an acronym for **Denied, Disrupted, Intermittent, and Limited**. The NIST Computer Security Resource Center lists it in its [glossary](https://csrc.nist.gov/glossary/term/ddil) with the source document NISTIR 8286D-upd1. The four letters are four different failure modes, and they break an application in four different ways:

- **Denied**: there is no link at all. Jamming, a radio-silence order, a basement, a mine shaft, or an air-gapped enclave that has no route to the internet by design.
- **Disrupted**: the link exists but drops in the middle of a transfer. A request that was accepted by the client is never confirmed by the server.
- **Intermittent**: connectivity comes in windows. A vehicle passes a relay, a ship comes into range, a technician walks back into WiFi coverage.
- **Limited**: the link works but is narrow or slow. A geostationary satellite link has a round trip time of roughly **600 ms** ([satsig.net](https://www.satsig.net/latency.htm)), and low-earth-orbit constellations measure roughly an order of magnitude lower ([arXiv large-scale Starlink measurement, 2024](https://arxiv.org/pdf/2412.18243)).

Most software is tested against exactly none of these. The development laptop has WiFi, the staging server is one hop away, and the failure path is a spinner and a retry button.

## Why Request and Response Falls Short

Take a screen that loads eight resources in sequence over a geostationary link. At 600 ms per round trip that is **4.8 seconds** before anything is on screen, and that is the case where nothing fails. When the link is disrupted instead of limited, the retry does not help, because the connection is gone and the retry queue grows. When the link is denied, there is nothing to retry against at all.

The usual mitigations do not survive DDIL either. A cache holds a subset of previous server responses and still treats the server as the source of truth, so writes fail. A service worker can serve assets offline but does not give you a queryable database or a merge strategy. A retry wrapper turns a fast failure into a slow one.

The network is not a detail of the architecture. It is the architecture.

## What a DDIL-Capable Client Has to Do

Working in DDIL is a set of concrete requirements, not a feature flag:

1. **Keep the working set on the device.** Reads must not depend on a link, so the relevant data has to be stored locally in something like [IndexedDB](../rx-storage-indexeddb.md), [OPFS](../rx-storage-opfs.md), or [SQLite](../rx-storage-sqlite.md).
2. **Accept writes while offline.** The write has to succeed locally and be durable, so that a user can keep working through a full outage.
3. **Resume instead of restart.** When a transfer dies at 80%, the next attempt has to continue from a checkpoint. Re-downloading the whole dataset on every reconnect is what kills a limited link.
4. **Transfer in small batches.** A narrow uplink cannot take one large payload. It can take many small ones.
5. **Resolve conflicts deterministically.** Two people edit the same record during the same outage. Both writes are valid, and the merge has to be a rule, not a surprise.
6. **Encrypt data at rest.** A device in the field gets lost, and the local copy is a full copy.
7. **Install and run without the public internet.** In an air-gapped deployment the package has to come from an internal registry, not from a public one at build time.

## How RxDB Handles DDIL

### 1. The Local Database Is the Source of Truth

RxDB stores documents on the client and answers every read and write against that local copy. Reads return in under a millisecond, and a write is durable as soon as it is stored, without asking a server first. This is the [offline-first](../offline-first.md) model, and in a denied environment it is the difference between a usable app and an error page.

### 2. Replication Resumes From a Checkpoint

The RxDB [Sync Engine](../replication.md) is checkpoint-based. The client remembers the last position it successfully pulled, and after a reconnect it asks for the changes since that checkpoint instead of the whole collection. When a batch fails, the checkpoint does not move, so the next attempt repeats one batch and not the entire history. Failed requests are retried after `retryTime`, and RxDB skips the wait when it detects an offline to online switch through `navigator.onLine`.

### 3. Any Transport, Because the Protocol Needs Only Three Things

The [replication protocol](../replication.md) does not care what carries the bytes. It needs a pull handler that returns documents changed after a checkpoint, a push handler that accepts client writes, and an optional event stream for live changes. Everything else is yours. That means it runs over [HTTP](../replication-http.md), [GraphQL](../replication-graphql.md), [WebSockets](../replication-websocket.md), a message queue, or a custom link that a normal web app has never seen, as long as you can implement two functions on top of it.

### 4. Conflicts Are Resolved on the Client

When two clients write the same document during the same outage, the first push wins and the second is rejected. RxDB then calls the [conflict handler](../transactions-conflicts-revisions.md#custom-conflict-handler) of the collection on the losing client, which produces a merged state that is pushed again. The default handler lets the server state win. For field-by-field merging without a central decision you can use the [CRDT plugin](../crdt.md).

### 5. Encryption at Rest

The [encryption plugins](../encryption.md) encrypt marked fields on top of any storage, so the data on a lost device is not readable without the password. Keep in mind that encrypted fields cannot be used inside of query selectors, so fields you have to query against have to stay unencrypted.

### 6. One Syncing Tab per Device

When the app runs in multiple browser tabs, [leader election](../leader-election.md) makes sure that the replication runs in exactly one of them. On a limited link this matters more than it does on broadband, because four tabs syncing in parallel means four times the traffic over the same narrow uplink.

### 7. The Storage Is a Configuration Choice

RxDB itself does not persist data. It runs on a swappable [RxStorage](../rx-storage.md) layer, so the same application code runs on [IndexedDB](../rx-storage-indexeddb.md) in a browser, on [SQLite](../rx-storage-sqlite.md) in a [React Native](../react-native-database.md) or [Electron](../electron-database.md) build, and in [memory](../rx-storage-memory.md) for tests. Switching storages is a configuration change, not a rewrite.

## Code Sample: A Client That Survives a Dying Link

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

// This write succeeds with no network at all.
await db.reports.insert({
    id: 'report-1',
    title: 'Sensor 4 offline',
    status: 'open',
    updatedAt: Date.now()
});

// Reactive query: emits a new array whenever a matching doc changes,
// no matter if the change came from this device or from a later sync.
db.reports.find({
    selector: { status: 'open' }
}).$.subscribe(reports => {
    console.log('open reports: ' + reports.length);
});

const replicationState = await replicateRxCollection({
    collection: db.reports,
    replicationIdentifier: 'reports-sync-to-https://example.com/api/sync',
    live: true,
    /**
     * Retry a failed request after 30 seconds instead of the 5 second default.
     * On a narrow link, hammering a dead endpoint costs bandwidth you need.
     */
    retryTime: 30 * 1000,
    /**
     * Only the leading tab replicates, so one device means one uplink stream.
     * [default=true]
     */
    waitForLeadership: true,
    pull: {
        /**
         * Small batches so a dropped transfer loses one batch, not the sync.
         */
        batchSize: 25,
        async handler(checkpointOrNull, batchSize) {
            const updatedAt = checkpointOrNull ? checkpointOrNull.updatedAt : 0;
            const response = await fetch(
                `https://example.com/api/sync?updatedAt=${updatedAt}&limit=${batchSize}`
            );
            const data = await response.json();
            return {
                documents: data.documents,
                checkpoint: data.checkpoint
            };
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
            // Return the conflicting documents so RxDB can resolve them locally.
            return await response.json();
        }
    }
});

// Errors are events, not crashes. The app keeps running while the link is down.
replicationState.error$.subscribe(err => {
    console.log('replication error, will retry: ' + err.message);
});
```

The application code above does not change when the network does. The insert and the query behave the same at a desk and in a tunnel, and the only thing the outage changes is when the data reaches the server.

## Where RxDB Falls Short in DDIL

RxDB is not the right answer for every DDIL problem, and the limits are worth stating before you build on it:

- **There is no radio mesh.** RxDB replicates between a client and an endpoint you provide. It does not form ad-hoc peer-to-peer networks over Bluetooth LE, peer-to-peer WiFi, or MANET radios. The [WebRTC replication](../replication-webrtc.md) plugin does peer-to-peer over standard web transports and still needs a signaling server to introduce the peers. When devices have to find each other with no infrastructure at all, look at [Ditto](./alternatives/ditto-alternative.md), which does that with native SDKs.
- **JavaScript runtimes only.** RxDB runs in browsers, Node.js, Electron, React Native, Capacitor, Deno, and Bun. It is not a Swift, Kotlin, C++, or Rust library.
- **It is not a realtime processing engine.** RxDB is the store and sync layer behind an operator interface. Sensor fusion and hard realtime pipelines belong somewhere else.
- **The working set has to fit on the device.** RxDB syncs the subset you select, so plan the selection. A client cannot hold an unbounded dataset, and [IndexedDB storage limits](./indexeddb-max-storage-limit.md) are real.

## FAQ

<Faq>
<FaqItem question="What does DDIL stand for?">

DDIL stands for **Denied, Disrupted, Intermittent, and Limited**. It describes network conditions where connectivity is unavailable, drops mid-transfer, comes only in windows, or is too narrow and slow to carry normal traffic. The term is listed in the [NIST CSRC glossary](https://csrc.nist.gov/glossary/term/ddil) and is used across defense, maritime, aviation, mining, and emergency-response software.

</FaqItem>
<FaqItem question="What database should I use for a disconnected or offline environment?">

Use a client-side database that stores the working set locally and syncs in the background, instead of a client that queries a remote server per interaction. **[RxDB](../rx-database.md)** does this for JavaScript applications with observable queries, [pluggable storage](../rx-storage.md), and a transport-agnostic [Sync Engine](../replication.md). For native mobile stacks without a JavaScript layer, an embedded database with its own sync layer is the better fit.

</FaqItem>
<FaqItem question="What happens when the network drops in the middle of a sync?">

The replication stops at the last successful checkpoint and retries later. Because the RxDB [Sync Engine](../replication.md) pulls in batches and only advances the checkpoint after a batch succeeds, a dropped transfer costs one batch and not the whole dataset. Failed requests are retried after the configured `retryTime`, and the wait is skipped when an offline to online switch is detected.

</FaqItem>
<FaqItem question="Can RxDB sync directly between devices without a server?">

Partly. The [WebRTC replication](../replication-webrtc.md) plugin replicates between peers over WebRTC, but the peers still have to find each other through a signaling server first. RxDB has no Bluetooth LE, peer-to-peer WiFi, or MANET transport, so a fully infrastructure-free mesh is out of scope. See the [Ditto alternative](./alternatives/ditto-alternative.md) page for a comparison with a product that is built around that.

</FaqItem>
<FaqItem question="Can RxDB be installed and run in an air-gapped network?">

Yes. The RxDB core is published on npm under the Apache 2.0 license, so it can be mirrored into an internal registry and installed with no route to the public internet. At runtime the [replication](../replication.md) only talks to the pull and push handlers you write, which means the database contacts exactly the endpoints your own code contacts and nothing else.

</FaqItem>
<FaqItem question="How do you handle two people editing the same record while both are offline?">

The first write that reaches the server wins, and the second client gets its push rejected. RxDB then runs the [conflict handler](../transactions-conflicts-revisions.md) of that collection on the losing client to build a merged document, which is pushed again. The default resolution lets the server state win, and the [CRDT plugin](../crdt.md) merges field by field when you need both changes kept.

</FaqItem>
</Faq>

## Follow Up

- Start with the [RxDB Quickstart](../quickstart.md) and build the local part first.
- Read how the [Sync Engine](../replication.md) replicates with any backend, and what an [offline database](./offline-database.md) changes about your architecture.
- Learn where [offline-first](../offline-first.md) helps and where it has [downsides](../downsides-of-offline-first.md).
- Compare with [Ditto](./alternatives/ditto-alternative.md) when you need a device-to-device radio mesh.
- Ask questions in the [RxDB Chat](/chat/) and leave a star ⭐ on [GitHub](/code/).
