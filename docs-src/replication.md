# Replication primitives

With the replication primitives plugin, you can build a realtime replication based on a transport layer like **REST**, **WebRTC** or **websockets** or any other transport layer. Also the [GraphQL replication plugin](./replication-graphql.md) is build on top of the replication primitives.


## Trade offs

- This plugin is made to do a **many-to-one** replication like you would do when you replicate **many** clients with **one** backend server. It is not possible to replicate things in a star schema like it can be done with the [couchdb replication](./replication-couchdb.md).

- This plugin is made for fast and reliable replication, it has less overhead then the couchdb replication for example.

- It is assumes that the remote instance is the single source of truth that also resolves conflicts.

- The replication of attachments or local documents is not supported at the moment.

## Data Layout

To use the replication primitives you first have to ensure that:
- **documents are deterministic sortable by their last write time**

  *deterministic* means that even if two documents have the same *last write time*, they have a predictable sort order.
    This is most often ensure by using the *primaryKey* as second sort parameter.

- **documents are never deleted, instead the `_deleted` field is set to `true`.**

  This is needed so that the deletion state of a document exists in the database and can be replicated with other instances.


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

Then your data is always sortable by `updatedAt`. This ensures that when RxDB fetches 'new' changes, it can send the latest `updatedAt` to the remote endpoint and then recieve all newer documents.

The deleted field must always be exactly `_deleted`. If your remote endpoint uses a different field to mark deleted documents, you have to map the fields in the pull- and push handlers.

## The replication cycle

The replication works in cycles. A cycle is triggered when:
  - When calling `replicateRxCollection()` (if `autoStart` is `true` as by default)
  - Automatically on writes to non-[local](./rx-local-document.md) documents.
  - When `liveInterval` is reached from the time of last `run()` cycle.
  - The `run()` method is called manually.
  - Calling `notifyAboutRemoteChange` might also trigger a cycle, if needed.

A cycle performs these steps in the given order:

1. Get a batch of unreplicated document writes and call the `push handler` with them to send them to the remote instance.
2. Repeat step `1` until there are no more local unreplicated changes.
3. Get the `latestPullDocument` from the local database.
4. Call the `pull handler` with `latestPullDocument` to fetch a batch from remote unreplicated document writes.
5. When the `pull handler` has returned the remote documents...
  - ...if a local write happened in between, drop the pulled changes and start from step `1` to not miss out local writes.
  - ...if no local write happend in between, persist the pulled changes to the local state.
6. Update `latestPullDocument` with the newest latest document from the remote.
7. Repeat step `3+4+5` until the pull handler returns `hasMoreDocuments: false`.


## Error handling

When sending a document to the remote fails for any reason, RxDB will send it again in a later point in time.
This happens for **all** errors. The document write could have already reached the remote instance and be processed, while only the answering fails.
The remote instance must be designed to handle this properly and to not crash on duplicate data transmissions. 
Depending on your use case, it might be ok to just write the duplicate document data again.
But for a more resilent error handling you could compare the last write timestamps or add a unique write id field to the document. This field can then be used to detect duplicates and ignore re-send data.

## Conflict resolution

Imagine two of your users modify the same JSON document, while both are offline. After they go online again, their clients replicate the modified document to the server. Now you have two conflicting versions of the same document, and you need a way to determine how the correct new version of that document should look like. This process is called **conflict resolution**.
RxDB relies solely on the remote instance to detect and resolve conflicts. Each document write is sent to the remote where conflicts can be resolved and the winning document can be sent back to the clients on the next run of the `pull` handler.

## Security

Be aware that client side clocks can never be trusted. When you have a client-backend replication, the backend should overwrite the `updatedAt` timestamp when it receives the change from the client.


## replicateRxCollection()

