# Backlog

This file contains a list with things that should be implemented in the future. If you want to create a PR with one of these things, please create an issue before starting your work, so we can prevent duplication.


## RxQuery.count()

There is currently no count-method for queries.

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


## default and custom [conflict-strategies](https://pouchdb.com/guides/conflicts.html)
Pouchdb requires the developer to solve [conflicts manually](https://pouchdb.com/guides/conflicts.html).

A solution is to introduce a new keyword to the RxSchema conflictStrategy

Here it is describe what should happen when a document-conflict happens.

There should be the following default-strategies:

- first-insert-wins
- last-insert-wins
- lexical-ordering of the documents-hash
- It should also be possible to define custom resolution-strategies.
- equal [strategy as rethinkdb](https://rethinkdb.com/api/javascript/insert/) (as RxDB.plugin)



## Full Text Search

Add a plugin with full-text-search like
- https://github.com/pouchdb-community/pouchdb-quick-search
- https://docs.mongodb.com/manual/core/index-text/

See [#259](https://github.com/pubkey/rxdb/issues/259)



## Upsert atomic with attachments

See [#494](https://github.com/pubkey/rxdb/issues/494)


## import/export with attachments

See [#1396](https://github.com/pubkey/rxdb/pull/1396#issuecomment-523014106)

## generate typings from schema
[Writing typescript](https://rxdb.info/tutorials/typescript.html) defintions for rxdb documents and collections could be done by generating them from the schema. 

### Refactor data-migrator

The current implementation has some flaws and should be completely rewritten.

* It does not use pouchdb's bulkDocs which is much faster
* It could have been written without rxjs and with less code that is easier to understand
* It does not migrate the revisions of documents which causes a problem when replication is used
* It is not able to migrate attachments
