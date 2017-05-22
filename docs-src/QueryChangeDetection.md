# QueryChangeDetection

Similar to Meteors [oplog-observe-driver](https://github.com/meteor/docs/blob/version-NEXT/long-form/oplog-observe-driver.md),
RxDB has a QueryChangeDetection to optimize observed or reused queries. This makes sure that when you update/insert/remove documents,
the query does not have to re-run over the whole database but the new results will be calculated from the events. This creates a huge performance-gain
with zero cost.

## NOTICE:
The QueryChangeDetection is currently in **beta** and disabled by default.
You can enable it by calling the `enable()`-function on its module.

```js
import { QueryChangeDetector } from 'rxdb';
QueryChangeDetector.enable();
QueryChangeDetector.enableDebugging(); // shows a console.log everytime an optimisation is made
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

As you may detect, the query can take a very long time to run, because you have thousands of users in the collection.
When a user now loggs of, the whole query will re-run over the database which takes again very long.

```js
anyUser.loggedIn = false;
await anyUser.save();
```

But not with the QueryChangeDetection enabled.
Now, when one user loggs of, it will calculate the new results from the current results plus the RxChangeEvent. This often can be done in-memory without making IO-requests to the storage-engine. The QueryChangeDetection not only works on subscribed queries, but also when you do multiple `.exec()`'s on the same query.


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](https://github.com/pubkey/rxdb/tree/master/examples)
