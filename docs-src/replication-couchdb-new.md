# Replication with CouchDB (new, beta)

This plugins uses the RxDB [replication protocol](./replication.md) to replicate with a CouchDB endpoint. In contrast to the old [PouchDB-CouchDB Plugin](./replication-couchdb.md), this one **does NOT** use the official [CouchDB replication protocol](https://docs.couchdb.org/en/3.2.2-docs/replication/protocol.html). The CouchDB protocol was optimized for server-to-server replication and is not suitable for fast client side applications, mostly because it has to run many HTTP-requests (at least one per document) and also it has to store the whole revision tree of the documents at the client. This makes initial replication and querying very slow.

Because the way how RxDB handles revisions and documents is very similar to CouchDB, using the RxDB replication with a CouchDB endpoint is pretty straightforward.

## Pros

- Faster inital replication.
- Works with any [RxStorage](./rx-storage.md), not just PouchDB.
- Easier conflict handling because conflicts are handled during replication and not afterwards.
- Does not have to store all document revisions on the client, only stores the newest version.

## Cons

- Does not support the replication of [attachments](./rx-attachment.md).
- Like all CouchDB replication plugins, this one is also limited to replicating 6 collections in parallel. [Read this for workarounds](./replication-couchdb.md#limitations)


## Usage

To enable the CouchDB replication, you have to add the `replication-couchdb-new` plugin.

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBReplicationCouchDBNewPlugin } from 'rxdb/plugins/replication-couchdb-new';
addRxPlugin(RxDBReplicationCouchDBNewPlugin);
```

Then you can start the replication va `RxCollection().syncCouchDBNew()`

```ts

const replicationState = collection.syncCouchDBNew({
    // url to the CouchDB endpoint (required)
    url: 'http://example.com/db/humans',
    /**
     * true for live replication,
     * false for a one-time replication.
     * [default=true]
     */
    live: true,
    /**
     * A custom fetch() method can be provided
     * to add authentication or credentials.
     * Can be swapped out dynamically
     * by running 'replicationState.fetch = newFetchMethod;'.
     * (optional)
     */
    fetch: myCustomFetchMethod,
    pull: {
        /**
         * Amount of documents to be fetched in one HTTP request
         * (optional)
         */
        batchSize: 60,
        /**
         * Custom modifier to mutate pulled documents
         * before storing them in RxDB.
         * (optional)
         */
        modifier: docData => {/* ... */} 
        /**
         * Heartbeat time in milliseconds
         * for the long polling of the changestream.
         * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/changes.html
         * (optional, default=60000)
         */
        heartbeat: 60000
    },
    push: {
        /**
         * How many local changes to process at once.
         * (optional)
         */
        batchSize: 60;
        /**
         * Custom modifier to mutate documents
         * before sending them to the CouchDB endpoint.
         * (optional)
         */
        modifier: docData => {/* ... */} 
    }
});
```

When you call `myCollection.syncCouchDBNew()` it returns a `RxCouchDBNewReplicationState` which can be used to subscribe to events, for debugging or other functions. It extends the [RxReplicationState](./replication.md) so any other method that can be used there can also be used on the CouchDB replication state.


## Known problems

In contrast to PouchDB, this plugin **does NOT** automatically create missing CouchDB databases.
If your CouchDB server does not have a database yet, you have to create it by yourself by running a `PUT` request to the database name url:

```ts
// create a 'humans' CouchDB database on the server
await fetch(
    'http://example.com/db/humans',
    {
        method: 'PUT'
    }
);
```
