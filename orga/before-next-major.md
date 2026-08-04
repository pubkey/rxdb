# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.

## Limit the maximum length of indexed strings [DONE]

Some people set a really big value like `10000000` for convenience. But this will break on some storages or cause really bad performance. Indexed strings should have a limit of like 500 chars because otherwise it makes no sense to index them anyways. Add this check in dev-mode.


## Do not require WeakRef types [DONE]

This is just another painful setup step. Find a way to not require devs to add the WeakRef types here: https://rxdb.info/tutorials/typescript.html#known-problems

## no longer ship the dist-folder in the repo [DONE]

Same for /docs, use a different branch for that.

## Add `context` string to all write errors [DONE]
We already pass the context string to `storageInstance.bulkWrite()` and when we include it into bulk-write errors, debugging becomes way easier.

## (premium) Add databaseNamePrefix to premium sqlite storage [DONE]

## (premium) Merge memory-mapped fix BREAKING: deleted docs must be purged [DONE]

https://github.com/pubkey/rxdb-premium-dev/pull/480

## (premium) Merge OPFS fix BREAKING: FIX memory and cleanup leak [DONE]

https://github.com/pubkey/rxdb-premium-dev/pull/477

## `toggleOnDocumentVisible` should default to `true` [DONE]

https://github.com/pubkey/rxdb/issues/6810

## Final fields should not be automatically required [done]

https://discord.com/channels/969553741705539624/1237000453791678487/threads/1327921349808885831

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
