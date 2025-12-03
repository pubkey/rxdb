---
title: ⚙️ RxDB realtime Sync Engine for Local-First Apps
slug: replication.html
description: Replicate data in real-time with RxDB's offline-first Sync Engine. Learn about efficient syncing, conflict resolution, and advanced multi-tab support.
---

# RxDB's realtime Sync Engine for Local-First Apps

The RxDB Sync Engine provides the ability to sync the database state in **realtime** between the clients and the server.

The backend server does not have to be a RxDB instance; you can build a replication with **any infrastructure**.
For example you can replicate with a [custom GraphQL endpoint](./replication-graphql.md) or a [HTTP server](./replication-http.md) on top of a PostgreSQL or MongoDB database.

The replication is made to support the [Local-First](./articles/local-first-future.md) paradigm, so that when the client goes [offline](./offline-first.md), the RxDB [database](./rx-database.md) can still read and write [locally](./articles/local-database.md) and will continue the replication when the client goes online again.


## Design Decisions of the Sync Engine

In contrast to other (server-side) database replication protocols, the RxDB Sync Engine was designed with these goals in mind:

- **Easy to Understand**: The sync engine works in a simple "git-like" way that is easy to understand for an average developer. You only have to understand how three simple endpoints work.
- **Complex Parts are in RxDB, not in the Backend**: The complex parts of the Sync Engine, like [conflict handling](./transactions-conflicts-revisions.md) or offline-online switches, are implemented inside of RxDB itself. This makes creating a compatible backend very easy.
- **Compatible with any Backend**: Because the complex parts are in RxDB, the backend can be "dump" which makes the protocol compatible to almost every backend. No matter if you use PostgreSQL, MongoDB or anything else.
- **Performance is optimized for Client Devices and Browsers**: By grouping updates and fetches into batches, it is faster to transfer and easier to compress. Client devices and browsers can also process this data faster, for example running `JSON.parse()` on a chunk of data is faster than calling it once per row. Same goes for how client side storage like [IndexedDB](./rx-storage-indexeddb.md) or [OPFS](./rx-storage-opfs.md) works where writing data in bulks is faster.
- **Offline-First Support**: By incorporating conflict handling at the client side, the protocol fully supports [offline-first apps](./offline-first.md). Users can continue making changes while offline, and those updates will sync seamlessly once a connection is reestablished - all without risking data loss or having undefined behavior.
- **Multi-Tab Support**: When RxDB is used in a browser and multiple tabs of the same application are opened, only exactly one runs the replication at any given time. This reduces client- and backend resources.


## The Sync Engine on the document level

On the RxDocument level, the replication works like git, where the fork/client contains all new writes and must be merged with the master/server before it can push its new state to the master/server.

```
A---B-----------D   master/server state
     \         /
      B---C---D     fork/client state
```

- The client pulls the latest state `B` from the master.
- The client does some changes `C+D`.
- The client pushes these changes to the master by sending the latest known master state `B` and the new client state `D` of the document.
- If the master state is equal to the latest master `B` state of the client, the new client state `D` is set as the latest master state.
- If the master also had changes and so the latest master change is different then the one that the client assumes, we have a conflict that has to be resolved on the client.



## The Sync Engine on the transfer level

When document states are transferred, all handlers use batches of documents for better performance.
The server **must** implement the following methods to be compatible with the replication:

- **pullHandler** Get the last checkpoint (or null) as input. Returns all documents that have been written **after** the given checkpoint. Also returns the checkpoint of the latest written returned document.
- **pushHandler** a method that can be called by the client to send client side writes to the master. It gets an array with the `assumedMasterState` and the `newForkState` of each document write as input. It must return an array that contains the master document states of all conflicts. If there are no conflicts, it must return an empty array.
- **pullStream** an observable that emits batches of all master writes and the latest checkpoint of the write batches.


```
        +--------+                             +--------+ 
        |        | pullHandler()               |        |
        |        |--------------------->       |        | 
        |        |                             |        | 
        |        |                             |        |
        | Client | pushHandler()               | Server |
        |        |--------------------->       |        | 
        |        |                             |        |
        |        |   pullStream$               |        | 
        |        |   <-------------------------|        | 
        +--------+                             +--------+
```



The replication runs in two **different modes**:

### Checkpoint iteration

