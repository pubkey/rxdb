---
title: WebSockets vs Server-Sent-Events vs Long-Polling vs WebRTC vs WebTransport
slug: websockets-sse-polling-webrtc-webtransport.html
description: Learn the unique benefits and pitfalls of each real-time tech. Make informed decisions on WebSockets, SSE, Polling, WebRTC, and WebTransport.
image: /headers/websockets-sse-polling-webrtc-webtransport.jpg
---
# WebSockets vs Server-Sent-Events vs Long-Polling vs WebRTC vs WebTransport


For modern real-time web applications, the ability to send events from the server to the client is indispensable. This necessity has led to the development of several methods over the years, each with its own set of advantages and drawbacks. Initially, [long-polling](#what-is-long-polling) was the only option available. It was then succeeded by [WebSockets](#what-are-websockets), which offered a more robust solution for bidirectional communication. Following WebSockets, [Server-Sent Events (SSE)](#what-are-server-sent-events) provided a simpler method for one-way communication from server to client. Looking ahead, the [WebTransport](#what-is-the-webtransport-api) protocol promises to revolutionize this landscape even further by providing a more efficient, flexible, and scalable approach. For niche use cases, [WebRTC](#what-is-webrtc) might also be considered for server-client events.

This article aims to delve into these technologies, comparing their performance, highlighting their benefits and limitations, and offering recommendations for various use cases to help developers make informed decisions when building real-time web applications. It is a condensed summary of my gathered experience when I implemented the [RxDB Sync Engine](../replication.md) to be compatible with various backend technologies.

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>


### What is Long Polling?

Long polling was the first "hack" to enable a server-client messaging method that can be used in browsers over HTTP. The technique emulates server push communications with normal XHR requests. Unlike traditional polling, where the client repeatedly requests data from the server at regular intervals, long polling establishes a connection to the server that remains open until new data is available. Once the server has new information, it sends the response to the client, and the connection is closed. Immediately after receiving the server's response, the client initiates a new request, and the process repeats. This method allows for more immediate data updates and reduces unnecessary network traffic and server load. However, it can still introduce delays in communication and is less efficient than other real-time technologies like WebSockets.

```js
// long-polling in a JavaScript client
function longPoll() {
    fetch('http://example.com/poll')
        .then(response => response.json())
        .then(data => {
            console.log("Received data:", data);
            longPoll(); // Immediately establish a new long polling request
        })
        .catch(error => {
            /**
             * Errors can appear in normal conditions when a 
             * connection timeout is reached or when the client goes offline.
             * On errors we just restart the polling after some delay.
             */
            setTimeout(longPoll, 10000);
        });
}
longPoll(); // Initiate the long polling
```

Implementing long-polling on the client side is pretty simple, as shown in the code above. However on the backend there can be multiple difficulties to ensure the client receives all events and does not miss out updates when the client is currently reconnecting.

### What are WebSockets?

[WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket?retiredLocale=de) provide a full-duplex communication channel over a single, long-lived connection between the client and server. This technology enables browsers and servers to exchange data without the overhead of HTTP request-response cycles, facilitating real-time data transfer for applications like live chat, gaming, or financial trading platforms. WebSockets represent a significant advancement over traditional HTTP by allowing both parties to send data independently once the connection is established, making it ideal for scenarios that require low latency and high-frequency updates.

```js
// WebSocket in a JavaScript client
const socket = new WebSocket('ws://example.com');

socket.onopen = function(event) {
  console.log('Connection established');
  // Sending a message to the server
  socket.send('Hello Server!');
};

socket.onmessage = function(event) {
  console.log('Message from server:', event.data);
};
```

While the basics of the WebSocket API are easy to use it has shown to be rather complex in production. A socket can loose connection and must be re-created accordingly. Especially detecting if a connection is still usable or not, can be very tricky. Mostly you would add a [ping-and-pong](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#pings_and_pongs_the_heartbeat_of_websockets) heartbeat to ensure that the open connection is not closed.
This complexity is why most people use a library on top of WebSockets like [Socket.IO](https://socket.io/) which handles all these cases and even provides fallbacks to long-polling if required.

### What are Server-Sent-Events?

Server-Sent Events (SSE) provide a standard way to push server updates to the client over HTTP. Unlike WebSockets, SSEs are designed exclusively for one-way communication from server to client, making them ideal for scenarios like live news feeds, sports scores, or any situation where the client needs to be updated in real time without sending data to the server.

You can think of Server-Sent-Events as a single HTTP request where the backend does not send the whole body at once, but instead keeps the connection open and trickles the answer by sending a single line each time an event has to be send to the client.

Creating a connection for receiving events with SSE is straightforward. On the client side in a browser, you initialize an [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) instance with the URL of the server-side script that generates the events.

Listening for messages involves attaching event handlers directly to the EventSource instance. The API distinguishes between generic message events and named events, allowing for more structured communication. Here's how you can set it up in JavaScript:

```js
// Connecting to the server-side event stream
const evtSource = new EventSource("https://example.com/events");

// Handling generic message events
evtSource.onmessage = event => {
    console.log('got message: ' + event.data);
};
```

In difference to WebSockets, an EventSource will automatically reconnect on connection loss.

On the server side, your script must set the `Content-Type` header to `text/event-stream` and format each message according to the [SSE specification](https://www.w3.org/TR/2012/WD-eventsource-20120426/). This includes specifying event types, data payloads, and optional fields like event ID and retry timing.

Here's how you can set up a simple SSE endpoint in a Node.js Express app:

```ts
import express from 'express';
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const sendEvent = (data) => {
        // all message lines must be prefixed with 'data: '
        const formattedData = `data: ${JSON.stringify(data)}\n\n`;
        res.write(formattedData);
    };

    // Send an event every 2 seconds
    const intervalId = setInterval(() => {
        const message = {
            time: new Date().toTimeString(),
            message: 'Hello from the server!',
        };
        sendEvent(message);
    }, 2000);

    // Clean up when the connection is closed
    req.on('close', () => {
        clearInterval(intervalId);
        res.end();
    });
});
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
```

### What is the WebTransport API?

WebTransport is a cutting-edge API designed for efficient, low-latency communication between web clients and servers. It leverages the [HTTP/3 QUIC protocol](https://en.wikipedia.org/wiki/HTTP/3) to enable a variety of data transfer capabilities, such as sending data over multiple streams, in both reliable and unreliable manners, and even allowing data to be sent out of order. This makes WebTransport a powerful tool for applications requiring high-performance networking, such as real-time gaming, live streaming, and collaborative platforms. However, it's important to note that WebTransport is currently a working draft and has not yet achieved widespread adoption.
As of now (March 2024), WebTransport is in a [Working Draft](https://w3c.github.io/webtransport/) and not widely supported. You cannot yet use WebTransport in the [Safari browser](https://caniuse.com/webtransport) and there is also no native support [in Node.js](https://github.com/w3c/webtransport/issues/511). This limits its usability across different platforms and environments.

Even when WebTransport will become widely supported, its API is very complex to use and likely it would be something where people build libraries on top of WebTransport, not using it directly in an application's sourcecode.

### What is WebRTC?

[WebRTC](https://webrtc.org/) (Web Real-Time Communication) is an open-source project and API standard that enables real-time communication (RTC) capabilities directly within web browsers and mobile applications without the need for complex server infrastructure or the installation of additional plugins. It supports peer-to-peer connections for streaming audio, video, and data exchange between browsers. [WebRTC](../replication-webrtc.md) is designed to work through NATs and firewalls, utilizing protocols like ICE, STUN, and TURN to establish a connection between peers.

While WebRTC is made to be used for client-client interactions, it could also be leveraged for server-client communication where the server just simulated being also a client. This approach only makes sense for niche use cases which is why in the following WebRTC will be ignored as an option.

The problem is that for WebRTC to work, you need a signaling-server anyway which would then again run over websockets, SSE or WebTransport. This defeats the purpose of using WebRTC as a replacement for these technologies.

## Limitations of the technologies

### Sending Data in both directions

Only WebSockets and WebTransport allow to send data in both directions so that you can receive server-data and send client-data over the same connection.

While it would also be possible with **Long-Polling** in theory, it is not recommended because sending "new" data to an existing long-polling connection would require
to do an additional http-request anyway. So instead of doing that you can send data directly from the client to the server with an additional http-request without interrupting
the long-polling connection.

**Server-Sent-Events** do not support sending any additional data to the server. You can only do the initial request, and even there you cannot send POST-like data in the http-body by default with the native [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource). Instead you have to put all data inside of the url parameters which is considered a bad practice for security because credentials might leak into server logs, proxies and caches. To fix this problem, [RxDB](https://rxdb.info/) for example uses the [eventsource polyfill](https://github.com/EventSource/eventsource) instead of the native `EventSource API`. This library adds additional functionality like sending **custom http headers**. Also there is [this library](https://github.com/Azure/fetch-event-source) from microsoft which allows to send body data and use `POST` requests instead of `GET`.

### 6-Requests per Domain Limit

Most modern browsers allow six connections per domain () which limits the usability of all steady server-to-client messaging methods. The limitation of six connections is even shared across browser tabs so when you open the same page in multiple tabs, they would have to shared the six-connection-pool with each other. This limitation is part of the HTTP/1.1-RFC (which even defines a lower number of only two connections).

> Quote From [RFC 2616 - Section 8.1.4](https://www.w3.org/Protocols/rfc2616/rfc2616-sec8.html#sec8.1.4): "Clients that use persistent connections SHOULD limit the number of simultaneous connections that they maintain to a given server. A single-user client SHOULD NOT maintain more than **2 connections** with any server or proxy. A proxy SHOULD use up to 2*N connections to another server or proxy, where N is the number of simultaneously active users. These guidelines are intended to improve HTTP response times and avoid congestion."

While that policy makes sense to prevent website owners from using their visitors to D-DOS other websites, it can be a big problem when multiple connections are required to handle server-client communication for legitimate use cases. To workaround the limitation you have to use HTTP/2 or HTTP/3 with which the browser will only open a single connection per domain and then use multiplexing to run all data through a single connection. While this gives you a virtually infinity amount of parallel connections, there is a [SETTINGS_MAX_CONCURRENT_STREAMS](https://www.rfc-editor.org/rfc/rfc7540#section-6.5.2) setting which limits the actually connections amount. The default is 100 concurrent streams for most configurations.

In theory the connection limit could also be increased by the browser, at least for specific APIs like EventSource, but the issues have been marked as "won't fix" by [chromium](https://issues.chromium.org/issues/40329530) and [firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=906896).

:::note Lower the amount of connections in Browser Apps
When you build a browser application, you have to assume that your users will use the app not only once, but in multiple browser tabs in parallel.
By default you likely will open one server-stream-connection per tab which is often not necessary at all. Instead you open only a single connection and shared it between tabs, no matter how many tabs are open. [RxDB](https://rxdb.info/) does that with the [LeaderElection](../leader-election.md) from the [broadcast-channel npm package](https://github.com/pubkey/broadcast-channel) to only have one stream of replication between server and clients. You can use that package standalone (without RxDB) for any type of application.
:::

### Connections are not kept open on mobile apps


In the context of mobile applications running on operating systems like Android and iOS, maintaining open connections, such as those used for WebSockets and the others, poses a significant challenge. Mobile operating systems are designed to automatically move applications into the background after a certain period of inactivity, effectively closing any open connections. This behavior is a part of the operating system's resource management strategy to conserve battery and optimize performance. As a result, developers often rely on **mobile push notifications** as an efficient and reliable method to send data from servers to clients. Push notifications allow servers to alert the application of new data, prompting an action or update, without the need for a persistent open connection.

### Proxies and Firewalls

From consulting many [RxDB](https://rxdb.info/) users, it was shown that in enterprise environments (aka "at work") it is often hard to implement a WebSocket server into the infrastructure because many proxies and firewalls block non-HTTP connections. Therefore using the Server-Sent-Events provides and easier way of enterprise integration. Also long-polling uses only plain HTTP-requests and might be an option.

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## Performance Comparison

Comparing the performance of WebSockets, Server-Sent Events (SSE), Long-Polling and WebTransport directly involves evaluating key aspects such as latency, throughput, server load, and scalability under various conditions.

First lets look at the raw numbers. A good performance comparison can be found in [this repo](https://github.com/Sh3b0/realtime-web?tab=readme-ov-file#demos) which tests the messages times in a [Go Lang](https://go.dev/) server implementation. Here we can see that the performance of WebSockets, WebRTC and WebTransport are comparable:

<center>
    <a href="https://github.com/Sh3b0/realtime-web?tab=readme-ov-file#demos" target="_blank">
        <img src="../files/websocket-webrtc-webtransport-performance.png" alt="WebSocket WebRTC WebTransport Performance" width="360" />
    </a>
</center>

:::note
Remember that WebTransport is a pretty new technology based on the also new HTTP/3 protocol. In the future (after March 2024) there might be more performance optimizations. Also WebTransport is optimized to use less power which metric is not tested.
:::

Lets also compare the Latency, the throughput and the scalability:

### Latency
- **WebSockets**: Offers the lowest latency due to its full-duplex communication over a single, persistent connection. Ideal for real-time applications where immediate data exchange is critical.
- **Server-Sent Events**: Also provides low latency for server-to-client communication but cannot natively send messages back to the server without additional HTTP requests.
- **Long-Polling**: Incurs higher latency as it relies on establishing new HTTP connections for each data transmission, making it less efficient for real-time updates. Also it can occur that the server wants to send an event when the client is still in the process of opening a new connection. In these cases the latency would be significantly larger.
- **WebTransport**: Promises to offer low latency similar to WebSockets, with the added benefits of leveraging the HTTP/3 protocol for more efficient multiplexing and congestion control.

### Throughput
- **WebSockets**: Capable of high throughput due to its persistent connection, but throughput can suffer from [backpressure](https://chromestatus.com/feature/5189728691290112) where the client cannot process data as fast as the server is capable of sending it.
- **Server-Sent Events**: Efficient for broadcasting messages to many clients with less overhead than WebSockets, leading to potentially higher throughput for unidirectional server-to-client communication.
- **Long-Polling**: Generally offers lower throughput due to the overhead of frequently opening and closing connections, which consumes more server resources.
- **WebTransport**: Expected to support high throughput for both unidirectional and bidirectional streams within a single connection, outperforming WebSockets in scenarios requiring multiple streams.

### Scalability and Server Load
- **WebSockets**: Maintaining a large number of WebSocket connections can significantly increase server load, potentially affecting scalability for applications with many users.
- **Server-Sent Events**: More scalable for scenarios that primarily require updates from server to client, as it uses less connection overhead than WebSockets because it uses "normal" HTTP request without things like [protocol updates](https://developer.mozilla.org/en-US/docs/Web/HTTP/Protocol_upgrade_mechanism) that have to be run with WebSockets.
- **Long-Polling**: The least scalable due to the high server load generated by frequent connection establishment, making it suitable only as a fallback mechanism.
- **WebTransport**: Designed to be highly scalable, benefiting from HTTP/3's efficiency in handling connections and streams, potentially reducing server load compared to WebSockets and SSE.


## Recommendations and Use-Case Suitability

In the landscape of server-client communication technologies, each has its distinct advantages and use case suitability. **Server-Sent Events** (SSE) emerge as the most straightforward option to implement, leveraging the same HTTP/S protocols as traditional web requests, thereby circumventing corporate firewall restrictions and other technical problems that can appear with other protocols. They are easily integrated into Node.js and other server frameworks, making them an ideal choice for applications requiring frequent server-to-client updates, such as news feeds, stock tickers, and live event streaming.

On the other hand, **WebSockets** excel in scenarios demanding ongoing, two-way communication. Their ability to support continuous interaction makes them the prime choice for browser games, chat applications, and live sports updates.

However, **WebTransport**, despite its potential, faces adoption challenges. It is not widely supported by server frameworks [including Node.js](https://github.com/w3c/webtransport/issues/511) and lacks compatibility with [safari](https://caniuse.com/webtransport). Moreover, its reliance on HTTP/3 further limits its immediate applicability because many WebServers like nginx only have [experimental](https://nginx.org/en/docs/quic.html) HTTP/3 support. While promising for future applications with its support for both reliable and unreliable data transmission, WebTransport is not yet a viable option for most use cases.

**Long-Polling**, once a common technique, is now largely outdated due to its inefficiency and the high overhead of repeatedly establishing new HTTP connections. Although it may serve as a fallback in environments lacking support for WebSockets or SSE, its use is generally discouraged due to significant performance limitations.


## Known Problems

For all of the realtime streaming technologies, there are known problems. When you build anything on top of them, keep these in mind.

### A client can miss out events when reconnecting

When a client is connecting, reconnecting or offline, it can miss out events that happened on the server but could not be streamed to the client.
This missed out events are not relevant when the server is streaming the full content each time anyway, like on a live updating stock ticker.
But when the backend is made to stream partial results, you have to account for missed out events. Fixing that on the backend scales pretty bad because the backend would have to remember for each client which events have been successfully send already. Instead this should be implemented with client side logic.

The [RxDB Sync Engine](../replication.md) for example uses two modes of operation for that. One is the [checkpoint iteration mode](../replication.md#checkpoint-iteration) where normal http requests are used to iterate over backend data, until the client is in sync again. Then it can switch to [event observation mode](../replication.md#event-observation) where updates from the realtime-stream are used to keep the client in sync. Whenever a client disconnects or has any error, the replication shortly switches to [checkpoint iteration mode](../replication.md#checkpoint-iteration) until the client is in sync again. This method accounts for missed out events and ensures that clients can always sync to the exact equal state of the server.

### Company firewalls can cause problems

There are many known problems with company infrastructure when using any of the streaming technologies. Proxies and firewall can block traffic or unintentionally break requests and responses. Whenever you implement a realtime app in such an infrastructure, make sure you first test out if the technology itself works for you.

## Follow Up

- Check out the [hackernews discussion of this article](https://news.ycombinator.com/item?id=39745993)
- Shared/Like my [announcement tweet](https://twitter.com/rxdbjs/status/1769507055298064818)
- Learn how to use Server-Sent-Events to [replicate a client side RxDB database with your backend](../replication-http.md#pullstream-for-ongoing-changes).
- Learn how to use RxDB with the [RxDB Quickstart](../quickstart.md)
- Check out the [RxDB github repo](https://github.com/pubkey/rxdb) and leave a star ⭐
