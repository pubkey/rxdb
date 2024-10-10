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
**Since 2017** I spend most of my time working with these APIs, doing performance tests and building [hacks](../slow-indexeddb.md) to reach the limits of browser database operation speed.

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

> There is also the **SessionStorage** API. The key difference is that localStorage data persists indefinitely until explicitly cleared, while sessionStorage data is cleared when the browser tab or window is closed.


### What is IndexedDB

IndexedDB was first introduced as "Indexed Database API" [in 2015](https://www.w3.org/TR/IndexedDB/#sotd).

IndexedDB is a low-level API for storing large amounts of structured JSON data. While the API is a bit hard to use, IndexedDB can utilize indexes and asynchronous operations. It lacks support for complex queries and only allows to iterate over the indexes which makes it more like a base layer for other libraries then a fully fledged database.

In 2018, IndexedDB version 2.0 [was introduced](https://hacks.mozilla.org/2016/10/whats-new-in-indexeddb-2-0/). This added some major improvements. Most noticeable the `getAll()` method which improves performance dramatically when fetching bulks of JSON documents. 

IndexedDB [version 3.0](https://w3c.github.io/IndexedDB/) is in the workings which contains many improvements. Most important the addition of `Promise` based calls that makes modern JS features like `async/await` more useful.


### What is OPFS

The [Origin Private File System](../rx-storage-opfs.md) (OPFS) is a [relatively new](https://caniuse.com/mdn-api_filesystemfilehandle_createsyncaccesshandle) API that allows web applications to store large files directly in the browser. It is designed for data-intensive applications that want to write and read **binary data** in a simulated file system.

OPFS can be used in two modes:
- Either asynchronous on the [main thread](../rx-storage-opfs.md#using-opfs-in-the-main-thread-instead-of-a-worker) 
- Or in a WebWorker with the faster, aynchronous access with the `createSyncAccessHandle()` method.

Because only binary data can be processed, OPFS is made to be a base filesystem for library developers. You will unlikely directly want to use the OPFS in your code when you build a "normal" application because it is too complex. That would only make sense for storing plain files like images, not to store and query JSON data efficiently. I have build a [OPFS based storage](../rx-storage-opfs.md) for RxDB with proper indexing and querying and it took me several months.

### What is WASM SQLite

[WebAssembly](https://webassembly.org/) (Wasm) is a binary format that allows high-performance code execution on the web.
Wasm was added to major browsers over the course of 2017 wich opened a wide range of opportunities on what to run inside of a browser. You can compile native libraries to WebAssembly and just run them on the client with just a few adjustments. WASM code can be shipped to browser apps and generally runs much faster compared to JavaScript, but still about [10% slower then native](https://www.usenix.org/conference/atc19/presentation/jangda).

Many people started to use compiled SQLite as a database inside of the browser which is why it makes sense to also compare this setup to the native APIs.

The compiled byte code of SQLite has a size of [about 938.9 kB](https://sqlite.org/download.html) which must be downloaded and parsed by the users on the first page load. WASM cannot directly access any persistend storage API in the browser. Instead it requires data to flow from WASM to the main-thread and then can be put into one of the browser APIs. This is done with so called [VFS adapters](https://www.sqlite.org/vfs.html) that handle data access from SQLite to anything else.

### What was WebSQL

WebSQL **has been** a web API [introduced in 2009](https://www.w3.org/TR/webdatabase/) that allowed browsers to use SQL databases for client-side storage, based on SQLite. The idea was to give developers a way to store and query data using SQL on the client side, similar to server-side databases.
WebSQL has been **removed from browsers** in the current years for multiple good reasons:

- WebSQL was not standardized and having an API based on a single specific implementation in form of the SQLite source code is hard to ever make it to a standard.
- WebSQL required browsers to use a [specific version](https://developer.chrome.com/blog/deprecating-web-sql#reasons_for_deprecating_web_sql) of SQLite (version 3.6.19) which means whenever there would be any update or bugfix to SQLite, it would not be possible to add that to WebSQL without possible breaking the web.
- Major browsers like firefox never supported WebSQL.

Therefore in the following we will **just ignore WebSQL** even if it would be possible to run tests on in by setting specific browser flags or using old versions of chromium.

-------------

## Feature Comparison

Now that you know the basic concepts of the APIs, lets compare some specific features that have shown to be important for people using RxDB and browser based storages in general.

### Storing complex JSON documents

When you store data in a web application, most often you want to store complex JSON documents and not only "normal" values like the `integers` and `strings` you store in a server side database.

- Only IndexedDB works with JSON objects natively.
- With SQLite WASM you can [store JSON](https://www.sqlite.org/json1.html) in a `text` column since version 3.38.0 (2022-02-22) and even run deep queries on it and use single attributes as indexes.

Every of the other APIs can only store strings or binary data. Of course you can transform any JSON object to a string with `JSON.stringify()` but not having the JSON support in the API can make things complex when running queries and running `JSON.stringify()` many times can cause performance problems.

### Multi-Tab Support

A big difference when building a Web App compared to [Electron](../electron-database.md) or [React-Native](../react-native-database.md), is that the user will open and close the app in **multiple browser tabs at the same time**. Therefore you have not only one JavaScript process running, but many of them can exist and might have to share state changes between each other to not show **outdated data** to the user.

> If your users' muscle memory puts the left hand on the **F5** key while using your website, you did something wrong!

Not all storage APIs support a way to automatically share write events between tabs. 

Only localstorage has a way to automatically share write events between tabs by the API itself with the [storage-event](./localstorage.md#localstorage-vs-indexeddb) which can be used to observe changes.

```js
// localStorage can observe changes with the storage event.
// This feature is missing in IndexedDB and others
addEventListener("storage", (event) => {});
```

There was the [experimental IndexedDB observers API](https://stackoverflow.com/a/33270440) for chrome, but the proposal repository has been archived.

To workaround this problem, there are two solutions: 
- The first option is to use the [BroadcastChannel API](https://github.com/pubkey/broadcast-channel) which can send messages across browser tabs. So whenever you do a write to the storage, you also send a notification to other tabs to inform them about these changes. This is the most common workaround which is also used by RxDB. Notice that there is also the [WebLocks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) which can be used to have mutexes accross browser tabs. 
- The other solution is to use the [SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) and do all writes inside of the worker. All browser tabs can then subscribe to messages from that **single** SharedWorker and know about changes.

### Indexing Support

The big difference between a database and storing data in a plain file, is that a database is writing data in a format that allows running operations over indexes to facilitate fast performant queries. From our list of technologies only **IndexedDB** and **WASM SQLite** support for indexing out of the box. In theory you can build indexes on top of any storage like localstorage or OPFS but you likely should not want to do that by yourself.

In IndexedDB for example, we can fetch a bulk of documents by a given index range:

```ts
// find all producs with a price between 10 and 50
const keyRange = IDBKeyRange.bound(10, 50);
const transaction = db.transaction('products', 'readonly');
const objectStore = transaction.objectStore('products');
const index = objectStore.index('priceIndex');
const request = index.getAll(keyRange);
const result = await new Promise((res, rej) => {
  request.onsuccess = (event) => res(event.target.result);
  request.onerror = (event) => rej(event);
});
```

Notice that IndexedDB has the limitation of [not having indexes on boolean values](https://github.com/w3c/IndexedDB/issues/76). You can only index strings and numbers. To workaround that you have to transform boolean to numbers and backwards when storing the data.


### WebWorker Support

When running heavy data operations, you might want to move the processing away from the JavaScript main thread. This ensures that our app keeps being responsive and fast while the processing can run in parallel in the background. In a browser you can either use the [WebWorker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API), [SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) or the [ServiceWorker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) API to do that. In RxDB you can use the [WebWorker](../rx-storage-worker.md) or [SharedWorker](../rx-storage-shared-worker.md) plugins to move your storage inside of a worker.

The most common API for that use case is spawning a **WebWorker** and doing most work on that second JavaScript process. The worker is spawned from a seperate JavaScript file (or base64 string) and communicates with the main thread by sending data with `postMessage()`.

Unfortunately **Localstorage** and **Cookies** [cannot be used in WebWorker or SharedWorker](https://stackoverflow.com/questions/6179159/accessing-localstorage-from-a-webworker) because of the design and security constraints. WebWorkers run in a separate global context from the main browser thread and therefore cannot do stuff that might impact the main thread. They have no direct access to certain web APIs, like the DOM, localStorage, or cookies.

Everything else can be used from inside a WebWorker.
The fast version of OPFS with the `createSyncAccessHandle` method can **only** [be used in a WebWorker](../rx-storage-opfs.md#opfs-limitations), and **not on the main thread**. This is because all the operations of the returned `AccessHandle` are **not async** and therefore block the JavaScript process, so you do want to do that on the main thread and block everything.

-----------------------------------------------------------------------------
-----------------------------------------------------------------------------
-----------------------------------------------------------------------------
-----------------------------------------------------------------------------








## Performance comparison

Lets do some performance comparisons. Notice that we only run simple tests and for your specific use case in your application the results might differ. Also we only compare performance in google chrome (version 128.0.6613.137). Firefox and Safari have similar **but not equal** performance patterns. You can run the test by yourself on your own machine from this [github repository](https://github.com/pubkey/localstorage-indexeddb-cookies-opfs-sqlite-wasm).

### Latency of small writes

### Latency of small reads

### Big Bulk Writes

### Big Bulk Reads



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
