# Replication

The RxDB replication protocol allows to replicate the database state in **realtime** between the clients and the server.

The backend server does not have to be a RxDB instance, you can build a replication with **any infrastructure**.
For example you can replicate with a custom GraphQL endpoint or a http server on top of a PostgreSQL database.

The replication is made to support the [Offline-First](http://offlinefirst.org/) paradigm, so that when the client goes offline, the RxDB database can still read and write locally and will continue the replication when the client goes online again.


## Replication protocol on the document level

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



## Replication protocol on the transfer level

When document states are transfered, all handlers are using bulks of documents for better performance.
The server has to implement the following methods to be compatible with the replication:

- **pullHandler** Get the last checkpoint (or null) as input. Returns all documents that have been written **after** the given checkpoint. Also returns the checkpoint of the latest written returned document.
- **pushHandler** a method that can be called by the client to send client side writes to the master. It gets and array with the the `assumedMasterState` and the `newForkState` of each document write as input. It must return an array that contains the master document states of all conflicts. If there are no conflicts, it must return an empty array.
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

If your backend for any reason is not able to provide a full `pullStream$` that contains all events and the checkpoint, you can instead only emit `RESYNC` events that tell RxDB that anything unknown has changed on the server and it should run the pull replication via `checkpoint iteration`.

When the client goes offline and online again, it might happen that the `pullStream$` has missed out some events. Therefore the `pullStream$` should also emit a `RESYNC` event each time the client reconnects, so that the client can become in sync with the backend via the `checkpoint iteration` mode.

## Data layout on the server

To use the replication you first have to ensure that:
- **documents are deterministic sortable by their last write time**

  *deterministic* means that even if two documents have the same *last write time*, they have a predictable sort order.
    This is most often ensured by using the *primaryKey* as second sort parameter as part of the checkpoint.

- **documents are never deleted, instead the `_deleted` field is set to `true`.**

  This is needed so that the deletion state of a document exists in the database and can be replicated with other instances. If your backend uses a different field to mark deleted documents, you have to transform the data in the push/pull handlers or with the modifiers.


For example if your documents look like this:

```json
{
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

Then your data is always sortable by `updatedAt`. This ensures that when RxDB fetches 'new' changes via `pullHandler()`, it can send the latest `updatedAt+id` checkpoint to the remote endpoint and then recieve all newer documents.

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

The default conflict handler will always drop the fork state and use the master state. This ensures that clients that are offline for a very long time, do not accidentially overwrite other peoples changes when they go online again.
You can specify a custom conflict handler by setting the property `conflictHandler` when calling `addCollection()`.


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
     * By default it will do an ongoing realtime replicatino.
     * By settings live: false the replication will run once until the local state
     * is in sync with the remote state, then it will cancel itself.
     * (optional), default is true.
     */
    live: true,
    /**
     * Time in milliseconds after when a failed backend request
     * has to be retried.
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
                 * Notice: If documentsFromRemote.length < batchSize,
                 * then RxDB assumes that there are no more un-replicated documents
                 * on the backend, so the replication will switch to 'Event observation' mode.
                 */
                documents: documentsFromRemote,
                /**
                 * The last checkpoint of the returned documents.
                 * On the next call to the pull handler,
                 * this checkoint will be passed as 'lastCheckpoint'
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
 * like long polling or server-send events.
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
     * Automatically reconned the socket on close and error.
     */
    socket.onclose = () => connectSocket();
    socket.onerror = () => socket.close();

    socket.onopen = () => {
        if(firstOpen) {
            firstOpen = false;
        } else {
            /**
             * When the client is offline and goes online again,
             * it might have missed out events that happend on the server.
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


## Limitations

 * At the moment it is not possible to replicate [attachments](./rx-attachment.md), make a pull request if you need this.
 * It is not possible to do a multi-master replication, like with CouchDB. RxDB always assumes that the backend is the single source of truth.


## Error handling

When sending a document to the remote fails for any reason, RxDB will send it again in a later point in time.
This happens for **all** errors. The document write could have already reached the remote instance and be processed, while only the answering fails.
The remote instance must be designed to handle this properly and to not crash on duplicate data transmissions. 
Depending on your use case, it might be ok to just write the duplicate document data again.
But for a more resilent error handling you could compare the last write timestamps or add a unique write id field to the document. This field can then be used to detect duplicates and ignore re-send data.

Also the replication has an `.error$` stream that emits all `RxError` objects that arise during replication.
Notice that these errors are contain an inner `.parameters.errors` field that contains the original error. Also they contain a `.parameters.direction` field that indicates if the error was thrown during `pull` or `push`. You can use these to properly handle errors. For example when the client is outdated, the server might respond with a `426 Upgrade Required` error code that can then be used to force a page reload.


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
// emits each document that was recieved from the remote
myRxReplicationState.received$.subscribe(doc => console.dir(doc));

// emits each document that was send to the remote
myRxReplicationState.send$.subscribe(doc => console.dir(doc));

// emits all errors that happen when running the push- & pull-handlers.
myRxReplicationState.error$.subscribe(error => console.dir(error));

// emits true when the replication was canceled, false when not.
myRxReplicationState.canceled$.subscribe(bool => console.dir(bool));

// emits true when a replication cycle is running, false when not.
myRxReplicationState.active$.subscribe(bool => console.dir(bool));
```

### awaitInitialReplication()

With `awaitInitialReplication()` you can await the initial replication that is done when a full replication cycle was finished for the first time.

**WARNING:** When `multiInstance: true` and `waitForLeadership: true` and another tab is already running the replication, `awaitInitialReplication()` will not resolve until the other tab is closed and the replication starts in this tab.


```ts
await myRxReplicationState.awaitInitialReplication();
```

### awaitInSync()

Returns a `Promise` that resolves when:
- `awaitInitialReplication()` has emitted.
- All local data is replicated with the remote.
- No replication cycle is running or in retry-state.

**WARNING:** When `multiInstance: true` and `waitForLeadership: true` and another tab is already running the replication, `awaitInSync()` will not resolve until the other tab is closed and the replication starts in this tab.

```ts
await myRxReplicationState.awaitInSync();
```


### reSync()

Triggers a `RESYNC` cycle where the replication goes into `Checkpoint iteration` until the client is in sync with the backend. Used in unit tests or when no proper `pull.stream$` can be implemented so that the client only knows that something has been changed but not what.

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
await myRxReplicationState.cancel()
```


### isStopped()

Returns `true` if the replication is stopped. This can be if a non-live replication is finished or a replication got canceled.

```js
replicationState.isStopped(); // true/false
```
