# Backlog

This file contains a list with things that should be implemented in the future. If you want to create a PR with one of these things, please create an issue before starting your work, so we can prevent duplication.

## RxQuery.count()

There is currently no cound-method for queries.

Goal-API:

```javascript
// single-exec
const amount = await myCollection.count().where('foo').gt(10). /* .. */.exec();
console.log(amount);
// > 5

// subscription
myCollection.count().where('foo').gt(10). /* .. */.$.subscribe(nr => console.log(nr));
// > 5
await myCollection.insert({/* any docData */});
// > 6
```

There should be an optimisation to determine if the amount is needed once or many times (if we subscribe). The first case should do a pouch-find-count-query, the second case should use the QueryChangeDetection for better performance.

## remote-only-collections

It's currently not possible to create remote-only databases, like with the [pouchdb-http-adapter](https://www.npmjs.com/package/pouchdb-adapter-http).

Goal-API:

```javascript

import 'babel-polyfill'; // only needed when you dont have polyfills
import RxDB from 'rxdb';
RxDB.plugin(require('pouchdb-adapter-http'));
const db = await RxDB.create({
    name: 'heroesdb',
    adapter: 'http'
});

const collection = await db.collection({name: 'http://127.0.0.1:5984/mydb', schema: mySchema});


```
