# Websocket Replication

> With the websocket replication plugin, you can spawn a websocket server from a RxDB database in Node.js and replicate with it.

# Websocket Replication

With the websocket replication plugin, you can spawn a websocket server from a RxDB database in Node.js and replicate with it.

:::note
The websocket replication plugin does not have any concept for authentication or permission handling. It is designed to create an easy **server-to-server** replication. It is **not** made for client-server replication. Make a pull request if you need that feature.
:::

## Starting the Websocket Server

```ts
import { createRxDatabase } from 'rxdb';
import {
    startWebsocketServer
} from 'rxdb/plugins/replication-websocket';

// create a RxDatabase like normal
const myDatabase = await createRxDatabase({/* ... */});

// start a websocket server
const serverState = await startWebsocketServer({
    database: myDatabase,
    port: 1337,
    path: '/socket'
});

// stop the server
await serverState.close();
```

## Connect to the Websocket Server

The replication has to be started once for each collection that you want to replicate.

```ts
import {
    replicateWithWebsocketServer
} from 'rxdb/plugins/replication-websocket';

// start the replication
const replicationState = await replicateWithWebsocketServer({
    /**
     * To make the replication work,
     * the client collection name must be equal
     * to the server collection name.
     */
    collection: myRxCollection,
    url: 'ws://localhost:1337/socket'
});

// stop the replication
await replicationState.cancel();
```

## Customize

We use the [ws](https://www.npmjs.com/package/ws) npm library, so you can use all optional configuration provided by it.
This is especially important to improve performance by opting in of some optional settings.
