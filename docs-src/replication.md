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

- **pullHandler** Returns all documents that have been written **after** the given checkpoint. Also returns the checkpoint of the latest written returned document.
- **pushHandler** a method that can be called by the client to send client side writes to the master. It gets the `assumedMasterState` and the `newForkState` as input. It must return the master document states of all conflicts.
- **pullStream** an observable that emits all master writes and the latest checkpoint of the write batches.


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
A checkpoint is a subset of the field of the last pulled document. When the checkpoint is send to the backend via `pullHandler()`, the backend must be able to respond with all documents that have been written **after** the given checkpoint.
For example if your documents contain an `id` and an `updatedAt` field, these two can be used as checkpoint.

When the checkpoint iteration reaches the last checkpoint, it will automatically switch to the `event observation` mode.
  
### Event observation

While the client is connected to the backend, the events from the backend are observed via `pullStream$` and persisted to the client.

If your backend for any reason is not able to provide a full `pullStream$` that contains all events and the checkpoint, you can instead only emit `RESYNC` events that tell RxDB that anything unknown has changed on the server and it should run the pull replication via `checkpoint iteration`.

When the client goes offline and online again, it might happen that the `pullStream$` has missed out some events. Therefore the `pullStream$` should also emit a `RESYNC` event each time the client reconnects.

## Data layout on the server

To use the replication you first have to ensure that:
- **documents are deterministic sortable by their last write time**

  *deterministic* means that even if two documents have the same *last write time*, they have a predictable sort order.
    This is most often ensured by using the *primaryKey* as second sort parameter as part of the checkpoint.

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

Then your data is always sortable by `updatedAt`. This ensures that when RxDB fetches 'new' changes via `pullHandler()`, it can send the latest `updatedAt+id` checkpoint to the remote endpoint and then recieve all newer documents.

The deleted field must always be exactly `_deleted`. If your remote endpoint uses a different field to mark deleted documents, you have to map the fields in the handlers.

## Conflict handling


When multiple clients (or the server) modify the same document at the same time (or when they are offline), it can happen that a conflict arises during the replication.

```
A---B1---C1---X    master/server state
     \       /
      B1---C2      fork/client state
```

In the case above, the client would tell hte master to move the document state from `B1` to `C2` by calling `pushHandler()`. But because the actual master state is `C1` and not `B1`, the master would reject the write by sending back the actual master state `C1`. 
**RxDB resolves all conflicts on the client** so it would call the conflict handler of the `RxCollection` and create a new document state `D` that can then be written to the master.

```
A---B1---C1---X---D    master/server state
     \       / \ /
      B1---C2---D      fork/client state
```

The default conflict handler will always drop the fork state and use the master state. This ensures that clients that are offline for a very long time, do not accidentially overwrite other peoples changes when they go online again.
You can specify a custom conflict handler by setting the property `conflictHandler` when calling `addCollection()`.

## Multi Tab support

For better performance, the replication runs only in one instance when RxDB is used in multiple browser tabs or Node.js processes.
By setting `waitForLeadership: false` you can enforce that each tab runs its own replication cycles.
If used in a multi instance setting, so when at database creation `multiInstance: false` was not set,
you need to import the [leader election plugin](./leader-election.md) so that RxDB can know how many instances exist and which browser tab should run the replication.


## Limitations

 * At the moment it is not possible to replicate [attachments](./rx-attachment.md), make a pull request if you need this.
 * It is not possible to do a multi-master replication, like with CouchDB. RxDB always assumes that the backend is the single source of truth.