On first initial replication, or when the client comes online again, a checkpoint based iteration is used to catch up with the server state.
A checkpoint is a subset of the fields of the last pulled document. When the checkpoint is send to the backend via `pullHandler()`, the backend must be able to respond with all documents that have been written **after** the given checkpoint.
For example if your documents contain an `id` and an `updatedAt` field, these two can be used as checkpoint.

When the checkpoint iteration reaches the last checkpoint, where the backend returns an empty array because there are no newer documents, the replication will automatically switch to the `event observation` mode.

### Event observation

While the client is connected to the backend, the events from the backend are observed via `pullStream$` and persisted to the client.

If your backend for any reason is not able to provide a full `pullStream$` that contains all events and the checkpoint, you can instead only emit `RESYNC` events that tell RxDB that anything unknown has changed on the server and it should run the pull replication via [checkpoint iteration](#checkpoint-iteration).

When the client goes offline and online again, it might happen that the `pullStream$` has missed out some events. Therefore the `pullStream$` should also emit a `RESYNC` event each time the client reconnects, so that the client can become in sync with the backend via the [checkpoint iteration](#checkpoint-iteration) mode.

## Data layout on the server

To use the replication you first have to ensure that:
- **documents are deterministic sortable by their last write time**

  *deterministic* means that even if two documents have the same *last write time*, they have a predictable sort order.
    This is most often ensured by using the *primaryKey* as second sort parameter as part of the checkpoint.

- **documents are never deleted, instead the `_deleted` field is set to `true`.**

  This is needed so that the deletion state of a document exists in the database and can be replicated with other instances. If your backend uses a different field to mark deleted documents, you have to transform the data in the push/pull handlers or with the modifiers.


For example if your documents look like this:

```ts
const docData = {
    "id": "foobar",
    "name": "Alice",
    "lastName": "Wilson",
    /**
     * Contains the last write timestamp
     * so all documents writes can be sorted by that value
     * when they are fetched from the remote instance.
     */
    "updatedAt": 1564483474,
    /**
     * Instead of physically deleting documents,
     * a deleted document gets replicated.
     */
    "_deleted": false
}
```

Then your data is always sortable by `updatedAt`. This ensures that when RxDB fetches 'new' changes via `pullHandler()`, it can send the latest `updatedAt+id` checkpoint to the remote endpoint and then receive all newer documents.

By default, the field is `_deleted`. If your remote endpoint uses a different field to mark deleted documents, you can set the `deletedField` in the replication options which will automatically map the field on all pull and push requests.

## Conflict handling


When multiple clients (or the server) modify the same document at the same time (or when they are offline), it can happen that a conflict arises during the replication.

```
A---B1---C1---X    master/server state
     \       /
      B1---C2      fork/client state
```

In the case above, the client would tell the master to move the document state from `B1` to `C2` by calling `pushHandler()`. But because the actual master state is `C1` and not `B1`, the master would reject the write by sending back the actual master state `C1`. 
**RxDB resolves all conflicts on the client** so it would call the conflict handler of the `RxCollection` and create a new document state `D` that can then be written to the master.

```
A---B1---C1---X---D    master/server state
     \       / \ /
      B1---C2---D      fork/client state
```

The default conflict handler will always drop the fork state and use the master state. This ensures that clients that are offline for a very long time, do not accidentally overwrite other peoples changes when they go online again.
You can specify a custom conflict handler by setting the property `conflictHandler` when calling `addCollection()`.

Learn how to create a [custom conflict handler](./transactions-conflicts-revisions.md#custom-conflict-handler).


## replicateRxCollection()

You can start the replication of a single `RxCollection` by calling `replicateRxCollection()` like in the following:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';
import {
    lastOfArray
} from 'rxdb';
const replicationState = await replicateRxCollection({
    collection: myRxCollection,
    /**
     * An id for the replication to identify it
     * and so that RxDB is able to resume the replication on app reload.
     * If you replicate with a remote server, it is recommended to put the
     * server url into the replicationIdentifier.
     */
    replicationIdentifier: 'my-rest-replication-to-https://example.com/api/sync',
    /**
     * By default it will do an ongoing realtime replication.
     * By settings live: false the replication will run once until the local state
     * is in sync with the remote state, then it will cancel itself.
     * (optional), default is true.
     */
    live: true,
    /**
     * Time in milliseconds after when a failed backend request
     * has to be retried.
     * This time will be skipped if a offline->online switch is detected
     * via navigator.onLine
     * (optional), default is 5 seconds.
     */
    retryTime: 5 * 1000,
    /**
     * When multiInstance is true, like when you use RxDB in multiple browser tabs,
     * the replication should always run in only one of the open browser tabs.
     * If waitForLeadership is true, it will wait until the current instance is leader.
     * If waitForLeadership is false, it will start replicating, even if it is not leader.
     * [default=true]
     */
    waitForLeadership: true,
    /**
     * If this is set to false,
     * the replication will not start automatically
     * but will wait for replicationState.start() being called.
     * (optional), default is true
     */
    autoStart: true,

    /**
     * Custom deleted field, the boolean property of the document data that
     * marks a document as being deleted.
     * If your backend uses a different fieldname then '_deleted', set the fieldname here.
     * RxDB will still store the documents internally with '_deleted', setting this field
     * only maps the data on the data layer.
     * 
     * If a custom deleted field contains a non-boolean value, the deleted state
     * of the documents depends on if the value is truthy or not. So instead of providing a boolean * * deleted value, you could also work with using a 'deletedAt' timestamp instead.
     * 
     * [default='_deleted']
     */
    deletedField: 'deleted',

    /**
     * Optional,
     * only needed when you want to replicate local changes to the remote instance.
     */
    push: {
        /**
         * Push handler
         */
        async handler(docs) {
            /**
             * Push the local documents to a remote REST server.
             */
            const rawResponse = await fetch('https://example.com/api/sync/push', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ docs })
            });
            /**
             * Contains an array with all conflicts that appeared during this push.
             * If there were no conflicts, return an empty array.
             */
            const response = await rawResponse.json();
            return response;
        },
        /**
         * Batch size, optional
         * Defines how many documents will be given to the push handler at once.
         */
        batchSize: 5,
        /**
         * Modifies all documents before they are given to the push handler.
         * Can be used to swap out a custom deleted flag instead of the '_deleted' field.
         * If the push modifier return null, the document will be skipped and not send to the remote.
         * Notice that the modifier can be called multiple times and should not contain any side effects.
         * (optional)
         */
        modifier: d => d
    },
    /**
     * Optional,
     * only needed when you want to replicate remote changes to the local state.
     */
    pull: {
        /**
         * Pull handler
         */
        async handler(lastCheckpoint, batchSize) {
            const minTimestamp = lastCheckpoint ? lastCheckpoint.updatedAt : 0;
            /**
             * In this example we replicate with a remote REST server
             */
            const response = await fetch(
                `https://example.com/api/sync/?minUpdatedAt=${minTimestamp}&limit=${batchSize}`
            );
            const documentsFromRemote = await response.json();
            return {
                /**
                 * Contains the pulled documents from the remote.
                 * Not that if documentsFromRemote.length < batchSize,
                 * then RxDB assumes that there are no more un-replicated documents
                 * on the backend, so the replication will switch to 'Event observation' mode.
                 */
                documents: documentsFromRemote,
                /**
                 * The last checkpoint of the returned documents.
                 * On the next call to the pull handler,
                 * this checkpoint will be passed as 'lastCheckpoint'
                 */
                checkpoint: documentsFromRemote.length === 0 ? lastCheckpoint : {
                    id: lastOfArray(documentsFromRemote).id,
                    updatedAt: lastOfArray(documentsFromRemote).updatedAt
                }
            };
        },
        batchSize: 10,
        /**
         * Modifies all documents after they have been pulled
         * but before they are used by RxDB.
         * Notice that the modifier can be called multiple times and should not contain any side effects.
         * (optional)
         */
        modifier: d => d,
        /**
         * Stream of the backend document writes.
         * See below.
         * You only need a stream$ when you have set live=true
         */
        stream$: pullStream$.asObservable()
    },
});


