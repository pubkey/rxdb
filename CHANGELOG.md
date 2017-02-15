## 3.0.0 (XXX, 2017)

Features:
  - added [DataMigration](docs/DataMigration.md)
  - added [ORM/DRM](docs/ORM.md)-capabilities
  - added [RxQuery.remove()](docs/RxQuery.md)
  - added [Population](docs/Population.md)
  - added collections-getter to RxDatabase-instance `myDatabase.heroes.insert()` etc. is now possible
  - schema-fieldnames must match the regex: `^[a-zA-Z][[a-zA-Z0-9_]*]?[a-zA-Z0-9]$`

Bugfixes:

Breaking:
  - Collection-names must match `^[a-z][a-z0-9]*$` Fixes [#45](https://github.com/pubkey/rxdb/issues/45)
  - RxDB.create has new api with destructuring [see](docs/RxDatabase.md)
  - RxDatabase.collection() has new api with destructuring [see](docs/RxDatabase.md)

## 2.0.4 (February 12, 2017)

Bugfixes:
  - top-level array of document not working [#50](https://github.com/pubkey/rxdb/issues/50)
  - event on document.remove() not fired at query-obserable [#52](https://github.com/pubkey/rxdb/issues/52)

## 2.0.3 (January 31, 2017)

Features:
  - save full schema in internal database once

Bugfixes:
  - Throw when .findOne() is called with number or array
  - ADD babel-polyfill to dependencies [#40](https://github.com/pubkey/rxdb/issues/40)

## 2.0.2 (January 27, 2017)

Bugfixes:
  - Throw when .regex() is used on primary

## 2.0.1 (January 26, 2017)

Refactor:
  - Because IE11 does not support the Proxy-Object, [defineGetter/Setter](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/__defineGetter__) is now used
  - Tests now run in all installed browsers

Bugfixes:
  - Fixed tests for IE11


## 2.0.0 (January 23, 2017)

Features:
  - key-compression for better space-usage (awesome!)

Breaking:
  - schema-objects are now normalized (order alphabetic) before hashing
  - RxQuery.select() is removed since it has no better performance than getting the whole document
  - RxChangeEvent on sockets do no longer contain the documents-data for performance-reason
  - RxQuery.$ only emits when the result actually changes [#31](https://github.com/pubkey/rxdb/issues/31)

Bugfixes:
  - console.dir on RxDocument now works

## 1.7.7 (January 13, 2017)

Features:
  - add [Proxy-wrapping arround RxDocument](./docs/RxDocument.md)

## 1.6.7 (January 11, 2017)

Features:
  - add [middleware-hooks](./docs/Middleware.md)

## 1.5.6 (December 22, 2016)

Bugfixes:
  - direct import 'url'-module for react native

## 1.5.5 (December 20, 2016)

Features:
  - refactor socket to save db-io
  - wrap BroadcastChannel-API
  - added [leader-election](./docs/LeaderElection.md)
  - sync() will only start wenn db is leader

Bugfixes:
  - cleanup all databases after tests
  - remove broken builds from dist-folder
