# Alternatives for offline-first/realtime JavaScript applications

To give you an augmented view over the topic of client side JavaScript databases, this page contains all known alternatives to **RxDB**. Remember that you read this inside of the RxDB documentation, so everything is **opinionated**.
If you disagree with anything or think that something is missing, make a pull request to this file.


### What to compare with

[RxDB](https://rxdb.info) is an **observable**, **replicating**, **[offline first](./offline-first.md)**, **JavaScript** database. So it makes only sense to list similar projects as alternatives, not just any database or JavaScript store library.



<!-- 
  IMPORTANT:
  DO NOT ADD ANY LINKS TO THE PROJECTS.
  THEY WOULD HAVE TO BE UPDATED EVERY FEW MONTHS AND I DO NOT WANT TO MAINTAIN THEM.
-->


### Firebase

<p align="center">
  <img src="./files/alternatives/firebase.svg" alt="firebase alternative" height="60" />
</p>

Firebase is a **platform** developed by Google for creating mobile and web applications. Firebase has many features and products, two of which are client side databases. The `Realtime Database` and the `Cloud Firestore`.

#### Firebase - Realtime Database

The firebase realtime database was the first database in firestore. It has to be mentioned that in this context, "realtime" means **"realtime replication"**, not "realtime computing". The firebase realtime database stores data as a big unstructured JSON tree that is replicated between clients and the backend.

#### Firebase - Cloud Firestore

The firestore is the successor to the realtime database. The big difference is that it behaves more like a 'normal' database that stores data as documents inside of collections.

The biggest difference to RxDB is that firebase products are only able to replicate with the firebase cloud hosted backend, which creates a vendor lock-in. RxDB can replicate with any self hosted CouchDB server or custom GraphQL endpoints.

### Meteor

<p align="center">
  <img src="./files/alternatives/meteor_text.svg" alt="MeteorJS alternative" height="60" />
</p>

Meteor (since 2012) is one of the oldest technologies for JavaScript realtime applications. Meteor is no a library but a whole framework with its own package manager, database management and replication protocol.
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

WatermelonDB is a reactive & asynchronous JavaScript database. While originally made for React and React Native, it can also be used with other JavaScript frameworks. The main goal of WatermelonDB is **performance** when having application with much data.
In React Native, WatermelonDB uses the provided SQLite database. In a browser, LokiJS can be used to store and query data.


### AWS Amplify
<p align="center">
  <img src="./files/alternatives/aws-amplify.svg" alt="AWS Amplify alternative" height="60" />
</p>

AWS Amplify is a collection of tools and libraries to develope web- and mobile frontend applications. Similar to firebase, it provides everything needed like authentication, analytics, a REST API, storage and so on. Everything hosted in the AWS Cloud, even when they state that *"AWS Amplify is designed to be open and pluggable for any custom backend or service"*. For realtime replication, AWS Amplify can connect to an AWS App-Sync GraphQL endpoint.

### AWS Datastore

Since december 2019 the Amplify library includes the AWS Datastore which is a document based, client side database that is able to replicate data via AWS AppSync in the background.
The main difference to other projects is the complex project configuration via the amplify cli and the bit confusing query syntax that works over functions. Complex Queries with multiple `OR/AND` statements are not possible which might change in the future.
Local developement is hard because the AWS AppSync mock does not support realtime replication. It also is not really offline-first because a user login is always required.

```ts
// An AWS datastore OR query
const posts = await DataStore.query(Post, c => c.or(
  c => c.rating("gt", 4).status("eq", PostStatus.PUBLISHED),
));

// An AWS datastore SORT query
const posts = await DataStore.query(Post, Predicates.ALL, {
  sort: s => s.rating(SortDirection.ASCENDING).title(SortDirection.DESCENDING)
});
```

The biggest difference to RxDB is that you have to use the AWS cloud backends. This might not be a problem if your data is at AWS anyway.


### RethinkDB

<p align="center">
  <img src="./files/alternatives/rethinkdb.svg" alt="RethinkDB alternative" height="60" />
</p>

RethinkDB is a backend database that pushed dynamic JSON data to the client in realtime. It was founded in 2009 and the company shut down in 2016.
Rethink db is not a client side database, it streams data from the backend to the client which of course does not work while offline.

### Horizon

Horizion is the client side library for RethinkDB which provides usefull functions like authentication, permission management and subscription to a RethinkDB backend. Offline support [never made](https://github.com/rethinkdb/horizon/issues/58) it to horizon.

### Supabase

<p align="center">
  <img src="./files/alternatives/supabase.svg" alt="Supabase alternative" height="60" />
</p>


Supabase labels itself as "*Supabase is an open source Firebase alternative*". It is a collection of open source tools that together can mimic many of the firebase features, most of them by wrapping a PostgreSQL database. While it has realtime queries that run over the wire, like with RethinkDB, Supabase has no client side storage or replication feature and therefore is not offline first.

### CouchDB

### PouchDB

### Couchbase
## Hoodie

### LokiJS
### Gundb

### sql.js
https://github.com/sql-js/sql.js/

### Absurd SQL
https://github.com/jlongster/absurd-sql

### NeDB

https://github.com/louischatriot/nedb

### MongoDB realm

### Apollo

## Further Read

- [Offline First Database Comparison](https://github.com/pubkey/client-side-databases)
