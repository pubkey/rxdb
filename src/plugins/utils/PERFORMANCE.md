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
| `getHeightOfRevision` | **CRITICAL** | 5 | Annotated `@hotPath`. Called per-document in `getCachedRxDocumentMonad` (`doc-cache.ts`) and `categorizeBulkWriteRows` (`rx-storage-helper.ts`). Uses `indexOf` + `charCodeAt` fast path for single-digit heights to avoid `parseInt`. |
| `createRevision` | **CRITICAL** | 10 | Called per-document during every write operation in `categorizeBulkWriteRows`. Internally calls `getHeightOfRevision`. |
| `parseRevision` | **LOW** | 0 | Not used in production code. Kept for external consumers. Use `getHeightOfRevision` instead when only height is needed. |

### `utils-object.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `flatClone` | **CRITICAL** | 39 | Called per-document in `categorizeBulkWriteRows` (`@hotPath`) and across most storage plugin write paths. Uses spread `{ ...obj }` (~4x faster than `Object.assign` in V8). |
| `clone` / `deepClone` | **CRITICAL** | 22 | Called in query normalization, document processing, and storage operations. Performance comment on `deepClone`: "do not change without running performance tests!" Uses manual recursion instead of `JSON.parse(JSON.stringify())`. `clone` is an alias for `deepClone`. Collapsed entry checks, moved Blob check after Array check for the common case. |
| `objectPathMonad` | **CRITICAL** | 3 | Used in `getIndexableStringMonad` (`@hotPath`) for index string generation and in `rx-query-helper.ts` for query field access. Pre-computes property access path for reuse. Has fast paths for 1-segment and 2-segment paths (most common cases). Uses `=== undefined` for faster checks. |
| `overwriteGetterForCaching` | **HIGH** | 4 | Replaces getters with cached values on first access. Uses a value descriptor instead of a getter descriptor so subsequent reads are direct property lookups (~37% faster reads). Used in schema and query objects. |
| `sortObject` | **MEDIUM** | 2 | Used in schema normalization. Called during setup, not in hot loops. |
| `flattenObject` | **LOW** | 1 | Minimal usage. |
| `deepFreeze` | **MEDIUM** | 14 | Freezes objects recursively. Used in doc cache, schema, and dev-mode for immutability checks. |
| `firstPropertyNameOfObject` | **LOW** | 1 | Minimal usage. |
| `firstPropertyValueOfObject` | **LOW** | 1 | Minimal usage. |
| `getFromObjectOrThrow` | **LOW** | 0 | Not used in production code. |
| `hasDeepProperty` | **LOW** | 0 | Not used in production code. |
| `findUndefinedPath` | **LOW** | 1 | Used in dev-mode query checks only. |

### `utils-object-deep-equal.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `deepEqual` | **HIGH** | 11 | Copied from `fast-deep-equal` to avoid ESM/optimization bailout issues. Uses a single combined loop for key-existence and value comparison (~17% faster for unequal objects). Used in change detection, query result comparison, and storage plugins. |

### `utils-object-dot-prop.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `getProperty` | **CRITICAL** | 9 | Used in `rx-document.ts` `basePrototype.get()` (`@hotPath`). Called on every document property access. Has fast path for simple dot-notation paths that avoids the expensive `getPathSegments()` parser (~3x faster for dot-separated paths). |
| `setProperty` | **MEDIUM** | 4 | Used in `fillObjectWithDefaults` (`@hotPath` in `rx-schema-helper.ts`). |
| `hasProperty` | **LOW** | 0 | Not used in production code. |
| `deleteProperty` | **LOW** | 0 | Not used in production code. |
| `deepKeys` | **LOW** | 0 | Not used in production code. |

### `utils-map.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `getFromMapOrCreate` | **CRITICAL** | 26 | Core caching primitive. Used in query cache, doc cache, event-reduce, and storage helpers. Avoids redundant `Map.has()` + `Map.get()` calls by combining lookup and creation. Uses `=== undefined` for faster comparisons. |
| `getFromMapOrThrow` | **HIGH** | 11 | Used to retrieve collections, storage instances, and other registered objects. Uses `=== undefined` instead of `typeof` for ~6% faster comparisons. Called frequently in database operations. |

