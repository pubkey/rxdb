# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.

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

## Add enum-compression to the key-compression plugin
- Also rename the key-compression plugin to be just called 'compression'

## RxStorage: Add RxStorage.info() which also calls parents

Having an .info() method helps in debugging stuff and sending reports on problems etc.


## Rename "RxDB Premium" to "RxDB Enterprise"

Most "normal" users do not need premium access so we should name it "RxDB Enterprise" to make it more clear that it is intended to bought by companies.


## Refactor data-migrator

 - Migration strategies should be defined [like in WatermelonDB](https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html) with a `toVersion` version field. We should also add a `fromVersion` field so people could implement performance shortcuts by directly jumping several versions. The current migration strategies use the array index as `toVersion` which is confusing.
