---
title: Localstorage vs. IndexedDB vs. Cookies vs. OPFS vs. Wasm-SQLite
slug: localstorage-indexeddb-cookies-opfs-sqlite-wasm.html
---

<!-- 

GOALS:

- Compare latency of single bit writes
- Compare latency of bulk writes
- Compare the latency of single item reads
- Compare the latency of bulk reads
- Compare storage size limit
- Compare feature table
  - Indexing
  - Cross-tab events
  - Browser Support
  - 
- Give a conclusion on what to use which
- Tell about how RxDB storages might improve stuff

-->

# Localstorage vs. IndexedDB vs. Cookies vs. OPFS vs. Wasm-SQLite

So you build that web application and you want to **store data inside of your users browser**. Maybe you just need to store some small flags or you even need a fully fledged database to store massive amounts of data for your [local first app](../offline-first.md).

In the beginnings of the Web, we only had cookies to store some small key value assignements. But over the years JavaScript has evolved significantly and better storage APIs have been added to the browsers which pave the way for bigger and more complex data operations. Namely we have [Localstorage](./localstorage.md), WebSQL, IndexedDB, and the Origin Private File System API [(OPFS)](../rx-storage-opfs.md).


In this article, we will dive into the various technologies available for storing and querying data in a browser. We'll explore traditional methods like **Cookies**, **LocalStorage** and **IndexedDB**, and newer solutions such as **OPFS** and **SQLite via WebAssembly**. Through performance tests we aim to uncover how fast we can write and read data in a web application with the various methods.


:::note
You are reading this in the [RxDB](/) docs. RxDB is a JavaScript database that has different storage adapters which can utilize the different storage APIs.
Over the last 8 years I spend most of my time working with these APIs, doing performance tests and building [hacks](../slow-indexeddb.md) to reach the limits of browser database operation speed.

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>
:::


## The available storage APIs in a modern browser

Over the years, the type of web applications we build has changed significantly. In the early years of the web we served static html files. Then we served dynamically rendered html and later we build single page applications that run most logic on the client. And for the comming years you might want to build so called [local first apps](../offline-first.md) that handle big and complex data operations solely on the client and even work when offline which gives you the opportunity to build zero-latency user interactions.

For these increments of use cases, the browser vendors kept in pace providing more and better APIs. Let me give you a brief explanation of them:

### What are Cookies

