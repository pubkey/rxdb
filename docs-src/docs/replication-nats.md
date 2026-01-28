---
title: RxDB & NATS - Realtime Sync
slug: replication-nats.html
description: Seamlessly sync your RxDB data with NATS for real-time, two-way replication. Handle conflicts, errors, and retries with ease.
---

import {Steps} from '@site/src/components/steps';

# Replication with NATS

With this RxDB plugin you can run a two-way realtime replication with a [NATS](https://nats.io/) server.

The replication itself uses the [RxDB Sync Engine](./replication.md) which handles conflicts, errors and retries.
On the client side the official [NATS npm package](https://www.npmjs.com/package/nats) is used to connect to the NATS server.

NATS is a messaging system that by itself does not have a validation or granulary access control build in.
Therefore it is not recommended to directly replicate the NATS server with an untrusted RxDB client application. Instead you should replicated from NATS to your Node.js server side RxDB database.

## Precondition

For the replication endpoint the NATS cluster must have enabled [JetStream](https://docs.nats.io/nats-concepts/jetstream) and store all message data as [structured JSON](https://docs.nats.io/using-nats/developer/sending/structure).

The easiest way to start a compatible NATS server is to use the official docker image:

```docker run --rm --name rxdb-nats -p 4222:4222 nats:2.9.17 -js```



## Usage

<Steps>

### Install the nats package

```bash
npm install nats --save
```

### Start the Replication

To start the replication, import the `replicateNats()` method from the RxDB plugin and call it with the collection
that must be replicated.
The replication runs *per [RxCollection](./rx-collection.md)*, you can replicate multiple RxCollections by starting a new replication for each of them.

```typescript
import {
    replicateNats
} from 'rxdb/plugins/replication-nats';

const replicationState = replicateNats({
    collection: myRxCollection,
    replicationIdentifier: 'my-nats-replication-collection-A',
    // in NATS, each stream need a name
    streamName: 'stream-for-replication-A',
    /**
     * The subject prefix determines how the documents are stored in NATS.
     * For example the document with id 'alice'
     * will have the subject 'foobar.alice'
     */
    subjectPrefix: 'foobar',
    connection: { servers: 'localhost:4222' },
    live: true,
    pull: {
        batchSize: 30
    },
    push: {
        batchSize: 30
    }
});
```

</Steps>


## Handling deletes

RxDB requires you to never [fully delete documents](./replication.md#data-layout-on-the-server). This is needed to be able to replicate the deletion state of a document to other instances. The NATS replication will set a boolean `_deleted` field to all documents to indicate the deletion state. You can change this by setting a different `deletedField` in the sync options.
