# LocalStorage vs. IndexedDB vs. Cookies vs. OPFS vs. WASM-SQLite

> Compare LocalStorage, IndexedDB, Cookies, OPFS, and WASM-SQLite for web storage, performance, limits, and best practices for modern web apps.

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

# LocalStorage vs. IndexedDB vs. Cookies vs. OPFS vs. WASM-SQLite

So you are building that web application and you want to **store data inside of your users browser**. Maybe you just need to store some small flags or you even need a fully fledged database.

The types of web applications we build have changed significantly. In the early years of the web we served static html files. Then we served dynamically rendered html and later we build **single page applications** that run most logic on the client. And for the coming years you might want to build so called [local first apps](../offline-first.md) that handle big and complex data operations solely on the client and even work when offline, which gives you the opportunity to build **zero-latency** user interactions.

In the early days of the web, **cookies** were the only option for storing small key-value assignments.. But JavaScript and browsers have evolved significantly and better storage APIs have been added which pave the way for bigger and more complex data operations.

In this article, we will dive into the various technologies available for storing and querying data in a browser. We'll explore traditional methods like **Cookies**, **localStorage**, **WebSQL**, **IndexedDB** and newer solutions such as **OPFS** and **SQLite via WebAssembly**. We compare the features and limitations and through performance tests we aim to uncover how fast we can write and read data in a web application with the various methods.

:::note
You are reading this in the [RxDB](/) docs. RxDB is a JavaScript database that has different storage adapters which can utilize the different storage APIs.
**Since 2017** I spend most of my time working with these APIs, doing performance tests and building [hacks](../slow-indexeddb.md) and plugins to reach the limits of browser database operation speed.

<center>
    
        
    
</center>
:::

## The available Storage APIs in a modern Browser

First lets have a brief overview of the different APIs, their intentional use case and history:

### What are Cookies