Cookies were first introduced by [netscape in 1994](https://www.baekdal.com/thoughts/the-original-cookie-specification-from-1997-was-gdpr-compliant/).
Cookies store small pieces of key-value data. Cookies are mainly used for session management, personalization, and tracking, but are limited to about `4 KB` of data in [RFC-6265](https://datatracker.ietf.org/doc/html/rfc6265#section-6.1). Because the stored cookies are send to the server with every HTTP request, this limitation is reasonable. You can test your browsers cookie limits [here](http://www.ruslog.com/tools/cookies.html).

This size limitation means we cannot store much data in a cookie but it is still interesting how good cookie access performance compared to the other methods. Especially because cookies are such an important base feature of the web, many performance optimizations have been done and even these days there is still progress being made like the [Shared Memory Versioning](https://blog.chromium.org/2024/06/introducing-shared-memory-versioning-to.html) by chromium or the asynchronous [CookieStore API](https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API).


### What is Localstorage

The [LocalStorage API](./localstorage.md) was first proposed as part of the [WebStorage specification in 2009](https://www.w3.org/TR/2009/WD-webstorage-20090423/#the-localstorage-attribute).
LocalStorage provides a simple API to store key-value pairs inside of a web browser. It has the methods `setItem`, `getItem`, `removeItem` and `clear` which is all you need from a key-value store. Localstorage is only suitable for storing small amounts of data that need to persist across sessions and it is [limited by a 5MB storage cap](./localstorage.md#understanding-the-limitations-of-local-storage). Storing complex data is only possible by transforming it into a string for example with `JSON.stringify()`.
The API is not asynchronous which means if fully blocks your JavaScript process while doing stuff. Therefore running heavy operations on it might block your UI from rendering.

> There is also the SesssionStorage API. The key difference is that localStorage data persists indefinitely until explicitly cleared, while sessionStorage data is cleared when the browser tab or window is closed




-----------------------------------------------------------------------------
-----------------------------------------------------------------------------
-----------------------------------------------------------------------------
-----------------------------------------------------------------------------

### What is IndexedDB

IndexedDB is a low-level API for storing large amounts of structured (JSON) data. While the API is a bit hard to use, IndexedDB can utilize indexes and asynchronous operations. It lacks support for complex queries and only allows to iterate over the indexes which makes it more like a base layer for other libraries. The performance of basic IndexedDB operations can be problematic but there exist [several hacks](../slow-indexeddb.md) to improve writes and query speed.


### What is OPFS
The [Origin Private File System](../rx-storage-opfs.md) (OPFS) is a relatively new API that allows web applications to store large files directly in the browser. It is designed for data-intensive applications that want to write and read binary data.
OPFS can be used in two modes: Either asynchronous on the [main thread](../rx-storage-opfs.md#using-opfs-in-the-main-thread-instead-of-a-worker) or in a WebWorker with the faster, aynchronous access.
Because only binary data can be processed, OPFS is made to be as a base filesystem for database libraries. You will unlikely directly want to use the OPFS in your applications code.


### What is WASM-SQLite

SQLite is a small, fast, self-contained SQL database written in the C programming language.
Because browsers cannot run an applications C code directly, [WebAssembly](https://webassembly.org/) (WASM) is used to compile the SQLite C code into WASM byte code. WASM code can be shipped to browser apps and generally runs much faster compared to JavaScript, but still about [10% slower then native](https://www.usenix.org/conference/atc19/presentation/jangda).
The compiled byte code has a size of [about 938.9 kB](https://sqlite.org/download.html) which must be downloaded and parsed by the users on the first page load.

WASM cannot directly access any persistend storage API in the browser. Instead it requires data to flow from WASM to the main-thread and then can be put into one of the browser APIs. For reads the same goes the other way round.


### What is WebSQL




## Test Setup

As mentioned above, we will focus on the performance differences of the various technologies.
But we not only want to store a few documents, instead lets store **many** of them and run **heavy and complex queries** to find out about the limits of what can be done in a browser.

TODO add github repo url with performance tests. https://github.com/pubkey/localstorage-indexeddb-cookies-opfs-sqlite-wasm

### Running many small operations

One aspect of performance is the latency. The time to run a small database operation, either read or write.
Depending on your use case, it might be relevant that many small operations run fast, like when you have a browser game and want to store the game's state.

### Running single big operations

### Initial page load
How fast does the first query load when there are many documents
stored already.



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

The big difference between a database and storing data in a plain file, is that a database is writing data in a format that allows running operations over indexes to facilitate fast queries.

#### iterable indexes
- IndexedDB does not support boolean indexes

#### secondary indexes
- Only IndexedDB and SQLite WASM has secondary indexes


### Storing complex JSON documents

- IndexedDB can store JSON natively
- SQLite can [store JSON](https://www.sqlite.org/json1.html) from version 3.38.0 (2022-02-22).

### Worker Support

- Localstorage and Cookies [cannot be used in WebWorker or SharedWorker](https://stackoverflow.com/questions/6179159/accessing-localstorage-from-a-webworker).

- OPFS with the fast `createSyncAccessHandle` method can **only** [be used in a WebWorker](../rx-storage-opfs.md#opfs-limitations).
  2




## Lets reach the limits of client side storage performance with RxDB
- indexeddb optimizations
- compression with keycompression
- spliting work load with WebWorker
- sharding
- memory mapped/synced stuff

- Store metadata in localstorage
- fix initial page load for new tabs with the SharedWorker (only chrome can spawn WebWorkers inside of a SharedWorker)

- is OPFS faster then indexeddb?

### Things this article does not talk about

WebSQL
session storage.
Web Storage API
Cross tab support
Observability




## Read further

TODO fix links
- Check out the [hackernews discussion of this article](https://news.ycombinator.com/item?id=39745993)
- Shared/Like my [announcement tweet](https://twitter.com/rxdbjs/status/1769507055298064818)
- Reproduce the benchmarks at the [github repo](https://github.com/pubkey/localstorage-indexeddb-cookies-opfs-sqlite-wasm)

- Learn how to use RxDB with the [RxDB Quickstart](../quickstart.md)
- Check out the [RxDB github repo](https://github.com/pubkey/rxdb) and leave a star ⭐





## TODOs

- Is indexeddb faster with storage buckets? https://developer.chrome.com/blog/maximum-idb-performance-with-storage-buckets?hl=en
