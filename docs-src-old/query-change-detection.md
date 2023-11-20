# QueryChangeDetection


## NOTICE:
Since version [9.0.0](https://github.com/pubkey/rxdb/blob/master/orga/releases/9.0.0.md) RxDB is using the [EventReduce algorithm](https://github.com/pubkey/event-reduce) instead of the QueryChangeDetection. So this document is **outdated**.



Similar to Meteors [oplog-observe-driver](https://github.com/meteor/docs/blob/version-NEXT/long-form/oplog-observe-driver.md),
RxDB has a QueryChangeDetection to optimize observed or reused queries. This makes sure that when you update/insert/remove documents, the query does not have to re-run over the whole database but the new results will be calculated from the events. This creates a huge performance gain with zero cost.

```js
const db = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageDexie(),
  queryChangeDetection: true // <- enable queryChangeDetection
});
```

# Use-case-example

Imagine you have a very big collection with many user-documents. At your page you want to display a toplist with users which have the most `points` and are currently logged in.
You create a query and subscribe to it.

```js
const query = usersCollection.find().where('loggedIn').eq(true).sort('points');
query.$.subscribe(users => {
    document.querySelector('body').innerHTML = users
        .reduce((prev, cur) => prev + cur.username+ '<br/>', '');
});
```

As you may detect, the query can take a very long time to run because you have thousands of users in the collection.
Then, when a user logs off, the whole query will re-run over the database which takes a really long time yet again.

```js
anyUser.loggedIn = false;
await anyUser.save();
```

But not with QueryChangeDetection enabled.
Now, when one user logs off, it will calculate the new results from the current results plus the RxChangeEvent. This can often be done in-memory without making IO-requests to the storage-engine. QueryChangeDetection not only works on subscribed queries, but also when you do multiple `.exec()`'s on the same query.
