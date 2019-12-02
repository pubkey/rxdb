# Changelog

### 8.7.4 (2 December 2019)

Other:
  - Improved performance of `QueryChangeDetection` by using [array-push-at-sort-position](https://github.com/pubkey/array-push-at-sort-position) instead of re-sorting the whole results of a query
  - Improved performance by removing unnecessary calls to deep-clone

### 8.7.3 (10 November 2019)

Features:
  - Added `RxCollection.bulkInsert()`

Bugfixes:
  - Fix replication of migrated schemas in the server plugin

### 8.7.2 (24 October 2019)

Bugfixes:
  - GraphQL replication sometimes not pushes when a big amount of documents has been pulled before
  - Fixed typings of PouchdbReplicationOptions

Other:
  - Upgrade pouchdb to `7.1.1`
  - Refactor some internals

### 8.7.1 (18 October 2019)

Other:
  - Json-Import now uses `bulkDocs` for better performance
  - Refactored prototype merging so it can be optimised later
  - Moved some check into the check-plugin to optimize production build size
  - Refactor schema-validation-plugins since sub-path validation is no longer needed

### 8.7.0 (11 October 2019)

Features:
  - RxDB server can now be used with an existing express-app. [#1448](https://github.com/pubkey/rxdb/issues/1448) Thanks [@dstudzinski](https://github.com/dstudzinski)
  - Wrapped pouchdb conflict error into `RxError`

Other:
  - Fixed typings of `RxError` parameters
  - Fix GraphQL-example to propper use Websocket-Pub-Sub

### 8.6.0 (4 October 2019)
Migrated to typescript.

### 8.5.0-beta.3 (1 October 2019)

  - Fixed import of `@types/pouchdb-core` and `@types/pouchdb-find`

### 8.5.0-beta.2 (1 October 2019)

Bugfixes:
  - Fixed typings of `preCreateRxCollection` [#1533](https://github.com/pubkey/rxdb/issues/1533) Thanks [@yanshiyason](https://github.com/yanshiyason)

### 8.5.0-beta.1 (30 September 2019)

Migrated to typescript.

### 8.5.0 (18 September 2019)

Features:
  - Add ability to use `server` app as a part of bigger Express app [#1448](https://github.com/pubkey/rxdb/issues/1448) Thanks [@dstudzinski](https://github.com/dstudzinski)

Bugfixes:
  - custom server path not working on `server`-plugin [#1447](https://github.com/pubkey/rxdb/issues/1447) Thanks [@dstudzinski](https://github.com/dstudzinski)
  - Fix CORS headers when the request's credentials mode is 'include' [#1450](https://github.com/pubkey/rxdb/issues/1450) Thanks [@dstudzinski](https://github.com/dstudzinski)

Other:
  - Improved `QueryChangeDetection` to not run on irrelevant changes

### 8.4.0 (1 September 2019)

Bugfixes:
  - Fix imports of encryption-plugin to work with rollup [#1413](https://github.com/pubkey/rxdb/issues/1413) Thanks [@kenshyx](https://github.com/kenshyx)
  - Removed `express-pouchdb` from the dependencies [#884](https://github.com/pubkey/rxdb/issues/884)

### 8.3.1 (23 August 2019)

Features:
  - Added `RxQuery.doesDocumentDataMatch()` [read the docs](https://rxdb.info/rx-query.html#doesdocumentdatamatch)

Bugfixes:
  - Attachments not working in electron renderer with IndexedDb adapter [#1371](https://github.com/pubkey/rxdb/issues/1371) Thanks [@rixo](https://github.com/rixo)
  - json export/import not working when a document has attachments [#1396](https://github.com/pubkey/rxdb/pull/1396) Thanks [@rixo](https://github.com/rixo)

Other:
  - Improved performance of query-change-detection by reusing the result of `massageSelector`

### 8.3.0 (5 August 2019)

Features:
  - Added a plugin for [GraphQL-replication](https://rxdb.info/replication-graphql.html)

Bugfixes:
  - .populate() returns findOne() on empty string. This results in a random find [#1325](https://github.com/pubkey/rxdb/issues/1325) Thanks [@PVermeer](https://github.com/PVermeer)

### 8.2.1 (5 July 2019)

Features:
  - Add a [z-schema](https://github.com/zaggino/z-schema) validator plugin [#1157](https://github.com/pubkey/rxdb/pull/1157). Thanks [@phil-lgr](https://github.com/phil-lgr)

Bugfixes:
  - Collection change event was emitted before the actual change happened [#1225](https://github.com/pubkey/rxdb/pull/1225). Thanks [@milanpro](https://github.com/milanpro)

Typings:
  - ADD typings to access the `PouchSyncHandler` of `RxReplicationState`

### 8.2.0 (21 May 2019)

Bugfixes:
  - Vue devtools broke the application [#1126](https://github.com/pubkey/rxdb/issues/1126)

Typings:
  - `RxDocument.getAttachment()` and `RxDocument.allAttachments()` did not return promises
  - ADD RxJsonSchema<T> generic for better TypeScript experience

### 8.1.0 (22 April 2019)

Bugfixes:
  - Server-plugin did not work with absolute paths and leveldb
  - Vue threw `get is not a function` when a RxDocument was added to a component's state
  - `RxDocument.allAttachments()` did throw an error when the document has no `RxAttachment`
  - `RxDocument.toJSON(false)` does no longer return the `_attachments` attribute

### 8.0.7 (6 April 2019)

Bugfixes:
  - Fix creating a collection mutates to arguments object [#939](https://github.com/pubkey/rxdb/pull/939)
  - Fix not having optional encrypted fields in a document throws an error [#917](https://github.com/pubkey/rxdb/issues/917)

### 8.0.6 (20 March 2019)

Features:
  - `RxDocument().toJSON()` can be called with `.toJSON(false)` and then returns not `_rev` attribute

Bugfixes:
  - (typings) Fix `additionalProperties: boolean` is allowed for nested objects
  - (typings) Fix `RxQuery().toJSON()'` was missing

### 8.0.5 (7 February 2019)

Bugfixes:
  - Calling `remove()` on a deleted RxDocument should return a rejected promise [#830](https://github.com/pubkey/rxdb/issues/830)
  - Passing `auto_compaction` to a collection did not work [via gitter](https://gitter.im/pubkey/rxdb?at=5c42f3dd0721b912a5a4366b)
  - `util` missing in react-native [#890](https://github.com/pubkey/rxdb/pull/890)

### 8.0.4 (13 November 2018)

Bugfixes:
  - Updated the dependencies with some bugfixes

### 8.0.3 (29. October 2018)

Bugfixes:
  - Reopening a database after using the wrong password did not work [#837](https://github.com/pubkey/rxdb/issues/837)

### 8.0.2 (7. October 2018)

Features:
  - Allow to use `_id` as primary field [#824](https://github.com/pubkey/rxdb/pull/824). Thanks [@will118](https://github.com/will118)

Bugfixes:
  - `RxDB.removeDatabase()` did not return a Promise [#822](https://github.com/pubkey/rxdb/pull/822). Thanks [@will118](https://github.com/will118)

### 8.0.1 (21. September 2018)

Bugfixes:
  - Does not compile in TypeScript with strict flag enabled [#448](https://github.com/pubkey/rxdb/issues/448)

### 8.0.0 (18. September 2018) BREAKING [read the announcement](./orga/releases/8.0.0.md)

Breaking:
  - Upgraded to [pouchdb 7.0.0](https://pouchdb.com/2018/06/21/pouchdb-7.0.0.html)
  - `disableKeyCompression` is renamed to `keyCompression` which defaults to `false`
  - `RxDatabase.collection()` now only accepts the json-schema as schema-attribute
  - It is no longer allowed to set required fields via `required: true`, use `required: ['myfield']` in compliance with the jsonschema standard
  - QueryChangeDetection is not enabled in the RxDatabase-options `queryChangeDetection: true`
  - Setters and `save()` are only callable on temporary documents
  - Removed `RxDocument.synced$` and `RxDocument.resync()`
  - Middleware-Hooks now have `plainJson` as first parameter and `RxDocument`-instance as second
  - Typings have been modified, [see](./docs-src/tutorials/typescript.md)
  - `postCreateRxDocument`-hooks will not be awaited if they are async

Features:
  - Added `RxDocument.atomicSet()`
  - Added `RxCollection.awaitPersistence()` for in-memory-collections
  - Added `RxReplicationState.denied$` [#763](https://github.com/pubkey/rxdb/issues/763)
  - Added option for CORS to server-plugin
  - `this`-scope of collection-hooks are bound to the collection itself [#788](https://github.com/pubkey/rxdb/issues/788)
  - All methods of `RxDocument` are bound to the instance [#791](https://github.com/pubkey/rxdb/issues/791)
  - Added `RxReplicationState.alive$`, [see](./docs-src/replication.md#alive). Thanks [@rafamel](https://github.com/rafamel)

Bugfixes:
  - checkAdapter doesn't cleanup test databases [#714](https://github.com/pubkey/rxdb/issues/714)
  - inMemory collections don't implement static methods [#744](https://github.com/pubkey/rxdb/issues/744)
  - inMemory collections do not sync up removals [#754](https://github.com/pubkey/rxdb/issues/754)
  - Ensure `final` fields cannot be changed on `RxDocument.atomicUpdate()` and `RxDocument.update()`
  - Fixed a missing dependency on the server-plugin

Other:
  - cross-instance communication is now done with https://github.com/pubkey/broadcast-channel (way better performance)
  - Upgrade to eslint 5 (no more babel-eslint)
  - Upgrade to babel7
  - Refactored `plugins/replication/.watchForChanges()` to fix sometimes-breaking-test with `RxReplicationState.complete$`
  - Split `RxCollection.watchForChanges()` into own plugin
  - Refactored `RxQuery`


### 7.7.1 (August 1, 2018)

Bugfixes:
  - newRxError is not a constructor [#719](https://github.com/pubkey/rxdb/issues/719) thanks [@errorx666](https://github.com/errorx666)
  - Collection name validation is too strict [#720](https://github.com/pubkey/rxdb/issues/720) thanks [@errorx666](https://github.com/errorx666)
  - Field names can't be one character long [#717](https://github.com/pubkey/rxdb/issues/717) thanks [@errorx666](https://github.com/errorx666)
  - Invalid value persists in document after failed update [#734](https://github.com/pubkey/rxdb/issues/734) thanks [@rybaczewa](https://github.com/rybaczewa)

Other
  - Moved `@types/core-js` to dev-dependencies [#712](https://github.com/pubkey/rxdb/issues/712)
  - Added more example the the RxQuery-Docs [#740](https://github.com/pubkey/rxdb/pull/740) thanks [@Celludriel](https://github.com/Celludriel)

### 7.7.0 (July 6, 2018)


Bugfixes:
  - Indexes do not work in objects named "properties" [#697](https://github.com/pubkey/rxdb/issues/697)
  - Wrong pouch-location when folderpath used for collection [#677](https://github.com/pubkey/rxdb/issues/677)
  - Mutating a result-array from `RxQuery.exec()` or `RxQuery.$` does not affect future calls [#698#issuecomment-402604237](https://github.com/pubkey/rxdb/issues/698#issuecomment-402604237)

Other:
  - Updated Angular-Example to 6.0.5 Thanks [@fuerst](https://github.com/fuerst)

### 7.6.1 (May 26, 2018)

Bugfixes:
  - Unhandled promise rejection with DOMException [#644](https://github.com/pubkey/rxdb/issues/644)
  - Prevent bug with replication of internal pouchdb's [#641](https://github.com/pubkey/rxdb/pull/641)
  - LocalDocument observe on field not working [#661](https://github.com/pubkey/rxdb/issues/661)
  - Skip defining getter and setter when property not defined in schema [#646](https://github.com/pubkey/rxdb/pull/646)
  - (typings) Fix `type: 'object'` not correctly recognized (via gitter at 2018 Mai 22 19:20)

### 7.6.0 (May 12, 2018)

Bugfixes:
  - Query cache is not being invalidated by replication [#630](https://github.com/pubkey/rxdb/issues/630)

Other:
  - Updated to rxjs 6.0.0
  - Added integration tests for couchdb

### 7.5.1 (May 3, 2018)

Bugfixes:
  - Indexes are no longer required thx [@gvuyk](https://github.com/gvuyk) [#620](https://github.com/pubkey/rxdb/issues/620)

Other:
  - Fixed typings for `additionalProperties` in schemas
  - Added performance-tests
  - Removed workarround for [pouchdb#6733](https://github.com/pouchdb/pouchdb/issues/6733)

Typings:
  - Added optional type for ORM-Methods

### 7.5.0 (April 24, 2018)

Features:
  - Added `RxCollection.insert$`, `RxCollection.update$`, `RxCollection.remove$` [read the docs](https://rxdb.info/rx-collection.html#observe-)

Other:
  - Added `dangerousRemoveCollectionInfo()` for migrations over rxdb-versions.
  - Improved typings for `RxChangeEvent`

### 7.4.4 (April 18, 2018)

Bugfixes:
  - Wrong index used when no sort specified [#609](https://github.com/pubkey/rxdb/issues/609)

Other:
  - Improved typings of `RxChangeEvent` thx [@hubgit](https://github.com/hubgit)

### 7.4.3 (April 7,2018)

Bugfixes:
  - Sort by sub object is not working [#585](https://github.com/pubkey/rxdb/issues/585)
  - Encrypted attachments not working inside of electron-renderer [#587](https://github.com/pubkey/rxdb/issues/587)
  - Schema fails with sub-sub-index [#590](https://github.com/pubkey/rxdb/issues/590)
  - Default value not applied when the stored value is `undefined` [#596](https://github.com/pubkey/rxdb/issues/596)

### 7.4.2 (March 22, 2018)

Bugfixes:
  - Wrong typings with custom build [#576](https://github.com/pubkey/rxdb/issues/576)

Features:
  - Add option to add pouchSettings to all pouchdb-instances [#567](https://github.com/pubkey/rxdb/pull/567) Thx [@EugeniaM](https://github.com/EugeniaM)

### 7.4.1 (March 11, 2018)

Bugfixes:
  - Remove preinstall-script [#558](https://github.com/pubkey/rxdb/issues/558) thx [@adam-lebon](https://github.com/adam-lebon)

### 7.4.0 (March 9, 2018)

Features:
  - Added `RxDatabase.server()` to quickly spawn couchdb-compatibe endpoint out of RxDB. Read [this](https://pubkey.github.io/rxdb/custom-build.html#server)
  - Use `CustomIdleQueue` for atomic updates to enable [#494](https://github.com/pubkey/rxdb/issues/494)

Bugfixes:
  - Default ignored when `0` [#528](https://github.com/pubkey/rxdb/pull/528) thx [@gvuyk](https://github.com/gvuyk)

### 7.3.3 (February 4, 2018)

Other:
  - Update to pouchdb version 6.4.3
  - Improve performance by using the profiler
  - Added typings for internal `pouchdb`-instance

### 7.3.2 (January 25, 2018)

Features:
  - Upgraded to pouchdb 6.4.2. [Read this](https://pouchdb.com/2018/01/23/pouchdb-6.4.2.html)

Typings:
  - Fix `RxCollection.findOne()` can return `null`

Other:
  - Improved [react-native-example](https://github.com/pubkey/rxdb/tree/master/examples/react-native) thx [@Darkbladecr](https://github.com/Darkbladecr)

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
  - Added [default values](https://pubkey.github.io/rxdb/rx-schema.html#default)
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
