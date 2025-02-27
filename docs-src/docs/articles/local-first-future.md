---
title: Why Local-First Is the Future and whare are Its Limitations
slug: local-first-future.html
description:  asdf
---


# Why Local-First Is the Future and what are Its Limitations

Imagine a web app that behaves seamlessly even with zero internet access, provides sub-millisecond response times, and keeps most of the user's data on their device. This is the **local-first** or [offline-first](../offline-first.md) approach. Although it has been around for a while, local-first has recently become more practical because of **maturing browser storage APIs** and new frameworks that simplify **data synchronization**. By allowing data to live on the client and only syncing with a server or other peers when needed, local-first apps can deliver a user experience that is **fast, resilient**, and **privacy-friendly**.

However, local-first is no silver bullet. It introduces tricky distributed-data challenges like conflict resolution and schema migrations on client devices. In this article, we'll dive deep into what local-first means, why it's trending, its pros and cons, and how to implement it (with examples using **RxDB**) in real applications. We'll also discuss other tools, criticisms, backend considerations, and how local-first compares to traditional cloud-centric approaches.

## What is the Local-First Paradigm (and Why It’s Gaining Traction)

**Local-first computing** refers to a software design paradigm where applications **store and process data primarily on the user’s local device** (browser or mobile), rather than relying on a constant server connection. In a local-first app, the [local database](./local-database.md) is the source of truth for the app’s state, and cloud servers (if any) are used mainly for background synchronization and backup​. This means the app should function as well offline as it does online, giving users ownership and control of their data. Local-first ideals include the ability to work offline and collaborate across devices, while improving security, privacy, and user control of data​.

In other words, the app should work as well offline as it does online. Instead of treating the server as the single source of truth, a local-first app treats the _local database_ as the source of truth for reads and writes, and uses background synchronization to propagate changes to a backend or other peers. This makes the local database (on the client) the gateway for all persistent state changes, **not the remote server​**.

The push for local-first is driven by a few key new technological capabilities that previously restricted client devices from running heavy local-first computing:

