---
title: RxReplicationState - Observe and Control the RxDB Replication
slug: rx-replication-state.html
description: Learn how to use the RxReplicationState to observe errors, await the initial sync, and cancel, pause or restart the RxDB replication.
image: /headers/rx-replication-state.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';

# RxReplicationState

The function [replicateRxCollection()](./replicate-rx-collection.md) returns an **`RxReplicationState`** that can be used to manage and observe the replication. All replication plugins return an object that extends it, for example the [HTTP replication](./replication-http.md), the [GraphQL replication](./replication-graphql.md), and the [CouchDB replication](./replication-couchdb.md). So everything on this page also works with the replication state of these plugins.

How the replication itself works is explained on the [Sync Engine](./replication.md) page. To watch the pull and push state and the replicated documents without writing any code, open the Replication panel of the [database viewer](./db-viewer.md).

## Observable

To observe the replication, the `RxReplicationState` has some `Observable` properties:

```ts
// emits each document that was received from the remote
myRxReplicationState.received$.subscribe(doc => console.dir(doc));

// emits each document that was sent to the remote
myRxReplicationState.sent$.subscribe(doc => console.dir(doc));

// emits all errors that happen when running the push- & pull-handlers.
myRxReplicationState.error$.subscribe(error => console.dir(error));

// emits true when the replication was canceled, false when not.
myRxReplicationState.canceled$.subscribe(bool => console.dir(bool));

// emits true when a replication cycle is running, false when not.
myRxReplicationState.active$.subscribe(bool => console.dir(bool));

// emits each conflict that was reported by the remote in the response
// of the push handler, together with the output of the conflictHandler
// that resolved it.
myRxReplicationState.conflict$.subscribe(conflict => console.dir(conflict));
```