/**
 * Creating the pull stream for realtime replication.
 * Here we use a websocket but any other way of sending data to the client can be used,
 * like long polling or server-sent events.
 */
const pullStream$ = new Subject<RxReplicationPullStreamItem<any, any>>();
let firstOpen = true;
function connectSocket() {
    const socket = new WebSocket('wss://example.com/api/sync/stream');
    /**
     * When the backend sends a new batch of documents+checkpoint,
     * emit it into the stream$.
     * 
     * event.data must look like this
     * {
     *     documents: [
     *        {
     *            id: 'foobar',
     *            _deleted: false,
     *            updatedAt: 1234
     *        }
     *     ],
     *     checkpoint: {
     *         id: 'foobar',
     *         updatedAt: 1234
     *     }
     * }
     */
    socket.onmessage = event => pullStream$.next(event.data);
    /**
     * Automatically reconnect the socket on close and error.
     */
    socket.onclose = () => connectSocket();
    socket.onerror = () => socket.close();

    socket.onopen = () => {
        if(firstOpen) {
            firstOpen = false;
        } else {
            /**
             * When the client is offline and goes online again,
             * it might have missed out events that happened on the server.
             * So we have to emit a RESYNC so that the replication goes
             * into 'Checkpoint iteration' mode until the client is in sync
             * and then it will go back into 'Event observation' mode again.
             */
            pullStream$.next('RESYNC');
        }
    }
}