### `utils-time.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `now` | **CRITICAL** | 30 | Called per-document during writes to generate `_meta.lwt` timestamps. Guarantees monotonically increasing values. Uses `Math.round` instead of `parseFloat(toFixed())` to avoid string conversion. |

### `utils-promise.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `PROMISE_RESOLVE_TRUE` | **HIGH** | ~35 (combined) | Reused resolved promise constants avoid creating new `Promise.resolve()` each time. Used across many core operations. |
| `PROMISE_RESOLVE_FALSE` | **HIGH** | (see above) | Same as above. Combined count of ~35 files across all four constants. |
| `PROMISE_RESOLVE_NULL` | **HIGH** | (see above) | Same as above. |
| `PROMISE_RESOLVE_VOID` | **HIGH** | (see above) | Same as above. |
| `requestIdlePromise` | **MEDIUM** | 13 | Queued idle callback scheduling. Used for background cleanup and non-urgent tasks. |
| `requestIdleCallbackIfAvailable` | **MEDIUM** | 1 | Fire-and-forget idle scheduling. |
| `nextTick` | **MEDIUM** | 3 | Used for microtask scheduling. |
| `toPromise` | **MEDIUM** | 2 | Used to normalize sync/async return values. |
| `isPromise` | **LOW** | 1 | Type-checking utility. |
| `promiseWait` | **MEDIUM** | 21 | Delay utility. Used in cleanup, replication, storage plugins, and retry logic. |
| `promiseSeries` | **LOW** | 1 | Serial promise execution. |

### `utils-document.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `getDefaultRxDocumentMeta` | **HIGH** | 5 | Called during document creation to generate default `_meta` fields. |
| `stripMetaDataFromDocument` | **MEDIUM** | 1 | Removes internal fields. Low usage count. |
| `areRxDocumentArraysEqual` | **MEDIUM** | 1 | Optimized array comparison using only ids/revisions (faster than deep equal). |
| `sortDocumentsByLastWriteTime` | **LOW** | 0 | Not used in production code. |
| `getSortDocumentsByLastWriteTimeComparator` | **LOW** | 0 | Not used in production code. |
| `toWithDeleted` | **LOW** | 0 | Not used in production code. |
| `getDefaultRevision` | **MEDIUM** | 10 | Returns static string `1-`. Used in document initialization across database and replication code. |

### `utils-hash.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `defaultHashSha256` | **MEDIUM** | 2 | Default hash function. Used when no custom hash is provided. Async (uses native crypto). |
| `hashStringToNumber` | **LOW** | 1 | Simple hash for load balancing. Minimal usage. |

### `utils-other.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `ensureNotFalsy` | **HIGH** | 63 | Most-used utility function. Runtime assertion that throws on falsy values. Inlined by most JS engines due to simplicity. Used across all core modules. |
| `RXJS_SHARE_REPLAY_DEFAULTS` | **MEDIUM** | 6 | Configuration constant for RxJS operators. |
| `ensureInteger` | **LOW** | 0 | Not used in production code. |
| `runXTimes` | **LOW** | 0 | Not used in production code. |
| `nameFunction` | **LOW** | 1 | Debugging utility for stack traces. |
| `customFetchWithFixedHeaders` | **LOW** | 0 | Not used in production code. |

### `utils-array.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `lastOfArray` | **HIGH** | 12 | Frequently used to get the last element. Simple `arr[arr.length - 1]` access. |
| `toArray` | **HIGH** | 16 | Normalizes single values to arrays. Used in query processing and event handling. |
| `isMaybeReadonlyArray` | **MEDIUM** | 6 | Array type check used in schema and query processing. |
| `countUntilNotMatching` | **MEDIUM** | 1 | Used in query planner for index-related computations. |
| `batchArray` | **MEDIUM** | 3 | Used for chunking bulk operations. |
| `uniqueArray` | **LOW** | 1 | Deduplication utility. |
| `arrayFilterNotEmpty` | **LOW** | 1 | Type guard for filtering. |
| `sumNumberArray` | **LOW** | 1 | Aggregation utility. |
| `maxOfNumbers` | **LOW** | 1 | Aggregation utility. |
| `shuffleArray` | **LOW** | 0 | Not used in production code. |
| `randomOfArray` | **LOW** | 0 | Not used in production code. |
| `removeOneFromArrayIfMatches` | **LOW** | 1 | Conditional removal. |
| `isOneItemOfArrayInOtherArray` | **LOW** | 1 | Set intersection check. |
| `asyncFilter` | **LOW** | 1 | Async array filtering. |
| `sortByObjectNumberProperty` | **LOW** | 1 | Comparator factory. |

