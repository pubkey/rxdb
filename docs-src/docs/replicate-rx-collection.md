---
title: replicateRxCollection() - Options of the RxDB Sync Engine
slug: replicate-rx-collection.html
description: Learn how to start the RxDB replication with replicateRxCollection(). See a minimal example, all options, TypeScript types, and pull-only sync.
image: /headers/replicate-rx-collection.jpg
---

# replicateRxCollection()

With **`replicateRxCollection()`** you start the [Sync Engine](./replication.md) for a single [RxCollection](./rx-collection.md). You provide a pull handler, a push handler, or both, and RxDB runs the [checkpoint iteration](./replication.md#checkpoint-iteration), the batching, the retries and the [conflict handling](./transactions-conflicts-revisions.md#replication-conflicts) for you. The function returns an [RxReplicationState](./rx-replication-state.md) that you use to observe and control the running replication.

How the protocol works and which data layout your backend needs is explained on the [Sync Engine](./replication.md) page. The replication plugins like the [HTTP replication](./replication-http.md) and the [GraphQL replication](./replication-graphql.md) are built on top of `replicateRxCollection()` and accept the same base options.

## Minimal Example

The following example replicates the `todos` collection with a backend that has one endpoint for pulling and one for pushing:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    collection: myDatabase.todos,
    replicationIdentifier: 'todos-sync-https://example.com/api/sync',
    pull: {
        async handler(lastCheckpoint, batchSize) {
            const minUpdatedAt = lastCheckpoint ? lastCheckpoint.updatedAt : 0;
            const response = await fetch(
                `https://example.com/api/sync/pull?minUpdatedAt=${minUpdatedAt}&limit=${batchSize}`
            );
            // must return { documents, checkpoint }
            return await response.json();
        }
    },
    push: {
        async handler(rows) {
            const response = await fetch('https://example.com/api/sync/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rows)
            });
            // must return the master states of all conflicts, or [] when there are none
            return await response.json();
        }
    }
});
```

Without a `pull.stream$`, this replication only fetches server changes on start and when you call [reSync()](./rx-replication-state.md#resync). For realtime updates from the server, add a `pull.stream$` like shown in the next section.

## Options

The following example shows all options of `replicateRxCollection()` together with a WebSocket based `pull.stream$` for realtime updates:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';
import {
    lastOfArray
} from 'rxdb';
const replicationState = await replicateRxCollection({
    collection: myDatabase.todos,
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
     * If waitForLeadership is true, it will wait until
     * the current instance is leader.
     * If waitForLeadership is false, it will start
     * replicating, even if it is not leader.
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
     * If your backend uses a different field name
     * than '_deleted', set the field name here.
     * RxDB will still store the documents internally
     * with '_deleted', setting this field
     * only maps the data on the data layer.
     * 
     * If a custom deleted field contains a non-boolean value, the deleted state
     * of the documents depends on if the value is
     * truthy or not. So instead of providing a boolean
     * deleted value, you could also work with using a
     * 'deletedAt' timestamp instead.
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
         * Can be used to swap out a custom deleted
         * flag instead of the '_deleted' field.
         * If the push modifier return null, the
         * document will be skipped and not sent to
         * the remote.
         * Notice that the modifier can be called
         * multiple times and should not contain
         * any side effects.
         * The modifier must not throw, a throwing
         * modifier cancels the replication.
         * (optional)
         */
        modifier: d => d,
        /**
         * When a local write happens, the
         * replication will normally start pushing
         * immediately.
         * By providing a function here that returns
         * a promise, the replication waits for that
         * promise to resolve before starting the
         * next upstream persist cycle.
         * This lets you batch writes from multiple
         * rapid inserts into a single push call,
         * or defer pushing until the CPU is idle
         * (e.g. via requestIdleCallback).
         * NOTE: The longer you wait, the higher
         * the risk of losing writes if the
         * replication closes unexpectedly.
         * (optional)
         */
        waitBeforePersist: () => new Promise(resolve => requestIdleCallback(resolve))
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
                `https://example.com/api/sync/` +
                `?minUpdatedAt=${minTimestamp}` +
                `&limit=${batchSize}`
            );
            const documentsFromRemote = await response.json();
            return {
                /**
                 * Contains the pulled documents from the remote.
                 * Not that if documentsFromRemote.length < batchSize,
                 * then RxDB assumes that there are no more un-replicated documents
                 * on the backend, so the replication
                 * will switch to 'Event observation'
                 * mode.
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
         * Notice that the modifier can be called
         * multiple times and should not contain
         * any side effects.
         * The modifier must not throw, a throwing
         * modifier cancels the replication.
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
 * Here we use a websocket but any other way of
 * sending data to the client can be used,
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

The two modes `Checkpoint iteration` and `Event observation` that are mentioned in the comments are explained on the [Sync Engine](./replication.md#the-sync-engine-on-the-transfer-level) page.

### Setting a custom initialCheckpoint

By default, the push replication will start from the beginning of time and push all documents from there to the remote.
By setting a custom `push.initialCheckpoint`, you can tell the replication to only push writes that are newer than the given checkpoint.

```ts
// store the latest checkpoint of a collection
let lastLocalCheckpoint: any;
myCollection.checkpoint$.subscribe(checkpoint => lastLocalCheckpoint = checkpoint);

// start the replication but only push documents
// that are newer than the lastLocalCheckpoint
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
const lastRemoteCheckpoint = await (
    await fetch('http://example.com/pull-checkpoint')
).json();

// start the replication but only pull documents
// that are newer than the lastRemoteCheckpoint
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

## Using the Replication with TypeScript

`replicateRxCollection()` and `RxReplicationState` take two generic types: the document type and the checkpoint type of your backend.

```ts
function replicateRxCollection<RxDocType, CheckpointType>(
    options: ReplicationOptions<RxDocType, CheckpointType>
): RxReplicationState<RxDocType, CheckpointType>;
```

The handler types are exported from `rxdb`:

- `ReplicationPullHandler<RxDocType, CheckpointType>`: `(lastPulledCheckpoint: CheckpointType | undefined, batchSize: number) => Promise<{ documents: WithDeleted<RxDocType>[], checkpoint: CheckpointType | undefined }>`
- `ReplicationPushHandler<RxDocType>`: `(rows: RxReplicationWriteToMasterRow<RxDocType>[]) => Promise<WithDeleted<RxDocType>[]>`. Each row has a `newDocumentState` and an optional `assumedMasterState`.

When you write a helper function that starts the replication for any collection, take the document type from the `RxCollection` generic so that the returned `RxReplicationState` stays typed:

```ts
import type {
    RxCollection,
    ReplicationPullHandler,
    ReplicationPushHandler
} from 'rxdb';
import {
    replicateRxCollection,
    RxReplicationState
} from 'rxdb/plugins/replication';

type MyCheckpoint = { id: string; updatedAt: number; };

export function startReplication<RxDocType>(
    collection: RxCollection<RxDocType>,
    pullHandler: ReplicationPullHandler<RxDocType, MyCheckpoint>,
    pushHandler: ReplicationPushHandler<RxDocType>
): RxReplicationState<RxDocType, MyCheckpoint> {
    return replicateRxCollection<RxDocType, MyCheckpoint>({
        collection,
        replicationIdentifier: 'my-sync-' + collection.name,
        live: true,
        pull: { handler: pullHandler },
        push: { handler: pushHandler }
    });
}

// replicationState is typed as RxReplicationState<TodoDocType, MyCheckpoint>
const replicationState = startReplication(
    myDatabase.todos,
    myPullHandler,
    myPushHandler
);
```

## Pull-Only Replication

With the replication protocol it is possible to do pull only replications where data is pulled from a backend but not pushed from the client. RxDB implements some performance optimizations for these like not storing server metadata on pull only streams.

## Attachment replication

Attachment replication is supported in the RxDB Sync Engine itself. But not all replication plugins support it.
If you start the replication with a collection which has [enabled RxAttachments](./rx-attachment.md) attachment data will be added to all push- and write data.

The pushed documents will contain an `_attachments` object which contains:

- The attachment meta data (id, length, digest) of all non-attachments
- The full attachment data of all attachments that have been updated/added from the client.
- Deleted attachments are spared out in the pushed document.

With this data, the backend can decide onto which attachments must be deleted, added or overwritten.

Accordingly, the pulled document must contain the same data, if the backend has a new document state with updated attachments.

## Storing Local-Only Metadata Alongside Replicated Documents

Sometimes you want to store data on the client that belongs to a replicated document but must never be sent to the server, for example a "read" flag, a draft text or a UI state. Keep in mind how the replication treats document fields:

- Every field of the document schema is part of the replicated document state. When the server sends a newer version of a document, the local document is **replaced** with the server state. A field that only exists on the client is lost at that moment.
- The `_meta` and `_rev` fields are internal to RxDB. They are stripped before documents are pushed and they are not passed to the [conflict handler](./transactions-conflicts-revisions.md#custom-conflict-handler), which only sees the `WithDeleted<RxDocType>` data. RxDB writes `_meta` itself, so you cannot use it for your own data.

There are two ways to store local-only data that survive replication:

### 1. A separate local collection

Create a second [RxCollection](./rx-collection.md) that is not replicated and use the same primary key as the replicated document. This keeps the data queryable and reactive, and a remote update of the replicated document does not touch it.

```ts
await myDatabase.addCollections({
    // replicated with the server
    todos: { schema: todoSchema },
    // never replicated, stores client-only state per todo
    todoLocalState: {
        schema: {
            version: 0,
            primaryKey: 'id', // same value as the todo id
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                isRead: { type: 'boolean' },
                draftText: { type: 'string' }
            },
            required: ['id']
        }
    }
});

await myDatabase.todoLocalState.upsert({ id: 'todo1', isRead: true });
```

### 2. Local documents

For key-value data that does not need queries, use [local documents](./rx-local-document.md). They are stored in a separate storage instance, are never replicated and are not part of the collection schema. They require the `local-documents` plugin and `localDocuments: true` on the collection.

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBLocalDocumentsPlugin } from 'rxdb/plugins/local-documents';
addRxPlugin(RxDBLocalDocumentsPlugin);

await myDatabase.addCollections({
    todos: {
        schema: todoSchema,
        localDocuments: true
    }
});

await myDatabase.todos.upsertLocal('ui-state-todo1', { isRead: true });
const localDoc = await myDatabase.todos.getLocal('ui-state-todo1');
```

A schema field that you strip in the `push.modifier` does not reach the server, but it does not survive a pull either: as soon as the server sends a newer state of the document, the stripped field is gone from the local document. Only use this pattern for data that can be recomputed.
