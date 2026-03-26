---
title: Websocket Replication
slug: replication-websocket.html
description: Spawn a WebSocket replication server from a RxDB Node.js database and replicate data between server instances in real time.
image: /headers/replication-websocket.jpg
---

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

## FAQ

<details>
<summary>What is the WebSocket protocol and how does it differ from HTTP?</summary>

The WebSocket protocol operates over a persistent, full-duplex TCP connection, fundamentally differing from standard HTTP's stateless, unidirectional request-response model. While traditional HTTP requires the client to initiate every exchange and constantly re-send heavy headers, WebSockets remain open indefinitely, allowing the server to push real-time data events down to the client with mere bytes of overhead, which is vital for high-throughput database [Replication](./replication.md).
</details>

<details>
<summary>When should you use Server-Sent Events (SSE) vs WebSockets?</summary>

WebSockets should be used when your application demands heavy, bidirectional communication such as live chat, multiplayer gaming, or synchronous database multi-master replication. You should opt for [Server-Sent Events (SSE)](./articles/websockets-sse-polling-webrtc-webtransport.md) if your communication is strictly unidirectional (server-to-client) like delivering live sports scores or stock tickers, as SSE works natively over traditional HTTP/1.1 connections without encountering common corporate firewall and proxy blocks.
</details>

<details>
<summary>Does OpenAI and ChatGPT use WebSockets or Server-Sent Events for streaming?</summary>

OpenAI and ChatGPT rely heavily on [Server-Sent Events (SSE)](./articles/websockets-sse-polling-webrtc-webtransport.md) rather than WebSockets to stream their generative text responses. Because LLM generation is inherently a unidirectional operation (the server generating and streaming tokens down to the client after an initial prompt), SSE is the perfect fit. It drastically reduces server overhead by utilizing standard HTTP/1.1 connections and avoids the bidirectional complexities, strict statefulness, and proxy-blocking issues commonly associated with persistent WebSocket streams.
</details>
<details>
<summary>How does long polling differ from traditional polling and WebSockets?</summary>

Traditional polling requests data at fixed intervals regardless of state changes, wasting bandwidth and battery. Long polling holds the HTTP connection open until the server has new data or a timeout occurs, simulating a push. Unlike WebSockets, which establish a single, continuous, bidirectional TCP stream, both polling methods are strictly unidirectional and incur the overhead of re-establishing TCP handshakes and heavy HTTP headers for every discrete data event.
</details>

<details>
<summary>What are the best load balancing solutions for scaling WebSocket connections?</summary>

Scaling WebSockets requires load balancers that support persistent TCP connections and protocol upgrades (like HAProxy, NGINX, or AWS ALB). Because WebSockets are heavily stateful, you must configure sticky sessions (Session Affinity) to ensure a client's continuous stream routes to the exact same backend node. For distributing real-time replication events globally across multiple horizontal backend nodes, integrating a secondary Pub/Sub mechanism (like Redis Pub/Sub) is highly recommended.
</details>

<details>
<summary>Do service worker fetch events intercept WebSocket connections?</summary>

No, Service Worker `fetch` events do not intercept WebSocket connections. The `fetch` event handler in a Service Worker is strictly designed to intercept standard HTTP/HTTPS requests. If you require offline caching or Request interception for your real-time data stream, you must intercept the initial REST calls or implement a custom sync queue inside the Service Worker, which is an architectural pattern databases like **[RxDB](./rx-database.md)** handle inherently on the client side without relying on Service Workers for WS persistence.
</details>

<details>
<summary>Are WebSockets significantly faster or more expensive than standard HTTP polling?</summary>

WebSockets are significantly faster (lower latency) because they eliminate the HTTP request/response header overhead for every message, pushing data instantly down an open TCP pipe. However, they are more "expensive" on the server side in terms of memory utilization; each open WebSocket connection consumes a dedicated file descriptor and RAM on the server indefinitely, making massive horizontal scaling more complex and costly compared to completely stateless HTTP polling endpoints.
</details>

<details>
<summary>How many Server-Sent Events or WebSocket connections can a server handle per client?</summary>

According to the HTTP/1.1 specification (RFC 2616), browsers traditionally limit clients to a maximum of 6 concurrent connections per domain. This limit is rigidly shared across all open tabs. If a user opens 7 tabs connecting to the same WebSocket or SSE endpoint, the 7th tab will stall indefinitely. To bypass this, sophisticated real-time architectures (like **[RxDB](./rx-database.md)**) utilize [Leader Election](./leader-election.md) via the BroadcastChannel API to designate a single tab to maintain the active Socket connection, sharing the data pipeline across all other passive tabs locally.
</details>