### `utils-string.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `randomToken` | **MEDIUM** | 24 | Used for generating database/collection instance tokens. Called during setup, not in hot loops. |
| `trimDots` | **LOW** | 3 | String cleanup utility. |
| `lastCharOfString` | **LOW** | 1 | Single character access. |
| `ucfirst` | **LOW** | 1 | Capitalization utility. |
| `isFolderPath` | **LOW** | 1 | Path detection. |
| `arrayBufferToString` | **LOW** | 1 | Encoding utility. |
| `stringToArrayBuffer` | **LOW** | 1 | Encoding utility. |
| `normalizeString` | **LOW** | 1 | Whitespace normalization. |

### `utils-base64.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `b64EncodeUnicode` | **LOW** | 1 | Base64 encoding. Minimal usage. |
| `b64DecodeUnicode` | **LOW** | 1 | Base64 decoding. Minimal usage. |
| `arrayBufferToBase64` | **LOW** | 1 | Binary encoding. |
| `base64ToArrayBuffer` | **LOW** | 1 | Binary decoding. |

### `utils-blob.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `createBlob` | **LOW** | 1 | Blob construction. |
| `createBlobFromBase64` | **LOW** | 1 | Blob construction. |
| `blobToString` | **LOW** | 1 | Blob reading. |
| `blobToBase64String` | **LOW** | 1 | Blob reading. |

### `utils-regex.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `REGEX_ALL_DOTS` | **LOW** | 2 | Pre-compiled regex constant. |
| `REGEX_ALL_PIPES` | **LOW** | 1 | Pre-compiled regex constant. |

### `utils-error.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `pluginMissing` | **LOW** | 4 | Error construction. Only called on failure paths. |
| `errorToPlainJson` | **LOW** | 9 | Error serialization. Only called on failure paths. |

### `utils-number.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `randomNumber` | **LOW** | 0 | Not used in production code. |

### `utils-global.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `RXDB_UTILS_GLOBAL` | **LOW** | 2 | Global mutable state object for plugins. |

### `utils-premium.ts`

| Function | Performance | Usage Count (src/) | Notes |
|---|---|---|---|
| `hasPremiumFlag` | **LOW** | 1 | One-time check during collection creation. |

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

## Benchmark Results for CRITICAL Functions

Microbenchmarks comparing old vs optimized implementations (Node.js, 5M iterations, median of 5 runs).

| Function | Change | Before (ops/sec) | After (ops/sec) | Improvement |
|---|---|---|---|---|
| `flatClone` (5-key doc) | Spread `{ ...obj }` instead of `Object.assign({}, obj)` | 12.7M | 53.1M | **~319% faster** |
| `getProperty` (3-level dot path) | Fast path for dot-notation avoids `getPathSegments()` parser | 2.5M | 9.5M | **~281% faster** |
| `getProperty` (2-level dot path) | Same | 3.8M | 10.8M | **~181% faster** |
| `objectPathMonad` (2-segment) | Unrolled loop for 2-segment paths + `=== undefined` | 46.6M | 201.0M | **~332% faster** |
| `objectPathMonad` (3+ segment) | `=== undefined` instead of `typeof` | 33.8M | 35.3M | **~4% faster** |
| `getFromMapOrCreate` (cache hit) | `=== undefined` instead of `typeof` | 100.5M | 106.9M | **~6% faster** |
| `deepClone` (nested doc) | Collapsed null check, moved Blob check after Array check | 3.0M | 3.0M | 0% (no change) |
| `getHeightOfRevision` (1-digit) | Already optimal (charCodeAt fast path) | 65.6M | 65.6M | 0% (no change) |
| `createRevision` (with prev) | Already optimal | 35.7M | 35.7M | 0% (no change) |
| `now` | Already optimal (monotonic + Math.round) | 17.7M | 17.7M | 0% (no change) |

