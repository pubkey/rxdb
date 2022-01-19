# Alternatives for offline-first/realtime JavaScript applications

To give you an augmented view over the topic of client side JavaScript databases, this page contains all known alternatives to **RxDB**. Remember that you read this inside of the RxDB documentation, so everything is **opinionated**.
If you disagree with anything or think that something is missing, make a pull request to this file.


### What to compare with

[RxDB](https://rxdb.info) is an **observable**, **replicating**, **[offline first](./offline-first.md)**, **JavaScript** database. So it makes only sense to list similar projects as alternatives, not just any database or JavaScript store library.



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
Compared to RxDB, Minimongo has no concept of revisions or conflict handling, which might lead to undefined behavior when used with replication or in multiple browser tabs.

### WatermelonDB

<p align="center">
  <img src="./files/alternatives/watermelondb.png" alt="WatermelonDB alternative" height="60" />
</p>

WatermelonDB is a reactive & asynchronous JavaScript database. While originally made for React and React Native, it can also be used with other JavaScript frameworks. The main goal of WatermelonDB is **performance** when having application with much data.
In React Native, WatermelonDB uses the provided SQLite database. In a browser, LokiJS can be used to store and query data.

### AWS Datastore
### AWS Amplify
<p align="center">
  <img src="./files/alternatives/aws-amplify.svg" alt="AWS Amplify alternative" height="60" />
</p>


### Supabase

### RethinkDB
### Horizon

### LokiJS

### CouchDB
### PouchDB

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
