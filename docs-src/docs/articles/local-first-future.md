---
title: Why Local-First Is the Future and whare are Its Limitations
slug: local-first-future.html
description:  asdf
---


# Why Local-First Is the Future and what are Its Limitations

Imagine a web app that behaves seamlessly even with zero internet access, provides sub-millisecond response times, and keeps most of the user's data on their device. This is the **local-first** or [offline-first](../offline-first.md) approach. Although it has been around for a while, local-first has recently become more practical because of **maturing browser storage APIs** and new frameworks that simplify **data synchronization**. By allowing data to live on the client and only syncing with a server or other peers when needed, local-first apps can deliver a user experience that is **fast, resilient**, and **privacy-friendly**.

However, local-first is no silver bullet. It introduces tricky distributed-data challenges like conflict resolution and schema migrations on client devices. In this article, we'll dive deep into what local-first means, why it's trending, its pros and cons, and how to implement it (with examples using **RxDB**) in real applications. We'll also discuss other tools, criticisms, backend considerations, and how local-first compares to traditional cloud-centric approaches.

## What is the Local-First Paradigm

**Local-first computing** refers to a software design paradigm where applications **store and process data primarily on the user’s local device** (browser or mobile), rather than relying on a constant server connection. In a local-first app, the [local database](./local-database.md) is the source of truth for the app’s state, and cloud servers (if any) are used mainly for background synchronization and backup​. This means the app should function as well offline as it does online, giving users ownership and control of their data. Local-first ideals include the ability to work offline and collaborate across devices, while improving security, privacy, and user control of data​.

In other words, the app should work as well offline as it does online. Instead of treating the server as the single source of truth, a local-first app treats the _local database_ as the source of truth for reads and writes, and uses background synchronization to propagate changes to a backend or other peers. This makes the local database (on the client) the gateway for all persistent state changes, **not the remote server​**.

## Why Local-First is Gaining Traction

The push for local-first is driven by a few key new technological capabilities that previously restricted client devices from running heavy local-first computing:

