## 3.0.5 (March 21, 2017)

Bugfixes:
  - overwrites default selector on `RxQuery.sort()`

Other:
  - Refactor RxQuery for better performance
  - Refactor mquery for smaller build
  - More tests for RxQuery

## 3.0.4 (March 12, 2017)

Bugfixes:
  - Vuejs runs populate-getter on changedetection [#75](https://github.com/pubkey/rxdb/issues/75)
  - `isDeepEqual` does not work correctly for Arrays [#76](https://github.com/pubkey/rxdb/issues/76)
  - wrong `storageEngine` in the typings

## 3.0.3 (March 6, 2017)

Features:
  - Added RxDocument.[deleted](docs/RxDocument.md#get-deleted)
  - Added RxDocument.[synced](docs/RxDocument.md#get-synced)
  - moved from [jsonschema](https://www.npmjs.com/package/jsonschema) to [is-my-json-valid](https://www.npmjs.com/package/is-my-json-valid)

Bugfixes:
  - No error on sync when remote document is deleted [680f75bfcbda3f71b6ba0a95ceecdc6b6f30ba58](https://github.com/pubkey/rxdb/commit/680f75bfcbda3f71b6ba0a95ceecdc6b6f30ba58)

## 3.0.2 (March 2, 2017)

Bugfixes:
  - compound-index not being created [#68](https://github.com/pubkey/rxdb/issues/68)

## 3.0.1 (March 2, 2017)

Bugfixes:
  - new document does not get new state on remove-reinsert [#66](https://github.com/pubkey/rxdb/issues/66)

## 3.0.0 (February 27, 2017)

Features:
  - added [DataMigration](docs/DataMigration.md)
  - added [ORM/DRM](docs/ORM.md)-capabilities
  - added [RxQuery.remove()](docs/RxQuery.md)
  - added [Population](docs/Population.md)
  - added [RxDocument.deleted$](docs/RxDocument.md#deleted)
  - added [RxDocument.synced$](docs/RxDocument.md#synced)
  - added [RxDocument.resnyc()](docs/RxDocument.md#resync)
  - added [RxCollection.upsert()](docs/RxDocument.md#synced)
  - non-top-level-indexes are now allowed
  - `RxQuery.sort()` now works on non-top-level-indexes

Bugfixes:
  - running `RxDocument().save()` twice did not work

Breaking:
  - Collection-names must match `^[a-z][a-z0-9]*$` Fixes [#45](https://github.com/pubkey/rxdb/issues/45)
  - RxDB.create has new api with destructuring [see](docs/RxDatabase.md)
  - RxDatabase.collection() has new api with destructuring [see](docs/RxDatabase.md)
  - schema-fieldnames must match the regex: `^[a-zA-Z][[a-zA-Z0-9_]*]?[a-zA-Z0-9]$`
  - `RxDatabase.collection()` only to create collection, use `myDatabase.heroes` to get existing one
  - `RxDB.create()` multiInstance is now true by default
  - `rxjs` and `babel-polyfill` are now peerDependencies

## 2.0.5 (February 25, 2017)

Features:
  - possibility to add `pouchSettings` when creating a collection
  - typings compatible with `noImplicitAny` Typescript projects

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
  - sync() will only start if db is leader

Bugfixes:
  - cleanup all databases after tests
  - remove broken builds from dist-folder
