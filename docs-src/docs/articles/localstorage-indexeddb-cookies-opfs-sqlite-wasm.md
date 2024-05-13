# Localstorage vs. IndexedDB vs. Cookies vs. OPFS vs. Wasm-SQLite

So it is 2024 and you want to build your this awesome Web Application. To make you app fast and even work [offline](../offline-first.md), you want to store all data on the client device and run operations there, instead of awaiting requests to a backend server.

But there is a problem:

> Browser are slow and weren't made to run huge database operations.

Or are they? Over the last few years, a lot of features have been added to JavaScript. New storage APIs such as OPFS and new features like the BroadcastChannel are here to let us reach the limits of JavaScript performance.

In this article we have look at all previous and new technologies to store and query data in a browser. We will run performance tests and combine many performance hacks to find out how fast we can write and read a **huge amount of data** in a Web App.


## What is localstorage
## What is indexeddb
## What are cookies
## What is OPFS
## What is wasm sqlite

## Things this does not talk about
WebSQL
session storage.
Web Storage API




## Feature comparison

### Multitab support

A big difference when building a Web App compared to Electron or React-Native, is that the user will open and close the app in multiple browser tabs at the same time. Therefore you have not only one JavaScript process running, but many of them can exist and might have to share state changes between each other to not show outdated data to the user.

Not all storage APIs support a way to automatically share write events between tabs. Only localstorage has the  [storage-event](./localstorage.md#localstorage-vs-indexeddb) which can be used to observe changes.

```js
// localStorage can observe changes with the storage event.
// This feature is missing in IndexedDB and others
addEventListener("storage", (event) => {});
```

To workaround this problem, there are two solutions: 
The first option is to use the [BroadcastChannel API](https://github.com/pubkey/broadcast-channel) which can send messages across browser tabs. So whenever you do a write to the storage, you also send a notification to other tabs to inform them about these changes.

The other solution is to use the [SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) and do all writes inside of the worker. All browser tabs can then subscribe to messages from that SharedWorker and know about changes.

### Indexing
- IndexedDB does not support boolean indexes
#### iterable indexes
#### secondary indexes
### Storing complex JSON documents

### Worker Support

- Localstorage and Cookies [cannot be used in WebWorker or SharedWorker](https://stackoverflow.com/questions/6179159/accessing-localstorage-from-a-webworker).

- OPFS with the fast `createSyncAccessHandle` method can **only** [be used in a WebWorker](../rx-storage-opfs.md#opfs-limitations).

## Performance Comparison

Now that we know about the basics of the various storage solutions, lets compare their performance. As mentioned above, we not only want to store a few documents, instead lets store **many** of them and run **heavy and complex queries**.

TODO add github repo url with performance tests.

### Running many small operations

One aspect of performance is the latency. The time to run a small database operation, either read or write.
Depending on your use case, it might be relevant that many small operations run fast, like when you have a browser game and want to store the game's state.

### Running single big operations

### Initial page load
How fast does the first query load when there are many documents
stored already.




## Lets reach the limits of client side storage performance with RxDB
- indexeddb optimizations
- compression with keycompression
- spliting work load with WebWorker
- sharding
- memory mapped/synced stuff

- Store metadata in localstorage
- fix initial page load for new tabs with the SharedWorker (only chrome can spawn WebWorkers inside of a SharedWorker)

- is OPFS faster then indexeddb?



## Read further

TODO fix links
- Check out the [hackernews discussion of this article](https://news.ycombinator.com/item?id=39745993)
- Shared/Like my [announcement tweet](https://twitter.com/rxdbjs/status/1769507055298064818)

- Learn how to use RxDB with the [RxDB Quickstart](../quickstart.md)
- Check out the [RxDB github repo](https://github.com/pubkey/rxdb) and leave a star ⭐