- **Relaxed Browser Storage Limits**: In the past, true local-first web apps were not very feasible due to **storage limitations** in browsers. Early web storage options like cookies or [localStorage](./localstorage.md#understanding-the-limitations-of-local-storage) had tiny limits (~5-10MB) and were unsuitable for complex data. Even **IndexedDB**, the structured client storage introduced over a decade ago, had restrictive quotas on many browsers – for example, older Firefox versions would **prompt the user if more than 50MB** was being stored. Mobile browsers often capped IndexedDB to 5MB without user permission. Such limits made it impractical to cache large application datasets on the client. However, modern browsers have dramatically [increased these limits](./indexeddb-max-storage-limit.md). Today, IndexedDB can typically store **hundreds of megabytes to multiple gigabytes** of data, depending on device capacity. Chrome allows up to ~80% of free disk space per origin (tens of GB on a desktop), Firefox now supports on the order of gigabytes per site (10% of disk size), and even Safari (historically strict) permits around 1GB per origin on iOS. In short, the storage quotas of 5–50MB are a thing of the past – modern web apps can cache very large datasets locally without hitting a ceiling. This shift in storage capabilities has unlocked new possibilities for **local-first web apps** that simply weren’t viable a few years ago.

- **New Storage APIs (OPFS)**: The [Origin Private File System](../rx-storage-opfs.md) (OPFS), part of the File System Access API, enables near-native file I/O from within a browser. It allows web apps to manage file handles securely and perform fast, synchronous reads/writes in Web Workers. This is a huge deal for local-first computing because it makes it feasible to embed robust database engines directly in the browser, persisting data to real files on a virtual filesystem. With OPFS, you can avoid some of the performance overhead that comes with [IndexedDB-based workarounds](../slow-indexeddb.md), providing a near-native [speed experience](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md#big-bulk-writes) for file-structured data.

- **WebAssembly**: Another crucial advancement is **WebAssembly (WASM)**, which allows developers to compile low-level languages (C, C++, Rust) for execution in the browser at near-native speed. This means database engines, search algorithms, [vector databases](./javascript-vector-database.md),  and other performance-heavy tasks can run right on the client. However, a key limitation is that **WASM cannot directly access persistent storage APIs** in the browser. Instead, all data must be marshaled from WASM to JavaScript (or the main thread) and then go through something like IndexedDB or OPFS. This extra indirection [is slower](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md) compared to plain JavaScript->storage calls. Looking ahead, there might come up future APIs that allow WASM to interface with persistent storage directly—if those land, local-first systems could see another major boost in [performance](../rx-storage-performance.md).

- **Bandwidth Has Grown, But Latency Is Capped**: Internet infrastructure has rapidly expanded to provide higher throughput—making it possible to transfer large amounts of data more quickly. However, latency (i.e., round-trip delay) is constrained by the **speed of light** and other physical limitations in fiber, satellite links, and routing. We can always build out bigger “pipes” to stream or send bulk data, but we can’t significantly reduce the base round-trip time for each request. This is a physical limit, not a technological one. Local-first strategies mitigate this fundamental latency limit by avoiding excessive client-server calls in interactive workflows—once data is on the client, it’s instantly available for reads and writes without waiting on a network round-trip. Imagine, transferring **around 100,000** “average” JSON documents might only consume **about the same bandwidth as two frames of a 4K YouTube video**, which shows just how far raw data throughput has come. Yet each request still carries a 100–200ms delay or more, which becomes noticeable in user interactions. Local-first mitigates this by minimizing round-trip calls during active use.


<p align="center">
  <img src="/files/latency-london-san-franzisco.png" alt="latency london san franzisco" width="300" />
</p>

- **Improvements in Local-First Tooling**: TODO (how rxdb is faster and better and can do 1mio mail search in 100 ms)

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="RxDB" width="220" />
    </a>
</center>

## What you can expect from a Local First App

[Jevons’ Paradox](https://en.wikipedia.org/wiki/Jevons_paradox) says that making a _resource cheaper or more efficient to use often leads to greater overall consumption_. Originally about coal, it applies to the local-first paradigm in a way where we require apps to have more features, simply because it is technically possible, the app users and developers start to expect them:

### User Experience Benefits

- **Performance & UX:** Running from local storage means **low latency** and instantaneous interactions. There's no round-trip delay for most operations. Local-first apps aim to provide **near-zero latency** responses by querying a local database instead of waiting for a server response​. This results in a snappy UX (often no need for loading spinners) because data reads/writes happen immediately on-device. Modern users expect real-time feedback, and local-first delivers that by default.

<p align="center">
  <img src="/files/loading-spinner-not-needed.gif" alt="loading spinner not needed" width="300" />
</p>

- **Offline Resilience:** Obviously, being able to work offline is a major benefit. Users can continue using the app with no internet (or flaky connectivity), and their changes sync up once online. This is increasingly important not just for remote areas, but for any app that needs to be available 24/7. Even though mobile networks have improved, connectivity can still drop; local-first ensures the app doesn't grind to a halt. The app _“stores data locally at the client so that it can still access it when the internet goes away.”_

- **User Control & Privacy:** Storing data locally can limit how much sensitive information is sent off to remote servers. End users have greater control over their data, and the app can implement [client-side encryption](../encryption.md), thereby reducing the risk of mass data breaches.

- **Realtime Apps**: Today’s users expect data to stay in sync across browser tabs and devices without constant page reloads. In a typical cloud app, if you want real-time updates (say to show that a friend edited a document), you'd need to implement a [websocket or polling](./websockets-sse-polling-webrtc-webtransport.md) system for the server to push changes to clients, which is complex. Local-first architectures naturally lend themselves to realtime-by-default updates because the application state lives in a local database that can be observed for changes. Any edits (local or incoming from the server) immediately trigger [UI updates](./optimistic-ui.md). Similarly, background sync mechanisms ensure that new server-side data flows into the local store and into the user interface right away—no need to hit F5 to fetch the latest changes like on a traditional webpage.

<p align="center">
  <img src="/files/animations/realtime.gif" alt="realtime ui updates" width="700" />
</p>


### Developer Experience Benefits

- **Reduced Server Load**: Because local-first architectures typically **transfer large chunks of data once** (e.g., during an initial sync) and then sync only small diffs (delta changes) afterward, the server does not have to handle repeated requests for the same dataset. This bulk-first, diff-later approach drastically decreases the total number of round-trip requests to the backend. In scenarios where hundreds of simultaneous users each require continuous data access, an offline-ready client that only periodically sends or receives changes can scale more efficiently, freeing your servers to handle more users or other tasks. Instead of being bombarded with frequent small queries and updates, the server focuses on periodic sync operations, which can be more easily optimized or batched. It **Scales with Data, Not Load**. In fact for most type of apps, most of the data itself rarely changes. Imagine a CRM system, how often does the data of a customer really change compared to how of a user open the customer-overview page which would load data from a server in traditional systems?

- **Less Need for Custom API Endpoints**: A local-first architecture often simplifies backend design. Instead of writing extensive REST routes for each client operation (create, read, update, delete, etc.), you can build a **single replication endpoint** or a small set of endpoints to handle data synchronization for each entity. The client manages local data, merges edits, and pushes/pulls changes with the server automatically. This not only **reduces boilerplate code** on the backend but also **frees developers** to focus on business logic and domain-specific concerns rather than spending time creating and maintaining dozens of narrowly scoped endpoints. As a result, the overall system can be easier to scale and maintain, delivering a **smoother developer experience**.

- **Simplified State Management in Frontend**: Because the local database holds the authoritative state, you might rely less on complex state management libraries (Redux, MobX, etc.). The DB becomes a single source of truth for your UI. In an offline-first app, “your global state is already there in a single place stored inside of the local database”, so you don't need as many in-memory state layers to synchronize​. The UI can directly bind to the database (using queries or reactive subscriptions). All sources of changes (user input, remote updates, other tabs) funnel through the database. This can significantly reduce the "glue code" to keep UI state in sync with server state – the local DB does that for you. With RxDB and similar tools, “you might not need Redux” because the reactive DB fulfills that role​ of state management already.

- **Better Multi-Tab and Multi-Device Consistency**: Because the source of truth is on the client, if the user has the app open in multiple tabs or even multiple devices, each has a full copy of the data. In browsers, many offline databases use a storage like IndexedDB that is shared across tabs of the same origin. This means all tabs see the same up-to-date local state. For example, if a user logs in or adds data in one tab, the other tab can automatically reflect that change via the shared local DB (and events)​. This solves a common issue in web apps where one tab doesn't know that something changed in another tab. With local-first, **multi-tab just works** by default because there's "exactly one state of the data across all tabs". Similarly, on multiple devices, once sync runs, each device eventually converges to the same state.

  > If your users have to press F5 all the time, your app is broken!

- **Potential for P2P and Decentralization**: While most current local-first apps still use a central backend for syncing, the paradigm opens the door to [peer-to-peer data syncing](../replication-webrtc.md). Because each device has the full data, devices could sync directly via LAN or other P2P channels for collaboration, reducing reliance on central servers. There are experimental frameworks that allow truly decentralized sync. This is a more advanced benefit, but it aligns with the ethos of giving users more control and reducing dependence on any one cloud provider.


These advantages show why developers are excited about local-first. You get happier users thanks to a fast, offline-capable app, and you can differentiate your product by working in scenarios where others fail (e.g. poor connectivity). Companies like Google, Amazon, etc., invest heavily in reducing latency and adding offline modes for a reason: it improves retention and usability. Local-first design takes that to the extreme by default.

## Challenges and Limitations of Local-First

However, this approach is not without significant challenges. It's important to understand the drawbacks and trade-offs before deciding to go all-in on local-first. Let's examine the flip side.

> You fully understood a technology when you know when **not** to use it.

Critics of local-first approaches often point out these challenges. Here's a comprehensive list of cons, criticisms, and obstacles associated with local-first development and proposed solutions on how to solve these obstacles:

- **Data Synchronization**: Data synchronization is arguably the hardest part of local-first development, because when every user’s device can be offline for extended periods, data inevitably diverges. Ensuring those changes propagate and reconcile with minimal user headaches is a major challenge in distributed systems. Two main approaches have emerged:
  - **Use a bundled frontend+backend solution** where the backend is tightly coupled to the client SDK and knows exactly how to handle sync. A common example is Firestore (part of the Firebase ecosystem) where Google’s servers and client libraries collectively manage storage, change detection, conflict resolution, and syncing. The upside is you have a turnkey solution—developers can focus on features rather than writing sync logic. The downside is lock-in, because the sync protocol is proprietary and tailored to that vendor. In many organizations, this is a non-starter: existing company infrastructure can'T be uprooted or replaced just for a single offline-capable app. This lock-in issue can arise even if the backend is not strictly a third-party vendor but simply another technology like PostgreSQL, because it still forces you to consolidate all your data into a single system that you might not use otherwise.

  - **Custom Replication with Your Own Endpoints**: Alternatively, you can implement your own [replication endpoints](../replication-http.md) on top of your existing infrastructure. This is the approach used by tools like RxDB, which rely on a lightweight, git-like replication protocol. The server remains relatively “dumb,” focusing on storing revisions, tracking changes, and marking conflicts, while the client library does the actual [conflict resolution](../transactions-conflicts-revisions.md). During sync, if the server detects a conflict (e.g., two offline edits to the same document), it notifies the client, which then decides how to merge them—whether via last-write-wins, a custom merge function, or a [CRDT](../crdt.md). Setting up custom endpoints does require more development effort, but you avoid vendor lock-in and can integrate seamlessly with your existing database(s). Your system simply needs to support incrementally fetching changes (pull) and accepting local modifications (push), which can be layered on top of nearly any data store or architecture.

- **Conflict Resolution**: When multiple offline edits happen on the same data, you inevitably get **merge conflicts**. For example, if two users (or the same user on two devices) both edit the same document offline, when both sync, whose changes win? Local-first systems need a conflict resolution strategy. Some systems use **last-write-wins** or deterministic revision hashing to pick a "winner" (as in CouchDB/PouchDB)​. This is simple but may drop one user's changes. Other approaches keep both versions and merge them either via an implement ["merge-function"](../transactions-conflicts-revisions.md#custom-conflict-handler) or require a **manual merge** step (e.g., like git conflicts or showing the user a diff UI). More advanced solutions involve **CRDTs (Conflict-free Replicated Data Types)** which mathematically merge changes (used for rich text collaboration, for instance). Libraries like Automerge or Yjs implement CRDTs to "magically solve conflicts" – but in practice, using CRDTs is also complex and has its own trade-offs and sometimes not even possible like when you need aditional data from another instance for a "correct" merge. No matter which route, handling conflicts adds complexity to your app logic or infrastructure. In cloud-based (online-first) apps, you avoid this because everyone is always editing the single up-to-date copy on the server. Local-first shifts that burden to the client side. 
  
  Here is an example on how a merge functions works in RxDB:

  ```ts
  import { deepEqual } from 'rxdb/plugins/utils';
  export const myConflictHandler = {
      /**
       * isEqual() is used to detect if two documents are
       * equal. This is used internally to detect conflicts.
       */
      isEqual(a, b) {
          /**
           * isEqual() is used to detect conflicts or to detect if a
           * document has to be pushed to the remote.
           * If the documents are deep equal,
           * we have no conflict.
           * Because deepEqual is CPU expensive,
           * on your custom conflict handler you might only
           * check some properties, like the updatedAt time or revision-strings
           * for better performance.
           */
          return deepEqual(a, b);
      },
      /**
       * resolve() a conflict. This can be async so
       * you could even show an UI element to let your user
       * resolve the conflict manually.
       */
      async resolve(i) {
          /**
           * In this example we drop the local state and use the server-state.
           * This basically implements a "first-on-server-wins" strategy.
           * 
           * In your custom conflict handler you could want to merge properties
           * of the i.realMasterState, i.assumedMasterState and i.newDocumentState
           * or return i.newDocumentState to have a "last-write-wins" strategy.
           */
          return i.realMasterState;
      }
  };
  ```

- **Eventual Consistency (No Single Source of Truth):** A local-first system is **eventually consistent** by nature. There is no single authoritative copy of the data at all times – instead you have one per device (and maybe one on the server), and they sync to become consistent eventually. This means at any given moment, two users might not see the same data if one hasn't synced recently. Users could even make decisions based on stale data. In many applications this is acceptable (the data will catch up), but for some scenarios it's problematic. For instance, an offline-first banking app that lets you initiate a money transfer offline could be dangerous if the account balance was out-of-date or if the transfer needs immediate consistency. One author put it bluntly: some data is too important to be eventual – _“No thank you, do not use offline first for these kind of things”_, at least not without very careful UI to indicate sync state. Essentially, **not all apps can tolerate eventual consistency**. If your use case demands strong consistency (e.g., inventory systems where overselling is a big issue, or real-time collaborative editing where every keystroke must be seen by others instantly), a purely local-first approach might need augmentation or may not fit.

- **Initial Data Load and Data Size Limits:** Local-first requires pulling data **down to the client**. If your dataset is huge (gigabytes), it's simply not feasible to download everything to every client. For example, syncing every tweet on Twitter to every user's phone is impossible. Local-first works best when the data set per user is reasonably sized (up to 2 Gigabytes). In practice, you often **limit the data** to just that user's own data or a subset relevant to them. Even then, on first use the app might need to download a significant chunk of data to initialize the local database. There is a **upper bound on dataset size** beyond which the initial sync or storage needs become impractical. You cannot assume unlimited local storage. If your data is too large, local-first will either fail or you'll need to only sync partial data (and then handle what happens if the needed data isn't present locally). In short, **local-first is unsuitable for massive datasets** or data that cannot be partitioned per user.

- **Storage Persistence (Browser Limitations):** Storing data in the browser (via IndexedDB or similar) is not as durable as on a server disk. Browsers may **evict data** to save space (especially on mobile devices). For instance, Safari notoriously wipes out IndexedDB data if the user hasn't used the site in ~7 days, treating it as cache. Other browsers have their own eviction policies for offline data. Also, users can at any time clear their browser storage (intentionally or via something like "Clear site data"). This means the local data **cannot be 100% trusted to stay forever**. A well-behaved local-first app needs to be able to recover if local data is lost – usually by pulling from the server again​. Essentially, the server still often serves as a backup. But if your app had any purely local data (not intended to sync), that's at risk. **Mobile apps** (with SQLite or filesystem storage) are a bit more stable than web browsers, but even there, uninstalls or certain OS actions can remove local data. This is a challenge: how to cache data offline for speed while ensuring if it's wiped, the user doesn’t lose everything important. Cloud-only apps by contrast keep data in the cloud so it's typically safe unless the server fails (and servers are easier to backup reliably).

<p align="center">
  <img src="/files/safari-database.png" alt="safari database" width="200" />
</p>


- **Complex Client-Side Logic & Increased App Size**: A local-first app tends to be more complex on the client side. You're essentially putting what used to be server responsibilities (storage, query engine, sync logic) into the frontend. This can increase the size of your frontend bundle (including a database library, possibly CRDT or sync code, etc.). It also increases memory and CPU usage on the client, as the browser/phone is doing more work. Low-end devices or older phones might struggle if the app is not optimized. Developers need to consider performance tuning for the local database (indexing, query efficiency) just like they would on a server. So while the user gains benefits, the app developer has to manage this complexity.

- **Performance Constraints in JavaScript:** Even though devices are fast, a local JS database is generally **slower than a server DB** on robust hardware. There are many layers (JS -> IndexedDB -> possibly SQLite under the hood) that add overhead​. For example, inserting a record might go through the DB library, the storage engine, the browser's implementation, down to disk. For most UI uses this is fine (you don't need 10k writes/sec in a to-do app, you need maybe a few writes per second at most). But if your app does heavy data processing, the browser might become a bottleneck. The key question is _“Is it fast enough?”_. Often the answer is yes for typical usage, but developers must be mindful of not doing something on the client that truly requires big iron servers. For instance, full-text indexing of a million documents might be too slow in a client-side DB. **Unpredictable performance** is also a factor: different users have different devices. A query that takes 50ms on a high-end desktop might take 500ms on a low-end phone. So performance tuning and testing across devices is needed, and some heavy tasks might still belong on the server side​. For example if you build a [local vector database](./javascript-vector-database.md) you might want to create the embedding on the server and sync them instead of creating them on the client.

- **Client Database Migrations:** As your app evolves, you'll change data models or add new fields. In a cloud-first app, you'd typically run a migration on the server database. In a local-first app, you have not only the server DB (if any) but also every client’s local database to consider. Upgrading the schema means you need to write migration logic that runs on each client, perhaps the next time they launch the app after an update. Clients may be offline or not upgrade the app immediately, so you could have different versions of the schema in the wild. This complicates data handling (the sync protocol might need to handle multiple schema versions until everyone is updated). Providing a smooth migration path for local data is doable (many libraries like RxDB or Realm provide [migration facilities](../migration-schema.md)), but it requires careful testing. In a worst case, a failed migration on a client could brick the app for that user or force a full resync. This is a **much bigger headache** than just migrating a centralized DB at midnight while your service is in maintenance mode. 🌃

- **Security and Access Control:** In cloud-based apps, enforcing data security (who can see what) is done on the server – the client only gets the data it's authorized to get. In a local-first scenario, you often need to **partition data per user** on the backend as well, to ensure users only sync down their own data (or data they have permission for). One simple strategy is to give each user their own database or dataset on the server and only replicate that. For example, CouchDB allows creating one database per user and replication can be scoped to that DB – making permission easy. But if you ever need to query across users (say an admin view or aggregate analytics), having data split into many small DBs becomes a pain. The alternative is a single backend database with a **fine-grained access control**, and the client asks to sync only certain documents/fields. That usually means writing a custom sync server or using something like GraphQL with resolvers that respect permissions. In short, **implementing auth and permissions in sync** adds complexity. Also, any data stored on the client is theoretically vulnerable to extraction (if someone compromises the device or uses dev tools). You can [encrypt local databases](../encryption.md) to prevent extraction after the server "revokes" the decryption password to migitate the data extraction risk.

- **Relational Data and Complex Queries:** Most client-side/offline databases (like RxDB, IndexedDB, PouchDB, etc.) are [NoSQL/document](../why-nosql.md) oriented for flexibility in syncing and easy conflict handling. They may not support complex join queries or ACID transactions across multiple tables like a full SQL database would. This is partly because replicating a full relational model is much harder (maintaining referential integrity, etc., when data is partial on a client) or not even logically possible. For example if you have two offline clients running a complex `UPDATE X WHERE Y FROM Z INNER JOIN Alice INNER JOIN Bob` query and then they go online, you have no easy way of handling these conflicts.
  
  If your app has heavy relational data requirements or relies on complex server-side queries (aggregations, multi-join reports), you might find the local database either cannot do it or is too slow to do it client-side. The lack of robust relational querying is something to plan for – you might need to adjust your data model to be more document-oriented or use client-side libraries to run [joins in memory](../why-nosql.md#relational-queries-in-nosql). Most tools use NoSQL because it makes replication easy and implementing true relational sync would require extremely sophisticated solutions and even needing an atomic clock for full consistency across nodes (like google spanner). So, **if your app truly needs SQL power on the client**, local-first might complicate things.

  > In Local-First, most tools use NoSQL because it makes replication and conflict handling easy.



That’s a long list of challenges! In summary, local-first approaches introduce distributed data issues on the client side that web developers usually didn't have to deal with. But most of them are solved or solveable for your specific use-case, just keep them in mind before you start building local-first stuff.











## Offline-First vs. Local-First

.. offline-first started with pouchdb in sth like 2014..
.. RxDB started in 2018..
...also when designing logos for local-first, do not use the map-location symbol as it will confuse users with geographical locality.


## Do people actually use Local-First or is it just a trend

..npm download counts low compared to other javascript tooling..
..show how RxDB premium users use it..
