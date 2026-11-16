# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.

## Remove the DenoKV RxStorage

The Deno team joined Cloudflare on October 9, 2026 (https://deno.com/blog/cloudflare). Deno Deploy, which hosts the globally replicated DenoKV, shuts down six months after that, and the Deno runtime only gets bug fixes and security updates for one more year. The DenoKV RxStorage was deprecated for that reason.

In the next major:
- Remove `src/plugins/storage-denokv`, its `exports` entry in `package.json` and its case in `test/unit/config.ts`.
- Remove the `test:deno:denokv` scripts and the `run deno tests:denokv` step in `.github/workflows/main.yml`.
- Remove `docs-src/docs/rx-storage-denokv.md`, its sidebar entry, and the links to it from other docs pages. Add a redirect from `rx-storage-denokv.html` to `rx-storage.html`.

## sortObject() performance improvements

https://github.com/pubkey/rxdb/pull/9153

## Schema normalization must not depend on the device locale

`sortObject()` sorts the keys with `localeCompare()` without a fixed locale. The order, and with it the schema hash, depends on the device locale. For example in Czech and Slovak "ch" sorts after "h", so a schema with the keys `chunk_id` and `hint` gets a different hash when the device or app language changes. See https://github.com/pubkey/rxdb/issues/9128

For now `addCollections()` runs a `deepEqual()` check on the stored schema when the hashes differ and does not throw `DB6` when the content is equal.

In the next major:
- Change the normalization in `sortObject()` to no longer use `localeCompare()`, for example a plain code unit comparison (`a < b`). This is faster and does not depend on the locale, but it changes the hash of existing schemas, which is why it is a breaking change.
- Remove the `deepEqual()` fallback check in `addCollections()` again.

## Add end-to-end TypeScript typings for mango queries

https://github.com/pubkey/rxdb/pull/8941

## Replace `simple-peer` with `@thaunknown/simple-peer`

The `simple-peer` package that the [WebRTC replication](https://rxdb.info/replication-webrtc.html), the Google Drive replication and the Microsoft OneDrive replication use is unmaintained. Its last release was `9.11.1` in February 2022 and its repository has over 100 open issues. It depends on `buffer`, `readable-stream`, `randombytes`, `get-browser-rtc`, `queue-microtask`, `err-code` and `debug`, and those Node.js shims are what reaches the users:

- https://github.com/pubkey/rxdb/issues/8605 `ReferenceError: global is not defined` from `randombytes`, which breaks Angular builds.
- https://github.com/pubkey/rxdb/issues/4960 `Cannot read properties of undefined (reading 'call') at _Peer.Readable`.
- https://github.com/pubkey/rxdb/issues/7365 npm audit reports `rxdb -> Depends on vulnerable versions of simple-peer`.
- The error code `RC7` exists only to tell people that `simple-peer` needs `process.nextTick()` to be polyfilled.
- `createSimplePeerWrtc()` exists only to work around `simple-peer` mutating the `RTCSessionDescription` objects of WebRTC polyfills.

[@thaunknown/simple-peer](https://www.npmjs.com/package/@thaunknown/simple-peer) is an API compatible fork that is still released. It is ESM, replaces `readable-stream` and `buffer` with `streamx` and `Uint8Array`, and has a `lite.js` entry point that contains only the data channel code and not the MediaStream handling, which is the only part that RxDB uses.

RxDB only uses `new Peer({initiator, config, trickle})`, the `signal`, `connect`, `data`, `close` and `error` events and `.signal()`, `.send()` and `.destroy()`, so the swap itself is small. These things were found while trying it out and have to be handled:

- **It must be an optional peer dependency**, like `firebase` and `mongodb`. The fork depends on `webrtc-polyfill`, which depends on `node-datachannel`, a native NAPI addon with an install script. As a normal dependency that native install runs on every `npm install rxdb`, browser only apps included. Requiring the install is the main reason why this is a breaking change.
- **It can never be loaded with `require()`.** `webrtc-polyfill` has no `require` condition in its `exports` map, which fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`, and `webrtc-polyfill/lib/Blob.js` starts with a top-level await, which fails with `ERR_REQUIRE_ASYNC_MODULE` on every Node.js version. Raising the `engines` field does not help. It has to be loaded with a dynamic `import()`, which babel and tsx both leave untouched, otherwise `require('rxdb/plugins/replication-webrtc')` breaks in the CommonJS build. The testcases of the Google Drive and OneDrive replication run through tsx and are affected the same way.
- **The `data` event emits `Uint8Array` instead of a Node.js `Buffer`.** All three call sites decode the payload with `toString()` or `+ ''`, which on a `Uint8Array` returns the comma separated byte values instead of the JSON string. They have to decode with a `TextDecoder`, otherwise every message fails to parse.
- **React Native still needs a WebRTC implementation.** The fork removed the `wrtc` option and reads the api from `webrtc-polyfill`, which covers browsers with the native api and Node.js with `node-datachannel`. React Native is neither and `webrtc-polyfill` has no `react-native` export condition. Because the fork reads the api from the global scope once at load time, the `wrtc` option can be kept working by writing it to the global scope right before the lazy `import()`. On top of that, Metro has to be told to resolve `webrtc-polyfill` to its browser build, otherwise it picks the Node.js one with the native module.
- `RC7` and `ensureProcessNextTickIsSet()` can be removed. `streamx` uses `queueMicrotask()`.
- `@types/simple-peer` can be dropped, but the fork ships no types, so the used part of the api has to be declared. Declaring only the used part narrows the public `SimplePeer` type, which breaks the builds of people who call other methods on the peers from `connect$` and `message$`.
- `@thaunknown/simple-peer` has to be added to the ignored modules of the `test:deps` script, next to `ws`, because `dependency-check` only detects static imports.

A full implementation with green CI is at https://github.com/pubkey/rxdb/pull/8900

## Remove the premium re-exports of the reactivity plugins

The `reactivity-vue` and `reactivity-preact-signals` plugins moved from RxDB Premium to the free RxDB core (`rxdb/plugins/reactivity-vue`, `rxdb/plugins/reactivity-preact-signals`). The premium package still has plugins with the same names that only re-export the core plugins, so that existing imports from `rxdb-premium/plugins/reactivity-*` do not break. In the next major version, remove these re-exporting premium plugins and tell users in the changelog to import from `rxdb/plugins/reactivity-vue` and `rxdb/plugins/reactivity-preact-signals` instead.


## Remove the `CE1` dev-mode check for UPDATE events without `previousDocumentData`

`rxChangeEventToEventReduceChangeEvent()` in `src/rx-change-event.ts` throws `CE1` in dev-mode when an RxStorage emits an `UPDATE` event without `previousDocumentData`. It was added together with the removal of the `'UNKNOWN'` fallback from the PouchDB era, so that custom RxStorage implementations which relied on that fallback fail loudly instead of silently producing wrong query results. All RxStorages build their events with `categorizeBulkWriteRows()`, which always sets `previousDocumentData`. In the next major version, remove the check and the `CE1` error code. See https://github.com/pubkey/rxdb/pull/9306

## Remove the legacy subject fallback of the NATS replication

The NATS replication percent-encodes the primary key in the subject with `encodeNatsSubjectToken()`. Before that, documents were stored under the plain subject `<subjectPrefix>.<docId>`. For ids with a `%`, or with a `*` or `>` inside a longer id like `a*b`, the legacy subject differs from the encoded one, so the push handler has a fallback for documents that are still stored under the legacy subject:

- `getNatsLegacyDocumentSubject()`, `getNatsLegacyServerDocumentState()` and `moveNatsLegacyDocument()` in `src/plugins/replication-nats/nats-helper.ts`.
- In the push handler, the move of a legacy document that occupies the encoded subject of another document (the legacy subject of `a%2Eb` is the encoded subject of `a.b`) and the lookup of the legacy subject when the encoded subject has no message.
- In the pull handler, the deduplication of documents by primary key.

A legacy document is only moved when it is written again. Removing the fallback before all legacy documents are moved breaks them: the pull still returns them, but the push no longer finds their server state, so the conflict detection does not work and the old message stays in the stream next to the new one. In the next major version, remove the fallback and tell users in the changelog to move the legacy documents first, for example by running a one-time migration that reads all subjects with a `LastPerSubject` consumer and calls `moveNatsLegacyDocument()` for every message whose subject is not `getNatsDocumentSubject(subjectPrefix, docId)`. See https://github.com/pubkey/rxdb/issues/9343

## Make `crypto-js` an optional peer dependency

`crypto-js` is a normal `dependency` pinned at `4.2.0`, so **every** `npm install rxdb` pulls it in, including the installs of everyone who never touches the encryption plugin. It is used in exactly one place, `import pkg from 'crypto-js'` in `src/plugins/encryption-crypto-js/index.ts`, and nothing else in `src/` imports it.

The reason to move it: `crypto-js` is no longer maintained. Its npm page marks it as discontinued, `4.2.0` is the last release and its own README recommends the native crypto module. Since RxDB generates a CycloneDX and an SPDX SBOM for every release and attaches both to the GitHub release, that discontinued package is now listed in a machine readable file for every consumer, and a dependency scanner flags it without anyone reading the docs. Making it optional keeps it out of the dependency tree and out of the SBOM of everyone who does not use the plugin.

It has to be a `peerDependency` with `peerDependenciesMeta.optional`, the same as `firebase`, `mongodb` and `nats`. That is the breaking part: people who use `rxdb/plugins/encryption-crypto-js` have to install `crypto-js` themselves.

These things have to be handled:

- **`crypto-js` has to stay a `devDependency`.** `src/plugins/test-utils/config.ts` imports `wrappedKeyEncryptionCryptoJsStorage`, so the test utils pull the plugin in and the repo's own test suite needs the package present. The test utils also ship inside the npm package, so anyone importing `rxdb/plugins/test-utils` needs `crypto-js` installed as well, which is worth a line in the changelog.
- **Check what `test:deps` does with it.** The script runs `dependency-check` with `--no-dev` over `./dist/cjs/plugins/encryption-crypto-js/index.js`. Verify whether a `peerDependency` counts as satisfying the import. If it does not, add `--ignore-module crypto-js` next to the existing `ws` and `graphql` entries.
- **The import is static and `encryptString()` / `decryptString()` are synchronous.** Without the package installed the plugin throws at import time with a module resolution error rather than an RxDB error. Turning it into a lazy `import()` would make the whole encryption path async, which is a much larger change, so the static import is probably worth keeping. Decide whether a clearer error is needed instead, for example a check in the plugin's `init` that throws a dedicated error code.

Open question, not decided: whether the free plugin should keep using `crypto-js` at all. `encryptString()` calls `AES.encrypt(value, password)` with the password as a string, which makes crypto-js derive the key with the OpenSSL compatible scheme (MD5, one iteration) and produce unauthenticated AES-CBC. `MINIMUM_PASSWORD_LENGTH` is `8`. The [encryption docs](https://rxdb.info/encryption.html) now carry a warning that points security relevant users at `encryption-web-crypto`. Moving the free plugin to the Web Crypto API as well, or deprecating it, is a separate decision and a separate breaking change, because it changes the ciphertext format and makes existing stored data unreadable without a migration.

## Enable enum-compression in the key-compression plugin

`jsonschema-key-compression` can store the value of a property as the index of that value inside of the `enum` of the property. With the enum `['admin', 'editor', 'viewer']` the value `'editor'` is stored as the number `1`. It is opt-in with the fourth parameter of `createCompressionTable()`, exactly because turning it on changes the stored format. See https://github.com/pubkey/jsonschema-key-compression/pull/756

Only enums where every value is a string are compressed, and only when the property name has the same enum at every place where it occurs in the schema, so the gain depends on the schema. On the test object of the library it is 300 to 291 characters raw and 181 to 174 gzipped, and the gain grows with the length of the enum values.

In the next major:
- Pass `true` as the fourth parameter of the `createCompressionTable()` call in `getCompressionStateByRxJsonSchema()` in `src/plugins/key-compression/index.ts`. Nothing else in the plugin has to change, `compressObject()`, `decompressObject()`, `compressQuery()` and `createCompressedJsonSchema()` all read the enum-table from the compression-table.
- Also rename the key-compression plugin to be just called 'compression', because it then no longer compresses only the keys.

Why it is breaking, and what has to be handled:

- **Documents that are already stored keep the string value.** The compressed schema declares `type: 'number'` with the indexes as `enum` for such a field, so an old document no longer validates against it, and a query for `'editor'` is compressed to `1` and does not match it. This needs a schema version bump and a migration strategy that rewrites every document. `decompressObject()` leaves a value that is not an index untouched, so the old string should survive the read of the migration and be written back as an index, but that has to be verified against the storages, not assumed.
- **Indexes over an enum field change their stored values** from strings to numbers. The indexes are rebuilt by the migration anyway, but any code that reads an index value directly, or a `$gt`/`$lt` bound that is sent to the storage for such a field, is affected. The indexes themselves stay correctly ordered, because the library assigns them in the alphabetical order of the values.
- **`$type` and `$mod` are not transformed by `compressQuery()`.** On an enum field they would run against the number instead of the string. Decide whether to document that or to throw in dev-mode.
- **It assumes the data matches the schema.** A document that stores a number where the schema declares a string-enum cannot be told apart from an already compressed value. The schema validation plugins catch this, but they are optional, so this should at least be a dev-mode check or a line in the docs.
- It needs the `jsonschema-key-compression` release that contains enum-compression, which is not released yet.

## Replication: Add `newDocumentRevision` to the push rows

When a push request fails, RxDB sends the rows again. The write could have already reached the remote while only the response got lost, so the remote gets the same write twice. A push row has no identity that the remote could use to detect that:

```ts
{
    assumedMasterState: { id: 'todo1', name: 'Learn RxDB', done: false, _deleted: false },
    newDocumentState: { id: 'todo1', name: 'Learn RxDB', done: true, _deleted: false }
}
```

The fork document already has such an identity, its `_rev` (`<height>-<databaseInstanceToken>`, see `createRevision()` in `src/plugins/utils/utils-revision.ts`). It is stored with the document, so it is the same on each retry, also after the JavaScript process was restarted and when the rows are batched differently. But `writeDocToDocState()` in `src/replication-protocol/helper.ts` strips `_rev` and `_meta` before the rows are given to the push handler.

In the next major, a push row looks like this:

```ts
{
    assumedMasterState: { id: 'todo1', name: 'Learn RxDB', done: false, _deleted: false },
    newDocumentState: { id: 'todo1', name: 'Learn RxDB', done: true, _deleted: false },
    newDocumentRevision: '2-ipivwauvdn'
}
```

The remote stores the last applied revision of each document and skips a row when the `newDocumentRevision` of that document was already applied. This makes the push idempotent per document, which also covers a batch that was only partially written before the request died.

What has to be changed:

- **Type**: Add `newDocumentRevision: string` to `RxReplicationWriteToMasterRow` in `src/types/replication-protocol.d.ts`.
- **Upstream**: Set it in `persistToMaster()` in `src/replication-protocol/upstream.ts` from `fullDocData._rev` where `writeRowsToMaster[docId]` is created.
- **Replication plugin**: The `masterWrite()` wrapper in `src/plugins/replication/index.ts` creates a new row object when a custom `deletedField` is used. It spreads the row, so the field is kept, but add a test for it.
- **Schema migration**: `src/plugins/migration-schema/rx-migration-state.ts` calls `masterWrite()` with its own migrated rows and has to set the field too.
- **Receiving side**: `rxStorageInstanceToReplicationHandler()` in `src/replication-protocol/index.ts` is the remote of the WebRTC and WebSocket replications. Decide if its `masterWrite()` uses the revision to skip duplicates or if the comparison with the `assumedMasterState` is enough there.
- **RxServer**: The [rxdb-server](https://github.com/pubkey/rxdb-server) has to implement the duplicate detection in its replication endpoint and must have tests for it: a push that is sent twice with the same `newDocumentRevision` must only be applied once, also when the server was restarted in between and when the second request has the rows in a different batch.
- **GraphQL**: `graphQLSchemaFromRxSchema()` has to add the field to the `PushRow` input type and `pushQueryBuilderFromRxSchema()` has to send it.
- **Other replication plugins**: CouchDB, Firestore, MongoDB, Supabase, Appwrite, NATS, Google Drive, and Microsoft OneDrive read the rows in their push handlers. Check that the additional field does not end up in the written document and use it for duplicate detection where the backend makes that possible.
- **Tests**: Add a test to `test/unit/replication.test.ts` where the push handler writes the rows and then throws, so that the retry has the same `newDocumentRevision`. Add one that restarts the replication between the failed and the successful push. `getPushHandler()` in `src/plugins/test-utils/replication.ts` can be used as the remote.
- **Docs**: Add a section to `docs-src/docs/replication.md` that covers how to correctly handle duplicate pushes on the remote. It replaces the vague advice in the "Error handling" section to "add a unique write id field to the document". The section must contain:
    - Why duplicates happen (retry after a lost response, restart of the app, partially written batch).
    - A backend example that stores the last applied revision per document and skips a row with a known `newDocumentRevision`, in the same transaction that writes the document.
    - What the remote returns for a skipped row. It must not return it as a conflict, otherwise the client runs the conflict handler for its own write.
    - That the revision must be used together with the primary key and how long the remote has to keep the applied revisions.
    - What to do with writes that have side effects on the remote (counters, payments, emails), because these are the cases where a duplicate does real damage.
- **Other docs**: Add the field to the push endpoint of `docs-src/docs/replication-http.md` and update the push rows that are shown in `replication-graphql.md`, `rx-server.md`, and `migration-schema.md`. Mention it in the release notes of the major as a breaking change for custom backends.

Why it is breaking, and what has to be handled:

- **The rows get a new field.** Remotes that validate the rows strictly reject it, for example a GraphQL input type like `HumanInputPushRow` or a schema validation on the server.
- **The revision is only unique per document.** The remote has to use the primary key together with the revision. The height starts at `1` again when a deleted document was purged by the cleanup plugin and is inserted again with the same primary key on the same device, so the remote must not keep the applied revisions forever.
- **Rows that are changed by the `push.modifier`** keep the revision of the unmodified fork document. Decide if that is documented or if the modifier also gets the revision.
- **Conflicts**: When the conflict handler resolves a conflict, the resolved document is written to the fork with a new revision and pushed as a new row. This must not be detected as a duplicate, which works because the revision height is increased.

A non-breaking variant was tried in [#9463](https://github.com/pubkey/rxdb/pull/9463). It called the `push.handler` with a second argument that contained a random `requestId` which was the same on all retries of a request. It was dropped because the `requestId` was only kept in memory: After a restart of the app the same writes are pushed with a new `requestId`, and the rows can be batched differently so that the same request no longer exists.

---------------------------------
## Maybe later (not sure if should be done)


## Do not allow type mixing

In the RxJsonSchema, a property of a document can have multiple types like

```ts
{
    type?: JsonSchemaTypes | JsonSchemaTypes[];
}
```

This is bad and should not be used. Instead each field must have exactly one type.
Having mixed types causes many confusion, for example when the type is `['string', 'number']`,
you could run a query selector like `$gt: 10` where it now is not clear if the string `foobar` is matching or not.

## RxStorage: Add RxStorage.info() which also calls parents

Having an .info() method helps in debugging stuff and sending reports on problems etc.


## Rename "RxDB Premium" to "RxDB Enterprise"

Most "normal" users do not need premium access so we should name it "RxDB Enterprise" to make it more clear that it is intended to bought by companies.


## Refactor data-migrator

 - Migration strategies should be defined [like in WatermelonDB](https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html) with a `toVersion` version field. We should also add a `fromVersion` field so people could implement performance shortcuts by directly jumping several versions. The current migration strategies use the array index as `toVersion` which is confusing.

## RxStorage: Add a commit sequence to query results and change events

A storage can make a write visible to queries before the change event of that write reaches the RxCollection. This always happens with multiInstance (the event of another tab comes over the BroadcastChannel after the commit) and with the remote storage, so it cannot be fixed by pinning the emit timing in the RxStorage contract. When a query runs in that gap, the event is applied again on top of a result that already contains the write. The result window buffer does not tolerate this and can end up with duplicate documents or a skipped document in the result. See [#9381](https://github.com/pubkey/rxdb/pull/9381), which only covers writes of the same JavaScript process by waiting for pending `bulkWrite()` calls in `_execOverDatabase()`.

Idea:
- Each storage instance keeps a commit sequence number that is incremented in the same transaction as each `bulkWrite()`, for example in a single meta row.
- `query()` and `count()` return the sequence they have read in their read transaction: `{ documents, sequence }`.
- Each `EventBulk` contains the sequence of its write. Events from other tabs and from the remote storage carry the same number because the storage assigned it on commit.
- `__ensureEqual()` drops all events with a sequence that is lower or equal to the sequence of the current result. Then the `pendingWrites` wait and maybe the rerun loop in `_execOverDatabase()` can be removed.
- The existing `EventBulk.checkpoint` cannot be used for this because its `lwt` comes from the clock of each tab and is not ordered by commit across tabs.

Breaking for RxStorage implementations, not for RxDB users. It can be introduced as an optional field in a minor release (storages without it keep the current behavior) and be made required in the next major.

## Attachments: make the storage key of attachment data unambiguous

The memory, Dexie.js, localStorage, and FoundationDB storages build the key of the attachment data as `documentId + '||' + attachmentId`. The document `todo1` with the attachment `b||c.txt` and the document `todo1||b` with the attachment `c.txt` get the same key, so one overwrites or deletes the attachment data of the other.

Todo:
- Build the key with one shared function that cannot give the same key for two different pairs, for example by escaping `|` and `%` in both parts when the attachment id contains `||` or starts with `|`.
- This changes the key of attachments whose id contains `||` or starts with `|`. Data that was stored under the old key is no longer found, which is why it must be done in a major release. Either migrate these keys or state it in the release notes.
- The premium storages must use the same function.

An implementation with tests is in the closed pull request [#9613](https://github.com/pubkey/rxdb/pull/9613).

## RxStorage: make the name of the physical store unambiguous

The Dexie.js, localStorage, and memory storages join the database name, the collection name, and the schema version into the name of the physical store. When a name contains the separator, two different databases use the same store and see each other's documents.

- localStorage uses `<db>--<collection>--<version>`: the database `app--staging` with the collection `todos` collides with the database `app` with the collection `staging--todos`.
- Dexie.js uses `rxdb-dexie-<db>--<version>--<collection>`: `app--0--staging` with `todos` collides with `app` with `staging--0--todos`.
- The memory storage joins with `--memory--`.
- The DenoKV storage joins with `|` and the FoundationDB storage with `.`, which collides only with collection names that dev-mode rejects.

Todo:
- Build a store name that can only be split back into its parts in one way, for example with a length prefix when a name contains the separator.
- Stores of names that contain `--` get another name, so their existing data is no longer found. Either migrate these stores or state it in the release notes.
- Check the premium storages for the same kind of join.

An implementation with tests is in the closed pull request [#9616](https://github.com/pubkey/rxdb/pull/9616).

## Backup plugin: binary attachments and one folder per collection

Two defects in the backup plugin:
- Attachment data is converted to a string and written with the `utf-8` encoding, so every binary attachment (images, PDFs) in the backup is corrupted.
- The folder of a document is `<directory>/<documentId>` without the collection name. Two collections with a document of the same primary key overwrite each other's backup, and deleting the document in one collection removes the backup of the other.

Todo:
- Write attachment blobs as bytes.
- Store documents in `<directory>/<collectionName>/<documentId>/`.
- Existing backup directories have the old layout. Either migrate them or require an empty directory and state it in the release notes.

An implementation with tests is in the closed pull request [#9474](https://github.com/pubkey/rxdb/pull/9474).

## Encryption inside of key-compression stores encrypted fields in plain text

With the wrapper order `wrappedKeyCompressionStorage({ storage: wrappedKeyEncryptionCryptoJsStorage({ storage }) })`, which is the order shown in the RxStorage docs, and `keyCompression: true` in the schema, the fields listed in `encrypted` are stored in plain text. The key-compression plugin compresses the keys of the document but passes the `encrypted` paths of the schema on uncompressed, so the encryption storage does not find the fields. A nested encrypted path makes `addCollections()` throw a `TypeError`.

Todo:
- The key-compression plugin must also compress the `encrypted` paths of the schema that it passes down.
- Documents that released versions stored in plain text must stay readable and get encrypted on their next write. The encryption plugins need a tolerant read for values that are not cipher text.
- The premium Web Crypto encryption plugin gets the compressed paths then and needs the same tolerant read. This is the breaking part.
- Until this is done, the docs should tell users to wrap the key-compression inside of the encryption, or not to combine both.

An implementation with tests is in the closed pull request [#9530](https://github.com/pubkey/rxdb/pull/9530).

## dev-mode: reject indexed number fields whose range is too wide for exact index strings

The index string of a number field is built from its `minimum`, `maximum`, and `multipleOf`. When the range `maximum - minimum` is larger than `Number.MAX_SAFE_INTEGER` (with a minimum other than `0`), or the span is `1e21` or more, the index string loses precision. Different values share an index string and queries return wrong documents.

Todo:
- Throw a schema error in dev-mode at `addCollections()` for such a field. Existing schemas with such a field then no longer start in dev-mode, which is why it must be done in a major release.

An implementation with tests (error `SC44`) is in the closed pull request [#9618](https://github.com/pubkey/rxdb/pull/9618).

## CRDT: the CRDT field must be encrypted when the collection has encrypted fields

The CRDT plugin stores every operation in the CRDT field of the document. When the collection has `encrypted` fields but the CRDT field is not listed in `encrypted`, the values of the encrypted fields are stored in plain text inside of the CRDT operations.

Todo:
- Either treat the CRDT field as encrypted automatically when the schema has encrypted fields, or throw a schema error in dev-mode at `addCollections()` when the CRDT field is not listed in `encrypted`.
- Both need a new schema version with a migration for existing collections, which is why it must be done in a major release.

An implementation of the dev-mode error with tests (error `CRDT5`) is in the closed pull request [#9601](https://github.com/pubkey/rxdb/pull/9601).

## Incremental writes: reject with `VD2` instead of `COL20` on a schema validation error

With a schema validator, data that does not match the schema rejects with `VD2` on `insert()`, `upsert()`, `patch()`, `modify()`, and `update()`. The same write through `incrementalPatch()`, `incrementalModify()`, `incrementalUpdate()`, and `incrementalUpsert()` on an existing document rejects with `COL20`, because the incremental write queue maps every storage error to that code.

Todo:
- Use one shared mapping from a storage write error to an RxError for the direct write path and the incremental write queue.
- Breaking: the error code changes from `COL20` to `VD2` and the error parameters change, also for attachment writes and incremental writes of local documents.

An implementation with tests is in the closed pull request [#9708](https://github.com/pubkey/rxdb/pull/9708).

## RxStorage: memory and localStorage must report a slow count

The memory and localStorage storages report `mode: 'fast'` for a `count()` whose selector is not satisfied by the index, so `collection.count()` does not throw `QU14` in production like it does on the Dexie.js storage and in dev-mode.

Todo:
- Report `mode: 'slow'` with the same condition that the Dexie.js storage uses.
- Decide whether every storage has to report `slow` here. The SQLite trial, MongoDB, FoundationDB, and DenoKV storages return `fast` in every case.
- Breaking: such a `count()` throws `QU14` in production on these storages unless `allowSlowCount: true` is set.

An implementation with tests is in the closed pull request [#9668](https://github.com/pubkey/rxdb/pull/9668).

## Remote websocket storage: reject requests when the connection to the server is lost

When the connection to the server is lost, the client of the remote websocket storage lets pending requests hang forever. After the automatic reconnect every call rejects with `First call must be a create call`, because the server does not know the old connections any more.

Todo:
- Answer all unanswered and all later requests with an RxError and let `close` requests succeed, so that `database.close()` resolves.
- Breaking: the client no longer reconnects by itself. To continue, the database has to be closed and created again with a new storage.

An implementation with tests is in the closed pull request [#9667](https://github.com/pubkey/rxdb/pull/9667).

## Cleanup must not purge tombstones while a replication is paused

With `awaitReplicationsInSync: true`, `awaitInSync()` resolves on a paused replication. The cleanup then purges deleted documents and the deletion is never pushed to the server after `start()`.

Todo:
- Let the cleanup wait until the paused replication is started again or canceled, or the collection is closed. The cleanup of RxState has the same pattern.
- Breaking: `collection.cleanup()` and the automatic cleanup wait while a replication of the collection is paused.

An implementation with tests is in the closed pull request [#9637](https://github.com/pubkey/rxdb/pull/9637).

## Replication must wait for a pending schema migration

With `autoMigrate: false`, a replication that is started before the schema migration has finished replicates into the collection that is not migrated yet. The migration then drops the local changes that are not pushed and deleted documents come back.

Todo:
- Let the start of the replication wait until the migration of the collection is done, with a real signal from the collection (for example a promise `awaitMigration()`).
- Breaking: `awaitInitialReplication()` and `awaitInSync()` stay pending until the migration is done. Code that awaits one of them before it calls `migratePromise()` waits forever.

An implementation with tests is in the closed pull request [#9633](https://github.com/pubkey/rxdb/pull/9633).

## Attachments: `getAttachmentData()` must reject on an outdated digest on all storages

`getAttachmentData()` of the Dexie.js and localStorage storages ignores the `digest` parameter, so `getData()` on an RxAttachment object of an attachment that was replaced returns the new data. The memory storage throws a plain `Error`.

Todo:
- Reject with one RxError on all storages when the digest no longer matches the stored attachment.
- Breaking: `getData()` and `getStringData()` on an outdated RxAttachment object reject on Dexie.js and localStorage, where they returned the new data.

An implementation with tests is in the closed pull request [#9614](https://github.com/pubkey/rxdb/pull/9614).

## Attachments-compression: replicated documents must have the plain digest and length

With `attachments.compression`, a pulled document is stored in the replication state with the internal `c-` digest and the compressed length of its attachments. A backend that compares the `assumedMasterState` answers each later push with a conflict and the local change is dropped.

Todo:
- Give newly written compressed attachments the plain digest and the `length` of the uncompressed data on the RxAttachment and in replicated documents.
- Breaking: newly written compressed attachments get another digest prefix that released versions cannot read, and `RxAttachment.length` is the uncompressed size.

An implementation with tests is in the closed pull request [#9605](https://github.com/pubkey/rxdb/pull/9605).

## `RxQuery.exec()` on a closed or removed collection must reject with `COL21`

`exec()` on a query of a closed or removed collection rejects with a plain `ensureNotFalsy()` error, or resolves with the old cached result when the query was executed before.

Todo:
- Reject with `COL21`.
- Breaking: an `exec()` that resolved with the cached result of a closed collection rejects.

An implementation with tests is in the closed pull request [#9583](https://github.com/pubkey/rxdb/pull/9583).

## Incremental writes on a deleted document must reject like the non-incremental methods

`incrementalModify()`, `incrementalPatch()`, `incrementalUpdate()`, and `incrementalRemove()` write to a document that is already deleted and emit additional `DELETE` events. `modify()`, `patch()`, and `remove()` reject with `DOC11` and `DOC13`. Attachment writes and incremental writes of a deleted local document have the same problem.

Todo:
- Put one check into the `IncrementalWriteQueue`: when the state that a modifier runs on is deleted and the modifier keeps it deleted, reject that write with `DOC11`. `incrementalUpsert()`, `bulkUpsert()`, and `upsertLocal()` must still be able to insert a deleted document again.
- Breaking: these calls reject on a deleted document.
- The attachment case has its own pull request [#9686](https://github.com/pubkey/rxdb/pull/9686), which is covered by this one.

An implementation with tests is in the closed pull request [#9558](https://github.com/pubkey/rxdb/pull/9558).

## Wrong range query results for string bounds with astral characters or more code units than `maxLength`

Range queries on indexed string fields return wrong documents on the storages with custom index strings (memory, localStorage, and others) when the queried value contains astral characters like emojis or is longer than the `maxLength` of the field.

Todo:
- Fix the bounds in the query planner. The stored index strings do not have to change.
- Breaking: `count()` with such a bound becomes a slow count and throws `QU14` without `allowSlowCount: true`.

An implementation with tests is in the closed pull request [#9554](https://github.com/pubkey/rxdb/pull/9554).

## Queries on optional index fields must not return documents without the field

Queries and `count()` on an optional index field return documents that do not have the field, for example with `{ priority: 0 }`, `{ priority: { $lt: 5 } }`, or `{ dueAt: '' }`, on storages that use the custom index strings (memory, localStorage).

Todo:
- The query planner must not treat the selector as satisfied by the index when the index range can contain documents without the field. The stored index strings do not have to change.
- Breaking: `count()` with such a selector becomes a slow count and throws `QU14` without `allowSlowCount: true`. Before, it returned a count that was too high.

An implementation with tests is in the closed pull request [#9531](https://github.com/pubkey/rxdb/pull/9531).

## `preSave` hook must get the RxDocument as second parameter

The `preSave` hook gets the plain previous document data as second parameter and not the RxDocument instance as typed and documented, so `rxDocument.toJSON()` or `rxDocument.get()` inside the hook throws a `TypeError`.

Todo:
- Decide whether the runtime follows the type (pass the RxDocument) or the type follows the runtime (plain data), and make `postSave` consistent between `patch()`/`modify()` and the incremental writes.
- Breaking: hooks that use the second parameter as plain data.

An implementation with tests is in the closed pull request [#9552](https://github.com/pubkey/rxdb/pull/9552).

## `importJSON()` must report documents that could not be written

`importJSON()` of the json-dump plugin resolves with the internal storage write response and ignores write errors like a document that fails the schema validation.

Todo:
- Reject when a document of the dump could not be written and resolve with `void` as typed. Conflicts with existing documents are handled by the conflict mode parameter of `importJSON()` that was added in [#9716](https://github.com/pubkey/rxdb/pull/9716), so check what is left to do.
- Breaking: an import that resolved before rejects.

An implementation with tests is in the closed pull request [#9551](https://github.com/pubkey/rxdb/pull/9551).

## Incremental writes must await `postSave` hooks

`incrementalPatch()`, `incrementalModify()`, `incrementalUpdate()`, `incrementalUpsert()`, and `incrementalRemove()` do not wait for async `postSave` hooks. An error that is thrown in a `postSave` hook becomes an unhandled promise rejection and the write call resolves.

Todo:
- Await the `postSave` hooks in the incremental write queue and reject the write call when a hook throws, like the non-incremental methods.
- Breaking: these calls take as long as their `postSave` hooks and can reject.

An implementation with tests is in the closed pull request [#9520](https://github.com/pubkey/rxdb/pull/9520).

## GraphQL replication: schema and query builders must match with `ignoreInputKeys` and `ignoreOutputKeys`

`graphQLSchemaFromRxSchema()` and `pushQueryBuilderFromRxSchema()` do not match when `ignoreInputKeys` or `ignoreOutputKeys` are set.

Todo:
- Build the `PullBulk` documents type from the output schema and do not select the `ignoreOutputKeys` fields in the push mutation.
- Breaking: the generated schema and query change for users of these options, so the server schema has to be generated again.

An implementation with tests is in the closed pull request [#9535](https://github.com/pubkey/rxdb/pull/9535).

## GraphQL replication: `pullStreamBuilderFromRxSchema()` must create a valid query without `headerFields`

Without `headerFields`, `pullStreamBuilderFromRxSchema()` creates a subscription query with a `$headers` variable of a type that is not defined, so the query is invalid against the schema of `graphQLSchemaFromRxSchema()`.

Todo:
- Do not declare `$headers` and do not pass the `headers` argument when no `headerFields` are set.
- Breaking: the generated query string changes.

An implementation with tests is in the closed pull request [#9533](https://github.com/pubkey/rxdb/pull/9533).

## Throw `DB1` when a database with a password is opened without a password

The password check compares the stored password hash only when the new instance has a password. A database that was created with a password can be opened again without one and no `DB1` is thrown.

Todo:
- Run the comparison in both directions. The stored format does not have to change and `removeRxDatabase()` without a password must still work.
- Breaking: code that opens such a database without the password throws.

An implementation with tests is in the closed pull request [#9483](https://github.com/pubkey/rxdb/pull/9483).

## `migrateStorage()` must not delete documents that could not be written to the new storage

`migrateStorage()` does not look at the write errors of the new storage. Every document of a batch is marked as deleted in the old storage and purged. Documents that the new storage rejected, for example with a 422 from a schema validation wrapper, exist nowhere afterwards.

Todo:
- Keep documents with a write error other than 409 in the old storage, migrate the rest of the batch, and reject with an RxError. A 409 still counts as already migrated, so that an interrupted run can resume.
- Breaking: a `migrateStorage()` call that resolved before can reject.

An implementation with tests is in the closed pull request [#9473](https://github.com/pubkey/rxdb/pull/9473).

## `insert()` must not accept an RxDocument instance

The typings of `insert()` and `insertIfNotExists()` allow `RxDocumentType | RxDocument`. Passing an RxDocument never worked: dev-mode throws `DOC24`, and without dev-mode the instance properties of the RxDocument are stored under the primary key `undefined`.

Todo:
- Remove `| RxDocument` from both signatures and let dev-mode throw a clear error (`COL1`) for JavaScript users and casts.
- Breaking: code that passes an RxDocument no longer compiles.

An implementation with tests is in the closed pull request [#9529](https://github.com/pubkey/rxdb/pull/9529).

## Wrong query results for bounds that the custom index string cannot represent exactly

On storages that use the custom index strings (memory, localStorage), the query planner marks a selector as satisfied by the index although the bound string is lossy, so the storage skips the query matcher. For example `{ priority: { $gte: 5.5 } }` on an indexed integer field returns the document with `5`.

Todo:
- Do not mark the selector as satisfied by the index when the bound cannot be represented exactly, so that the query matcher runs.
- Breaking: a `count()` with such a bound becomes a slow count and throws `QU14` without `allowSlowCount: true`. Before, it returned a wrong count.

An implementation with tests is in the closed pull request [#9469](https://github.com/pubkey/rxdb/pull/9469).

## An empty operator object on an indexed field must not return all documents

A query like `{ selector: { field: {} } }` returns all documents when `field` is indexed or the primary key and no documents when it is not indexed. The query planner treats an operator object without operators as fully answered by the index.

Todo:
- Do not mark such a selector as satisfied by the index, so that the query matcher decides and the result is the same with and without an index.
- Breaking: code that builds the operator object conditionally and relies on an empty object meaning "no filter" on an indexed field gets no documents.

An implementation with tests is in the closed pull request [#9617](https://github.com/pubkey/rxdb/pull/9617).

## `upsert()`, `bulkUpsert()`, and `insertIfNotExists()` must not run the `preInsert` hooks for existing documents

`bulkUpsert()` always tries an insert first, and the insert runs the `preInsert` hooks before the storage says whether the row is new. So `upsert()`, `bulkUpsert()`, and `insertIfNotExists()` run the `preInsert` hooks for a document that already exists. A hook that throws to stop inserts blocks the update of an existing document. `incrementalUpsert()` does not run them.

Todo:
- Run the insert hooks only for the documents that are inserted.
- Breaking: collections whose `preInsert` hooks have side effects or throw no longer get them on an upsert of an existing document.

An implementation with tests is in the closed pull request [#9707](https://github.com/pubkey/rxdb/pull/9707).

## `incrementalUpsert()` after remove and cleanup must not write on top of the cached deleted document

`incrementalUpsert()` has a shortcut that takes the document from the document cache, also when it is deleted. After `cleanup()` the storage no longer has that tombstone, so the write uses a previous state that the storage does not know. On localStorage that gives a `TypeError` and a document that cannot be read or written any more, on other storages a wrong revision height.

Todo:
- Use the shortcut only when the cached document is not deleted. Otherwise run the same path as after a restart, like `upsert()` does.
- Breaking: `incrementalUpsert()` on a removed document that is still in the cache runs the `preInsert` and `postInsert` hooks, where it ran `preSave` and `postSave` before.

An implementation with tests is in the closed pull request [#9638](https://github.com/pubkey/rxdb/pull/9638).

## Deleted documents must not keep attachment stubs

Deleted documents keep their `_attachments` stubs although the storage removes the attachment data on delete. One deleted document that had an attachment makes a schema migration fail with `DM4` on every start, and it also breaks the replication push and a re-insert of the document.

Todo:
- Store deleted documents with an empty `_attachments` object.
- Breaking: a deleted document no longer exposes attachment stubs.

An implementation with tests is in the closed pull request [#9471](https://github.com/pubkey/rxdb/pull/9471).

## No `DELETE` event for a write on an already deleted document

A write that replaces a deleted document with another deleted state, like a replication pull of a changed tombstone, emits a second `DELETE` event on `collection.$` and `remove$` and makes EventReduce drop a document from the results of queries with `skip`.

Todo:
- Do not emit a `DELETE` event on `collection.$`, `database.$`, and `remove$` for a write from a deleted state to another deleted state. `eventBulks$` and the `changeStream()` of the storage stay unchanged.
- Breaking: code that counts on these events.

An implementation with tests is in the closed pull request [#9586](https://github.com/pubkey/rxdb/pull/9586).

## `remove()` must run all `onRemove` handlers and remove the data when one handler throws

`collection.remove()` and `database.remove()` skip the remaining `onRemove` handlers and leave the stored data in place when one `onRemove` handler throws.

Todo:
- Run all handlers, remove the data, and then reject with the first handler error.
- Breaking: the data is removed where it stayed before.

An implementation with tests is in the closed pull request [#9590](https://github.com/pubkey/rxdb/pull/9590).

## Observables of a closed collection must complete

The observables of a closed or removed RxCollection (`$`, `insert$`, `update$`, `remove$`, `eventBulks$`, `checkpoint$`) do not complete, and they emit the change events of a collection with the same name that is added again with `addCollections()`. Documents of the closed collection also get the data of the new collection from `getLatest()`.

Todo:
- Complete the observables of a collection on `close()` and `remove()`, the same as the streams of RxDatabase do on `close()`. `RxQuery.$` already completes since [#9658](https://github.com/pubkey/rxdb/pull/9658).
- Breaking: subscribers get `complete`.

An implementation with tests is in the closed pull request [#9564](https://github.com/pubkey/rxdb/pull/9564).

## The first value of a later `RxQuery.$` subscriber must be the current result

`query.$` replays the last result object to every later subscriber. When a write is awaited and a second subscriber then subscribes, the shared update of the query can still be running or throttled, so the first value of that subscriber is the result from before the write.

Todo:
- Let each subscriber run the same check as `exec()` once on subscribe. Emit synchronously only when the cached result is current.
- Breaking: the timing of the first value changes. A later subscriber can get its first value asynchronously, and a query that only ran `exec()` gives its first subscriber the value synchronously.

An implementation with tests is in the closed pull request [#9702](https://github.com/pubkey/rxdb/pull/9702).

## CouchDB replication: a push must not overwrite a deletion on the server

The CouchDB replication push creates a document again that was deleted on the CouchDB server and does not handle the deletion as a conflict. It also writes a broken conflict state when the document gets deleted on the server during the push.

Todo:
- Handle a local write to a document that is deleted on the server as a conflict.
- Breaking: with the default conflict handler the local document gets deleted, where it was created again on the server before.

An implementation with tests is in the closed pull request [#9576](https://github.com/pubkey/rxdb/pull/9576).

## CouchDB replication: long polling when `live` is not set

The CouchDB replication does not start the long polling of the changes feed when the `live` option is not set, although `live` defaults to `true`. Also `pause()` does not stop the long polling, and `start()` after `pause()` starts additional parallel long polling requests.

Todo:
- Run the long polling when `live` is omitted, stop it on `pause()`, and run one loop per replication state.
- Breaking: replications that omit `live` start to send `_changes?feed=longpoll` requests.

An implementation with tests is in the closed pull request [#9542](https://github.com/pubkey/rxdb/pull/9542).

## Replication: retry with `retryTime: 0` and a growing default retry time

A replication with `retryTime: 0` stops retrying after the first failed pull or push handler call, so `awaitInitialReplication()` and `awaitInSync()` never resolve. The default retry time is a constant 5 seconds.

Todo:
- Retry also with `retryTime: 0`. Without a `retryTime`, start at 200 ms and grow by the factor 1.3 on each consecutive failure up to 5 seconds, like the reconnect of the websocket replication. An explicit `retryTime` stays constant.
- Decide whether the GraphQL, CouchDB, Firestore, MongoDB, Supabase, NATS, Appwrite, Google Drive, and OneDrive plugins, which set their own default of 5 seconds, use the growing default too.
- Breaking: a backend that is down gets more requests in the first 20 seconds, and `replicationState.retryTime` is `undefined` when the option is not set.

An implementation with tests is in the closed pull request [#9527](https://github.com/pubkey/rxdb/pull/9527).

## Replication must not drop a pulled master state while the push of the same document is running

The downstream skips a pulled document whose fork state differs from the assumed master state and still stores the checkpoint. When the push of that document is running and gets accepted, the newer master state is never pulled again and the client reports in-sync with an outdated document.

Todo:
- Let the skip branch wait for the upstream queue and read the fork state and the assumed master state again.
- Breaking: the pull waits for the push of that document. With a push handler that fails forever, the pull stops at that document.

An implementation with tests is in the closed pull request [#9625](https://github.com/pubkey/rxdb/pull/9625).

## Replication: the marker of a resolved conflict must use the stored revision

The upstream stores the revision of the resolved document as `isResolvedConflict` marker before the write. With `replicateRxCollection()` the storage wrapper of the collection replaces `_rev` on that write, so the marker never matches and a resolved push conflict is not pushed again. When the master changed again in between, the client stays on the outdated master state.

Todo:
- Use the `_rev` that was stored as marker.
- Breaking: after every resolved push conflict the resolved document is pushed once more, which is one more push handler call and `sent$` emission per conflict.

An implementation with tests is in the closed pull request [#9623](https://github.com/pubkey/rxdb/pull/9623).

## Replication: a push conflict with an equal master state must not rewrite the fork document

When a push is answered with a conflict although the master already has the pushed state, the upstream writes the same content to the fork again with a new revision. With three instances that replicate with each other, like in the WebRTC replication, that revision change makes one instance answer a correct push with a conflict, and the states are pushed around without end.

Todo:
- For such a conflict, only store the master state in the replication meta data.
- Breaking: `conflict$` emits the existing fork document as `output` and `resolve()` of the conflict handler is not called for a conflict with equal states.

An implementation with tests is in the closed pull request [#9677](https://github.com/pubkey/rxdb/pull/9677).

## GraphQL replication must reopen the pull stream after the websocket client gave up

When the `graphql-ws` client has used up its connection retries or the socket is closed with a fatal close code, the plugin puts the error on the pull stream. An errored stream is not observed any more, so the live pull never continues when the server comes back.

Todo:
- Emit the error on `error$` as an RxError (`RC_STREAM`), wait `retryTime`, open the stream again, and send a `RESYNC`.
- Breaking: `error$` gets one `RC_STREAM` RxError per failed cycle, where it got one plain close or error event before.

An implementation with tests is in the closed pull request [#9676](https://github.com/pubkey/rxdb/pull/9676).

## CRDT: a schema migration must not keep the old CRDT operations

A schema migration runs the migration strategies on the document data but keeps the stored CRDT operations of the old schema. The migrated document then no longer equals the replay of its operations. In dev-mode the next write throws `SNH`, and without dev-mode a merge rebuilds the state from before the migration.

Todo:
- Replace the operations of a document that the migration changed by one operation that sets the migrated state.
- Breaking: the operation history of such a document is dropped.

An implementation with tests is in the closed pull request [#9688](https://github.com/pubkey/rxdb/pull/9688).

## CRDT: changes of `preInsert` and `preSave` hooks must be part of the CRDT operations

The CRDT operation of a write is built before the `preInsert` and `preSave` hooks run. A change that a hook makes is stored in the document but not in the operations. In dev-mode the next write throws `SNH`, and without dev-mode the change of the hook is reverted on the next merge.

Todo:
- Create the operation after the hooks have run, or append one more operation with the changes of the hooks, for all write paths.
- Breaking: a write whose hook changes data stores one more operation. A `preSave` hook that sets a timestamp on every write doubles the number of stored operations.

An implementation with tests is in the closed pull request [#9689](https://github.com/pubkey/rxdb/pull/9689).

## CRDT: the conflict handler must handle attachments

The conflict handler of the CRDT plugin compares two document states only by the hash of their operations. A change of an attachment adds no operation, so the states count as equal, the attachment is never pushed, and the next pull replaces the document by the master state without the attachment.

Todo:
- Compare the attachments too and merge them per attachment id against the assumed master state.
- Breaking: attachment changes on CRDT collections are replicated, and the handler can throw a new error when it cannot keep an attachment of the master.

An implementation with tests is in the closed pull request [#9690](https://github.com/pubkey/rxdb/pull/9690).
