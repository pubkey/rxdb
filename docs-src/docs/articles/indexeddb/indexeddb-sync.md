---
title: IndexedDB Sync - Replicate Browser Data Across Tabs, Devices and Servers
slug: indexeddb-sync.html
description: Learn how to sync IndexedDB across browser tabs, devices, and a backend server. Compare sync approaches and see how RxDB adds realtime replication.
image: /headers/indexeddb-sync.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';

# IndexedDB Sync

[IndexedDB](../../rx-storage-indexeddb.md) stores structured data inside a single browser, on a single device, in a single origin. That is the whole design. It has no concept of syncing that data to another tab, another device, or a backend server. As soon as your app needs the same data in more than one place, you have to build **IndexedDB sync** yourself, or use a library that ships it.

This page explains what IndexedDB sync means, why the native API gives you nothing for it, the different levels of sync you might need, and how [RxDB](https://rxdb.info/) adds realtime replication on top of IndexedDB.

<RxdbLogo alt="IndexedDB Sync" />

## What IndexedDB Sync Means

"Sync" is used for three different problems, and it helps to keep them apart:

- **Multi-tab sync**: Two browser tabs of the same origin each open the same IndexedDB database. A write in one tab must become visible in the other tab.
- **Client-server sync**: The browser holds a local copy in IndexedDB and a backend server holds the source of truth. Changes flow both ways so the client works [offline](../../offline-first.md) and catches up when it reconnects.
- **Peer-to-peer sync**: Two or more clients exchange changes directly, without a central server, over [WebRTC](../../replication-webrtc.md) or a relay.

Native IndexedDB solves none of these. It only stores and reads data in one place.

## Why Raw IndexedDB Has No Sync

IndexedDB was designed as a low-level storage building block, not a database engine. It gives you object stores, indexes, and transactions. It does not give you:

- **Change events across tabs**: There is no built-in event when another tab writes to the store. You have to broadcast changes yourself.
- **A network layer**: IndexedDB never talks to a server. It has no push, no pull, no protocol.
- **Change tracking**: There is no log of what changed since the last sync. To replicate you need to know which documents are new or updated, and raw IndexedDB does not record that.
- **Conflict handling**: When the same document is edited in two places while offline, something has to decide the winner. IndexedDB has no notion of document revisions.

So syncing IndexedDB is not a small helper on top of the API. You end up rebuilding change feeds, a revision system, and a replication protocol. That is a database.

## Multi-Tab Sync

The first level of sync happens inside one browser. When a user opens your app in two tabs, both tabs read and write the same IndexedDB database, and a write in one tab should update the UI in the other.

The browser primitive for this is the `BroadcastChannel` API, which sends messages between tabs of the same origin. You can send a message on every write and have other tabs re-read the changed data. Doing this by hand is error-prone, because you also have to avoid running the same background work in every tab at once.

RxDB handles this out of the box. With `multiInstance: true`, writes in one tab are visible to [reactive queries](../../reactivity.md) in every other tab, change events propagate over a `BroadcastChannel`, and [leader election](../../leader-election.md) picks a single tab to run the server replication so you do not open one connection per tab.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

const db = await createRxDatabase({
  name: 'mydb',
  storage: getRxStorageIndexedDB(),
  // Coordinate the same database across all tabs of this origin.
  multiInstance: true
});
```

## Client-Server Sync

The second level is syncing the browser's IndexedDB copy with a backend. This is what most people mean by "IndexedDB sync". The client keeps working on the local database, and a replication process moves changes to and from the server.

To do this correctly you need three things that raw IndexedDB lacks:

1. **A checkpoint**: a marker of the last successfully synced state, so a reconnect only sends what changed since then instead of everything.
2. **Change detection**: a way to list documents modified since that checkpoint. RxDB stores an internal `_meta` field and revision on every document for exactly this.
3. **Conflict handling**: a rule for when the same document was changed on both sides. RxDB uses per-document revisions and a [conflict handler](../../transactions-conflicts-revisions.md) you can customize.

RxDB packages this into its [Sync Engine](../../replication.md). The backend does not have to run RxDB. You can replicate against any infrastructure through the general [replication protocol](../../replication.md) or one of the ready-made plugins:

- [GraphQL replication](../../replication-graphql.md) against a GraphQL endpoint
- [HTTP replication](../../replication-http.md) against a plain REST server on top of PostgreSQL or MongoDB
- [CouchDB](../../replication-couchdb.md), [Firestore](../../replication-firestore.md), [Supabase](../../replication-supabase.md), [NATS](../../replication-nats.md), [WebSocket](../../replication-websocket.md), and more

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
  collection: db.todos,
  replicationIdentifier: 'my-todos-http-replication',
  pull: {
    async handler(checkpointOrNull, batchSize) {
      // Ask the server for documents changed since the last checkpoint.
      const response = await fetch(`/api/pull?since=${/* checkpoint */ ''}`);
      const data = await response.json();
      return { documents: data.documents, checkpoint: data.checkpoint };
    }
  },
  push: {
    async handler(changeRows) {
      // Send local writes to the server and return conflicts, if any.
      const response = await fetch('/api/push', {
        method: 'POST',
        body: JSON.stringify(changeRows)
      });
      return response.json();
    }
  }
});
```

Because the replication runs on top of the local database, reads and writes stay [zero-latency](../zero-latency-local-first.md). The user never waits for the network. The sync happens in the background and continues where it left off after the client goes offline and back online.

## Peer-to-Peer Sync

The third level skips the central server. Clients exchange changes directly with each other. RxDB supports this with [WebRTC replication](../../replication-webrtc.md), where peers connect through a signaling server and then sync documents directly. This suits collaborative apps where a backend is optional or where devices on the same network should sync without the cloud.

## Sync Approaches Compared

There are a few ways to get sync onto IndexedDB. They differ in how much they hand you.

- **Do it yourself**: Use raw IndexedDB or a thin wrapper like [Dexie.js](./best-indexeddb-wrapper.md) and write the change tracking, checkpoint, and protocol by hand. Full control, but you are building and maintaining a replication engine.
- **A syncing document store**: [PouchDB](../alternatives/pouchdb-alternative.md) syncs IndexedDB with CouchDB. It works well but ties you to the CouchDB protocol and its revision-tree overhead grows the on-disk size.
- **RxDB**: A local-first database that uses IndexedDB (or faster storages) and ships multi-tab, client-server, and peer-to-peer sync with pluggable backends.

## Feature Comparison

| Sync capability | Raw IndexedDB | Dexie.js | PouchDB | RxDB |
| --- | --- | --- | --- | --- |
| Multi-tab change events | ❌ | ⚠️ manual | ⚠️ manual | ✅ built in |
| Leader election across tabs | ❌ | ❌ | ❌ | ✅ built in |
| Client-server replication | ❌ | ⚠️ paid add-on | ✅ CouchDB only | ✅ many backends |
| Offline then catch up | ❌ | ❌ | ✅ | ✅ |
| Change tracking / checkpoints | ❌ | ❌ | ✅ | ✅ |
| Conflict handling | ❌ | ❌ | ✅ revision tree | ✅ revisions + custom handler |
| Peer-to-peer sync | ❌ | ❌ | ⚠️ via CouchDB | ✅ WebRTC |
| Backend requirement | none | none | CouchDB | any (GraphQL, HTTP, more) |

## FAQ

<Faq>
<FaqItem question="Can IndexedDB sync across devices on its own?">

No. IndexedDB is scoped to one browser on one device and has no network layer. To sync across devices you need a replication process that moves changes through a server or a peer connection. RxDB provides this with its **[Sync Engine](../../replication.md)**.

</FaqItem>
<FaqItem question="How do I sync IndexedDB between browser tabs?">

Use the `BroadcastChannel` API to notify other tabs of writes, or let a database handle it. With RxDB and `multiInstance: true`, writes in one tab reach [reactive queries](../../reactivity.md) in every other tab automatically, and [leader election](../../leader-election.md) keeps a single tab responsible for the server connection.

</FaqItem>
<FaqItem question="Does IndexedDB sync work offline?">

Yes, when the database tracks changes. The client reads and writes to the local IndexedDB copy while offline, and the replication sends the queued changes once the connection returns. This is the core of the [offline-first](../../offline-first.md) approach that RxDB is built for.

</FaqItem>
<FaqItem question="What happens on a conflict when two devices edit the same document?">

The sync layer needs per-document revisions to detect that both sides changed. RxDB attaches a revision to every document and runs a [conflict handler](../../transactions-conflicts-revisions.md) that you can customize, so you decide whether the local write, the remote write, or a merge wins.

</FaqItem>
<FaqItem question="Do I need a special backend for IndexedDB sync?">

No. RxDB replicates against any infrastructure. There are plugins for [GraphQL](../../replication-graphql.md), plain [HTTP](../../replication-http.md), [CouchDB](../../replication-couchdb.md), [Firestore](../../replication-firestore.md), [Supabase](../../replication-supabase.md), and others, and you can implement the [replication protocol](../../replication.md) against your own server.

</FaqItem>
</Faq>

## Follow Up

- Read how the [RxDB Sync Engine](../../replication.md) works
- Start with the [RxDB Quickstart](../../quickstart.md)
- Learn about [offline-first](../../offline-first.md) apps and [zero-latency](../zero-latency-local-first.md) interactions
- Compare the [best IndexedDB wrappers](./best-indexeddb-wrapper.md)
- Check the [RxDB code on GitHub](/code/) and leave a star ⭐
