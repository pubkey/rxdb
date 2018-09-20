# Replication

One of the most powerful features with CouchDB, PouchDB and RxDB is **sync**.
You can sync every RxCollection with another RxCollection, a PouchDB-instance or a remote pouch/couch-DB.


## Rx.Collection.sync()
To replicate the collection with another instance, use `RxCollection.sync()`.
It basically does the same as [pouchdb-sync](https://pouchdb.com/guides/replication.html) but also adds event-handlers to make sure that change-events will be recognized in the internal event-stream.

```js

// you need these plugins to sync
RxDB.plugin(require('pouchdb-adapter-http')); // enable syncing over http (remote database)

const replicationState = myCollection.sync({
    remote: 'http://localhost:10102/db/', // remote database. This can be the serverURL, another RxCollection or a PouchDB-instance
    waitForLeadership: true,              // (optional) [default=true] to save performance, the sync starts on leader-instance only
    direction: {                          // direction (optional) to specify sync-directions
        pull: true, // default=true
        push: true  // default=true
    },
    options: {                             // sync-options (optional) from https://pouchdb.com/api.html#replication
        live: true,
        retry: true
    },
    query: myCollection.find().where('age').gt(18) // query (optional) only documents that match that query will be synchronised
});
```

## RxReplicationState
The method `RxCollection.sync()` returns a RxReplicationState which can be used to observe events via rxjs-observables and to cancel the replication.

### change$
Emits the change-events every time some documents get replicated.

```js
replicationState.change$.subscribe(change => console.dir(change));
```

### docs$
Emits each replicated document-data.

```js
replicationState.docs$.subscribe(docData => console.dir(docData));
```

### denied$
Emits when a document failed to replicate (e.g. due to permissions).

```js
replicationState.denied$.subscribe(docData => console.dir(docData));
```

### active$
Emits `true` or `false` depending if the replication is transmitting data. A `false` value does not imply the connection has died.

```js
replicationState.active$.subscribe(active => console.dir(active));
```

### alive$
Emits `true` or `false` depending if the replication is alive - data is transmitting properly between databases. A `false` value implies the connection has died -if you're replicating to a remote database, for example. It will only emit `false` if there are pending changes that couldn't be replicated -it won't emit immediately after the connection dies.

```js
replicationState.alive$.subscribe(alive => console.dir(alive));
```

### complete$
Emits `true` or `false` depending if the replication is completed.
If you do a `live: true`-sync (default) the replication never completes.
Only one-time-replications will complete.

```js
replicationState.complete$.subscribe(completed => console.dir(completed));
```

### error$
If errors occur during the replication, they will get emitted here.

```js
replicationState.error$.subscribe(error => console.dir(error));
```

### cancel()
Calling this method will cancel the replication.
```js
await replicationState.cancel(); // cancel() is async
```

--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./query-change-detection.md)