```


## Multi Tab support

For better performance, the replication runs only in one instance when RxDB is used in multiple browser tabs or Node.js processes.
By setting `waitForLeadership: false` you can enforce that each tab runs its own replication cycles.
If used in a multi instance setting, so when at database creation `multiInstance: false` was not set,
you need to import the [leader election plugin](./leader-election.md) so that RxDB can know how many instances exist and which browser tab should run the replication.

## Error handling

When sending a document to the remote fails for any reason, RxDB will send it again in a later point in time.
This happens for **all** errors. The document write could have already reached the remote instance and be processed, while only the answering fails.
The remote instance must be designed to handle this properly and to not crash on duplicate data transmissions. 
Depending on your use case, it might be ok to just write the duplicate document data again.
But for a more resilient error handling you could compare the last write timestamps or add a unique write id field to the document. This field can then be used to detect duplicates and ignore re-send data.

Also the replication has an `.error$` stream that emits all `RxError` objects that arise during replication.
Notice that these errors contain an inner `.parameters.errors` field that contains the original error. Also they contain a `.parameters.direction` field that indicates if the error was thrown during `pull` or `push`. You can use these to properly handle errors. For example when the client is outdated, the server might respond with a `426 Upgrade Required` error code that can then be used to force a page reload.


```ts
replicationState.error$.subscribe((error) => {
    if(
        error.parameters.errors &&
        error.parameters.errors[0] &&
        error.parameters.errors[0].code === 426
    ) {
        // client is outdated -> enforce a page reload
        location.reload();
    }
});
```

## Security

Be aware that client side clocks can never be trusted. When you have a client-backend replication, the backend should overwrite the `updatedAt` timestamp or use another field, when it receives the change from the client.

## RxReplicationState

The function `replicateRxCollection()` returns a `RxReplicationState` that can be used to manage and observe the replication.

### Observable

To observe the replication, the `RxReplicationState` has some `Observable` properties:

```ts
// emits each document that was received from the remote
myRxReplicationState.received$.subscribe(doc => console.dir(doc));

// emits each document that was send to the remote
myRxReplicationState.sent$.subscribe(doc => console.dir(doc));

// emits all errors that happen when running the push- & pull-handlers.
myRxReplicationState.error$.subscribe(error => console.dir(error));

// emits true when the replication was canceled, false when not.
myRxReplicationState.canceled$.subscribe(bool => console.dir(bool));

// emits true when a replication cycle is running, false when not.
myRxReplicationState.active$.subscribe(bool => console.dir(bool));
```

### awaitInitialReplication()

With `awaitInitialReplication()` you can await the initial replication that is done when a full replication cycle was successful finished for the first time. The returned promise will never resolve if you cancel the replication before the initial replication can be done.


```ts
await myRxReplicationState.awaitInitialReplication();
```

### awaitInSync()

Returns a `Promise` that resolves when:
- `awaitInitialReplication()` has emitted.
- All local data is replicated with the remote.
- No replication cycle is running or in retry-state.

:::warning
When `multiInstance: true` and `waitForLeadership: true` and another tab is already running the replication, `awaitInSync()` will not resolve until the other tab is closed and the replication starts in this tab.

```ts
await myRxReplicationState.awaitInSync();
```
:::


:::warning 

#### `awaitInitialReplication()` and `awaitInSync()` should not be used to block the application

A common mistake in RxDB usage is when developers want to block the app usage until the application is in sync.
Often they just `await` the promise of `awaitInitialReplication()` or `awaitInSync()` and show a loading spinner until they resolve. This is dangerous and should not be done because:
- When `multiInstance: true` and `waitForLeadership: true (default)` and another tab is already running the replication, `awaitInitialReplication()` will not resolve until the other tab is closed and the replication starts in this tab.
- Your app can no longer be started when the device is offline because there the `awaitInitialReplication()` will never resolve and the app cannot be used.

Instead you should store the last in-sync time in a [local document](./rx-local-document.md) and observe its value on all instances.

For example if you want to block clients from using the app if they have not been in sync for the last 24 hours, you could use this code:
```ts