You can start the replication of a single `RxCollection` by calling `replicateRxCollection()` like in the following:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';
const replicationState = await replicateRxCollection({
    collection: myRxCollection,
    /**
     * An id for the replication to identify it
     * and so that RxDB is able to resume the replication on app reload.
     * If you replicate with a remote server, it is recommended to put the
     * server url into the replicationIdentifier.
     */
    replicationIdentifier: 'my-rest-replication-to-https://example.com/rest',
    /**
     * By default it will do a one-time replication.
     * By settings live: true the replication will continuously
     * replicate all changes.
     * (optional), default is false.
     */
    live: true,
    /**
     * Interval in milliseconds on when to run the next replication cycle.
     * Set this to 0 when you have a back-channel from your remote
     * that that tells the client when to fetch remote changes.
     * (optional), only needed when live=true, default is 10 seconds.
     */
    liveInterval: 10000,
    /**
     * Time in milliseconds after when a failed replication cycle
     * has to be retried.
     * (optional), default is 5 seconds.
     */
    retryTime: number,
    /**
     * Trigger or not a first replication
     * if `false`, the first replication should be trigged by : 
     *  - `replicationState.run()`
     *  - a write to non-[local](./rx-local-document.md) document
     * Used with `liveInterval` greater than `0`, the polling for remote changes starts 
     * after the first triggered replication. 
     * (optional), only needed when live=true, default is true.
     */
    autoStart: true,
    /**
     * Optional,
     * only needed when you want to replicate remote changes to the local state.
     */
    pull: {
        /**
         * Pull handler
         */
        async handler(latestPullDocument) {
            const limitPerPull = 10;
            const minTimestamp = latestPullDocument ? latestPullDocument.updatedAt : 0;
            /**
             * In this example we replicate with a remote REST server
             */
            const response = await fetch(
                `https://example.com/api/sync/?minUpdatedAt=${minTimestamp}&limit=${limitPerPull}`
            );
            const documentsFromRemote = await response.json();
            return {
                /**
                 * Contains the pulled documents from the remote.
                 */
                documents: documentsFromRemote,
                /**
                 * Must be true if there might be more newer changes on the remote.
                 */
                hasMoreDocuments: documentsFromRemote.length === limitPerPull
            };
        }
    },
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
            const content = await rawResponse.json();
        },
        /**
         * Batch size, optional
         * Defines how many documents will be given to the push handler at once.
         */
        batchSize: 5
    }
});
```

## Back channel

The replication has to somehow know when a change happens in the remote instance and when to fetch new documents from the remote.

For the pull-replication, RxDB will run the pull-function every time `liveInterval` is reached.
This means that when a change happens on the server, RxDB will, in the worst case, take `liveInterval` milliseconds until the changes is replicated to the client.

To improve this, it is recommended to setup a back channel where the remote instance can tell the local database when something has changed and a replication cycle must be run.

For REST for example you might want to use a [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications).


```ts
const exampleSocket = new WebSocket('wss://example.com/socketserver', ['protocolOne', 'protocolTwo']);
exampleSocket.onmessage = () => {
    /**
     * Trigger a replication cycle
     * when the websocket recieves a message.
     * Instead of using run(),
     * we use notifyAboutRemoteChange() here to ensure
     * that only a full cycle is added, it there is no pending cycle
     * in the queue anyway.
     */
    replicationState.notifyAboutRemoteChange();
}
```


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

```ts
await myRxReplicationState.awaitInitialReplication();
```


### awaitInSync()

Returns a promise that resolves when:
- `awaitInitialReplication()` has emited.
- All local data is repliacted with the remote.
- No replication cycle is running or in retry-state.

```ts
await myRxReplicationState.awaitInSync();
```


### cancel()

Cancels the replication.

```ts
myRxReplicationState.cancel()
```

### run()

Runs a new replication cycle. The replication plugin will always make sure that at any point in time, only one cycle is running.

```ts
await myRxReplicationState.run();
```

### notifyAboutRemoteChange()

Should be called when the remote tells the client that a new change has happened at the remote. Might or might not trigger a new `run()` cycle, depending on when it is called and if another cycle is already running. Use this inside of websocket handlers.



--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./cleanup.md)
