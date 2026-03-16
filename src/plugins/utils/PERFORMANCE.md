# Performance-Relevant Functions in `src/plugins/utils`

This document lists all exported functions from the `src/plugins/utils` module and their performance relevance.
Functions are categorized by their performance impact based on how frequently they are called in hot code paths
(write operations, read operations, query execution, document caching).

## Performance Classification

- **CRITICAL**: Called inside `@hotPath` functions or per-document loops during bulk operations. Any regression here directly impacts throughput.
- **HIGH**: Called frequently in core database operations (queries, writes, reads) but not in the tightest inner loops.
- **MEDIUM**: Called during database/collection setup, schema processing, or infrequent operations where performance matters but is not the bottleneck.
- **LOW**: Called rarely (initialization, error handling, testing utilities). Performance is not a concern.

## Performance Table

### `utils-revision.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `getHeightOfRevision` | **CRITICAL** | 5 | Annotated `@hotPath`. Called per-document in `doc-cache.ts` (`getCachedRxDocumentMonad`) and `categorizeBulkWriteRows`. Uses `indexOf` + `charCodeAt` fast path for single-digit heights to avoid `parseInt`. |
| `createRevision` | **CRITICAL** | 10 | Called per-document during every write operation in `categorizeBulkWriteRows`. Internally calls `getHeightOfRevision`. |
| `parseRevision` | **LOW** | 0 | Not used in production code. Kept for external consumers. Use `getHeightOfRevision` instead when only height is needed. |

### `utils-object.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `flatClone` | **CRITICAL** | 39 | Called per-document in `categorizeBulkWriteRows` (`@hotPath`) and across most storage plugin write paths. Uses `Object.assign({}, obj)` for ~3x faster than `deepClone`. |
| `clone` / `deepClone` | **CRITICAL** | 22 | Called in query normalization, document processing, and storage operations. Performance comment in source: "do not change without running performance tests!" Uses manual recursion instead of `JSON.parse(JSON.stringify())`. |
| `objectPathMonad` | **CRITICAL** | 3 | Used in `getIndexableStringMonad` (`@hotPath`) for index string generation and in `rx-query-helper.ts` for query field access. Pre-computes property access path for reuse, with fast path for single-segment paths. |
| `overwriteGetterForCaching` | **HIGH** | 4 | Replaces getters with cached values on first access. Used in schema and query objects to avoid repeated computation. |
| `sortObject` | **MEDIUM** | 2 | Used in schema normalization. Called during setup, not in hot loops. |
| `flattenObject` | **LOW** | 1 | Minimal usage. |
| `deepFreeze` | **MEDIUM** | Used in dev mode | Freezes objects recursively. Only active in development mode for immutability checks. |
| `firstPropertyNameOfObject` | **LOW** | 1 | Minimal usage. |
| `firstPropertyValueOfObject` | **LOW** | 1 | Minimal usage. |
| `getFromObjectOrThrow` | **LOW** | Low | Error-path utility. |
| `hasDeepProperty` | **LOW** | Low | Used in schema validation. |
| `findUndefinedPath` | **LOW** | Low | Used in schema validation. |

### `utils-object-deep-equal.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `deepEqual` | **HIGH** | 11 | Copied from `fast-deep-equal` to avoid ESM/optimization bailout issues. Used in change detection, query result comparison, and storage plugins. Performance-sensitive due to frequency of comparisons. |

### `utils-object-dot-prop.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `getProperty` | **CRITICAL** | 9 | Used in `rx-document.ts` `basePrototype.get()` (`@hotPath`). Called on every document property access. Handles dot-notation path traversal. |
| `setProperty` | **MEDIUM** | 4 | Used in `fillObjectWithDefaults` (`@hotPath` in `rx-schema-helper.ts`). |
| `hasProperty` | **LOW** | Low | Not in hot paths. |
| `deleteProperty` | **LOW** | Low | Not in hot paths. |
| `deepKeys` | **LOW** | Low | Not in hot paths. |

### `utils-map.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `getFromMapOrCreate` | **CRITICAL** | 26 | Core caching primitive. Used in query cache, doc cache, event-reduce, and storage helpers. Avoids redundant `Map.has()` + `Map.get()` calls by combining lookup and creation. |
| `getFromMapOrThrow` | **HIGH** | 11 | Used to retrieve collections, storage instances, and other registered objects. Called frequently in database operations. |

