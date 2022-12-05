
# RxDB Changelog

<!-- CHANGELOG NEWEST -->

<!-- ADD new changes here! -->

<!-- /CHANGELOG NEWEST -->

<!-- RELEASE BELOW -->

### 13.13.6 (5 December 2022)

- REFACTOR the remote RxStorage for electron ipcRenderer

### 13.13.5 (2 December 2022)

### 13.13.4 (2 December 2022)

### 13.13.3 (2 December 2022)

### 13.13.2 (30 November 2022)

### 13.13.1 (30 November 2022)

- UPDATE `isomorphic-ws` to `5.0.0`

### 13.13.0 (30 November 2022)

- ADD [Firestore Replication Plugin](https://rxdb.info/replication-firestore.html)
- FIX run the unit tests for the migration plugin on all storages.

### 13.12.0 (29 November 2022)

- ADD [electron ipcRenderer plugin](./docs-src/electron.md) which can be used in Electron.js to run the RxStorage in the main process and the RxDatabase in the renderer processes.
- Removed the electron-remote example because `@electron/remote` is deprecated.
- FIX emit false on active$ after replication is done [#4136](https://github.com/pubkey/rxdb/pull/4136) Thanks [@maxnowack](https://github.com/maxnowack)
- Deprecated the PouchDB RxStorage, [read this](https://rxdb.info/questions-answers.html#why-is-the-pouchdb-rxstorage-deprecated)

### 13.11.1 (23 November 2022)

- FIX Throw proper error message when a boolean index is used in the Dexie.js RxStorage.

### 13.11.0 (19 November 2022)

- ADD [replication-p2p](./docs-src/replication-p2p.md) which can be used to replicate data peer-to-peer without a backend server.

### 13.10.1 (10 November 2022)

### 13.10.0 (10 November 2022)

- ADD [replication-couchdb-new plugin](./docs-src/replication-couchdb-new.md) which can be used to replicate **any** [RxStorage](https://rxdb.info/rx-storage.html) with a CouchDB endpoint.
- ADD skip replication `retryTime` if `navigator.onLine` becomes `true`.
- FIX `active$` should emit during replication [#4117](https://github.com/pubkey/rxdb/pull/4117) Thanks [@maxnowack](https://github.com/maxnowack)

### 13.9.0 (7 November 2022)

- REFACTOR use faster `areRxDocumentArraysEqual` instead of doing a deep-equal check.
- ADD check to easier debug wrongly behaving backend during replication.
- FIX error `dev-mode added multiple times` is removed because it is annoying when using react hot-swap. Instead `addRxPlugin()` will now only throw if a different plugin is added that has the same name as a plugin that was added before.
- REFACTOR create the `digest` of an attachment inside of the `RxStorage`, not in RxDB. This makes the behavior equal to CouchDB and solves a lot of problems caused by different hashing or base64 encoding of the RxStorage implementations. (Fixes [#4107](https://github.com/pubkey/rxdb/pull/4107)) Thanks [@Elendiar](https://github.com/Elendiar)
- FIX GraphQL replication: should stop syncing if we receive less docs than pull.batchSize [#4110](https://github.com/pubkey/rxdb/pull/4110) Thanks [@jwallet](https://github.com/jwallet)

### 13.8.3 (3 November 2022)

- FIX TS Error in Plugin "Replicate-GraphQL" : GraphQL Websocket on "isomorphic-ws" import [#4104](https://github.com/pubkey/rxdb/pull/4104) Thanks [@jwallet](https://github.com/jwallet)

### 13.8.2 (1 November 2022)

- UPDATE `fake-indexeddb` to version `4.0.0`
- REFACTOR use `webpack` instead of `browserify` in karma tests.
- REMOVE `graphql-client` dependency [#3497](https://github.com/pubkey/rxdb/pull/3497)

### 13.8.1 (1 November 2022)

- FIX wrong query results in some cases with many operators.
- REMOVE `deep-freeze` npm dependency because it has no author.

### 13.8.0 (31 October 2022)

- Added [RxCollection.count()](https://rxdb.info/rx-query.html#count) queries. [#4096](https://github.com/pubkey/rxdb/pull/4096)
- REFACTOR index boundary usage for better performance.
- FIX critical bug in query correctness. **IMPORTANT:** If you use the RxStorage [IndexedDB](https://rxdb.info/rx-storage-indexeddb.html) or [FoundationDB](https://rxdb.info/rx-storage-foundationdb.html), you have to rebuild the indexes by increasing your schema version and running a migration. [#4098](https://github.com/pubkey/rxdb/pull/4098)
- FIX Typo in CRDT Plugin: `RxDDcrdtPlugin` is now `RxDBcrdtPlugin` [#4094](https://github.com/pubkey/rxdb/pull/4094) Thanks [@jwallet](https://github.com/jwallet)

### 13.7.0 (24 October 2022)

- ADD [CRDT Plugin](./docs-src/crdt.md)
- FIX calling `.remove()` on an `RxDocument` must update the internal data of the document with the deleted state.
- FIX Stop retries when replication gets canceled [#4088](https://github.com/pubkey/rxdb/pull/4088) Thanks [@Whoops](https://github.com/Whoops)

### 13.6.0 (19 October 2022)

- ADD example [how to use RxDB with Flutter](https://github.com/pubkey/rxdb/tree/master/examples/flutter)
- FIX many typos from the [TYPOFIX event](https://github.com/pubkey/rxdb/issues/4024)
- FIX Cannot read properties of null [#4055](https://github.com/pubkey/rxdb/pull/4055) Thanks [@Albert-Gao](https://github.com/Albert-Gao)
- FIX(sqlite) do not run pragma inside of transaction

### 13.5.1 (15 October 2022)

- ADD in `fastUnsecureHash()` use polyfill if `TextEncoder` is not available

### 13.5.0 (12 October 2022)

- FIX many typos from the [TYPOFIX event](https://github.com/pubkey/rxdb/issues/4024)
- FIX `lastOfArray()` may return undefined if array is empty [#4011](https://github.com/pubkey/rxdb/pull/4011) Thanks [@AlexErrant](https://github.com/AlexErrant)
- FIX Remove legacy triple slash directives [#4023](https://github.com/pubkey/rxdb/pull/4023) Thanks [@jeromepochat](https://github.com/jeromepochat)
- FIX randomly failing replication test

### 13.4.5 (7 October 2022)

- REFACTORED the landingpage to have less blinking and no more autoplay audio.

### 13.4.4 (4 October 2022)

- ADD new premium plugin `RxStorage Localstorage Meta Optimizer`

### 13.4.2 (3 October 2022)

### 13.4.1 (2 October 2022)

- REFACTOR stuff for a new optimization plugin

### 13.4.0 (28 September 2022)

- FIX image attachments not working correctly in the browser
- FIX Push batchSize in not respected [#3994](https://github.com/pubkey/rxdb/issues/3994)
- FIX boolean indexes not working [#3994](https://github.com/pubkey/rxdb/issues/3994)

### 13.3.0 (26 September 2022)

- FIX(sqlite) use dollar params instead of named params
- CHANGE run performance tests without the `dev-mode` plugin
- IMPROVE performance of document writes by not using try-catch in a hot path.
- FIX `RxDatabase.remove()` must properly remove the collection storage together with the replication states.

### 13.2.0 (22 September 2022)

- FIX respect the `prefers-reduced-motion` media query to not show blinking animations to neurodiverse people at the landingpage.
- ADD `pull.responseModifier` to the graphql replication plugin so that you can aggregate the checkpoint from the returned graphql response.

### 13.1.0 (19 September 2022)

- FIX saving multiple attachments broke previously stored attachments on some storages.
- UPDATE graphql websocket dependencies [#3980](https://github.com/pubkey/rxdb/pull/3980) Thanks [@herefishyfish](https://github.com/herefishyfish)
- FIX on `RxCollection.remove()` the related storages like the meta of replications, must also be removed.

### 13.0.3 (17 September 2022)

- FIX sorting via `event-reduce` did not work when `key-compression` plugin was used.

### 13.0.2 (16 September 2022)

- FIX `event-reduce` did not work when `key-compression` plugin was used.

### 13.0.1 (16 September 2022)

### 13.0.0 (16 September 2022) BREAKING [read the announcement](./docs-src/releases/13.0.0.md)

- FIX `graphQLSchemaFromRxSchema()` must not create broken schema when there are no `headerFields`

- ADD credentials settings to the GraphQL replication plugin [#3976](https://github.com/pubkey/rxdb/pull/3976) Thanks [@marcoklein](https://github.com/marcoklein)

- RENAMED the `ajv-validate` plugin to `validate-ajv` to be in equal with the other validation plugins.
- The `is-my-json-valid` validation is no longer supported until [this bug](https://github.com/mafintosh/is-my-json-valid/pull/192) is fixed.
- REFACTORED the [schema validation plugins](./docs-src/schema-validation.md), they are no longer plugins but now they get wrapped around any other RxStorage.
  - It allows us to run the validation inside of a [Worker RxStorage](./docs-src/rx-storage-worker.md) instead of running it in the main JavaScript process.
  - It allows us to configure which `RxDatabase` instance must use the validation and which does not. In production it often makes sense to validate user data, but you might not need the validation for data that is only replicated from the backend.
- REFACTORED the [key compression plugin](./docs-src/key-compression.md), it is no longer a plugin but now a wrapper around any other RxStorage.
  - It allows to run the key-comresion inside of a [Worker RxStorage](./docs-src/rx-storage-worker.md) instead of running it in the main JavaScript process.

- REFACTORED the encryption plugin, it is no longer a plugin but now a wrapper around any other RxStorage.
  - It allows to run the encryption inside of a [Worker RxStorage](./docs-src/rx-storage-worker.md) instead of running it in the main JavaScript process.
  - It allows do use asynchronous crypto function like [WebCrypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- Store the password hash in the same write request as the database token to improve performance.

- REMOVED many unused plugin hooks because they decreased the performance.

- REMOVED support for temporary documents [see here](https://github.com/pubkey/rxdb/pull/3777#issuecomment-1120669088)
- REMOVED RxDatabase.broadcastChannel The broadcast channel has been moved out of the RxDatabase and is part of the RxStorage. So it is not longer exposed via `RxDatabase.broadcastChannel`.

- In the RxDB internal `_meta.lwt` field, we now use 2 decimals number of the unix timestamp in milliseconds.

- REMOVE RxStorageStatics `.hash` and `.hashKey`

- CHANGE removed default usage of `md5` as default hashing. Use a faster non-cryptographic hash instead.
  - ADD option to pass a custom hash function when calling `createRxDatabase`.

- Removed the `liveInterval` option of the replication. It was an edge case feature with wrong defaults. If you want to run the pull replication on internval, you can send a `RESYNC` event manually in a loop.

- CHANGE use `Float` instead of `Int` to represent timestamps in GraphQL.

- REPLACED `RxReplicationPullError` and `RxReplicationPushError` with normal `RxError` like in the rest of the RxDB code.
- REMOVED the option to filter out replication documents with the push/pull modifiers [#2552](https://github.com/pubkey/rxdb/issues/2552) because this does not work with the new replication protocol.
- CHANGE default of replication `live` to be set to `true`. Because most people want to do a live replication, not a one time replication.

- CHANGED Attachment data is now always handled as `Blob` because Node.js does support `Blob` since version 18.0.0 so we no longer have to use a `Buffer` but instead can use Blob for browsers and Node.js
- FIXED multiple problems with encoding attachments data. We now use the `js-base64` library which properly handles utf-8/binary/ascii transformations.

- RENAMED the `server` plugin is now called `server-couchdb` and `RxDatabase.server()` is now `RxDatabase.serverCouchDB()`
- ADDED the [websocket replication plugin](./docs-src/replication-websocket.md)
- ADDED the [FoundationDB RxStorage](./docs-src/rx-storage-foundationdb.md)

- FIX `couchdb-server` plugin missed out events from the replication.

- ADD Support JsonSchema for nested additionalProperties [#3952](https://github.com/pubkey/rxdb/pull/3952) Thanks [@swnf](https://github.com/swnf)

- REFACTORED the layout of `RxChangeEvent` to better match the RxDB requirements and to fix the 'deleted-document-is-modified-but-still-deleted' bug.

### 12.7.16 (18 July 2022)

### 12.7.15 (18 July 2022)

### 12.7.14 (18 July 2022)

### 12.7.13 (18 July 2022)

### 12.7.12 (17 July 2022)

- CHANGE use eslint rule `require-await` to reduce build size.

### 12.7.11 (17 July 2022)

### 12.7.10 (17 July 2022)

### 12.7.9 (17 July 2022)

### 12.7.8 (15 July 2022)

### 12.7.7 (15 July 2022)

### 12.7.6 (15 July 2022)

### 12.7.5 (15 July 2022)

- FIX unify checkpoint behavior across all RxStorage implementations.
- FIX github release bot to only post non-patch releases to discord.

### 12.7.4 (15 July 2022)

- ADD export type `CategorizeBulkWriteRowsOutput`
- CHANGE `RxStorageInstance.getChangedDocumentsSince()` only returns the last checkpoint, not one for each document.

### 12.7.3 (14 July 2022)

- ADD export type `RxStorageDefaultCheckpoint`

### 12.7.2 (14 July 2022)

### 12.7.1 (14 July 2022)

### 12.7.0 (14 July 2022)

- FIX [#3839](https://github.com/pubkey/rxdb/pull/3839) executing insert -> remove -> insert -> remove does not work. Thanks [@nisarpeitang](https://github.com/nisarpeitang)
- ADD `checkpoint` to the internal used events that are emitted in the `RxStorageInstance.changestream()`.
- FIX randomly failing test with dexie.js RxStorage.
- ADD `custom` parameter to `RxStorageInstance.bulkWrite()`

### 12.6.14 (7 July 2022)

- Moved from gitter to [discord](https://discord.gg/gNAuePsN)
- ADD `bulkSize` option to [Memory Synced RxStorage](https://rxdb.info/rx-storage-memory-synced.html)

### 12.6.13 (6 July 2022)

- ADD `getPouchDBOfRxCollection()` to easy access the PouchDB instance of a RxCollection.

### 12.6.11 (5 July 2022)

- Add the [Memory Synced RxStorage](https://rxdb.info/rx-storage-memory-synced.html) to the premium plugins.

### 12.6.10 (5 July 2022)

### 12.6.9 (4 July 2022)

- Add conflict handling to RxCollection.

### 12.6.8 (2 July 2022)

### 12.6.7 (1 July 2022)

### 12.6.6 (1 July 2022)

### 12.6.5 (30 June 2022)

- ADD `isRxDatabaseFirstTimeInstantiated()`

### 12.6.4 (30 June 2022)

### 12.6.3 (29 June 2022)

### 12.6.2 (29 June 2022)

### 12.6.1 (29 June 2022)

- FIX RxStorageReplication must work with local documents.

### 12.6.0 (29 June 2022)

- The worker RxStorage will no longer reuse the worker so that multiple RxDatabase instances can use different workers for better performance.
- Cross-Tab event propagation is now handled by the RxStorage implementations, not by the RxDatabase. This allows to better combine RxStorages and plugins/wrappers.

### 12.5.4 (23 June 2022)

- Only check if final field have been changed in dev-mode.
- Fix `atomicUpsert()` broken when document was replicated before. [#3856](https://github.com/pubkey/rxdb/pull/3856). Thanks [@AntonOfTheWoods](https://github.com/AntonOfTheWoods)
- Refactor revision handling
- Fix the `_rev` that is passed to an RxStorage must be respected by the RxStorage.

### 12.5.3 (15 June 2022)

### 12.5.1 (15 June 2022)

### 12.5.0 (15 June 2022)

- UPDATE Node.js to version `18.3.0`
- FIX: RxStorage should never emit an eventBulk with an empty events array.
- Update PouchDB to `7.3.0` Thanks [@cetsupport](https://github.com/cetsupport).
- CHANGE (RxStorage) revision hash must not include the `_meta` field.
- Added new Stream replication for internal usage in plugins.

### 12.4.3 (27 May 2022)

- SQLite RxStorage: Add support for specific query indexes.

### 12.4.2 (23 May 2022)

- FIX query planner did not pick the correct index on `$eq` operations.
- IMPROVE performance of the memory RxStorage
- IMPROVE performance of custom index creation

### 12.4.1 (12 May 2022)

- ADD query optimizer to premium plugins.

### 12.4.0 (12 May 2022)

- REFACTOR if no sort order is set on a query, use a better matching sort order and not just the primary key.

### 12.3.2 (10 May 2022)

### 12.3.1 (10 May 2022)

### 12.3.0 (10 May 2022)

- OPTIMIZE `isFindOneByIdQuery()` should be `true` when only the primary field is queried with an `$eq`
- REWRITE query planner to use better indexeses in dexie.js and memory storage.

### 12.2.0 (9 May 2022)

- ADD attachment support to SQLite `RxStorage`
- ADD attachment support to IndexedDB `RxStorage`
- FIX collections with a dash in the name where not properly removed [#3785](https://github.com/pubkey/rxdb/pull/3785) Thanks [@mmouterde](https://github.com/mmouterde)
- FIX data still there despite remove and destroy calls [#3788](https://github.com/pubkey/rxdb/pull/3788) Thanks [@mmouterde](https://github.com/mmouterde)

### 12.1.0 (6 May 2022)

- ADD `notifyAboutRemoteChange()` to the GrapQL replication and replication primitives.
- ADD attachment support to memory `RxStorage`.
- FIX default of `waitForLeadership` in replication primitives must be `true`

### 12.0.8 (4 May 2022)

- IMPROVE memory storage performance.

### 12.0.7 (3 May 2022)

### 12.0.6 (3 May 2022)

### 12.0.5 (3 May 2022)

### 12.0.4 (3 May 2022)

### 12.0.3 (3 May 2022)

### 12.0.2 (2 May 2022)

- FIX dexie.js storage does not work with keyCompression when having a nested schema.

### 12.0.1 (28 April 2022)

- Added `autoStart` option to the replication plugins [#3775](https://github.com/pubkey/rxdb/pull/3775) Thanks [@mmouterde](https://github.com/mmouterde)
- Fix [#778](https://github.com/pubkey/rxdb/pull/3778) Storing string array was broken in the dexie storage. Thanks [@mmouterde](https://github.com/mmouterde)

### 12.0.0 (26 April 2022) BREAKING [read the announcement](./docs-src/releases/12.0.0.md)

- All indexes that do not contain the primaryKey, get the primary key added.
- You can now set a custom index when doing a query.
- Unified the replication primitives and the GraphQL replication plugin.
- Removed the deprecated in-memory plugin.
- Added cleanup plugin
- Refactor local documents plugin to only create a storage instance for local documents when needed.
- Removed the `core` plugin. The default export `from 'rxdb'` now exports only the RxDB core without plugins.

- The Dexie.js RxStorage is no longer in beta mode.
- Added the in memory storage plugin.
- Added `RxDocument().toMutableJSON()`
- Added `RxCollection().bulkUpsert()`
- Added optional `init()` function to `RxPlugin`.
- dev-mode: Add check to ensure all top-level fields in a query are defined in the schema.
- Support for array field based indexes like `data.[].subfield` was removed, as it anyway never really worked.
- Refactored the usage of RxCollection.storageInstance to ensure all hooks run properly.
- Refactored the encryption plugin so no more plugin specific code is in the RxDB core.
- Removed the encrypted export from the json-import-export plugin. This was barely used and made everything more complex. All exports are no non-encrypted. If you need them encrypted, you can still run by encryption after the export is done.
- RxPlugin hooks now can be defined as running `before` or `after` other plugin hooks.
- Attachments are now internally handled as string instead of `Blob` or `Buffer`
- Fix (replication primitives) only drop pulled documents when a relevant document was changed locally.
- Fix dexie.js was not able to query over an index when `keyCompression: true`

Changes to `RxStorageInterface`:
- `RxStorageInstance` must have the `RxStorage` in the `storage` property.
- The `_deleted` field is now required for each data interaction with `RxStorage`.
- Removed `RxStorageInstance.getChangedDocuments()` and added `RxStorageInstance.getChangedDocumentsSince()` for better performance.
- Added `doesBroadcastChangestream()` to `RxStorageStatics`
- Added `withDeleted` parameter to `RxStorageKeyObjectInstance.findLocalDocumentsById()`
- Added internal `_meta` property to stored document data that contains internal document related data like last-write-time and replication checkpoints.

### 11.6.0 (4 February 2022)

Bugfixes:
  - [#3666](https://github.com/pubkey/rxdb/issues/3666) RxDB with lokijs works bad in Safari and FF when using multiple tabs

Other:
  - Replication primitives must throw an error if `_deleted` field is missing. [#3671](https://github.com/pubkey/rxdb/pull/3671)

### 11.5.1 (30 January 2022)

Bugfixes:
  - `RxStorage.statics.getQueryMatcher()` must not match documents with `_deleted: true`.
  - Fixed multiple problems with `RxCollection.findByIds$()` [#3659](https://github.com/pubkey/rxdb/pull/3659) Thanks [@Hideman85](https://github.com/Hideman85)

### 11.5.0 (30 January 2022)

Features:
  - Improve emitted errors of the GraphQL replication [#3630](https://github.com/pubkey/rxdb/pull/3630) Thanks [@nirvdrum](https://github.com/nirvdrum)
  - Added Dexie.js based `RxStorage`. [Read the docs](https://rxdb.info/rx-storage-dexie.html)

### 11.4.0 (28 January 2022)

Bugfixes:
  - `RxDocument.toJSON()` is leaking meta field `_deleted`. [#3645](https://github.com/pubkey/rxdb/pull/3645) Thanks [@Bessonov](https://github.com/Bessonov)

Features:
  - Allow truthy values for the GraphQL replication `deletedFlag` field. [#3644](https://github.com/pubkey/rxdb/pull/3644) Thanks [@nirvdrum](https://github.com/nirvdrum)

Other:
  - `.findOne(documentId)` should use `RxStorage().findDocumentsById()` instead of `RxStorage().query()`

### 11.3.0 (17 January 2022)

Bugfixes:
  - GraphQL replication: Unnecessary local document writes fill up the database [#3627](https://github.com/pubkey/rxdb/pull/3627) Thanks [@hdwatts](https://github.com/hdwatts)

### 11.2.0 (12 January 2022)

Bugfixes:
  - Replication Primitives: Local writes while running the `pull` must not be lost but send to the remote.
  - Replication Primitives: Should not stack up failed runs and then run many times.
  - Support composite indices in schema literal types [#3609](https://github.com/pubkey/rxdb/pull/3609) Thanks [@nirvdrum](https://github.com/nirvdrum)

### 11.1.0 (6 January 2022)

Features:
  - Added `toTypedRxJsonSchema` and `ExtractDocumentTypeFromTypedRxJsonSchema` to generate the document types from the schema.

### 11.0.0 (3 January 2022) BREAKING [read the announcement](./docs-src/releases/11.0.0.md)

BREAKING:
  - RxStorage: The non async functions `prepareQuery`, `getSortComparator` and `getQueryMatcher` have been moved out of `RxStorageInstance` into `RxStorage`. This was needed to have better WebWorker support. This will not affect you do not use a custom `RxStorage` implementation.
  - LokiJS: Do not use the `IdleQueue` of the RxDatabase to handle calls to saveDatabase(), instead wait for CPU idleness of the JavaScript process.
  - `RxStorageInterface`:
    - Replaced all `Map` with plain json objects so that they can be `JSON.stringify`-ed
    - Replaced typings of event stream to use `EventBulk` and process events in bulks to save performance.
    - Move all static methods into the `statics` property so we can code-split when using the worker plugin.
    - `digest` and `length` of attachment data is now created by RxDB, not by the RxStorage. [#3548](https://github.com/pubkey/rxdb/issues/3548)
    - Added the statics `hashKey` property to identify the used hash function.
  - Internally all events are handles via bulks, this saves performance when events are transfered over a WebWorker or a BroadcastChannel.
  - Removed the deprecated `recieved` methods, use `received` instead. [See #3392](https://github.com/pubkey/rxdb/pull/3392)
  - Removed the `no-validate` plugin. To use RxDB without schema validation, just do not add a validation plugin to your custom build.

Bugfixes:
  - Do not throw an error when database is destroyed while a GraphQL replication is running.
  - Compound primary key migration throws "Value of primary key(s) cannot be changed" [#3546](https://github.com/pubkey/rxdb/pull/3546) Thanks [@nothingkid](https://github.com/nothingkid)
  - Allow `_id` as primaryKey [#3562](https://github.com/pubkey/rxdb/pull/3562) Thanks [@SuperKirik](https://github.com/SuperKirik)
  - LokiJS: Remote operations do never resolve when remote instance was leader and died.

Other:
  - LokiJS: All documents are stored with a `$lastWriteAt` field, so we can implement an auto compaction later.
  - Transpile `async`/`await` to promises instead of generators. via [babel-plugin-transform-async-to-promises](https://github.com/rpetrich/babel-plugin-transform-async-to-promises)

### 10.5.4 (30 November 2021)

Bugfixes:
  - LokiJS: Do not call `saveDatabase()` when no persistence adapter is given.
  - Query returns outdated result in second subscription [#3498](https://github.com/pubkey/rxdb/issues/3498) Thanks [@swnf](https://github.com/swnf)
  - Spawning a server when full leveldown-module is used must not throw an error.

### 10.5.3 (19 November 2021)

Bugfixes:
  - PouchDB: `getSortComparator()` broken on some complex `$or` query.

### 10.5.2 (18 November 2021)

Other:
  - GraphQL replication must wait for `requestIdlePromise` to not slow down more important tasks.

Bugfixes:
  - LokiJS: Directly create local state when instance becomes leader.
  - LokiJS: `mustUseLocalState()` should not create multiple local states.

### 10.5.1 (15 November 2021)

Bugfixes:
  - GraphQL replication should affect `requestIdlePromise` and while replication IO is running, the database must not be idle.
  - Creating a collection that has existed before must not cause a database write.
  - LokiJS: Fixed error log when reloading while having the database open in multiple browser tabs.

### 10.5.0 (15 November 2021)

Other:
  - Removed useless runtime check of database name, only check in dev-mode.

Changes:
  - LokiJS: Use custom save handler instead of setting `autosave: true`

### 10.4.1 (13 November 2021)

Other:
  - Decreased build size by not importing `pouchdb-utils`
  - Improve build size and performance by replacing [deep-equal](https://www.npmjs.com/package/deep-equal) with [fast-deep-equal](https://github.com/epoberezkin/fast-deep-equal#readme)
  - Remove module `random-token` and use the same random string generator everywhere.

### 10.4.0 (11 November 2021)

Bugfixes:
  - LokiJS: Ensure events emit exact the same data as with PouchDB.
  - LokiJS: Queries with limit and skip where broken.
  - LokiJS: Fix all bugs and run the whole test suite with LokiJS Storage
  - Fix PouchDB RxStorage sometimes returned wrong sort comparison results.

Other:
  - Updated [event-reduce](https://github.com/pubkey/event-reduce) for more optimizations.
  - Allow dash character `-` in collection and database names.

### 10.3.5 (8 November 2021)

Bugfixes:
  - LokiJS `findDocumentsById()` returned additional `$loki` property.
  - LokiJS `bulkAddRevisions()` must not mutate the input.
  - LokiJS deletes on GraphQL replication must work.

### 10.3.4 (7 November 2021)

Bugfixes:
  - LokiJS: Upserting a deleted document did not work.
  - LokiJS: Storage queries returned additional `$loki` property.

### 10.3.3 (6 November 2021)

Bugfixes:
  - LokiJS Storage must have a deterministic sort order.

### 10.3.2 (5 November 2021)

Bugfixes:
  - Sort queries broken with LokiJS RxStorage.

### 10.3.1 (5 November 2021)

Bugfixes:
  - Fix endless loop when using GrapQL-replication & LokiJS RxStorage.

### 10.3.0 (4 November 2021)

Features:
  - Added LokiJS `RxStorage` plugin.

Bugfixes:
  - Fixed missing closings of `RxStorage` instances when the database or collection is destroyed.

Other:
  - Improved performance of write operations.
  - Removed unnecessary abstraction layer of `LeaderElector`

### 10.2.2 (25 October 2021)

Bugfixes:
  - Migration with attachments removes attachment mime types [#3460](https://github.com/pubkey/rxdb/issues/3460) Thanks [@swnf](https://github.com/swnf)

Other:
  - Improved performance when many queries are created in a short timespan.
  - Database- and collection names can now contain the minus char `-`.

### 10.2.1 (20 October 2021)

Bugfixes:
  - GraphQL replication: push not working with keyCompression.
  - `Buffer` is not available in browsers [#3454](https://github.com/pubkey/rxdb/issues/3454) Thanks [@swnf](https://github.com/swnf)

### 10.2.0 (13 October 2021)

Bugfixes:
  - Observed document data must be deep freezed in dev mode [#3434](https://github.com/pubkey/rxdb/issues/3434) Thanks [@chrisdrackett](https://github.com/chrisdrackett)

Other:
  - We now have set `sideEffects: false` to the default in the package.json so tree shaking can work.
  - Optimized memory usage in the query cache.

Features:
  - Added [replication primitives plugin](./docs-src/replication.md)

### 10.1.0 (27 September 2021)

Other:
  - Refactored the migration plugin for better performance by writing the documents in bulk requests
  - Added svelte example [#3287](https://github.com/pubkey/rxdb/pull/3287) Thanks [@bkeating](https://github.com/bkeating)
  - Improved error messages

Bugfixes:
  - [#3319](https://github.com/pubkey/rxdb/issues/3319) Graphql replication checkpoint was not deleted after running `RxDatabase.remove()`
  - Fixed spelling of `recieved -> received` everywhere. The old getters are still useable but `deprecated` [#3392](https://github.com/pubkey/rxdb/pull/3392). Thanks [chrisdrackett](https://github.com/chrisdrackett)

### 10.0.3 (9 August 2021)

Bugfixes:
  - Calling bulk-methods with an empty array must not throw an error.
  - `RxCollection.remove()` does not delete local documents [#3319](https://github.com/pubkey/rxdb/issues/3319)

### 10.0.0 (20 July 2021) BREAKING [read the announcement](./docs-src/releases/10.0.0.md)

Breaking:
  - Setting a `primaryKey` for a schema is now required.
  - When using the type `RxJsonSchema<DocType>` the `DocType` is now required.
  - A JsonSchema must have the `required` array at the top level and it must contain the primary key.

  - Outgoing data is now `Readonly` typed and [deep-frozen](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) in dev mode

  - `RxDocument.putAttachment()` no longer supports string as data, only `Blob` or `Buffer`.
  - Changed the default of `putAttachment` to `skipIfSame=true`.

  - Removed the deprecated `atomicSet()`, use `atomicPatch()` instead.
  - Removed the deprecated `RxDatabase.collection()` use `RxDatabase().addCollections()` instead.

  - Moved everything pouchdb related to the `pouchdb` plugin.
  - Pouchdb plugins are not longer added via `addRxPlugin()` but `addPouchPlugin()`. (RxDB plugins are still added via `addRxPlugin`).
  - Removed plugin hook `preCreatePouchDb`.
  - Removed the `watch-for-changes` plugin, this is now directly integrated into the pouchdb `RxStorage`.
  - Removed the `adapter-check` plugin. (The function `adapterCheck` has moved to the pouchdb plugin).

  - Calling `RxDatabase.server()` now returns a promise that resolves when the server is started up.
  - Changed the defaults of `PouchDBExpressServerOptions` from the `server()` method, by default we now store logs in the tmp folder and the config is in memory.
  - Renamed `replication`-plugin to `replication-couchdb` to be more consistend in naming like with `replication-graphql`
    - Renamed `RxCollection().sync()` to `RxCollection().syncCouchDB()`

  - Renamed the functions of the json import/export plugin to be less confusing
    - `dump()` is now `exportJSON()`
    - `importDump()` is now `importJSON()`
  - `RxCollection` uses a separate pouchdb instance for local documents, so that they can persist during migrations.

Features:
  - Added support for composite primary keys.

Other:
  - Moved all `should never happen` errors into own error code.

Typings:
  - Improved typings of error codes.

### 9.21.0 (30 June 2021)

Features:
  - Added `dataPath` property to GraphQL replication pull options to allow the document JSON lookup path to configured instead of assuming the document data is always the first child of the response [#2606](https://github.com/pubkey/rxdb/issues/2606) Thanks [@joshmcarthur](https://github.com/joshmcarthur)

Types:
  - `getLocal()` can return `undefined`. Thanks [@chrisdrackett](https://github.com/chrisdrackett)
  - Fixed typings in the dependencies so you can use `noUncheckedIndexedAccess`. Thanks [@seanwu1105](https://github.com/seanwu1105)

### 9.20.0 (15 May 2021)

Bugfixes:
  - Auto-cancel one time couchdb replications to not cause a memory leak
  - Fixed another memory leak when calling the couchdb replication many times.

### 9.19.0 (12 May 2021)

Features:
  - Added the [backup-plugin](https://rxdb.info/backup.html)

Other:
  - Updated `rxjs` to version `7.0.1`

### 9.18.0 (26 April 2021)

Bugfixes:
  - Fixed memory leak in `RxCollection().findByIds$()`

Other:
  - Added collection name when throwing errors in `RxQuery`

### 9.17.1 (21 April 2021)

Other:
  - Added hints abount 2021 user survey.

### 9.17.0 (14 April 2021)

Features:
  - Added possibility to change, update, remove and add `RxAttachment`s inside of a migration strategy.

### 9.16.0 (12 April 2021)

Features:
  - Added `RxDatabase.migrationStates()` which returns an observable to observe the state of all ongoing migrations.
  - Added `startupPromise` to the returned object of `RxDatabase().server()`

Bugfixes:
  - Ensure every background task is done when `RxDatabase.destroy()` resolves. [#2938](https://github.com/pubkey/rxdb/issues/2938)

Other:
  - Added analytics to docs page

### 9.15.0 (25 February 2021)

Bugfixes:
  - Updated `pouchdb-all-dbs` fixes [#2874](https://github.com/pubkey/rxdb/issues/2874)  Thanks [@openscript](https://github.com/openscript)

Other:
  - Determinstic handling of revision keys during data migration
  - Added more information to `RxError` when data migration fails

### 9.14.0 (14 February 2021)

Features:
  - Added `RxReplicationState.awaitInitialReplication()`

Bugfixes:
  - Using the replication plugins must not required to also use leader-election
  - Refactor `QueryCache.triggerCacheReplacement()` to not spawn `setTimeout` regulary. This is needed for server side rendering with angular universal.

Other:
  - Added server side rendering to the [angular example](https://github.com/pubkey/rxdb/tree/master/examples/angular)

### 9.13.0 (10 February 2021)

Features:

  - Added `RxCollection().bulkRemove()` [#2845](https://github.com/pubkey/rxdb/pull/2845) Thanks [@qinyang912](https://github.com/qinyang912)

Other:

  - Improved typings of `insertLocal()` [#2850](https://github.com/pubkey/rxdb/pull/2850) Thanks [@openscript](https://github.com/openscript)
  - Improved typings of `bulkInsert()`

### 9.12.1 (24 January 2021)

Bugfixes:
  - [#2785](https://github.com/pubkey/rxdb/pull/2785) postInsert hook not working when use bulkInsert to insert doc. Thanks [@qinyang912](https://github.com/qinyang912)
  - Setted `sideEffects: true` for main module [#2798](https://github.com/pubkey/rxdb/issues/2798)

Other:
  - (docs) added warning about indexeddb adapter
  - Upgraded typescript to `4.1.3`

### 9.12.0 (3 January 2021)

Features:
  - Allow `primary` and `ref` at the same time in a schema. [#2747](https://github.com/pubkey/rxdb/issues/2747)

Bugfixes:
  - [#2705](https://github.com/pubkey/rxdb/issues/2705) when use bulkInsert to insert doc, the rxDocument property on changeEvent is an object, not a RxDocument instance. Thanks [@qinyang912](https://github.com/qinyang912)
  - When the mutation function of `atomicUpdate()` has thrown once, it was not possible to use it again.

### 9.11.0 (13 December 2020)

Features:
  - Added `putAttachment(skipIfSame)`, if set to `true` a write will be skipped if the attachment already exists with the same data.

Bugfixes:
  - `awaitInitialReplication()` resolves on failed replication [#2745](https://github.com/pubkey/rxdb/pull/2745). Thanks [@dome4](https://github.com/dome4)
  - `insertLocal()` not emitted the state change across tabs

Other:
  - Added `name` identifier to `RxPlugin`
  - Throw error when `dev-mode` plugin is added multiple times because there is no way that this was done intentional likely the developer has mixed core and default usage of RxDB.
  - Fix reported security problem with the query builders mquery api.

### 9.10.1 (23 November 2020)

Other:
  - Additional refactorings to improve collection creation speed

### 9.10.0 (23 November 2020)

Features:
  - Added `RxCollection.getLocal$()` and `RxDatabase.getLocal$()` to observe local documents.
  - Added `RxDatabase.addCollections()` to create multiple collections at once. Is faster and better typed than the now deprecated `RxDatabase.collection()`

Other:
  - Improved typings for `pouchdb.changes()`
  - Moved from travisci to github actions

### 9.9.0 (10 November 2020)

Other:
  - Improved startup performance by doing a index-exist check
  - Added check for `properties` to dev-mode schema check
  - Add better checks for query input in dev-mode

### 9.8.0 (2 November 2020)

Features:
  - Added subscription parameters for `graphQLSchemaFromRxSchema()`
  - Added [RxDocument.atomicPatch()](https://rxdb.info/rx-document.html#atomicpatch)

Bugfixes:
  - (types) Returned values of `syncGraphQL()` did not type-match with `RxGraphQLReplicationState`
  - `RxDocument.atomicUpdate()` now does a retry on 409 write conflicts

Other:
  - Added authentication to graphql example
  - Deprecated `RxDocument.atomicSet()`. Used `atomicPatch` instead, it works better with typescript
  - (docs) added workarounds for 6-connection limit at couchdb replication [#2659](https://github.com/pubkey/rxdb/pull/2659). Thanks [@MuresanSergiu](https://github.com/MuresanSergiu)

### 9.7.1 (22 October 2020)

Bugfixes:
  - Server-Plugin: Replication did not work until there is at least one document.
  - Fix skipping docs in graphql push replication [#2627](https://github.com/pubkey/rxdb/pull/2627) Thanks [@DDoerner](https://github.com/DDoerner)

### 9.7.0 (21 October 2020)

Bugfixes:
  - `RxLocalDocument.$` emitted to often on changes [#2471](https://github.com/pubkey/rxdb/issues/2471)
  - Fix typings of `RxReplicationState.collection`

Features:
  - Allow to skip docs in push/pull modifiers with the graphql-replication. [#2552](https://github.com/pubkey/rxdb/issues/2552) Thanks [@DDoerner](https://github.com/DDoerner)
  - Allow to type the data of `RxLocalDocument` like `myDatabase.getLocal<{foo: string}>('bar')`

Other:
  - Refactored GraphQL replication to run faster [#2524](https://github.com/pubkey/rxdb/pull/2524/) Thanks [@corinv](https://github.com/corinv)

### 9.6.0 (7 September 2020)

Features:
  - Add `RxReplicationState.setHeaders()` [#2399](https://github.com/pubkey/rxdb/pull/2399/) Thanks [@DDoerner](https://github.com/DDoerner)
  - Added `RxCollection.findByIds$()` [see](./docs-src/tutorials/rx-collection.md#findbyids$)

Bugfixes:
  - wrong key handling on compound indexes [#2456](https://github.com/pubkey/rxdb/pull/2456/) Thanks [@dome4](https://github.com/dome4)
  - Nested `$or` queries where broken when they used the primaryKey in the selector

### 9.5.0 (2 August 2020)

Other:
  - Upgraded pouchdb to `7.2.2`
  - Upgraded typescript to `3.9.7`

### 9.4.0 (24 July 2020)

Features:
  - Add cache-replacement-policy for the [QueryCache](https://pubkey.github.io/rxdb/query-cache.html)
  - GraphQL replication async modifier function [#2367](https://github.com/pubkey/rxdb/issues/2367)

Bugfixes:
  - GraphQL replication run increasing requests when offline [#2336](https://github.com/pubkey/rxdb/issues/2336)

### 9.3.0 (26 June 2020)

Features:
  - Added (beta) `RxCollection.findByIds()` to get many documents by their id with a better performance.

Other:
  - Added typings for `pouch.allDocs()`

### 9.2.0 (21 June 2020)

Bugfixes:
  - `ref`-fields must be nullable [#2285](https://github.com/pubkey/rxdb/pull/2285/) Thanks [@kunal15595](https://github.com/DDoerner)
  - RxDatabase names can no longer end with a slash [#2251](https://github.com/pubkey/rxdb/issues/2251) which breaks the server plugin.

Other:
  - Added `"sideEffects": false` to all plugins

### 9.1.0 (31 May 2020)

Features:
  - `RxDatabase.server()` does now accept `pouchdbExpressOptions` to set the log file and other stuff configured [on express-pouchdb](https://github.com/pouchdb/pouchdb-server#api)

Bugfixes:
  - prepareQuery should handle all comparison operators [#2213](https://github.com/pubkey/rxdb/pull/2213/) Thanks [@kunal15595](https://github.com/kunal15595)

Other:
  - Added webpack [tree shaking optimization](https://webpack.js.org/guides/tree-shaking/#clarifying-tree-shaking-and-sideeffects) via `sideEffects: false`

### 9.0.0 (16 May 2020) BREAKING [read the announcement](./docs-src/releases/9.0.0.md)

Features:
  - Added `RxQuery.exec(throwIfMissing: true)`
  - Added helper functions to [GraphQL replication](https://rxdb.info/replication-graphql.html) to generate GraphQL Schemas from the `RxJsonSchema`

Bugfixes:
  - GraphQL replication plugin fires exponentially [#2048](https://github.com/pubkey/rxdb/issues/2048)
  - When a `default` is set in the schema, the default values are also applied after `atomicUpdate()` and `atomicSet()`

Breaking:
  - Indexes are now specified at the top-level of the schema-definition. [#1655](https://github.com/pubkey/rxdb/issues/1655)
  - Encrypted fields are now specified at the top-level of the schema-definition
  - Removed all default exports. Please only import the stuff that you really need.
  - Renamed `RxDB.create()` to `createRxDatabase()`
  - Renamed `removeDatabase()` to `removeRxDatabase()`
  - Renamed `plugin()` to `addRxPlugin()`
  - Replaced plugins `error-messages` and `schema-check` with [dev-mode](https://pubkey.github.io/rxdb/custom-build.html#dev-mode)
  - Moved data migration from core to migration plugin
  - Replaced key-compression implementation with [jsonschema-key-compression](https://github.com/pubkey/jsonschema-key-compression)
  - Renamed `RxDatabase.queryChangeDetection` to `eventReduce` and set default to `true` (no beta anymore)
  - Change `.find()` and `.findOne()` to acccept a full MangoQuery with `sort` and `limit` instead of just the selector
  - Chained queries like `collection.find().where('x').eq('foo')` moved out of the core module into the query-builder plugin
  - The internal `hash()` function does now use a RxDB specific salt
  - Change default of `RxDocument().toJSON(withRevAndAttachments)` to `false`
  - Refactored `RxCollection`
  - Creating a collection will no longer emit an `RxChangeEvent`
  - Removed `RxCollection.docChanges$()` because all events are from the docs
  - Renamed `RxSchema.jsonID` to `RxSchema.jsonSchema`
  - Moved remaining stuff of leader-election from core into the plugin
  - Merged multiple internal databases for metadata into one `internalStore`
  - In dev-mode, the GraphQL-replication will run a schema validation of each document that comes from the server

Other:
  - Removed many runtime type checks that now should be covered by typescript in buildtime
  - The GraphQL replication is now out of beta mode

Docs:
  - Removed examples for `require()` CommonJS loading

### 8.9.0 (14 March 2020)

Other:
  - The server plugin now exposes the `pouchApp` [#1992](https://github.com/pubkey/rxdb/pull/1992) Thanks [@Julusian](https://github.com/Julusian)

Features:
  - Added option to replicate revisions with graphql-replication [#2000](https://github.com/pubkey/rxdb/pull/2000) Thanks [@gautambt](https://github.com/gautambt)

### 8.8.0 (5 March 2020)

Other:
  - Upgraded PouchDB and other dependencies

### 8.7.5 (6 January 2020)

Other:
  - Added a new example for electron with the remote API. Thanks [@SebastienWae](https://github.com/SebastienWae)
  - Fixed Typing error on `database.dump()` [#1754](https://github.com/pubkey/rxdb/issues/1754). Thanks [@PVermeer](https://github.com/PVermeer)

Bugfixes:
  - Updates to documents fail with GraphQL replication. [#1812](https://github.com/pubkey/rxdb/issues/1812). Thanks [@gautambt](https://github.com/gautambt)
  - `RxQuery.doesDocumentDataMatch()` was wrong on queries with `$and` which lead to a wrong result with QueryChangeDetection

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

- Migrated to typescript.
- Fixed import of `@types/pouchdb-core` and `@types/pouchdb-find`

Bugfixes:
  - Fixed typings of `preCreateRxCollection` [#1533](https://github.com/pubkey/rxdb/issues/1533) Thanks [@yanshiyason](https://github.com/yanshiyason)

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

### 8.0.0 (18. September 2018) BREAKING [read the announcement](./docs-src/releases/8.0.0.md)

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
