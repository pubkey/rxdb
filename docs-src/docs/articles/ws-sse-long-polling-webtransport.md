# WebSockets vs Server-Send-Events vs Long-Polling vs WebTransport API


For modern real-time web applications, the ability to send events from the server to the client is indispensable. This necessity has led to the development of several methods over the years, each with its own set of advantages and drawbacks. Initially, [long-polling](#what-is-long-polling) was the only option available. It was then succeeded by [WebSockets](#what-are-websockets), which offered a more robust solution for bidirectional communication. Following WebSockets, [Server-Sent Events (SSE)](#what-are-server-send-events) provided a simpler method for one-way communication from server to client. Looking ahead, the [WebTransport](#what-is-the-webtransport-api) protocol promises to revolutionize this landscape even further by providing a more efficient, flexible, and scalable approach.

This article aims to delve into these technologies, comparing their performance, highlighting their benefits and limitations, and offering recommendations for various use cases to help developers make informed decisions when building real-time web applications.







- sending events from the server to the client is required for modern relatime web applications

There where several methods developed to do that:
- first there was only long-polling
- then we could use websockets
- then we could use server send events
- in the future we can use webtransport.

This article compares the different technologies, explain their downside and benefits, compare the performance and give recommendations for different use cases.



### What is Long Polling ?

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

Implementing long-polling on the client side is pretty simple, as shown in the code above. However on the backend there can be multiple difficulties to ensure the client recieves all events and does not miss out updates when the client is currently reconnecting.

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

While the basics of the WebSocket API are easy to use it has shown to be rather complex in production. A socket can loose connection and must be re-created accordingly. Especially detecting if a connection is still useable or not, can be very tricky. Mostly you would add a [ping-and-pong](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#pings_and_pongs_the_heartbeat_of_websockets) heartbeath to ensure that the open connection is not closed.
This complexity is why most people use a library on top of WebSockets like [Socket.IO](https://socket.io/) which handles all these cases and even provides fallbacks to long-polling if required.

From consutling many [RxDB](https://rxdb.info/) users, it was shown that in enterprise environments (aka "at work") it is often hard to implement a WebSocket server into the infrastructure because many proxies and firewalls block non-HTTP connections. Therefore using the Server-Send-Events provides and easier way of enterprise integration.

### What are Server-Send-Events ?



### What is the WebTransport API ?

WebTransport is a cutting-edge API designed for efficient, low-latency communication between web clients and servers. It leverages the [HTTP/3 QUIC protocol](https://en.wikipedia.org/wiki/HTTP/3) to enable a variety of data transfer capabilities, such as sending data over multiple streams, in both reliable and unreliable manners, and even allowing data to be sent out of order. This makes WebTransport a powerful tool for applications requiring high-performance networking, such as real-time gaming, live streaming, and collaborative platforms. However, it's important to note that WebTransport is currently a working draft and has not yet achieved widespread adoption.
As of now (March 2024), WebTransport is in a [Working Draft](https://w3c.github.io/webtransport/) and not widely supported. You cannot yet use WebTransport in the [Safari browser](https://caniuse.com/webtransport) and there is also no native support [in Node.js](https://github.com/w3c/webtransport/issues/511). This limits its usability across different platforms and environments.

Even when WebTransport will become widely supported, its API is very complex to use and likely it would be someting where people build libraries on top of WebTransport, not using it directly in an application's sourcecode.


## Limitations

### Sending Data in both directions

Only WebSockets and WebTransport allow to send data in both directions so that you can recieve server-data and send client-data over the same connection.

While it would also be possible with **Long-Polling** in theory, it is not recommended because sending "new" data to an existing long-polling connection would require
to do an additional http-request anyway. So instead of doing that you can send data directly from the client to the server with an additional http-request without interupting
the long-polling connection.

**Server-Send-Events** do not support sending any additional data to the server. You can only do the initial request, and even there you cannot send POST-like data in the http-body by default with the native [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource). Instead you have to put all data inside of the url parameters which is considered a bad practice for security because credentials might leak into server logs, proxies and caches. To fix this problem, [RxDB](https://rxdb.info/) for example uses the [eventsource polyfill](https://github.com/EventSource/eventsource) instead of the native `EventSource API`. This library adds aditional functionality like sending **custom http headers**.

### 6-Requests per Domain Limitation

Most modern browsers allow six connections per domain () which limits the usability of all steady server-to-client messaging methods. The limitation of six connections is even shared across browser tabs so when you open the same page in multiple tabs, they would have to shared the six-connection-pool wich each other. This limitation is part of the HTTP/1.1-RFC (which even defines a lower number of only two connections).

> Quote From [RFC 2616 – Section 8.1.4](https://www.w3.org/Protocols/rfc2616/rfc2616-sec8.html#sec8.1.4): "Clients that use persistent connections SHOULD limit the number of simultaneous connections that they maintain to a given server. A single-user client SHOULD NOT maintain more than **2 connections** with any server or proxy. A proxy SHOULD use up to 2*N connections to another server or proxy, where N is the number of simultaneously active users. These guidelines are intended to improve HTTP response times and avoid congestion."

While that policy makes sense to prevent website owners from using their visitors to D-DOS other websites, it can be a big problem when multiple connections are required to handle server-client communication for legitimate use cases. To workaround the limitation you have to use HTTP/2 or HTTP/3 with which the browser will only open a single connection per domain and then use multiplexing to run all data through a single connection. While this gives you a virtually infinity amount of parallel connections, there is a [SETTINGS_MAX_CONCURRENT_STREAMS](https://www.rfc-editor.org/rfc/rfc7540#section-6.5.2) setting which limits the actually connections amount. The default is 100 concurrent streams for most configurations.


## Performance


## Recommendations

### Server-Send-Events are the easiest to set up

- Use same http/s port and protocol as "normal" requests -> Not blocked by company-firewalls
- Easy to implement in Node.js and other server frameworks

### WebSocket is good for two-way communication

- Supports ongoing two-way communication.
- Is the best solution for things like browser games

### WebTransport is often not supported yet

- Not supported by most server-frameworks (Node.js)
- Not supported by [safari](https://caniuse.com/webtransport) yet.
- Requires HTTP/3
- Might be the best option in the future but is not ready yet.

### Long-Polling should not be used

- Slow and resource intensive
- Hickups when sending many messages in a short timespan
- Much overhead by establishing a new http connections after each event


## Other Technologies

- WebRTC: Normally used for client-client transmission could also be used for two-way communication between a client and server

## Follow Up