### `utils-time.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `now` | **CRITICAL** | 30 | Called per-document during writes to generate `_meta.lwt` timestamps. Guarantees monotonically increasing values. Uses `Math.round` instead of `parseFloat(toFixed())` to avoid string conversion. |

### `utils-promise.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `PROMISE_RESOLVE_TRUE` | **HIGH** | ~35 (all constants) | Reused resolved promise constants avoid creating new `Promise.resolve()` each time. Used across many core operations. |
| `PROMISE_RESOLVE_FALSE` | **HIGH** | (shared count) | Same as above. |
| `PROMISE_RESOLVE_NULL` | **HIGH** | (shared count) | Same as above. |
| `PROMISE_RESOLVE_VOID` | **HIGH** | (shared count) | Same as above. |
| `requestIdlePromise` | **MEDIUM** | 13 | Queued idle callback scheduling. Used for background cleanup and non-urgent tasks. |
| `requestIdleCallbackIfAvailable` | **MEDIUM** | Low | Fire-and-forget idle scheduling. |
| `nextTick` | **MEDIUM** | 3 | Used for microtask scheduling. |
| `toPromise` | **MEDIUM** | Low | Used to normalize sync/async return values. |
| `isPromise` | **LOW** | Low | Type-checking utility. |
| `promiseWait` | **LOW** | Low | Delay utility, mostly for tests. |
| `promiseSeries` | **LOW** | Low | Serial promise execution. |

### `utils-document.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `getDefaultRxDocumentMeta` | **HIGH** | 5 | Called during document creation to generate default `_meta` fields. |
| `stripMetaDataFromDocument` | **MEDIUM** | 1 | Removes internal fields. Low usage count. |
| `areRxDocumentArraysEqual` | **MEDIUM** | 1 | Optimized array comparison using only ids/revisions (faster than deep equal). |
| `sortDocumentsByLastWriteTime` | **LOW** | Low | Sorting utility. |
| `getSortDocumentsByLastWriteTimeComparator` | **LOW** | Low | Comparator factory. |
| `toWithDeleted` | **LOW** | 0 | Not used in production code currently. |
| `getDefaultRevision` | **LOW** | Low | Returns static string. |

### `utils-hash.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `defaultHashSha256` | **MEDIUM** | 2 | Default hash function. Used when no custom hash is provided. Async (uses native crypto). |
| `hashStringToNumber` | **LOW** | 1 | Simple hash for load balancing. Minimal usage. |

### `utils-other.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `ensureNotFalsy` | **HIGH** | 63 | Most-used utility function. Runtime assertion that throws on falsy values. Inlined by most JS engines due to simplicity. Used across all core modules. |
| `RXJS_SHARE_REPLAY_DEFAULTS` | **MEDIUM** | Low | Configuration constant for RxJS operators. |
| `ensureInteger` | **LOW** | Low | Validation utility. |
| `runXTimes` | **LOW** | Low | Iteration utility, mostly for tests. |
| `nameFunction` | **LOW** | 1 | Debugging utility for stack traces. |
| `customFetchWithFixedHeaders` | **LOW** | Low | HTTP utility. |

### `utils-array.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `lastOfArray` | **HIGH** | 12 | Frequently used to get the last element. Simple `arr[arr.length - 1]` access. |
| `toArray` | **HIGH** | 16 | Normalizes single values to arrays. Used in query processing and event handling. |
| `isMaybeReadonlyArray` | **MEDIUM** | 6 | Array type check used in schema and query processing. |
| `countUntilNotMatching` | **MEDIUM** | Low | Used in index-related computations. |
| `batchArray` | **MEDIUM** | 3 | Used for chunking bulk operations. |
| `uniqueArray` | **LOW** | 1 | Deduplication utility. |
| `arrayFilterNotEmpty` | **LOW** | 1 | Type guard for filtering. |
| `sumNumberArray` | **LOW** | Low | Aggregation utility. |
| `maxOfNumbers` | **LOW** | Low | Aggregation utility. |
| `shuffleArray` | **LOW** | Low | Randomization, not in hot paths. |
| `randomOfArray` | **LOW** | Low | Randomization, not in hot paths. |
| `removeOneFromArrayIfMatches` | **LOW** | Low | Conditional removal. |
| `isOneItemOfArrayInOtherArray` | **LOW** | Low | Set intersection check. |
| `asyncFilter` | **LOW** | Low | Async array filtering. |
| `sortByObjectNumberProperty` | **LOW** | Low | Comparator factory. |

