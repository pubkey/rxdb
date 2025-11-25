---
title: RxDB Server - Deploy Your Data
slug: rx-server.html
description: Launch a secure, high-performance server on top of your RxDB database. Enable REST, replication endpoints, and seamless data syncing with RxServer.
---

# RxDB Server

The RxDB Server Plugin makes it possible to spawn a server on top of a RxDB database that offers multiple types of endpoints for various usages. It can spawn basic CRUD REST endpoints or even realtime replication endpoints that can be used by the client devices to replicate data. The RxServer plugin is designed to be used in Node.js but you can also use it in Deno, Bun or the [Electron](./electron-database.md) "main" process. You can use it either as a **standalone server** or add it on top of an **existing http server** (like express) in nodejs.

## Starting a RxServer

To create an `RxServer`, you have to install the `rxdb-server` package with `npm install rxdb-server --save` and then you can import the `createRxServer()` function and create a server on a given [RxDatabase](./rx-database.md) and adapter.

After adding the endpoints to the server, do not forget to call `myServer.start()` to start the actually http-server.

```ts
import { createRxServer } from 'rxdb-server/plugins/server';

/**
 * We use the express adapter which is the one that comes with RxDB core
 * Make sure you have express installed in the correct version!
 * @see https://github.com/pubkey/rxdb-server/blob/master/package.json
 */
import { RxServerAdapterExpress } from 'rxdb-server/plugins/adapter-express';

const myServer = await createRxServer({
    database: myRxDatabase,
    adapter: RxServerAdapterExpress,
    port: 443
});

// add endpoints here (see below)

// after adding the endpoints, start the server
await myServer.start();
```

### Using RxServer with Fastify

