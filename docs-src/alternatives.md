# Alternatives for realtime offline-first JavaScript applications

To give you an augmented view over the topic of client side JavaScript databases, this page contains all known alternatives to **RxDB**. Remember that you are reading this inside of the RxDB documentation, so everything is **opinionated**.
If you disagree with anything or think that something is missing, make a pull request to this file.


### What to compare with

[RxDB](https://rxdb.info) is an **observable**, **replicating**, **[offline first](./offline-first.md)**, **JavaScript** database. So it makes only sense to list similar projects as alternatives, not just any database or JavaScript store library. However, I will list up some projects that RxDB is often compared with, even if it only makes sense for some use cases.

This list should be seen as an **entrypoint** for your personal evaluation of which tool could work for your project.

--------------------------------------------------------------------------------

<!-- 
  IMPORTANT:
  DO NOT ADD ANY LINKS TO THE PROJECTS.
  THEY WOULD HAVE TO BE UPDATED EVERY FEW MONTHS AND I DO NOT WANT TO MAINTAIN THEM.
-->



### Firebase

<p align="center">
  <img src="./files/alternatives/firebase.svg" alt="firebase alternative" 
  class="img-padding"
  height="60" />
</p>

Firebase is a **platform** developed by Google for creating mobile and web applications. Firebase has many features and products, two of which are client side databases. The `Realtime Database` and the `Cloud Firestore`.

#### Firebase - Realtime Database

The firebase realtime database was the first database in firestore. It has to be mentioned that in this context, "realtime" means **"realtime replication"**, not "realtime computing". The firebase realtime database stores data as a big unstructured JSON tree that is replicated between clients and the backend.

#### Firebase - Cloud Firestore

The firestore is the successor to the realtime database. The big difference is that it behaves more like a 'normal' database that stores data as documents inside of collections. The conflict resolution strategy of firestore is always *last-write-wins* which might or might not be suitable for your use case.

The biggest difference to RxDB is that firebase products are only able to be used on top of the Firebase cloud hosted backend, which creates a vendor lock-in. RxDB can replicate with any self hosted CouchDB server or custom GraphQL endpoints. You can even replicate Firestore to RxDB with the [Firestore Replication Plugin](./replication-firestore.md).

### Meteor

<p align="center">
  <img src="./files/alternatives/meteor_text.svg" alt="MeteorJS alternative"   class="img-padding"
  height="60" />
</p>

Meteor (since 2012) is one of the oldest technologies for JavaScript realtime applications. Meteor is not a library but a whole framework with its own package manager, database management and replication protocol.
Because of how it works, it has proven to be hard to integrate it with other modern JavaScript frameworks like [angular](https://github.com/urigo/angular-meteor), vue.js or svelte.

Meteor uses MongoDB in the backend and can replicate with a Minimongo database in the frontend.
While testing, it has proven to be impossible to make a meteor app **offline first** capable. There are [some projects](https://github.com/frozeman/meteor-persistent-minimongo2) that might do this, but all are unmaintained.


### Minimongo

Forked in Jan 2014 from meteorJSs' minimongo package, Minimongo is a client-side, in-memory, JavaScript version of MongoDB with backend replication over HTTP. Similar to MongoDB, it stores data in documents inside of collections and also has the same query syntax. Minimongo has different storage adapters for IndexedDB, WebSQL, LocalStorage and SQLite.
Compared to RxDB, Minimongo has no concept of revisions or conflict handling, which might lead to undefined behavior when used with replication or in multiple browser tabs. Minimongo has no observable queries or changestream.

### WatermelonDB

<p align="center">
  <img src="./files/alternatives/watermelondb.png" alt="WatermelonDB alternative" height="60" />
</p>

WatermelonDB is a reactive & asynchronous JavaScript database. While originally made for React and React Native, it can also be used with other JavaScript frameworks. The main goal of WatermelonDB is **performance** within an application with lots of data.
In React Native, WatermelonDB uses the provided SQLite database. In a browser, LokiJS can be used to store and query data.


### AWS Amplify
<p align="center">
  <img src="./files/alternatives/aws-amplify.svg" alt="AWS Amplify alternative" height="60" class="img-padding" />
</p>

AWS Amplify is a collection of tools and libraries to develop web- and mobile frontend applications. Similar to firebase, it provides everything needed like authentication, analytics, a REST API, storage and so on. Everything hosted in the AWS Cloud, even when they state that *"AWS Amplify is designed to be open and pluggable for any custom backend or service"*. For realtime replication, AWS Amplify can connect to an AWS App-Sync GraphQL endpoint.

### AWS Datastore

Since december 2019 the Amplify library includes the AWS Datastore which is a document-based, client side database that is able to replicate data via AWS AppSync in the background.
The main difference to other projects is the complex project configuration via the amplify cli and the bit confusing query syntax that works over functions. Complex Queries with multiple `OR/AND` statements are not possible which might change in the future.
Local development is hard because the AWS AppSync mock does not support realtime replication. It also is not really offline-first because a user login is always required.

```ts
// An AWS datastore OR query
const posts = await DataStore.query(Post, c => c.or(
  c => c.rating("gt", 4).status("eq", PostStatus.PUBLISHED)
));

// An AWS datastore SORT query
const posts = await DataStore.query(Post, Predicates.ALL, {
  sort: s => s.rating(SortDirection.ASCENDING).title(SortDirection.DESCENDING)
});
```

The biggest difference to RxDB is that you have to use the AWS cloud backends. This might not be a problem if your data is at AWS anyway.


### RethinkDB

<p align="center">
  <img src="./files/alternatives/rethinkdb.svg" alt="RethinkDB alternative" height="60" class="img-padding" />
</p>

RethinkDB is a backend database that pushed dynamic JSON data to the client in realtime. It was founded in 2009 and the company shut down in 2016.
Rethink db is not a client side database, it streams data from the backend to the client which of course does not work while offline.

### Horizon

Horizon is the client side library for RethinkDB which provides useful functions like authentication, permission management and subscription to a RethinkDB backend. Offline support [never made](https://github.com/rethinkdb/horizon/issues/58) it to horizon.

### Supabase

<p align="center">
  <img src="./files/alternatives/supabase.svg" alt="Supabase alternative" height="60" class="img-padding" />
</p>


Supabase labels itself as "*an open source Firebase alternative*". It is a collection of open source tools that together mimic many Firebase features, most of them by providing a wrapper around a PostgreSQL database. While it has realtime queries that run over the wire, like with RethinkDB, Supabase has no client-side storage or replication feature and therefore is not offline first.

### CouchDB

<p align="center">
  <img src="./files/icons/couchdb-text.svg" alt="CouchDB alternative" height="60" class="img-padding" />
</p>

Apache CouchDB is a server-side, document-oriented database that is mostly known for its multi-master replication feature. Instead of having a master-slave replication, with CouchDB you can run replication in any constellation without having a master server as bottleneck where the server even can go off- and online at any time. This comes with the drawback of having a slow replication with much network overhead.
CouchDB has a changestream and a query syntax similar to MongoDB.

### PouchDB

<p align="center">
  <img src="./files/alternatives/pouchdb.svg" alt="PouchDB alternative" height="60" class="img-padding" />
</p>


PouchDB is a JavaScript database that is compatible with most of the CouchDB API. It has an adapter system that allows you to switch out the underlying storage layer. There are many adapters like for IndexedDB, SQLite, the Filesystem and so on. The main benefit is to be able to replicate data with any CouchDB compatible endpoint.
Because of the CouchDB compatibility, PouchDB has to do a lot of overhead in handling the revision tree of document, which is why it can show bad performance for bigger datasets.
RxDB was originally build around PouchDB until the storage layer was abstracted out in version [10.0.0](https://github.com/pubkey/rxdb/blob/master/orga/releases/10.0.0.md) so it now allows to use different `RxStorage` implementations. PouchDB has some performance issues because of how it has to store the document revision tree to stay compatible with the CouchDB API.

### Couchbase

Couchbase (originally known as Membase) is another NoSQL document database made for realtime applications.
It uses the N1QL query language which is more SQL like compared to other NoSQL query languages. In theory you can achieve replication of a Couchbase with a PouchDB database, but this has shown to be not [that easy](https://github.com/pouchdb/pouchdb/issues/7793#issuecomment-501624297).

### Cloudant

Cloudant is a cloud-based service that is based on CouchDB and has mostly the same features.
It was originally designed for cloud computing where data can automatically be distributed between servers. But it can also be used to replicate with frontend PouchDB instances to create scalable web applications.
It was bought by IBM in 2014 and since 2018 the Cloudant Shared Plan is retired and migrated to IBM Cloud.

### Hoodie

Hoodie is a backend solution that enables offline-first JavaScript frontend development without having to write backend code. Its main goal is to abstract away configuration into simple calls to the Hoodie API.
It uses CouchDB in the backend and PouchDB in the frontend to enable offline-first capabilities.
The last commit for hoodie was one year ago and the website (hood.ie) is offline which indicates it is not an active project anymore.

### LokiJS

LokiJS is a JavaScript embeddable, in-memory database. And because everything is handled in-memory, LokiJS has awesome performance when mutating or querying data. You can still persist to a permanent storage (IndexedDB, Filesystem etc.) with one of the provided storage adapters. The persistence happens after a timeout is reached after a write, or before the JavaScript process exits. This also means you could loose data when the JavaScript process exits ungracefully like when the power of the device is shut down or the browser crashes.
While the project is not that active anymore, it is more *finished* than *unmaintained*.

RxDB supports using [LokiJS as RxStorage](./rx-storage-lokijs.md).

### Gundb

GUN is a JavaScript graph database. While having many features, the **decentralized** replication is the main unique selling point. You can replicate data Peer-to-Peer without any centralized backend server. GUN has several other features that are useful on top of that, like encryption and authentication.

While testing it was really hard to get basic things running. GUN is open source, but because of how the source code [is written](https://github.com/amark/gun/blob/master/src/put.js), it is very difficult to understand what is going wrong.

### sql.js

sql.js is a javascript library to run SQLite on the web. It uses a virtual database file stored in memory and does not have any persistence. All data is lost once the JavaScript process exits. sql.js is created by compiling SQLite to WebAssembly so it has about the same features as SQLite. For older browsers there is a JavaScript fallback.


### absurd-sQL

Absurd-sql is a project that implements an IndexedDB-based persistence for sql.js. Instead of directly writing data into the IndexedDB, it treats IndexedDB like a disk and stores data in blocks there which shows to have a much better performance, mostly because of how [performance expensive](./slow-indexeddb.md) IndexedDB transactions are.

### NeDB

NeDB was a embedded persistent or in-memory database for Node.js, nw.js, Electron and browsers.
It is document-oriented and had the same query syntax as MongoDB. 
Like LokiJS it has persistence adapters for IndexedDB etc. to persist the database state on the disc.
The last commit to NeDB was in **2016**.

### Dexie.js

Dexie.js is a minimalistic wrapper for IndexedDB. While providing a better API than plain IndexedDB, Dexie also improves performance by batching transactions and other optimizations. It also adds additional non-IndexedDB features like observable queries or multi tab support or react hooks.
Compared to RxDB, Dexie.js does not support complex (MongoDB-like) queries and requires a lot of fiddling when a document range of a specific index must be fetched.
Dexie.js is used by Whatsapp Web, Microsoft To Do and Github Desktop.

RxDB supports using [Dexie.js as RxStorage](./rx-storage-dexie.md) which enhances IndexedDB with RxDB features like MongoDB-like queries etc.

### MongoDB Realm

Originally Realm was a mobile database for Android and iOS. Later they added support for other languages and runtimes, also for JavaScript. 
It was meant as replacement for SQLite but is more like an object store than a full SQL database.
In 2019 MongoDB bought Realm and changed the projects focus.
Now Realm is made for replication with the MongoDB Realm Sync based on the MongoDB Atlas Cloud platform. This tight coupling to the MongoDB cloud service is a big downside for most use cases.

### Apollo

The Apollo GraphQL platform is made to transfer data between a server to UI applications over GraphQL endpoints. It contains several tools like GraphQL clients in different languages or libraries to create GraphQL endpoints.

While it is has different caching features for offline usage, compared to RxDB it is not fully offline first because caching alone does not mean your application is fully usable when the user is offline.


# Read further

- [Offline First Database Comparison](https://github.com/pubkey/client-side-databases)
- https://jaredforsyth.com/tags/local-first/