- **Relaxed Browser Storage Limits**: In the past, true local-first web apps were not very feasible due to **storage limitations** in browsers. Early web storage options like cookies or [localStorage](./localstorage.md#understanding-the-limitations-of-local-storage) had tiny limits (~5-10MB) and were unsuitable for complex data. Even **IndexedDB**, the structured client storage introduced over a decade ago, had restrictive quotas on many browsers – for example, older Firefox versions would **prompt the user if more than 50MB** was being stored. Mobile browsers often capped IndexedDB to 5MB without user permission. Such limits made it impractical to cache large application datasets on the client. However, modern browsers have dramatically [increased these limits](./indexeddb-max-storage-limit.md). Today, IndexedDB can typically store **hundreds of megabytes to multiple gigabytes** of data, depending on device capacity. Chrome allows up to ~80% of free disk space per origin (tens of GB on a desktop), Firefox now supports on the order of gigabytes per site (10% of disk size), and even Safari (historically strict) permits around 1GB per origin on iOS. In short, the storage quotas of 5–50MB are a thing of the past – modern web apps can cache very large datasets locally without hitting a ceiling. This shift in storage capabilities has unlocked new possibilities for **local-first web apps** that simply weren’t viable a few years ago.

- **New Storage APIs (OPFS)**: The [Origin Private File System](../rx-storage-opfs.md) (OPFS), part of the File System Access API, enables near-native file I/O from within a browser. It allows web apps to manage file handles securely and perform fast, synchronous reads/writes in Web Workers. This is a huge deal for local-first computing because it makes it feasible to embed robust database engines directly in the browser, persisting data to real files on a virtual filesystem. With OPFS, you can avoid some of the performance overhead that comes with [IndexedDB-based workarounds](../slow-indexeddb.md), providing a near-native [speed experience](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md#big-bulk-writes) for file-structured data.

- **WebAssembly**: Another crucial advancement is **WebAssembly (WASM)**, which allows developers to compile low-level languages (C, C++, Rust) for execution in the browser at near-native speed. This means database engines, search algorithms, [vector databases](./javascript-vector-database.md),  and other performance-heavy tasks can run right on the client. However, a key limitation is that **WASM cannot directly access persistent storage APIs** in the browser. Instead, all data must be marshaled from WASM to JavaScript (or the main thread) and then go through something like IndexedDB or OPFS. This extra indirection [is slower](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md) compared to plain JavaScript->storage calls. Looking ahead, there might come up future APIs that allow WASM to interface with persistent storage directly—if those land, local-first systems could see another major boost in [performance](../rx-storage-performance.md).

- **Bandwidth Has Grown, But Latency Is Capped**: Internet infrastructure has rapidly expanded to provide higher throughput—making it possible to transfer large amounts of data more quickly. However, latency (i.e., round-trip delay) is constrained by the **speed of light** and other physical limitations in fiber, satellite links, and routing. We can always build out bigger “pipes” to stream or send bulk data, but we can’t significantly reduce the base round-trip time for each request. This is a physical limit, not a technological one. Local-first strategies mitigate this fundamental latency limit by avoiding excessive client-server calls in interactive workflows—once data is on the client, it’s instantly available for reads and writes without waiting on a network round-trip. Imagine, transferring **around 100,000** “average” JSON documents might only consume **about the same bandwidth as two frames of a 4K YouTube video**, which shows just how far raw data throughput has come. Yet each request still carries a 100–200ms delay or more, which becomes noticeable in user interactions. Local-first mitigates this by minimizing round-trip calls during active use.

<p align="center">
  <img src="/files/latency-london-san-franzisco.png" alt="latency london san franzisco" width="300" />
</p>

## What you can expect from a Local First App

[Jevons’ Paradox](https://en.wikipedia.org/wiki/Jevons_paradox) says that making a _resource cheaper or more efficient to use often leads to greater overall consumption_. Originally about coal, it applies to the local-first paradigm in a way where we require apps to have more features, simply because it is technically possible, the app users and developers starts expecting them:

- **Performance & UX:** Running from local storage means **low latency** and instantaneous interactions. There's no round-trip delay for most operations. Local-first apps aim to provide **near-zero latency** responses by querying a local database instead of waiting for a server response​. This results in a snappy UX (often no need for loading spinners) because data reads/writes happen immediately on-device. Modern users expect real-time feedback, and local-first delivers that by default.

<p align="center">
  <img src="/files/loading-spinner-not-needed.gif" alt="loading spinner not needed" width="300" />
</p>

- **Offline Resilience:** Obviously, being able to work offline is a major benefit. Users can continue using the app with no internet (or flaky connectivity), and their changes sync up once online. This is increasingly important not just for remote areas, but for any app that needs to be available 24/7. Even though mobile networks have improved, connectivity can still drop; local-first ensures the app doesn't grind to a halt. The app _“stores data locally at the client so that it can still access it when the internet goes away.”_

- **User Control & Privacy:** Storing data locally can limit how much sensitive information is sent off to remote servers. End users have greater control over their data, and the app can implement [client-side encryption](../encryption.md), thereby reducing the risk of mass data breaches.

- **Reduced Server Load**: Because local-first architectures typically **transfer large chunks of data once** (e.g., during an initial sync) and then sync only small diffs (delta changes) afterward, the server does not have to handle repeated requests for the same dataset. This bulk-first, diff-later approach drastically decreases the total number of round-trip requests to the backend. In scenarios where hundreds of simultaneous users each require continuous data access, an offline-ready client that only periodically sends or receives changes can scale more efficiently, freeing your servers to handle more users or other tasks. Instead of being bombarded with frequent small queries and updates, the server focuses on periodic sync operations, which can be more easily optimized or batched. It **Scales with Data, Not Load**. In fact for most type of apps, most of the data itself rarely changes. Imagine a CRM system, how often does the data of a customer really change compared to how of a user open the customer-overview page which would load data from a server in traditional systems?

- **Realtime Apps**: Today’s users expect data to stay in sync across browser tabs and devices without constant page reloads. In a typical cloud app, if you want real-time updates (say to show that a friend edited a document), you'd need to implement a [websocket or polling](./websockets-sse-polling-webrtc-webtransport.md) system for the server to push changes to clients, which is complex. Local-first architectures naturally lend themselves to realtime-by-default updates because the application state lives in a local database that can be observed for changes. Any edits (local or incoming from the server) immediately trigger [UI updates](./optimistic-ui.md). Similarly, background sync mechanisms ensure that new server-side data flows into the local store and into the user interface right away—no need to hit F5 to fetch the latest changes like on a traditional webpage.

<p align="center">
  <img src="/files/animations/realtime.gif" alt="realtime ui updates" width="700" />
</p>

- **Better Developer Experience**: A local-first architecture often simplifies backend design. Instead of writing extensive REST routes for each client operation (create, read, update, delete, etc.), you can build a **single replication endpoint** or a small set of endpoints to handle data synchronization. The client (via tools like RxDB) manages local data, merges edits, and pushes/pulls changes with the server automatically. This not only **reduces boilerplate code** on the backend but also **frees developers** to focus on business logic and domain-specific concerns rather than spending time creating and maintaining dozens of narrowly scoped endpoints. As a result, the overall system can be easier to scale and maintain, delivering a **smoother developer experience**.



## Offline-First vs. Local-First

.. offline-first started with pouchdb in sth like 2014..
.. RxDB started in 2018..
...also when designing logos for local-first, do not use the map-location symbol as it will confuse users with geographical locality.