Cookies were first introduced by [netscape in 1994](https://www.baekdal.com/thoughts/the-original-cookie-specification-from-1997-was-gdpr-compliant/).
Cookies store small pieces of key-value data that are mainly used for session management, personalization, and tracking. Cookies can have several security settings like a time-to-live or the `domain` attribute to share the cookies between several subdomains.

Cookies values are not only stored at the client but also sent with **every http request** to the server. This means we cannot store much data in a cookie but it is still interesting how good cookie access performance compared to the other methods. Especially because cookies are such an important base feature of the web, many performance optimizations have been done and even these days there is still progress being made like the [Shared Memory Versioning](https://blog.chromium.org/2024/06/introducing-shared-memory-versioning-to.html) by chromium or the asynchronous [CookieStore API](https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API).

### What is LocalStorage

The [localStorage API](./localstorage.md) was first proposed as part of the [WebStorage specification in 2009](https://www.w3.org/TR/2009/WD-webstorage-20090423/#the-localstorage-attribute).
LocalStorage provides a simple API to store key-value pairs inside of a web browser. It has the methods `setItem`, `getItem`, `removeItem` and `clear` which is all you need from a key-value store. LocalStorage is only suitable for storing small amounts of data that need to persist across sessions and it is [limited by a 5MB storage cap](./localstorage.md#understanding-the-limitations-of-local-storage). Storing complex data is only possible by transforming it into a string for example with `JSON.stringify()`.
The API is not asynchronous which means if fully blocks your JavaScript process while doing stuff. Therefore running heavy operations on it might block your UI from rendering.

> There is also the **SessionStorage** API. The key difference is that localStorage data persists indefinitely until explicitly cleared, while sessionStorage data is cleared when the browser tab or window is closed.

### What is IndexedDB

IndexedDB was first introduced as "Indexed Database API" [in 2015](https://www.w3.org/TR/IndexedDB/#sotd).

[IndexedDB](../rx-storage-indexeddb.md) is a low-level API for storing large amounts of structured JSON data. While the API is a bit hard to use, IndexedDB can utilize indexes and asynchronous operations. It lacks support for complex queries and only allows to iterate over the indexes which makes it more like a base layer for other libraries then a fully fledged database.

In 2018, IndexedDB version 2.0 [was introduced](https://hacks.mozilla.org/2016/10/whats-new-in-indexeddb-2-0/). This added some major improvements. Most noticeable the `getAll()` method which improves performance dramatically when fetching bulks of JSON documents. 

IndexedDB [version 3.0](https://w3c.github.io/IndexedDB/) is in the workings which contains many improvements. Most important the addition of `Promise` based calls that makes modern JS features like `async/await` more useful.

### What is OPFS

The [Origin Private File System](../rx-storage-opfs.md) (OPFS) is a [relatively new](https://caniuse.com/mdn-api_filesystemfilehandle_createsyncaccesshandle) API that allows web applications to store large files directly in the browser. It is designed for data-intensive applications that want to write and read **binary data** in a simulated file system.

OPFS can be used in two modes:
- Either asynchronous on the [main thread](../rx-storage-opfs.md#using-opfs-in-the-main-thread-instead-of-a-worker) 
- Or in a WebWorker with the faster, asynchronous access with the `createSyncAccessHandle()` method.

Because only binary data can be processed, OPFS is made to be a base filesystem for library developers. You will unlikely directly want to use the OPFS in your code when you build a "normal" application because it is too complex. That would only make sense for storing plain files like images, not to store and query [JSON data](./json-based-database.md) efficiently. I have build a [OPFS based storage](../rx-storage-opfs.md) for RxDB with proper indexing and querying and it took me several months.

### What is WASM SQLite

<center>
        
</center>

[WebAssembly](https://webassembly.org/) (Wasm) is a binary format that allows high-performance code execution on the web.
Wasm was added to major browsers over the course of 2017 which opened a wide range of opportunities on what to run inside of a browser. You can compile native libraries to WebAssembly and just run them on the client with just a few adjustments. WASM code can be shipped to browser apps and generally runs much faster compared to JavaScript, but still about [10% slower then native](https://www.usenix.org/conference/atc19/presentation/jangda).

Many people started to use compiled SQLite as a database inside of the browser which is why it makes sense to also compare this setup to the native APIs.

The compiled byte code of SQLite has a size of [about 938.9 kB](https://sqlite.org/download.html) which must be downloaded and parsed by the users on the first page load. WASM cannot directly access any persistent storage API in the browser. Instead it requires data to flow from WASM to the main-thread and then can be put into one of the browser APIs. This is done with so called [VFS (virtual file system) adapters](https://www.sqlite.org/vfs.html) that handle data access from SQLite to anything else.

### What was WebSQL

WebSQL **was** a web API [introduced in 2009](https://www.w3.org/TR/webdatabase/) that allowed browsers to use SQL databases for client-side storage, based on SQLite. The idea was to give developers a way to store and query data using SQL on the client side, similar to server-side databases.
WebSQL has been **removed from browsers** in the current years for multiple good reasons:

- WebSQL was not standardized and having an API based on a single specific implementation in form of the SQLite source code is hard to ever make it to a standard.
- WebSQL required browsers to use a [specific version](https://developer.chrome.com/blog/deprecating-web-sql#reasons_for_deprecating_web_sql) of SQLite (version 3.6.19) which means whenever there would be any update or bugfix to SQLite, it would not be possible to add that to WebSQL without possible breaking the web.
- Major browsers like firefox never supported WebSQL.

Therefore in the following we will **just ignore WebSQL** even if it would be possible to run tests on in by setting specific browser flags or using old versions of chromium.

-------------

## Feature Comparison

Now that you know the basic concepts of the APIs, lets compare some specific features that have shown to be important for people using RxDB and browser based storages in general.

### Storing complex JSON Documents

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
- The first option is to use the [BroadcastChannel API](https://github.com/pubkey/broadcast-channel) which can send messages across browser tabs. So whenever you do a write to the storage, you also send a notification to other tabs to inform them about these changes. This is the most common workaround which is also used by RxDB. Notice that there is also the [WebLocks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) which can be used to have mutexes across browser tabs. 
- The other solution is to use the [SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) and do all writes inside of the worker. All browser tabs can then subscribe to messages from that **single** SharedWorker and know about changes.

### Indexing Support

The big difference between a database and storing data in a plain file, is that a database is writing data in a format that allows running operations over indexes to facilitate fast performant queries. From our list of technologies only **IndexedDB** and **WASM SQLite** support for indexing out of the box. In theory you can build indexes on top of any storage like localstorage or OPFS but you likely should not want to do that by yourself.

In IndexedDB for example, we can fetch a bulk of documents by a given index range:

```ts
// find all products with a price between 10 and 50
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

The most common API for that use case is spawning a **WebWorker** and doing most work on that second JavaScript process. The worker is spawned from a separate JavaScript file (or base64 string) and communicates with the main thread by sending data with `postMessage()`.

Unfortunately **LocalStorage** and **Cookies** [cannot be used in WebWorker or SharedWorker](https://stackoverflow.com/questions/6179159/accessing-localstorage-from-a-webworker) because of the design and security constraints. WebWorkers run in a separate global context from the main browser thread and therefore cannot do stuff that might impact the main thread. They have no direct access to certain web APIs, like the DOM, localStorage, or cookies.

Everything else can be used from inside a WebWorker.
The fast version of OPFS with the `createSyncAccessHandle` method can **only** [be used in a WebWorker](../rx-storage-opfs.md#opfs-limitations), and **not on the main thread**. This is because all the operations of the returned `AccessHandle` are **not async** and therefore block the JavaScript process, so you do want to do that on the main thread and block everything.

-------------

## Storage Size Limits

- **Cookies** are limited to about `4 KB` of data in [RFC-6265](https://datatracker.ietf.org/doc/html/rfc6265#section-6.1). Because the stored cookies are send to the server with every HTTP request, this limitation is reasonable. You can test your browsers cookie limits [here](http://www.ruslog.com/tools/cookies.html). Notice that you should never fill up the full `4 KB` of your cookies because your web server will not accept too long headers and reject the requests with `HTTP ERROR 431 - Request header fields too large`. Once you have reached that point you can not even serve updated JavaScript to your user to clean up the cookies and you will have locked out that user until the cookies get cleaned up manually.

- **LocalStorage** has a storage size limitation that varies depending on the browser, but generally ranges from 4 MB to 10 MB per origin. You can test your localStorage size limit [here](https://arty.name/localstorage.html).
  - Chrome/Chromium/Edge: 5 MB per domain
  - Firefox: 10 MB per domain
  - Safari: 4-5 MB per domain (varies slightly between versions)

- **IndexedDB** does not have a specific fixed size limitation like localStorage. The maximum storage size for IndexedDB depends on the browser implementation. The upper limit is typically based on the available disc space on the user's device. In chromium browsers it can use up to 80% of total disk space. You can get an estimation about the storage size limit by calling `await navigator.storage.estimate()`. Typically you can store gigabytes of data which can be tried out [here](https://demo.agektmr.com/storage/). Notice that we have a full article about [storage max size limits of IndexedDB](./indexeddb-max-storage-limit.md) that covers this topic.

- **OPFS** has the same storage size limitation as IndexedDB. Its limit depends on the available disc space. This can also be tested [here](https://demo.agektmr.com/storage/).

-------------

## Performance Comparison

Now that we've reviewed the features of each storage method, let's dive into performance comparisons, focusing on initialization times, read/write latencies, and bulk operations.

Notice that we only run simple tests and for your specific use case in your application the results might differ. Also we only compare performance in google chrome (version 128.0.6613.137). Firefox and Safari have similar **but not equal** performance patterns. You can run the test by yourself on your own machine from this [github repository](https://github.com/pubkey/localstorage-indexeddb-cookies-opfs-sqlite-wasm). For all tests we throttle the network to behave like the average german internet speed. (download: 135,900 kbit/s, upload: 28,400 kbit/s, latency: 125ms). Also all tests store an "average" JSON object that might be required to be stringified depending on the storage. We also only test the performance of storing documents by id because some of the technologies (cookies, OPFS and localstorage) do not support indexed range operations so it makes no sense to compare the performance of these.

### Initialization Time

Before you can store any data, many APIs require a setup process like creating databases, spawning WebAssembly processes or downloading additional stuff. To ensure your app starts fast, the initialization time is important.

The APIs of localStorage and Cookies do not have any setup process and can be directly used. IndexedDB requires to open a database and a store inside of it. WASM SQLite needs to download a WASM file and process it. OPFS needs to download and start a worker file and initialize the virtual file system directory.

Here are the time measurements from how long it takes until the first bit of data can be stored:

| Technology              | Time in Milliseconds |
| ----------------------- | -------------------- |
| IndexedDB               | 46                   |
| OPFS Main Thread        | 23                   |
| OPFS WebWorker          | 26.8                 |
| WASM SQLite (memory)    | 504                  |
| WASM SQLite (IndexedDB) | 535                  |

Here we can notice a few things:

- Opening a new IndexedDB database with a single store takes surprisingly long
- The latency overhead of sending data from the main thread to a WebWorker OPFS is about 4 milliseconds. Here we only send minimal data to init the OPFS file handler. It will be interesting if that latency increases when more data is processed.
- Downloading and parsing WASM SQLite and creating a single table takes about half a second. Using also the IndexedDB VFS to store data persistently adds additional 31 milliseconds. Reloading the page with enabled caching and already prepared tables is a bit faster with 420 milliseconds (memory).

### Latency of small Writes

Next lets test the latency of small writes. This is important when you do many small data changes that happen independent from each other. Like when you stream data from a websocket or persist pseudo randomly happening events like mouse movements.

| Technology              | Time in Milliseconds |
| ----------------------- | -------------------- |
| Cookies                 | 0.058                |
| LocalStorage            | 0.017                |
| IndexedDB               | 0.17                 |
| OPFS Main Thread        | 1.46                 |
| OPFS WebWorker          | 1.54                 |
| WASM SQLite (memory)    | 0.17                 |
| WASM SQLite (IndexedDB) | 3.17                 |

Here we can notice a few things:

- LocalStorage has the lowest write latency with only 0.017 milliseconds per write.
- IndexedDB writes are about 10 times slower compared to localStorage.
- Sending the data to the WASM SQLite process and letting it persist via IndexedDB is slow with over 3 milliseconds per write.

The OPFS operations take about 1.5 milliseconds to write the JSON data into one document per file. We can see the sending the data to a webworker first is a bit slower which comes from the overhead of serializing and deserializing the data on both sides.
If we would not create on OPFS file per document but instead append everything to a single file, the performance pattern changes significantly. Then the faster file handle from the `createSyncAccessHandle()` only takes about 1 millisecond per write. But this would require to somehow remember at which position the each document is stored. Therefore in our tests we will continue using one file per document.

### Latency of small Reads

Now that we have stored some documents, lets measure how long it takes to read single documents by their `id`.

| Technology              | Time in Milliseconds |
| ----------------------- | -------------------- |
| Cookies                 | 0.132                |
| LocalStorage            | 0.0052               |
| IndexedDB               | 0.1                  |
| OPFS Main Thread        | 1.28                 |
| OPFS WebWorker          | 1.41                 |
| WASM SQLite (memory)    | 0.45                 |
| WASM SQLite (IndexedDB) | 2.93                 |

Here we can notice a few things:

- LocalStorage reads are **really really fast** with only 0.0052 milliseconds per read.
- The other technologies perform reads in a similar speed to their write latency.

### Big Bulk Writes

As next step, lets do some big bulk operations with 200 documents at once.

| Technology              | Time in Milliseconds |
| ----------------------- | -------------------- |
| Cookies                 | 20.6                 |
| LocalStorage            | 5.79                 |
| IndexedDB               | 13.41                |
| OPFS Main Thread        | 280                  |
| OPFS WebWorker          | 104                  |
| WASM SQLite (memory)    | 19.1                 |
| WASM SQLite (IndexedDB) | 37.12                |

Here we can notice a few things:

- Sending the data to a WebWorker and running it via the faster OPFS API is about twice as fast.
- WASM SQLite performs better on bulk operations compared to its single write latency. This is because sending the data to WASM and backwards is faster if it is done all at once instead of once per document.

### Big Bulk Reads

Now lets read 100 documents in a bulk request.

| Technology              | Time in Milliseconds            |
| ----------------------- | ------------------------------- |
| Cookies                 | 6.34                            |
| LocalStorage            | 0.39                            |
| IndexedDB               | 4.99                            |
| OPFS Main Thread        | 54.79                           |
| OPFS WebWorker          | 25.61                           |
| WASM SQLite (memory)    | 3.59                            |
| WASM SQLite (IndexedDB) | 5.84       (35ms without cache) |

Here we can notice a few things:

- Reading many files in the OPFS webworker is about **twice as fast** compared to the slower main thread mode.
- WASM SQLite is surprisingly fast. Further inspection has shown that the WASM SQLite process keeps the documents in memory cached which improves the latency when we do reads directly after writes on the same data. When the browser tab is reloaded between the writes and the reads, finding the 100 documents takes about **35 milliseconds** instead.

## Performance Conclusions

- LocalStorage is really fast but remember that is has some downsides:
  - It blocks the main JavaScript process and therefore should not be used for big bulk operations.
  - Only Key-Value assignments are possible, you cannot use it efficiently when you need to do index based range queries on your data.
- OPFS is way faster when used in the WebWorker with the `createSyncAccessHandle()` method compare to using it directly in the main thread.
- SQLite WASM can be fast but you have to initially download the full binary and start it up which takes about half a second. This might not be relevant at all if your app is started up once and the used for a very long time. But for web-apps that are opened and closed in many browser tabs many times, this might be a problem.

-------------

## Possible Improvements

There is a wide range of possible improvements and performance hacks to speed up the operations.
- For IndexedDB I have made a list of [performance hacks here](../slow-indexeddb.md). For example you can do sharding between multiple database and webworkers or use a custom index strategy.
- OPFS is slow in writing one file per document. But you do not have to do that and instead you can store everything at a single file like a normal database would do. This improves performance dramatically like it was done with the RxDB [OPFS RxStorage](../rx-storage-opfs.md).
- You can mix up the technologies to optimize for multiple scenarios at once. For example in RxDB there is the [localstorage meta optimizer](../rx-storage-localstorage-meta-optimizer.md) which stores initial metadata in localstorage and "normal" documents inside of IndexedDB. This improves the initial startup time while still having the documents stored in a way to query them efficiently.
- There is the [memory-mapped](../rx-storage-memory-mapped.md) storage plugin in RxDB which maps data directly to memory. Using this in combination with a shared worker can improve pageloads and query time significantly.
- [Compressing](../key-compression.md) data before storing it might improve the performance for some of the storages.
- Splitting work up between [multiple WebWorkers](../rx-storage-worker.md) via [sharding](../rx-storage-sharding.md) can improve performance by utilizing the whole capacity of your users device.

Here you can see the [performance comparison](../rx-storage-performance.md) of various RxDB storage implementations which gives a better view of real world performance:

<center>
  
</center>

## Future Improvements

You are reading this in 2024, but the web does not stand still. There is a good chance that browser get enhanced to allow faster and better data operations.

- Currently there is no way to directly access a persistent storage from inside a WebAssembly process. If this changes in the future, running SQLite (or a similar database) in a browser might be the best option.
- Sending data between the main thread and a WebWorker is slow but might be improved in the future. There is a [good article](https://surma.dev/things/is-postmessage-slow/) about why `postMessage()` is slow.
- IndexedDB lately [got support](https://developer.chrome.com/blog/maximum-idb-performance-with-storage-buckets) for storage buckets (chrome only) which might improve performance.

## Follow Up

- Share my [announcement tweet](https://x.com/rxdbjs/status/1846145062847062391) -->
- Reproduce the benchmarks at the [github repo](https://github.com/pubkey/localstorage-indexeddb-cookies-opfs-sqlite-wasm)
- Learn how to use RxDB with the [RxDB Quickstart](../quickstart.md)
- Check out the [RxDB github repo](https://github.com/pubkey/rxdb) and leave a star ⭐
