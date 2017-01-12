# Ideas
Things that could be usefull but are not implemented yet.

## [Document.upsert](https://pouchdb.com/guides/conflicts.html#Upsert)

## Query.diff$
Emits a diff$-Observable where the emitted objects contains information on what Document got changed/deleted/added

## default and custom [conflict-strategies](https://pouchdb.com/guides/conflicts.html)
Pouchdb requires the developer to solve [conflicts manually](https://pouchdb.com/guides/conflicts.html).

A solution is to introduct a new keyword to the RxSchema conflictStrategy

Here it is describe what should happen when a document-conflict happens.

There should be the following default-strategies:

- first-insert-wins
- last-insert-wins
- lexical-ordering of the documents-hash
- It should also be possible to define custom resolution-strategies.
- equal [strategy as rethinkdb](https://rethinkdb.com/api/javascript/insert/) (as RxDB.plugin)

## module-split
Currently all parts of RxDB get bundled and included. To optimize build-size it would be good to split encryption and schema-validation from the core.
This would allow to schema-validate only in dev, not production. And to not include the cryptoJS-lib when there is no encrypted model-field.

```js
var RxDB = require('rxdb-core');
RxDB.plugin(require('rxdb-validation'));
RxDB.plugin(require('rxdb-encryption'));
```
