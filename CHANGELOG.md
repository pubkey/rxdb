# Changelog

### 7.3.1 (January 3, 2018)

Bugfixes:
  - Allow `number`-fields as index [#438](https://github.com/pubkey/rxdb/pull/438)
  - Ensure typescript `strict: true` works [#448](https://github.com/pubkey/rxdb/issues/448)

### 7.3.0 (December 18, 2017)

Features:
  - Added [ajv-validate](https://pubkey.github.io/rxdb/custom-build.html#ajv-validate)-plugin. Thx [@rybaczewa](https://github.com/rybaczewa)

Bugfixes:
  - inMemory() throws error when using primary-key [#401](https://github.com/pubkey/rxdb/issues/401)

Other:
  - Update to pouchdb [6.4.0](https://pouchdb.com/2017/12/16/pouchdb-6.4.0.html)
  - Optimize socket-pull by comparing internal last-change-time
  - do not hide fields with `value: undefined` in error-message [#403](https://github.com/pubkey/rxdb/issues/403)

## 7.2.0 (December 7, 2017)

Warning:
  - Removed automatic import of `pouchdb-adapter-memory` for in-memory-collections. Read [this](https://pubkey.github.io/rxdb/in-memory.html)

Features:
  - Added [options-parameter](https://pubkey.github.io/rxdb/plugins.html#options)
  - Added `postCreateRxDocument` [plugin-hook](https://github.com/pubkey/rxdb/blob/master/src/hooks.js)
  - Added [no-validate-plugin](https://pubkey.github.io/rxdb/custom-build.html#no-validate)
  - Added typings for `RxPlugin`

Bugfixes:
  - Query-Cache not used when declaring queries without mango-chain

Other:
  - Do not throw errors if the same plugin is added multiple times
  - Allow getting the collection via `RxDatabase().collection(name: string)`
  - Allow recreating the collection with different schema, if it has no documents
  - Split out error-messages into separate [own plugin](https://pubkey.github.io/rxdb/custom-build.html#error-messages)

## 7.1.1 (November 27, 2017)

Bugfixes:
  - Error on key-compression when nested value is null
  - Fix typings of `RxDocument.putAttachment()`

## 7.1.0 (November 22, 2017)

Other:
  - Reduced build-size by using [rxjs-lettable-operators](https://github.com/ReactiveX/rxjs/blob/master/doc/lettable-operators.md). Read [this](https://github.com/pubkey/rxdb/blob/master/docs-src/install.md#rxjs) if you have problems.
  - Improved typings [#368](https://github.com/pubkey/rxdb/pull/368) thx [@FlorianKoerner](https://github.com/FlorianKoerner)

## 7.0.1 (November 14, 2017)

Bugfixes:
  - Include `pouchdb-adapter-memory` as dependency [#365](https://github.com/pubkey/rxdb/issues/365)

## 7.0.0 (November 14, 2017)

Breaking:
  - Renamed `ingoreDuplicate` to `ingoreDuplicate` [#314](https://github.com/pubkey/rxdb/issues/314)
  - Improved typings [#329](https://github.com/pubkey/rxdb/pull/329) by [@ihadeed](https://github.com/ihadeed)

Features:
  - Added [attachments](https://pubkey.github.io/rxdb/rx-attachment.html)
  - Added [final fields](https://pubkey.github.io/rxdb/rx-schema.html#final)
  - Added [inMemory](https://pubkey.github.io/rxdb/in-memory.html)-collections
  - Added [local documents](https://pubkey.github.io/rxdb/rx-local-document.html)

Bugfixes:
  - Added error-message when you json-import on a non-existing collection [#319](https://github.com/pubkey/rxdb/issues/319)
  - Allow windows-foldernames (with backslash) as collection-name [343](https://github.com/pubkey/rxdb/issues/343)

Other:
  - Split out idle-queue into own [npm-module](http://npmjs.com/package/custom-idle-queue)
  - Enfore usage of strict-equality via eslint

## 6.0.1 (September 20, 2017)

- Fix `core is not defined` [#296](https://github.com/pubkey/rxdb/issues/296)

## 6.0.0 (September 19, 2017) BREAKING

Breaking:    
  - Filenames are now kebab-case
  - `pouchdb-replication`-plugin is now imported by default, do not import it by your own.
  - `RxDB.create()` throws if you create the same database twice. (You can use [ignoreDuplicate](https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate))

Features:
  - Added [RxDatabase.requestIdlePromise()](https://pubkey.github.io/rxdb/rx-database.html#requestidlepromise)
  - Added [RxDB.checkAdapter()](https://pubkey.github.io/rxdb/rx-database.html#checkadapter)
  - Added [ignoreDuplicate](https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate)-parameter to `RxDB.create()`

Custom-Build:
  - Custom-build is now out of beta
  - If you use a custom-build, you have to change the import-paths. See [custom-build](https://pubkey.github.io/rxdb/custom-build.html)
  - Replication is now its own module [see](https://pubkey.github.io/rxdb/custom-build.html#replication)
  - Json import/exportis now its own module [see](https://pubkey.github.io/rxdb/custom-build.html#json-dump)

Bugfixes:
  - Allow null-selector [#267](https://github.com/pubkey/rxdb/issues/267)
  - `RxQuery.exec()` throws when out of change-event-buffer-bounds [#278](https://github.com/pubkey/rxdb/issues/278)
  - Fix deprecated warning that sometimes occurs with indexeddb-adapter `db.type()`
  - Add fallback to leader-election when [unload](https://github.com/pubkey/unload) not works (mostly when you use RxDB inside of an iFrame)

Other:
  - Use `RxError`-class to throw Custom errors with the `parameters`-attribute
  - Optimize leader-election to not waste resources when many tabs open
  - Optimize schema-parsing when multiple collections have the same schema
  - Reduced build-size by only using async/await if it makes sense
  - Pre-Parse schema to validator when [requestIdleCallback](https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback) available
  - Optimize socket-cleanup by using `requestIdlePromise`
  - Added plugin-hook for `preCreatePouchDb`

## 5.3.0 (August 25, 2017)

Features:
  - Added [custom builds](https://pubkey.github.io/rxdb/custom-build.html)
  - Added [plugin-support](https://pubkey.github.io/rxdb/plugins.html)
  - Added default exports. Use `import RxDB from 'rxdb'` instead of `import * as RxDB from 'rxdb'`

Bugfixes:
  - `RxQuery.or()` did not work with KeyCompression [#252](https://github.com/pubkey/rxdb/issues/252)

## 5.2.1 (July 17, 2017)

Quickfix because of new [pouchdb-import](https://github.com/pouchdb/pouchdb/issues/6603#issuecomment-315867346)

## 5.2.0 (July 17, 2017)

Features:
  - Added [RxCollection.atomicUpsert](https://pubkey.github.io/rxdb/rx-collection.html#atomicupsert)
  - Added [defaul values](https://pubkey.github.io/rxdb/rx-schema.html#default)
  - Added generic typings so it's easier to be extended [see](https://github.com/pubkey/rxdb/blob/master/examples/angular2/app/src/RxDB.d.ts)

Other:
  - Split out test-util into its own npm-module [async-test-util](https://github.com/pubkey/async-test-util)
  - Upgrade to pouchdb version [6.3.4](https://github.com/pouchdb/pouchdb/releases/tag/6.3.4)

Bugfixes:
  - Settings values to `null` did not work on temporaryDocuments [#215](https://github.com/pubkey/rxdb/issues/215)
  - `RxDocument.atomicUpdate()` did not run when reusing after a while
  - `RxQuery.toString()` was sometimes not predictable

**WARNING**: If you use RxDB with angular2||zone.js, you might have the error [_global is not defined](https://github.com/angular/zone.js/issues/835). Wait for the next zone.js release before updating RxDB.


## 5.1.0 (July 10, 2017)

Features:
  - Added instanceOf-checks

Bugfixes:
  - AutoMigrated caused infinity-loop [#212](https://github.com/pubkey/rxdb/issues/212)
  - Minor bugs on the typings

Other:
  - Use [requestIdleCallback](https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback) on non-prio-tasks for better performance on browsers
  - Optimise socket-pull-intervall to not waste resources on slow devices
  - split out test-util from util to optimize build-size
  - remove lodash completely

## 5.0.0 (June 20, 2017) BREAKING

Features:
  - Added `RxDocument.atomicUpdate()` [docs](https://pubkey.github.io/rxdb/rx-document.html#atomicUpdate)
  - Added `RxCollection.remove()` [docs](https://pubkey.github.io/rxdb/rx-collection.html#clear)
  - Added `RxDatabase.remove()` [docs](https://pubkey.github.io/rxdb/rx-database.html#remove)
  - Added options for `RxCollection.sync()`: direction and pouchdb-replication-settings [docs](https://pubkey.github.io/rxdb/rx-collection.html#sync)
  - Added query-param for `RxCollection.sync()` to allow selector-based replication [docs](https://pubkey.github.io/rxdb/rx-collection.html#sync)
  - Added TemporaryDocuments `RxCollection.newDocument()` [docs](https://pubkey.github.io/rxdb/rx-collection.html#newDocument)

Breaking:
  - `postCreate`-hooks can no longer be async
  - `RxCollection.sync()` completely changed [docs](https://pubkey.github.io/rxdb/replication.html)

Other:
  - Added .babelrc to .npmignore
  - Added build-tests to travis

## 4.1.0 (June 7, 2017)

Features:
  - Added `postCreate`-[hook](https://pubkey.github.io/rxdb/middleware.html#postCreate) [#165](https://github.com/pubkey/rxdb/issues/165)
  - Added `RxQuery.update()` and `RxDocument.update()` [#143](https://github.com/pubkey/rxdb/issues/143) Thanks [@lgandecki](https://github.com/lgandecki)

Bugfixes:
  - QueryCache returns old RxQuery when `.regex()` is used [#190](https://github.com/pubkey/rxdb/issues/190)
  - `RxDocument.resync()` was broken [174](https://github.com/pubkey/rxdb/issues/174)

Other:
  - Throw error if `RxQuery.sort()` runs on field which is not in the schema [#146](https://github.com/pubkey/rxdb/issues/146)
  - extract `watchForChanges` to allow custom sync-operations [#197](https://github.com/pubkey/rxdb/pull/197)
  - Added [travis-ci](https://travis-ci.org/)

## 4.0.2 (May 17, 2017)

Bugfixes:
  - Ensure es6-build does not contain es7-features
  - Ensure everything works after using UglifyJs

## 4.0.1 (May 17, 2017)

Bugfixes:
  - `jsnext:main` and `module` now point to es6 instead of es7-stage-0 [commit](https://github.com/pubkey/rxdb/commit/d3a14cc417b04e32e2c534908dc62b0bcd654a5f) [issue](https://github.com/pubkey/rxdb/issues/172)
  - Sort on primary fails without non-id primary [commit](https://github.com/pubkey/rxdb/commit/59143a61530069f6e90ae203019d494d507330e9)
  - QueryChangeDetection breaks on no-resort-optimisation [commit](https://github.com/pubkey/rxdb/commit/c7f9b3e601d0bfbbde3ee410f00b017b4490dded)

## 4.0.0 (May 5, 2017) BREAKING

Breaking:
  - RxQuery's are now [immutable](https://pubkey.github.io/rxdb/rx-query.html#notice-rxquerys-are-immutable)
  - RxQuery.$ does not emit `null` when running
  - RxQuery will sort by primary (ASC) as default

Features:
  - Added [QueryChangeDetection](https://pubkey.github.io/rxdb/query-change-detection.html) (in **beta**, disabled by default)

Other:
  - upgraded to pouchdb [v6.2.0](https://pouchdb.com/2017/04/20/pouchdb-6.2.0.html)
  - re-executing queries while nothing happend to the collection, is now fetched


## 3.0.8 (April 20, 2017)

Bugfixes:
  - `findOne().$` did not have `limit:1`
  - `findOne(string).$` streams all documents when `_id` as primary

## 3.0.7 (April 10, 2017)

Bugfixes:
  - Fixed es6-imports for webpack-builds

## 3.0.6 (March 29, 2017)

Features:
  - [Population](https://pubkey.github.io/rxdb/population.html) can now be done on arrays

Other:
  - improved typings

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
  - Added RxDocument.[deleted](https://pubkey.github.io/rxdb/rx-document.html#get-deleted)
  - Added RxDocument.[synced](https://pubkey.github.io/rxdb/rx-document.html#get-synced)
  - moved from [jsonschema](https://www.npmjs.com/package/jsonschema) to [is-my-json-valid](https://www.npmjs.com/package/is-my-json-valid)

Bugfixes:
  - No error on sync when remote document is deleted [680f75bfcbda3f71b6ba0a95ceecdc6b6f30ba58](https://github.com/pubkey/rxdb/commit/680f75bfcbda3f71b6ba0a95ceecdc6b6f30ba58)

## 3.0.2 (March 2, 2017)

Bugfixes:
  - compound-index not being created [#68](https://github.com/pubkey/rxdb/issues/68)

## 3.0.1 (March 2, 2017)

Bugfixes:
  - new document does not get new state on remove-reinsert [#66](https://github.com/pubkey/rxdb/issues/66)

## 3.0.0 (February 27, 2017) BREAKING

Features:
  - added [DataMigration](https://pubkey.github.io/rxdb/data-migration.html)
  - added [ORM/DRM](https://pubkey.github.io/rxdb/orm.html)-capabilities
  - added [RxQuery.remove()](https://pubkey.github.io/rxdb/rx-query.html)
  - added [Population](https://pubkey.github.io/rxdb/population.html)
  - added [RxDocument.deleted$](https://pubkey.github.io/rxdb/rx-document.html#deleted)
  - added [RxDocument.synced$](https://pubkey.github.io/rxdb/rx-document.html#synced)
  - added [RxDocument.resnyc()](https://pubkey.github.io/rxdb/rx-document.html#resync)
  - added [RxCollection.upsert()](https://pubkey.github.io/rxdb/rx-document.html#synced)
  - non-top-level-indexes are now allowed
  - `RxQuery.sort()` now works on non-top-level-indexes

Bugfixes:
  - running `RxDocument().save()` twice did not work

Breaking:
  - Collection-names must match `^[a-z][a-z0-9]*$` Fixes [#45](https://github.com/pubkey/rxdb/issues/45)
  - RxDB.create has new api with destructuring [see](https://pubkey.github.io/rxdb/rx-database.html)
  - RxDatabase.collection() has new api with destructuring [see](https://pubkey.github.io/rxdb/rx-database.html)
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


## 2.0.0 (January 23, 2017) BREAKING

Features:
  - key-compression for better space-usage

Breaking:
  - schema-objects are now normalized (order alphabetic) before hashing
  - RxQuery.select() is removed since it has no better performance than getting the whole document
  - RxChangeEvent on sockets do no longer contain the documents-data for performance-reason
  - RxQuery.$ only emits when the result actually changes [#31](https://github.com/pubkey/rxdb/issues/31)

Bugfixes:
  - console.dir on RxDocument now works

## 1.7.7 (January 13, 2017)

Features:
  - add [Proxy-wrapping arround RxDocument](https://pubkey.github.io/rxdb/rx-document.html)

## 1.6.7 (January 11, 2017)

Features:
  - add [middleware-hooks](https://pubkey.github.io/rxdb/middleware.html)

## 1.5.6 (December 22, 2016)

Bugfixes:
  - direct import 'url'-module for react native

## 1.5.5 (December 20, 2016)

Features:
  - refactor socket to save db-io
  - wrap BroadcastChannel-API
  - added [leader-election](https://pubkey.github.io/rxdb/leader-election.html)
  - sync() will only start if db is leader

Bugfixes:
  - cleanup all databases after tests
  - remove broken builds from dist-folder
