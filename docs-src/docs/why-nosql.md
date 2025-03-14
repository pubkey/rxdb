---
title: Why NoSQL Powers Modern UI Apps
slug: why-nosql.html
description: Discover how NoSQL enables offline-first UI apps. Learn about easy replication, conflict resolution, and why relational data isn't always necessary.
---

# Why UI applications need NoSQL

[RxDB](https://rxdb.info), a client side, offline first, JavaScript database, is now several years old.
Often new users appear in the chat and ask for that one simple feature:
They want to store and query **relational data**.

> So why not just implement SQL?

All these client databases out there have on some kind of document based, NoSQL like, storage engine. PouchDB, Firebase, AWS Datastore, RethinkDB's [Horizon](https://github.com/rethinkdb/horizon), Meteor's [Minimongo](https://github.com/mWater/minimongo), [Parse](https://parseplatform.org/), [Realm](https://realm.io/). They all do not have real relational data.

They might have some kind of weak relational foreign keys like the [RxDB Population](./population.md)
or the [relational models](https://docs.amplify.aws/lib/datastore/relational/q/platform/js/) of AWS Datastore.
But these relations are weak. The foreign keys are not enforced to be valid like in PostgreSQL, and you cannot query
the rows with complex subqueries over different tables or collections and then make mutations based on the result.

There must be a reason for that. In fact, there are multiple of them and in the following I want to show you why you can neither have, nor want real relational data when you have a client-side database with replication.


<p align="center">
  <img src="./files/no-sql.png" alt="NoSQL" width="100" />
</p>


## Transactions do not work with humans involved

On the server side, transactions are used to run steps of logic inside of a self contained `unit of work`. The database system ensures that multiple transactions do not run in parallel or interfere with each other.
This works well because on the server side you can predict how longer everything takes. It can be ensured that one transaction does not block everything else for too long which would make the system not responding anymore to other requests.

When you build a UI based application that is used by a real human, you can no longer predict how long anything takes.
The user clicks the edit button and expects to not have anyone else change the document while the user is in edit mode.
Using a transaction to ensure nothing is changed in between, is not an option because the transaction could be open for a long
time and other background tasks, like replication, would no longer work.

So whenever a human is involved, this kind of logic has to be implemented using other strategies. Most NoSQL databases like [RxDB](./) or [CouchDB](./replication-couchdb.md) use a system based on [revision and conflicts](./transactions-conflicts-revisions.md) to handle these.



## Transactions do not work with offline-first


When you want to build an [offline-first](./offline-first.md) application, it is assumed that the user can also read and write data, even when the device has lost the connection to the backend.
You could use database transactions on writes to the client's database state, but enforcing a transaction boundary across other instances like clients or servers, is not possible when there is no connection.

<p align="center">
  <img src="./files/why-no-transactions.jpg" alt="offline first vs relational transactions" width="400" />
</p>

On the client you could run an update query where all `color: red` rows are changed to `color: blue`, but this would not guarantee that there will still be other `red` documents when the client goes online again and restarts the replication with the server. 

```sql
UPDATE docs
SET docs.color = 'red'
WHERE docs.color = 'blue';
```





## Relational queries in NoSQL

What most people want from a relational database, is to run queries over multiple tables.
Some people think that they cannot do that with NoSQL, so let me explain.

Let's say you have two tables with `customers` and `cities` where each city has an `id` and each customer has a `city_id`. You want to get every customer that resides in `Tokyo`. With SQL, you would use a query like this:

```sql
SELECT *
FROM city
WHERE city.name = 'Tokyo'
LEFT JOIN customer ON customer.city_id = city.id;
```

With **NoSQL** you can just do the same, but you have to write it manually:

```typescript
const cityDocument = await db.cities.findOne().where('name').equals('Tokyo').exec();
const customerDocuments = await db.customers.find().where('city_id').equals(cityDocument.id).exec();
```

So what are the differences? The SQL version would run faster on a remote database server because it would aggregate all data there and return only the customers as result set. But when you have a local database, it is not really a difference. Querying the two tables by hand would have about the same performance as a JavaScript implementation of SQL that is running locally.

The main benefit from using SQL is, that the SQL query runs inside of a **single transaction**. When a change to one of our two tables happens, while our query runs, the SQL database will ensure that the write does not affect the result of the query. This could happen with NoSQL, while you retrieve the city document, the customer table gets changed and your result is not correct for the dataset that was there when you started the querying. As a workaround, you could observe the database for changes and if a change happened in between, you have to re-run everything.

<p align="center">
  <img src="./files/no-relational-data.png" alt="no relational data" width="250" />
</p>


## Reliable replication

In an offline first app, your data is replicated from your backend servers to your users and you want it to be reliable.
The replication is **reliable** when, no matter what happens, every online client is able to run a replication
and end up with the **exact same** database state as any other client.

Implementing a reliable replication protocol is hard because of the circumstances of your app:

- Your users have unknown devices.
- They have an unknown internet speed.
- They can go offline or online at any time.
- Clients can be offline for a several days with un-synced changes.
- You can have many users at the same time.
- The users can do many database writes at the same time to the same entities.

Now lets say you have a SQL database and one of your users, called Alice, runs a query that mutates some rows, based on a condition.

```sql
# mark all items out of stock as inStock=FALSE
UPDATE
  Table_A
SET
  Table_A.inStock = FALSE
FROM
  Table_A
WHERE
  Table_A.amountInStock = 0
```

At first, the query runs on the local database of Alice and everything is fine.

But at the same time Bob, the other client, updates a row and sets `amountInStock` from `0` to `1`.
Now Bob's client replicates the changes from Alice and runs them. Bob will end up with a different database state than Alice because on one of the rows, the `WHERE` condition was not met. This is not what we want, so our replication protocol should be able to fix it. For that it has to reduce all mutations into a deterministic state.

Let me loosely describe how "many" SQL replications work:

Instead of just running all replicated queries, we remember a list of all past queries. When a new query comes in that happened `before` our last query, we roll back the previous queries, run the new query, and then re-execute our own queries on top of that. For that to work, all queries need a timestamp so we can order them correctly. But you cannot rely on the clock that is running at the client. Client side clocks drift, they can run in a different speed or even a malicious client modifies the clock on purpose. So instead of a normal timestamp, we have to use a [Hybrid Logical Clock](https://jaredforsyth.com/posts/hybrid-logical-clocks/) that takes a client generated id and the number of the clients query into account. Our timestamp will then look like `2021-10-04T15:29.40.273Z-0000-eede1195b7d94dd5`. These timestamps can be brought into a deterministic order and each client can run the replicated queries in the same order. Watch [this video](https://www.youtube.com/watch?v=iEFcmfmdh2w&t=607s) to learn how to implement that.

While this sounds easy and realizable, we have some problems:
This kind of replication works great when you replicate between multiple SQL servers. It does not work great when you replicate between a single server and many clients.

1. As mentioned above, clients can be offline for a long time which could require us to do many and heavy rollbacks on each client when someone comes back after a long time and replicates the change.
2. We have many clients where many changes can appear and our database would have to roll back many times.
3. During the rollback, the database cannot be used for read queries.
4. It is required that each client downloads and keeps the whole query history.

With **NoSQL**, replication works different. A new client downloads all current documents and each time a document changes, that document is downloaded again. Instead of replicating the query that leads to a data change, we just replicate the changed data itself. Of course, we could do the same with SQL and just replicate the affected rows of a query, like WatermelonDB [does it](https://youtu.be/uFvHURTRLxQ?t=1133). This was a clever way to go for WatermelonDB, because it was initially made for React Native and did want to use the fast SQLite instead of the slow [AsyncStorage](https://medium.com/@Sendbird/extreme-optimization-of-asyncstorage-in-react-native-b2a1e0107b34). But in a more general view, it defeats the whole purpose of having a replicating relational database because you have transactions locally, but these transactions become **meaningless** as soon as the data goes through the replication layer.

<p align="center">
  <img src="./files/database-replication.png" alt="database replication" width="200" />
</p>


## Server side validation

Whenever there is client-side input, it must be validated on the server.
On a NoSQL database, validating a changed document is trivial. The client sends the changed document to the server, and the server can then check if the user was allowed to modify that one document and if the applied changes are ok.

Safely validating a SQL query is up to impossible.
  - You first need a way to parse the query with all this complex SQL syntax and keywords.
  - You have to ensure that the query does not DOS your system.
  - Then you check which rows would be affected when running the query and if the user was allowed to change them
  - Then you check if the mutation to that rows are valid.

For simple queries like an insert/update/delete to a single row, this might be doable. But a query with 4 `LEFT JOIN` will be hard.

## Event optimization

With NoSQL databases, each write event always affects exactly one document. This makes it easy to optimize the processing of events at the client. For example instead of handling multiple updates to the same document, when the user comes online again, you could skip everything but the last event.

Similar to that you can optimize observable query results. When you query the `customers` table you get a query result of 10 customers. Now a new customer is added to the table and you want to know how the new query results look like. You could analyze the event and now you know that you only have to add the new customer to the previous results set, instead of running the whole query again. These types of optimizations can be run with all NoSQL queries and even work with `limit` and `skip` operators. In RxDB this all happens in the background with the [EventReduce algorithm](https://github.com/pubkey/event-reduce) that calculates new query results on incoming changes.

These optimizations do not really work with relational data. A change to one table could affect a query to any other tables. and you could not just calculate the new results based on the event. You would always have to re-run the full query to get the updated results.

## Migration without relations

Sooner or later you change the layout of your data. You update the schema and you also have to migrate the stored rows/documents. In NoSQL this is often not a big deal because all of your documents are modeled as self containing piece of data. There is an old version of the document and you have a function that transforms it into the new version.

With relational data, nothing is self-contained. The relevant data for the migration of a single row could be inside any other table. So when changing the schema, it will be important which table to migrate first and how to orchestrate the migration or relations.

On client side applications, this is even harder because the client can close the application at any time and the migration must be able to continue.

## Everything can be downgraded to NoSQL

To use an offline first database in the frontend, you have to make it compatible with your backend APIs.
Making software things compatible often means you have to find the **lowest common denominator**.
When you have SQLite in the frontend and want to replicate it with the backend, the backend also has to use SQLite. You cannot even use PostgreSQL because it has a different SQL dialect and some queries might fail. But you do not want to let the frontend dictate which technologies to use in the backend just to make replication work.

With NoSQL, you just have documents and writes to these documents. You can build a document based layer on top of everything by **removing** functionality. It can be built on top of SQL, but also on top of a graph database or even on top of a key-value store like [levelDB](./adapters.md#leveldown) or [FoundationDB](./rx-storage-foundationdb.md).

With that document layer you can build a [Sync Engine](./replication.md) that serves documents sorted by the last update time and there you have a realtime replication.

## Caching query results

Memory is limited and this is especially true for client side applications where you never know how much free RAM the device really has. You want to have a fast realtime UI, so your database must be able to cache query results.

When you run a SQL query like `SELECT ..` the result of it can be anything. An `array`, a `number`, a `string`, a single row, it depends on how the query goes on. So the caching strategy can only be to keep the result in memory, once for each query.
This scales very bad because the more queries you run, the more results you have to store in memory.

When you make a query to a NoSQL collection, you always know how the result will look like. It is a list of documents, based on the collection's schema (if you have one). The result set is stored in memory, but because you get similar documents for different queries to the same collection, we can de-duplicated the documents. So when multiple queries return the same document, we only have it in the cache **once** and each query caches point to the same memory object. So no matter how many queries you make, your cache maximum is the collection size.

## TypeScript support

Modern web apps are build with TypeScript and you want the transpiler to know the types of your query result so it can give you build time errors when something does not match. This is quite easy on document based systems. The typings of for each document of a collection can be generated from the schema, and all queries to that collection will always return the given document type. With SQL you have to manually write the typings for each query by hand because it can contain all these aggregate functions that affect the type of the query's result.


<p align="center">
  <img src="./files/typescript.png" alt="typescript" width="80" />
</p>

<!-- 
## Composable queries
-->


## What you lose with NoSQL

- You can not run relational queries across tables inside a single transaction.
- You can not mutate documents based on a `WHERE` clause, in a single transaction.
- You need to resolve replication conflicts on a per-document basis.

## But there is database XY

Yes, there are SQL databases out there that run on the client side or have replication, but not both.

- WebSQL / [sql.js](https://github.com/sql-js/sql.js/): In the past there was **WebSQL** in the browser. It was a direct mapping to SQLite because all browsers used the SQLite implementation. You could store relational data in it, but there was no concept of replication at any point in time. **sql.js** is an SQLite complied to JavaScript. It has not replication and it has (for now) no persistent storage, everything is stored in memory.
- WatermelonDB is a SQL databases that runs in the client. WatermelonDB uses a document-based replication that is not able to replicate relational queries.
- Cockroach / Spanner/ PostgreSQL etc. are SQL databases with replication. But they run on servers, not on clients, so they can make different trade offs.


# Further read

- Cockroach Labs: [Living Without Atomic Clocks](https://www.cockroachlabs.com/blog/living-without-atomic-clocks/)
- [Transactions, Conflicts and Revisions in RxDB](./transactions-conflicts-revisions.md)
- [Why MongoDB, Cassandra, HBase, DynamoDB, and Riak will only let you perform transactions on a single data item](https://dbmsmusings.blogspot.com/2015/10/why-mongodb-cassandra-hbase-dynamodb_28.html)

- `Make a PR to this file if you have more interesting links to that topic`
