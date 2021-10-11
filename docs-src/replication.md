# Replication primitives (beta)

With the replication primitives plugin, you can build a realtime replication based on any transport layer like **REST**, **WebRTC** or **websockets**.


## Trade offs

- This plugin is made to do a **many-to-one** replication like you would do when you replicate many clients with one backend server. It is not possible to replicate things in a star schema like it can be done with the [couchdb replication](./replication-couchdb.md).

- This plugin is made for fast and reliable replication, it has less overhead then the couchdb replication for example.

- It is assumes that the remote instance is the single source of truth that also resolves conflicts.

- The replication of attachments or local documents is not supported at the moment.

## Data Layout

To use the replication primitives you first have to ensure that your data is sortable by update time.

For example if your documents look like this:

```json
{
    "id": "foobar",
    "name": "Alice",
    "lastName": "Wilson",
    "updatedAt": 1564483474
}
```

Then your data is always sortable by `updatedAt`. This ensures that when RxDB fetches 'new' changes, it can send the latest `updatedAt` to the remote endpoint and then recieve all newer documents.

## The replication cycle

The replication works in cycles. A cycle is triggered when:
  - Automatically on local writes
  - When `liveInterval` is reached from the last cycle run.
  - The `run()` method is called manually.

A cycle performs these steps in the same order:

1. Get a batch of local unreplicated changes and call the `push handler` with it to send it to the remote.
2. Repeat step `1` until there are no more local unreplicated changes.
3. Get the `latestPullDocument` from the local database.
4. Call the `pull handler` with `latestPullDocument` to fetch a batch from remote unreplicated changes.
5. Update `latestPullDocument` with the newest latest document from the remote.
6. Repeat step `3+4+5` until the pull handler returns `hasMoreDocuments: false`.

## replicateRxCollection()

You can start the replication of a single `RxCollection` by calling `replicateRxCollection()` like in the following:

```ts
const replicationState = await replicateRxCollection({
    collection: myRxCollection,
    replicationIdentifier: 'my-custom-rest-replication',
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
            const documentsFromRemote = fetch(
                `https://example.com/api/sync/?minUpdatedAt=${minTimestamp}&limit=${limitPerPull}`
            ).json();
            return {
                /**
                 * Contains the pulled documents from the remote.
                 */
                documents: docsData,
                /**
                 * Must be true if there might be more newer changes on the remote.
                 */
                hasMoreDocuments: documentsFromRemote.length !== limitPerPull
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
            await postData('https://example.com/api/sync/push', { docs });
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
     */
    replicationState.run();
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



--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./in-memory.md)