### `utils-string.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `randomToken` | **MEDIUM** | 24 | Used for generating database/collection instance tokens. Called during setup, not in hot loops. |
| `trimDots` | **LOW** | 3 | String cleanup utility. |
| `lastCharOfString` | **LOW** | Low | Single character access. |
| `ucfirst` | **LOW** | Low | Capitalization utility. |
| `isFolderPath` | **LOW** | Low | Path detection. |
| `arrayBufferToString` | **LOW** | Low | Encoding utility. |
| `stringToArrayBuffer` | **LOW** | Low | Encoding utility. |
| `normalizeString` | **LOW** | Low | Whitespace normalization. |

### `utils-base64.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `b64EncodeUnicode` | **LOW** | 1 | Base64 encoding. Minimal usage. |
| `b64DecodeUnicode` | **LOW** | 1 | Base64 decoding. Minimal usage. |
| `arrayBufferToBase64` | **LOW** | Low | Binary encoding. |
| `base64ToArrayBuffer` | **LOW** | Low | Binary decoding. |

### `utils-blob.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `createBlob` | **LOW** | Low | Blob construction. |
| `createBlobFromBase64` | **LOW** | Low | Blob construction. |
| `blobToString` | **LOW** | Low | Blob reading. |
| `blobToBase64String` | **LOW** | Low | Blob reading. |

### `utils-regex.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `REGEX_ALL_DOTS` | **LOW** | Low | Pre-compiled regex constant. |
| `REGEX_ALL_PIPES` | **LOW** | Low | Pre-compiled regex constant. |

### `utils-error.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `pluginMissing` | **LOW** | 4 | Error construction. Only called on failure paths. |
| `errorToPlainJson` | **LOW** | 9 | Error serialization. Only called on failure paths. |

### `utils-number.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `randomNumber` | **LOW** | Low | Random generation. Not in hot paths. |

### `utils-global.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `RXDB_UTILS_GLOBAL` | **LOW** | Low | Global mutable state object for plugins. |

### `utils-premium.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `hasPremiumFlag` | **LOW** | Low | One-time check. |

### `utils-rxdb-version.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `RXDB_VERSION` | **LOW** | 13 | Static string constant. No runtime cost. |

## Summary: Functions That Matter Most for Performance

These are the functions where optimization or regression has the highest impact on RxDB throughput:

| Rank | Function | Module | Why It Matters |
|---|---|---|---|
| 1 | `getHeightOfRevision` | utils-revision | Called per-document in doc cache and bulk writes. Uses charCodeAt fast path. |
| 2 | `flatClone` | utils-object | Called per-document in every bulk write operation. |
| 3 | `now` | utils-time | Called per-document during writes for timestamps. Must be monotonic. |
| 4 | `objectPathMonad` | utils-object | Generates reusable field accessors for index strings and queries. |
| 5 | `getProperty` | utils-object-dot-prop | Called on every RxDocument property access via `.get()`. |
| 6 | `getFromMapOrCreate` | utils-map | Core caching primitive across query cache, doc cache, and event processing. |
| 7 | `createRevision` | utils-revision | Called per-document during writes. |
| 8 | `clone` / `deepClone` | utils-object | Called in query normalization and document processing. Manual recursion for speed. |
| 9 | `deepEqual` | utils-object-deep-equal | Change detection and query result comparison. Copied from fast-deep-equal for ESM compatibility. |
| 10 | `ensureNotFalsy` | utils-other | Called 63+ times across source. Inlined by engines but still the most-called utility. |
| 11 | `PROMISE_RESOLVE_*` | utils-promise | Reused resolved promises avoid GC pressure from creating new ones per operation. |
| 12 | `getFromMapOrThrow` | utils-map | Frequent map lookups in core database operations. |
| 13 | `lastOfArray` | utils-array | Frequent array access in event and query processing. |
| 14 | `toArray` | utils-array | Called in query and event processing paths. |
| 15 | `setProperty` | utils-object-dot-prop | Used in `fillObjectWithDefaults` (`@hotPath`). |
