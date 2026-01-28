---
title: RxDB's CouchDB Replication Plugin
slug: replication-couchdb.html
description: Replicate your RxDB collections with CouchDB the fast way. Enjoy faster sync, easier conflict handling, and flexible storage using this modern plugin.
image: /headers/replication-couchdb.jpg
---

# Replication with CouchDB

A plugin to replicate between a [RxCollection](./rx-collection.md) and a CouchDB server.

This plugins uses the RxDB [Sync Engine](./replication.md) to replicate with a CouchDB endpoint. This plugin **does NOT** use the official [CouchDB replication protocol](https://docs.couchdb.org/en/stable/replication/protocol.html) because the CouchDB protocol was optimized for server-to-server replication and is not suitable for fast client side applications, mostly because it has to run many HTTP-requests (at least one per document) and also it has to store the whole revision tree of the documents at the client. This makes initial replication and querying very slow.

Because the way how RxDB handles revisions and documents is very similar to CouchDB, using the RxDB replication with a CouchDB endpoint is pretty straightforward.

## Pros

- Faster initial replication.
- Works with any [RxStorage](./rx-storage.md), not just [PouchDB](./rx-storage-pouchdb.md).
- Easier conflict handling because conflicts are handled during replication and not afterwards.
- Does not have to store all document revisions on the client, only stores the newest version.

## Cons

- Does not support the replication of [attachments](./rx-attachment.md).
- Like all CouchDB replication plugins, this one is also limited to replicating 6 collections in parallel. [Read this for workarounds](./replication-couchdb.md#limitations)


## Usage

Start the replication via `replicateCouchDB()`.

```ts
import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';

const replicationState = replicateCouchDB(
    {
        replicationIdentifier: 'my-couchdb-replication',
        collection: myRxCollection,
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
            modifier: docData => {/* ... */}, 
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
            batchSize: 60,
            /**
             * Custom modifier to mutate documents
             * before sending them to the CouchDB endpoint.
             * (optional)
             */
            modifier: docData => {/* ... */} 
        }
    }
);
```

When you call `replicateCouchDB()` it returns a `RxCouchDBReplicationState` which can be used to subscribe to events, for debugging or other functions. It extends the [RxReplicationState](./replication.md) so any other method that can be used there can also be used on the CouchDB replication state.

## Conflict handling

When conflicts appear during replication, the `conflictHandler` of the `RxCollection` is used, equal to the other replication plugins. Read more about conflict handling [here](./replication.md#conflict-handling).

## Auth example

Lets say for authentication you need to add a [bearer token](https://swagger.io/docs/specification/authentication/bearer-authentication/) as HTTP header to each request. You can achieve that by crafting a custom `fetch()` method that add the header field.


```ts

const myCustomFetch = (url, options) => {

    // flat clone the given options to not mutate the input
    const optionsWithAuth = Object.assign({}, options);
    // ensure the headers property exists
    if(!optionsWithAuth.headers) {
        optionsWithAuth.headers = {};
    }
    // add bearer token to headers
    optionsWithAuth.headers['Authorization'] ='Basic S0VLU0UhIExFQ0...';

    // call the original fetch function with our custom options.
    return fetch(
        url,
        optionsWithAuth
    );
};

const replicationState = replicateCouchDB(
    {
        replicationIdentifier: 'my-couchdb-replication',
        collection: myRxCollection,
        url: 'http://example.com/db/humans',
        /**
         * Add the custom fetch function here.
         */
        fetch: myCustomFetch,
        pull: {},
        push: {}
    }
);
```

Also when your bearer token changes over time, you can set a new custom `fetch` method while the replication is running:

```ts
replicationState.fetch = newCustomFetchMethod;
```

Also there is a helper method `getFetchWithCouchDBAuthorization()` to create a fetch handler with authorization:

```ts

import { 
    replicateCouchDB,
    getFetchWithCouchDBAuthorization
} from 'rxdb/plugins/replication-couchdb';

const replicationState = replicateCouchDB(
    {
        replicationIdentifier: 'my-couchdb-replication',
        collection: myRxCollection,
        url: 'http://example.com/db/humans',
        /**
         * Add the custom fetch function here.
         */
        fetch: getFetchWithCouchDBAuthorization('myUsername', 'myPassword'),
        pull: {},
        push: {}
    }
);
```


## Limitations

Since CouchDB only allows synchronization through HTTP1.1 long polling requests there is a limitation of 6 active synchronization connections before the browser prevents sending any further request. This limitation is at the level of browser per tab per domain (some browser, especially older ones, might have a different limit, [see here](https://docs.pushtechnology.com/cloud/latest/manual/html/designguide/solution/support/connection_limitations.html)).

Since this limitation is at the **browser** level there are several solutions:
 - Use only a single database for all entities and set a "type" field for each of the documents
 - Create multiple subdomains for CouchDB and use a max of 6 active synchronizations (or less) for each
 - Use a proxy (ex: HAProxy) between the browser and CouchDB and configure it to use HTTP2.0, since HTTP2.0 

If you use nginx in front of your CouchDB, you can use these settings to enable http2-proxying to prevent the connection limit problem:
```
server {
    http2 on;
    location /db {
        rewrite /db/(.*) /$1 break;
        proxy_pass http://172.0.0.1:5984;
        proxy_redirect off;
        proxy_buffering off;
        proxy_set_header Host            $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded
        proxy_set_header Connection "keep_alive"
    }
}
```

## Known problems

### Database missing

In contrast to PouchDB, this plugin **does NOT** automatically create missing CouchDB databases.
If your CouchDB server does not have a database yet, you have to create it by yourself by running a `PUT` request to the database `name` url:

```ts
// create a 'humans' CouchDB database on the server
const remoteDatabaseName = 'humans';
await fetch(
    'http://example.com/db/' + remoteDatabaseName,
    {
        method: 'PUT'
    }
);
```

## React Native

React Native does not have a global `fetch` method. You have to import fetch method with the [cross-fetch](https://www.npmjs.com/package/cross-fetch) package:

```ts
import crossFetch from 'cross-fetch';
const replicationState = replicateCouchDB(
    {
        replicationIdentifier: 'my-couchdb-replication',
        collection: myRxCollection,
        url: 'http://example.com/db/humans',
        fetch: crossFetch,
        pull: {},
        push: {}
    }
);
```