// update last-in-sync-flag each time replication is in sync
await myCollection.insertLocal('last-in-sync', { time: 0 }).catch(); // ensure flag exists
myReplicationState.active$.pipe(
    mergeMap(async() => {
        await myReplicationState.awaitInSync();
        await myCollection.upsertLocal('last-in-sync', { time: Date.now() })
    })
);

// observe the flag and toggle loading spinner
await showLoadingSpinner();
const oneDay = 1000 * 60 * 60 * 24;
await firstValueFrom(
    myCollection.getLocal$('last-in-sync').pipe(
        filter(d => d.get('time') > (Date.now() - oneDay))
    )
);
await hideLoadingSpinner();
```

:::


### reSync()

Triggers a `RESYNC` cycle where the replication goes into [checkpoint iteration](#checkpoint-iteration) until the client is in sync with the backend. Used in unit tests or when no proper `pull.stream$` can be implemented so that the client only knows that something has been changed but not what.

```ts
myRxReplicationState.reSync();
```

If your backend is not capable of sending events to the client at all, you could run `reSync()` in an interval so that the client will automatically fetch server changes after some time at least.


```ts
// trigger RESYNC each 10 seconds.
setInterval(() => myRxReplicationState.reSync(), 10 * 1000);
```



### cancel()

Cancels the replication. Returns a promise that resolved when everything has been cleaned up.

```ts
await myRxReplicationState.cancel();
```

### pause()

Pauses a running replication. The replication can later be resumed with `RxReplicationState.start()`.

```ts
await myRxReplicationState.pause();
await myRxReplicationState.start(); // restart
```


### remove()

Cancels the replication and deletes the metadata of the replication state. This can be used to restart the replication "from scratch". Calling `.remove()` will only delete the replication metadata, it will NOT delete the documents from the collection of the replication.

```ts
await myRxReplicationState.remove();
```

### isStopped()

Returns `true` if the replication is stopped. This can be if a non-live replication is finished or a replication got canceled.

```js
replicationState.isStopped(); // true/false
```

### isPaused()

Returns `true` if the replication is paused.

```js
replicationState.isPaused(); // true/false
```

### Setting a custom initialCheckpoint

By default, the push replication will start from the beginning of time and push all documents from there to the remote.
By setting a custom `push.initialCheckpoint`, you can tell the replication to only push writes that are newer than the given checkpoint.

```ts
// store the latest checkpoint of a collection
let lastLocalCheckpoint: any;
myCollection.checkpoint$.subscribe(checkpoint => lastLocalCheckpoint = checkpoint);

// start the replication but only push documents that are newer than the lastLocalCheckpoint
const replicationState = replicateRxCollection({
    collection: myCollection,
    replicationIdentifier: 'my-custom-replication-with-init-checkpoint',
    /* ... */
    push: {
        handler: /* ... */,
        initialCheckpoint: lastLocalCheckpoint
    }
});
```

The same can be done for the other direction by setting a `pull.initialCheckpoint`. Notice that here we need the remote checkpoint from the backend instead of the one from the RxDB storage.

```ts
// get the last pull checkpoint from the server
const lastRemoteCheckpoint = await (await fetch('http://example.com/pull-checkpoint')).json();