### Changes Made

1. **`flatClone`**: Switched from `Object.assign({}, obj)` to spread `{ ...obj }`. V8 optimizes the spread operator for plain objects, resulting in ~4x faster shallow cloning.
2. **`getProperty`**: Added a fast path for simple dot-notation paths (e.g. `'nested.field'`). When the path contains no brackets `[` or backslashes `\\`, it uses a simple `split('.')` traversal instead of the expensive character-by-character `getPathSegments()` parser. This covers the vast majority of RxDB property access patterns.
3. **`objectPathMonad`**: Added a dedicated fast path for 2-segment paths (e.g. `'nested.field'`) that avoids the loop entirely. Also changed `typeof === 'undefined'` to `=== undefined` in the general loop.
4. **`getFromMapOrCreate`**: Replaced `typeof value === 'undefined'` with `value === undefined` for a faster strict equality check.
5. **`deepClone`**: Collapsed the redundant `!src` + `src === null` checks into a single `!src || typeof src !== 'object'`. Moved the Blob instanceof check after the Array.isArray check since arrays are much more common than Blobs.

### Not Changed (Already Optimal)

- **`getHeightOfRevision`**: The charCodeAt fast path for single-digit heights is already optimal. Adding a 2-digit fast path regresses the common single-digit case.
- **`createRevision`**: Simple string concatenation, already minimal overhead.
- **`now`**: `Date.now()` + monotonic guarantee + `Math.round` is already the fastest approach.

## Benchmark Results for HIGH Functions

Microbenchmarks comparing old vs optimized implementations (Node.js, 5M iterations, median of 3 runs).

| Function | Change | Before (ops/sec) | After (ops/sec) | Improvement |
|---|---|---|---|---|
| `overwriteGetterForCaching` (read) | Value descriptor instead of getter descriptor | 65.5M | 103.4M | **~37% faster** |
| `overwriteGetterForCaching` (create+read) | Same | 1.22M | 1.60M | **~25% faster** |
| `deepEqual` (equal objects, 7 keys) | Merged two loops into single pass | 2.49M | 2.52M | ~1% faster |
| `deepEqual` (unequal objects, nested diff) | Same | 3.08M | 3.70M | **~17% faster** |
| `getFromMapOrThrow` | `=== undefined` instead of `typeof` | 49.5M | 52.7M | **~6% faster** |
| `ensureNotFalsy` | Already optimal (V8 inlines it) | 134M | 134M | 0% (no change) |
| `toArray` (array input) | `.slice(0)` copy is necessary (callers mutate) | 115M | 115M | 0% (no change) |
| `toArray` (single value) | Already optimal | 145M | 145M | 0% (no change) |
| `getDefaultRxDocumentMeta` | Already optimal (object literal) | 165M | 165M | 0% (no change) |
| `lastOfArray` | Already optimal (`arr[arr.length - 1]`) | 186M | 186M | 0% (no change) |
| `PROMISE_RESOLVE_*` | Already optimal (pre-resolved constants) | N/A | N/A | 0% (no change) |

### Changes Made

1. **`overwriteGetterForCaching`**: Switched from `{ get: () => value }` to `{ value }` in `Object.defineProperty`. Subsequent reads become direct property lookups instead of function calls.
2. **`deepEqual`**: Merged the has-own-property check loop and the deep-comparison loop into a single pass, eliminating one full iteration over object keys.
3. **`getFromMapOrThrow`**: Replaced `typeof val === 'undefined'` with `val === undefined` for a faster strict equality check.

### Not Changed (Already Optimal)

- **`ensureNotFalsy`**: V8 already inlines this simple function. Extracting the throw path showed 0% improvement.
- **`lastOfArray`**: `arr[arr.length - 1]` is the fastest pattern in all engines.
- **`toArray`**: The `.slice(0)` copy is required because callers mutate the result (e.g., `.push()` in `rx-query-helper.ts`).
- **`getDefaultRxDocumentMeta`**: Object literal creation is already minimal overhead.
- **`PROMISE_RESOLVE_*`**: Pre-resolved promise constants are already the optimal pattern.
