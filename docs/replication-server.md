# RxDB Server Replication

> The *Server Replication Plugin* connects to the replication endpoint of an [RxDB Server Replication Endpoint](./rx-server.md#replication-endpoint) and replicates data between the client and the server.

# RxDB Server Replication

The *Server Replication Plugin* connects to the replication endpoint of an [RxDB Server Replication Endpoint](./rx-server.md#replication-endpoint) and replicates data between the client and the server.

## Usage

The replication server plugin is imported from the `rxdb-server` npm package. Then you start the replication with a given collection and endpoint url by calling `replicateServer()`.

```ts
import { replicateServer } from 'rxdb-server/plugins/replication-server';

const replicationState = await replicateServer({
    collection: usersCollection,
    replicationIdentifier: 'my-server-replication',
    url: 'http://localhost:80/users/0', // endpoint url with the servers collection schema version at the end
    headers: {
        Authorization: 'Bearer S0VLU0UhI...'
    },
    push: {},
    pull: {},
    live: true
});
```

## outdatedClient$

When you update your schema at the server and run a migration, you end up with a different replication url that has a new schema version number at the end.
Your clients might still be running an old version of your application that will no longer be compatible with the endpoint. Therefore when the client tries to call a server endpoint with an outdated schema version, the `outdatedClient$` observable emits to tell your client that the application must be updated. With that event you can tell the client to update the application.
On browser application you might want to just reload the page on that event:

```ts
replicationState.outdatedClient$.subscribe(() => {
    location.reload();
});
```

## unauthorized$

When you clients auth data is not valid (or no longer valid), the server will no longer accept any requests from you client and inform the client that the auth headers must be updated.
The `unauthorized$` observable will emit and expects you to update the headers accordingly so that following requests will be accepted again.

```ts
replicationState.unauthorized$.subscribe(() => {
    replicationState.setHeaders({
        Authorization: 'Bearer S0VLU0UhI...'
    });
});
```

## forbidden$

When you client behaves wrong in any case, like update non-allowed values or changing documents that it is not allowed to,
the server will drop the connection and the replication state will emit on the `forbidden$` observable.
It will also automatically stop the replication so that your client does not accidentally DOS attack the server.

```ts
replicationState.forbidden$.subscribe(() => {
    console.log('Client is behaving wrong');
});
```

## Custom EventSource implementation

For the server send events, the [eventsource](https://github.com/EventSource/eventsource) npm package is used instead of the native `EventSource` API. We need this because the native browser API does not support sending headers with the request which is required by the server to parse the auth data.

If the eventsource package does not work for you, you can set an own implementation when creating the replication.

```ts
const replicationState = await replicateServer({
    /* ... */
    eventSource: MyEventSourceConstructor
    /* ... */
});
```