// start the replication but only pull documents that are newer than the lastRemoteCheckpoint
const replicationState = replicateRxCollection({
    collection: myCollection,
    replicationIdentifier: 'my-custom-replication-with-init-checkpoint',
    /* ... */
    pull: {
        handler: /* ... */,
        initialCheckpoint: lastRemoteCheckpoint
    }
});
```

### toggleOnDocumentVisible


Ensures replication continues running when the document is `visible`. This helps avoid situations where the leader-elected tab becomes stale or is hibernated by the browser to save battery.  
When the tab becomes hidden, replication is automatically paused; when the tab becomes visible again (or the instance becomes leader), replication resumes.

**Default:** `true`

```ts
const replicationState = replicateRxCollection({
    toggleOnDocumentVisible: true,
    /* ... */
});
```

## Attachment replication (beta)

Attachment replication is supported in the RxDB Sync Engine itself. However not all replication plugins support it.
If you start the replication with a collection which has [enabled RxAttachments](./rx-attachment.md) attachments data will be added to all push- and write data.

The pushed documents will contain an `_attachments` object which contains:

- The attachment meta data (id, length, digest) of all non-attachments
- The full attachment data of all attachments that have been updated/added from the client.
- Deleted attachments are spared out in the pushed document.

With this data, the backend can decide onto which attachments must be deleted, added or overwritten.

Accordingly, the pulled document must contain the same data, if the backend has a new document state with updated attachments.


## Partial Sync with RxDB

Suppose you're building a Minecraft-like voxel game where the world can expand in every direction. Storing the entire map locally for offline use is impossible because the dataset could be massive. Yet you still want a local-first design so players can edit the game world offline and sync back to the server later.

### Idea: One Collection, Multiple Replications

You might define a single RxDB collection called `db.voxels`, where each document represents a block or "voxel" (with fields like id, chunkId, coordinates, and type). With RxDB you can, instead of setting up _one_ replication that tries to fetch _all_ voxels, you create **separate replication states** for each _chunk_ of the world the player is currently near.

When the player enters a particular chunk (say `chunk-123`), you **start a replication** dedicated to that chunk. On the server side, you have endpoints to **pull** only that chunk's voxels (e.g., GET `/api/voxels/pull?chunkId=123`) and **push** local changes back (e.g., POST `/api/voxels/push?chunkId=123`). RxDB handles them similarly to any other offline-first setup, but each replication is filtered to only that chunk's data.

When the player leaves `chunk-123` and no longer needs it, you **stop** that replication. If the player moves to `chunk-124`, you start a new replication for chunk 124. This ensures the game only downloads and syncs data relevant to the player's immediate location. Meanwhile, all edits made offline remain safely stored in the local database until a network connection is available.

```ts
const activeReplications = {}; // chunkId -> replicationState

function startChunkReplication(chunkId) {
  if (activeReplications[chunkId]) return;
  const replicationId = 'voxels-chunk-' + chunkId;

  const replicationState = replicateRxCollection({
    collection: db.voxels,
    replicationIdentifier: replicationId,
    pull: {
      async handler(checkpoint, limit) {
        const res = await fetch(
          `/api/voxels/pull?chunkId=${chunkId}&cp=${checkpoint}&limit=${limit}`
        );
        /* ... */
      }
    },
    push: {
      async handler(changedDocs) {
        const res = await fetch(`/api/voxels/push?chunkId=${chunkId}`);
        /* ... */
      }
    }
  });
  activeReplications[chunkId] = replicationState;
}

function stopChunkReplication(chunkId) {
  const rep = await activeReplications[chunkId];
  if (rep) {
    rep.cancel();
    delete activeReplications[chunkId];
  }
}

// Called whenever the player's location changes; 
// dynamically start/stop replication for nearby chunks.
function onPlayerMove(neighboringChunkIds) {
  neighboringChunkIds.forEach(startChunkReplication);
  Object.keys(activeReplications).forEach(cid => {
    if (!neighboringChunkIds.includes(cid)) {
      stopChunkReplication(cid);
    }
  });
}
```

### Diffy-Sync when Revisiting a Chunk
An added benefit of this multi-replication-state design is checkpointing. Each replication state has a unique "replication identifier," so the next time the player returns to `chunk-123`, the local database knows what it already has and only fetches the differences without the need to re-download the entire chunk.

### Partial Sync in a Local-First Business Application

Though a voxel world is an intuitive example, the same technique applies in enterprise scenarios where data sets are large but each user only needs a specific subset. You could spin up a new replication for each "permission group" or "region," so users only sync the records they're allowed to see. Or in a CRM, the replication might be filtered by the specific accounts or projects a user is currently handling. As soon as they switch to a different project, you stop the old replication and start one for the new scope.

This **chunk-based** or **scope-based** replication pattern keeps your local storage lean, reduces network overhead, and still gives users the offline, instant-feedback experience that local-first apps are known for. By dynamically creating (and canceling) replication states, you retain tight control over bandwidth usage and make the infinite (or very large) feasible. In a production app you would also "flag" the entities (with a `pull.modifier`) by which replication state they came from, so that you can clean up the parts that you no longer need. -->

## FAQ

<details>
    <summary>I have infinite loops in my replication, how to debug?</summary>
    <div>
    When you have infinite loops in your replication or random re-runs of http requests after some time, the reason is likely that your pull-handler
    is crashing. The debug this, add a log to the error$ handler to debug it. `myRxReplicationState.error$.subscribe(err => console.log('error$', err))`.
    </div>
</details>