The `conflictHandler` that resolves the conflicts of `conflict$` is explained in [replication conflicts](./transactions-conflicts-revisions.md#replication-conflicts).

## awaitInitialReplication()

With `awaitInitialReplication()` you can await the initial replication that is done when a full replication cycle was successfully finished for the first time. The returned promise will never resolve if you cancel the replication before the initial replication can be done.

The promise resolves only when **both directions** have finished their first cycle:

- **Downstream (pull)**: all documents that the pull handler returns, up to the latest checkpoint, are written to the local collection.
- **Upstream (push)**: all local writes that existed when the replication started are sent to the push handler. When the push handler reports conflicts, they are resolved and the upstream runs again before it counts as done.

When only one direction is configured, the other direction completes instantly. A pull-only replication resolves as soon as the pull is done, and a push-only replication resolves as soon as the push is done.


```ts
await myRxReplicationState.awaitInitialReplication();
```

## awaitInSync()

Returns a `Promise` that resolves when:
- `awaitInitialReplication()` has emitted.
- All local data is replicated with the remote.
- No replication cycle is running or in retry-state.

```ts
await myRxReplicationState.awaitInSync();
```

:::warning
When `multiInstance: true` and `waitForLeadership: true` and another tab is already running the replication, `awaitInSync()` will not resolve until the other tab is closed and the replication starts in this tab.
:::


:::warning 

### `awaitInitialReplication()` and `awaitInSync()` should not be used to block the application

A common mistake in RxDB usage is when developers want to block the app usage until the application is in sync.
Often they just `await` the promise of `awaitInitialReplication()` or `awaitInSync()` and show a loading spinner until they resolve. This is dangerous and should not be done because:
- When `multiInstance: true` and `waitForLeadership: true (default)` and another tab is already running the replication, `awaitInitialReplication()` will not resolve until the other tab is closed and the replication starts in this tab.
- Your app can no longer be started when the device is offline because there `awaitInitialReplication()` will never resolve and the app cannot be used.

Instead you should store the last in-sync time in a [local document](./rx-local-document.md) and observe its value on all instances.

For example if you want to block clients from using the app if they have not been in sync for the last 24 hours, you could use this code:
```ts

// update last-in-sync-flag each time replication is in sync
// ensure flag exists
await myCollection.insertLocal(
    'last-in-sync', { time: 0 }
).catch();
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


## awaitDocumentPushed()

Returns a `Promise` that resolves when a specific `RxDocument` instance was successfully pushed to the server.

While `awaitInSync()` waits for the whole collection to be in sync, `awaitDocumentPushed()` only waits for a single document. This is useful when you have a sensitive write (like a financial transaction or a value with a uniqueness constraint) and you want to confirm that exactly this write reached the backend, without blocking on every other unrelated change in the collection.

You pass the `RxDocument` instance you got back from a write operation:

```ts
const doc = await myDatabase.todos.insert({
    id: 'todo1',
    name: 'Learn RxDB',
    dueAt: '2026-01-01T10:00:00.000Z',
    priority: 8
});
await myReplicationState.awaitDocumentPushed(doc);
// here we know that the document state was pushed to the server
```

A `RxDocument` represents the state of a document at a given point in time, not the document in general. An older or a newer `RxDocument` instance of the same document is not the exact same `RxDocument`, because each instance carries the field values and the internal write time of that specific state. `awaitDocumentPushed()` therefore resolves based on the exact state of the instance you pass in.

It works by comparing the given document state with the last state that was written to the server, which RxDB stores in the replication meta data. Once the given state (or a newer one) was written to the server, the promise resolves.

If the document was overwritten by a newer local write before it could be pushed, the promise resolves as soon as a later state of that document has reached the server.

`awaitDocumentPushed()` does not set a timeout on purpose. If you need one, combine it with `Promise.race()`:

```ts
const doc = await myDatabase.todos.insert({
    id: 'todo1',
    name: 'Learn RxDB',
    dueAt: '2026-01-01T10:00:00.000Z',
    priority: 8
});
await Promise.race([
    myReplicationState.awaitDocumentPushed(doc),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
]);
```

## reSync()

Triggers a `RESYNC` cycle where the replication goes into [checkpoint iteration](./replication.md#checkpoint-iteration) until the client is in sync with the backend. Used in unit tests or when no proper `pull.stream$` can be implemented so that the client only knows that something has been changed but not what.

```ts
myRxReplicationState.reSync();
```

If your backend is not capable of sending events to the client at all, you could run `reSync()` in an interval so that the client will automatically fetch server changes after some time at least.


```ts
// trigger RESYNC each 10 seconds.
setInterval(() => myRxReplicationState.reSync(), 10 * 1000);
```



## cancel()

Cancels the replication. Returns a promise that resolves when everything has been cleaned up.

```ts
await myRxReplicationState.cancel();
```

A canceled `RxReplicationState` can **never** be started again. After `cancel()`, `isStopped()` returns `true` and calling `start()` rejects with the error [`RC_START_CANCELED`](./errors.md#RC_START_CANCELED). To resume the replication, call `replicateRxCollection()` again with the same `replicationIdentifier`. The new replication state reuses the stored checkpoints and continues where the canceled one stopped, so it does not download all documents again.

```ts
await replicationState.cancel();
await replicationState.start(); // throws RC_START_CANCELED

// resume by creating a new replication state with the same identifier
const newReplicationState = replicateRxCollection({
    collection: myDatabase.todos,
    replicationIdentifier: 'my-rest-replication-to-https://example.com/api/sync',
    pull: { /* ... */ },
    push: { /* ... */ }
});
```

Use `pause()` instead when you want to stop the replication for a while and continue later with the same `RxReplicationState`.

## pause()

Pauses a running replication. The replication can later be resumed with `RxReplicationState.start()`. In contrast to `cancel()`, a paused replication keeps its state. When `start()` is called after a pause, it runs one resync cycle and then continues the live replication.

```ts
await myRxReplicationState.pause();
await myRxReplicationState.start(); // restart
```


## remove()

Cancels the replication and deletes the metadata of the replication state. This can be used to restart the replication "from scratch". Calling `.remove()` will only delete the replication metadata, it will NOT delete the documents from the collection of the replication.

```ts
await myRxReplicationState.remove();
```

## isStopped()

Returns `true` if the replication is stopped. This can be if a non-live replication is finished or a replication got canceled.

```js
replicationState.isStopped(); // true/false
```

## isPaused()

Returns `true` if the replication is paused.

```js
replicationState.isPaused(); // true/false
```

## Replication Lifecycle

| Method | State afterwards | Can `start()` resume it? | Replication metadata |
| --- | --- | --- | --- |
| `pause()` | `isPaused() === true` | ✅ Yes | Kept |
| `cancel()` | `isStopped() === true` | ❌ No, `start()` throws `RC_START_CANCELED`. Call `replicateRxCollection()` again with the same `replicationIdentifier` | Kept, so a new replication continues from the last checkpoint |
| `remove()` | `isStopped() === true` | ❌ No, `start()` throws `RC_START_CANCELED`. Call `replicateRxCollection()` again | Deleted, so a new replication starts from scratch |

The replication is also canceled automatically when its [RxCollection](./rx-collection.md) or [RxDatabase](./rx-database.md) is closed.

## Error handling

When sending a document to the remote fails for any reason, RxDB will send it again at a later point in time.
This happens for **all** errors. The document write could have already reached the remote instance and be processed, while only the answering fails.
The remote instance must be designed to handle this properly and to not crash on duplicate data transmissions. 
Depending on your use case, it might be ok to just write the duplicate document data again.
But for a more resilient error handling you could compare the last write timestamps or add a unique write id field to the document. This field can then be used to detect duplicates and ignore re-sent data.

Also the replication has an `.error$` stream that emits all [RxError](./errors.md) objects that arise during replication.
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

### Errors in the modifiers

The `pull.modifier` and the `push.modifier` must not throw. Errors of the handlers are retried, but a modifier that throws on a document will throw on the same document again, and skipping the document would lose data.

When a modifier throws, the error is emitted once on `error$` and the replication stops. This ensures that the replication does not end up in a broken state.

## FAQ

<Faq>
<FaqItem question="I have infinite loops in my replication, how to debug?">

    <div>
    When you have infinite loops in your replication or random re-runs of http requests after some time, the reason is likely that your pull-handler
    is crashing. To debug this, add a log to the error$ handler to debug it. `myRxReplicationState.error$.subscribe(err => console.log('error$', err))`.
    </div>

</FaqItem>
</Faq>
