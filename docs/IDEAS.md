# Ideas
Things that could be usefull but are not implemented yet.

## [middleware-hooks](http://mongoosejs.com/docs/middleware.html)

## [Document.upsert](https://pouchdb.com/guides/conflicts.html#Upsert)

## Query.diff$
Emits a diff$-Observable where the emitted objects contains information on what Document got changed/deleted/added

## default and custom [conflict-strategies](https://pouchdb.com/guides/conflicts.html)

## module-split
Currently all parts of RxDB get bundled and included. To optimize build-size it would be good to split encryption and schema-validation from the core.
This would allow to schema-validate only in dev, not production. And to not include the cryptoJS-lib when there is no encrypted model-field.

```js
var RxDB = require('rxdb-core');
RxDB.plugin(require('rxdb-validation'));
RxDB.plugin(require('rxdb-encryption'));
```
