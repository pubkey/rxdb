# Replication

One of the most powerful features with CouchDB, PouchDB and RxDB is **sync**.
You can sync every RxCollection with another RxCollection, a PouchDB-instance or a remote pouch/couch-DB.


## Rx.Collection.sync()
To replicate the collection with another instance, use `RxCollection.sync()`.
It basically does the same as [pouchdb-sync](https://pouchdb.com/guides/replication.html) but also adds event-handlers to make sure that change-events will be recognized in the internal event-stream.

```js

// you need these plugins to sync
addRxPlugin(require('pouchdb-adapter-http')); // enable syncing over http (remote database)

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

## Limitations
Since CouchDB only allows synchronization through HTTP1.1 long polling requests there is a limitation of 6 active synchronization connections before the browser prevents sending any further request. This limitation is at the level of browser per tab per domain (some browser, especially older ones, might have a different limit, [see here](https://docs.pushtechnology.com/cloud/latest/manual/html/designguide/solution/support/connection_limitations.html)).

Since this limitation is at the **browser** level there are several solutions:
 1. Use a proxy (ex: HAProxy) between the browser and CouchDB and configure it to use HTTP2.0, since HTTP2.0 doesn't have this limitation (RECOMMENDED)
 2. Use only a single database for all entities and set a "type" field for each of the documents
 3. Create multiple subdomains for CouchDB and use a max of 6 active synchronizations (or less) for each

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

### awaitInitialReplication()

Returns a `Promise` that resolves when the initial replication is done and the data is equal to replication goal.
This only works on non-live replications and when `waitForLeadership: false`

```js
const repState = await myCollection.sync({
  remote: 'http://localhost:8080/db',
  waitForLeadership: false,
  options: {
    live: false
  }
});
await repState.awaitInitialReplication();
```


### cancel()
Calling this method will cancel the replication.
```js
await replicationState.cancel(); // cancel() is async
```

## Known problems and workarounds
  - When you do many writes in parallen and replicate them. Your replication might stuck because it reaches the maxSockets value of nodejs. You can increase it by setting
```js
require('http').globalAgent.maxSockets = 10;
```  
  - Especially when you replicate big attachments, you might get a stuck or slow replication. [See](https://pouchdb.com/errors.html#replicating_attachments_slow). You can solve this be changing the batches configuration.
```js
const replicationState = await myCollection.sync({
    remote: 'http://...',
    options: {
        retry: true,
        batch_size: 1, // only transfer one document per batch
        batches_limit: 1 // only one batch in parrallel
    }
}); 
```
  - When you replicate attachments bigger then `1mb` you might cause the replication to stuck. This is an unsolved problem with pouchdb that requires further analysis. It is recommended to not store attachments bigger then `1mb` when using the replication.

--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./replication-graphql.md)