There is also a [RxDB Premium 👑](/premium/) adapter to use the RxServer with [Fastify](https://fastify.dev/) instead of express. Fastify has shown to have better performance and in general is more modern.

```ts
import { createRxServer } from 'rxdb-server/plugins/server';
import { RxServerAdapterFastify } from 'rxdb-premium/plugins/server-adapter-fastify';

const myServer = await createRxServer({
    database: myRxDatabase,
    adapter: RxServerAdapterFastify,
    port: 443
});
await myServer.start();
```

### Using RxServer with Koa

There is also a [RxDB Premium 👑](/premium/) adapter to use the RxServer with [Koa](https://koajs.com/) instead of express. Koa has shown to have better performance compared to express.

```ts
import { createRxServer } from 'rxdb-server/plugins/server';
import { RxServerAdapterKoa } from 'rxdb-premium/plugins/server-adapter-koa';

const myServer = await createRxServer({
    database: myRxDatabase,
    adapter: RxServerAdapterKoa,
    port: 443
});
await myServer.start();
```


## RxServer Endpoints

On top of the RxServer you can add different types of **endpoints**. An endpoint is always connected to exactly one [RxCollection](./rx-collection.md) and it only serves data from that single collection.

For now there are only two endpoints implemented, the [replication endpoint](#replication-endpoint) and the [REST endpoint](#rest-endpoint). Others will be added in the future.

An endpoint is added to the server by calling the add endpoint method like `myRxServer.addReplicationEndpoint()`. Each needs a different `name` string as input which will define the resulting endpoint url.

The endpoint urls is a combination of the given `name` and schema `version` of the collection, like `/my-endpoint/0`.

```ts
const myEndpoint = server.addReplicationEndpoint({
    name: 'my-endpoint',
    collection: myServerCollection
});

console.log(myEndpoint.urlPath) // > 'my-endpoint/0'
```

Notice that it is **not required** that the server side schema version is equal to the client side schema version. You might want to change server schemas more often and then only do a [migration](./migration-schema.md) on the server, not on the clients.

## Replication Endpoint

The replication endpoint allows clients that connect to it to replicate data with the server via the [RxDB Sync Engine](./replication.md). There is also the [Replication Server](./replication-server.md) plugin that is used on the client side to connect to the endpoint.

The endpoint is added to the server with the `addReplicationEndpoint()` method. It requires a specific collection and the endpoint will only provided replication for documents inside of that collection.

```ts
// > server.ts
const endpoint = server.addReplicationEndpoint({
    name: 'my-endpoint',
    collection: myServerCollection
});
```

Then you can start the [Server Replication](./replication-server.md) on the client:
```ts
// > client.ts
const replicationState = await replicateServer({
    collection: usersCollection,
    replicationIdentifier: 'my-server-replication',
    url: 'http://localhost:80/my-endpoint/0',
    push: {},
    pull: {}
});
```



## REST endpoint

The REST endpoint exposes various methods to access the data from the RxServer with non-RxDB tools via plain HTTP operations. You can use it to connect apps that are programmed in different programming languages than JavaScript or to access data from other third party tools.

Creating a REST endpoint on a RxServer:
```ts
const endpoint = await server.addRestEndpoint({
    name: 'my-endpoint',
    collection: myServerCollection
});
```

```ts
// plain http request with fetch
const request = await fetch('http://localhost:80/' + endpoint.urlPath + '/query', {
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ selector: {} })
});
const response = await request.json();
```

There is also the `client-rest` plugin that provides type-save interactions with the REST endpoint:

```ts
// using the client (optional)
import { createRestClient } from 'rxdb-server/plugins/client-rest';
const client = createRestClient('http://localhost:80/' + endpoint.urlPath, {/* headers */});
const response = await client.query({ selector: {} });
```

The REST endpoint exposes the following paths:

- **query [POST]**: Fetch the results of a NoSQL query.
- **query/observe [GET]**: Observe a query's results via [Server Send Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).
- **get [POST]**: Fetch multiple documents by their primary key.
- **set [POST]**: Write multiple documents at once.
- **delete [POST]**: Delete multiple documents by their primary key.


## CORS

When creating a server or adding endpoints, you can specify a [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) string.
Endpoint cors always overwrite server cors. The default is the wildcard `*` which allows all requests.

```ts
const myServer = await startRxServer({
    database: myRxDatabase,
    cors: 'http://example.com'
    port: 443
});
const endpoint = await server.addReplicationEndpoint({
    name: 'my-endpoint',
    collection: myServerCollection,
    cors: 'http://example.com'
});
```


## Auth handler

To authenticate users and to make user-specific data available on server requests, an `authHandler` must be provided that parses the headers and returns the actual auth data that is used to authenticate the client and in the [queryModifier](#query-modifier) and [changeValidator](#change-validator).

An auth handler gets the given headers object as input and returns the auth data in the format `{ data: {}, validUntil: 1706579817126}`.
The `data` field can contain any data that can be used afterwards in the queryModifier and changeValidator.
The `validUntil` field contains the unix timestamp in milliseconds at which the authentication is no longer valid and the client will get disconnected.

For example your authHandler could get the `Authorization` header and parse the [JSON web token](https://jwt.io/) to identify the user and store the user id in the `data` field for later use.

## Query modifier

The query modifier is a JavaScript function that is used to restrict which documents a client can fetch or replicate from the server.
It gets the auth data and the actual NoSQL query as input parameter and returns a modified NoSQL query that is then used internally by the server.
You can pass a different query modifier to each endpoint so that you can have different endpoints for different use cases on the same server.

For example you could use a query modifier that get the `userId` from the auth data and then restricts the query to only return documents that have the same `userId` set.

```ts
function myQueryModifier(authData, query) {
    query.selector.userId = { $eq: authData.data.userid };
    return query;
}

const endpoint = await server.addReplicationEndpoint({
    name: 'my-endpoint',
    collection: myServerCollection,
    queryModifier: myQueryModifier
});
```

The RxServer will use the queryModifier at many places internally to determine which queries to run or if a document is allowed to be seen/edited by a client.

:::note
For performance reasons the `queryModifier` and `changeValidator` **MUST NOT** be `async` and return a promise. If you need async data to run them, you should gather that data in  the `RxServerAuthHandler` and store it in the auth data to access it later.
:::

## Change validator

The change validator is a JavaScript function that is used to restrict which document writes are allowed to be done by a client.
For example you could restrict clients to only change specific document fields or to not do any document writes at all.
It can also be used to validate change document data before storing it at the server.

In this example we restrict clients from doing inserts and only allow updates. For that we check if the change contains an `assumedMasterState` property and return false to block the write.

```ts

function myChangeValidator(authData, change) {
    if(change.assumedMasterState) {
        return false;
    } else {
        return true;
    }
}

const endpoint = await server.addReplicationEndpoint({
    name: 'my-endpoint',
    collection: myServerCollection,
    changeValidator: myChangeValidator
});
```


## Server-only indexes

Normal RxDB schema indexes get the `_deleted` field prepended because all [RxQueries](./rx-query.md) automatically only search for documents with `_deleted=false`.
When you use RxDB on a server, this might not be optimal because there can be the need to query for documents where the value of `_deleted` does not matter. Mostly this is required in the [pull.stream$](./replication.md#checkpoint-iteration) of a replication when a [queryModifier](#query-modifier) is used to add an additional field to the query.

To set indexes without `_deleted`, you can use the `internalIndexes` field of the schema like the following:

```json
  {
    "version": 0,
    "primaryKey": "id",
    "type": "object",
    "properties": {
        "id": {
            "type": "string",
            "maxLength": 100
        },
        "name": {
            "type": "string",
            "maxLength": 100
        }
    },
    "internalIndexes": [
        ["name", "id"]
    ]
}
```


:::note
Indexes come with a performance burden. You should only use the indexes you need and make sure you **do not** accidentally set the `internalIndexes` in your client side [RxCollections](./rx-collection.md).
:::

## Server-only fields

All endpoints can be created with the `serverOnlyFields` set which defines some fields to only exist on the server, not on the clients. Clients will not see that fields and cannot do writes where one of the `serverOnlyFields` is set.
Notice that when you use `serverOnlyFields` you likely need to have a different schema on the server than the schema that is used on the clients.

```ts
const endpoint = await server.addReplicationEndpoint({
    name: 'my-endpoint',
    collection: col,
    // here the field 'my-secretss' is defined to be server-only
    serverOnlyFields: ['my-secrets']
});
```

:::note
For performance reasons, only top-level fields can be used as `serverOnlyFields`. Otherwise the server would have to deep-clone all document data which is too expensive.
:::

## Readonly fields

When you have fields that should only be modified by the server, but not by the client, you can ensure that by comparing the fields value in the [changeValidator](#change-validator).

```ts

const myChangeValidator = function(authData, change){
    if(change.newDocumentState.myReadonlyField !== change.assumedMasterState.myReadonlyField){
        throw new Error('myReadonlyField is readonly');
    }
}
```

## $regex queries not allowed

`$regex` queries are not allowed to run at the server to prevent [ReDos Attacks](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS).


## Conflict handling

To [detect and handle conflicts](./replication.md#conflict-handling), the conflict handler from the endpoints RxCollection is used.

## FAQ

<details>
    <summary>Why are the server plugins in a different github repo and npm package?</summary>
    <div>
    The RxServer and its other plugins are in a different github repository because:
    <ul>
        <li>
            It has too many dependencies that you do not want to install if you only use RxDB at the client side
        </li>
        <li>
            It has a different license <a href="https://en.wikipedia.org/wiki/Server_Side_Public_License">(SSPL)</a> to prevent large cloud vendors from "stealing" the revenue, similar to MongoDB's license.
        </li>
    </ul>
    </div>
</details>

<details>
    <summary>Why can't endpoints be added dynamically?</summary>
    <div>
    After `RxServer.start()` is called, you can no longer add endpoints. This is because many of the supported
    server libraries do <a href="https://github.com/fastify/fastify/issues/1771">not allow dynamic routing</a> for performance and security reasons. 
    </div>
</details>
