# RxDB Test Coverage Analysis

Date: 2026-03-18

## Overview

This analysis compares 366 source files in `src/` against 68 test files in `test/` to identify coverage gaps. The findings are organized by severity.

## Critical Gaps

### 1. `conflict-handling.test.ts` - Empty Test File

The file `test/unit/conflict-handling.test.ts` exists but contains zero test cases (only a describe block stub). The corresponding source code in `src/replication-protocol/conflicts.ts` and `src/replication-protocol/default-conflict-handler.ts` handles a critical part of the replication system.

**Recommended tests:**
- Default conflict handler behavior (last-write-wins)
- Custom conflict handler integration
- Conflict detection with concurrent writes
- Edge cases: identical documents, deleted vs updated conflicts

### 2. `rx-storage-helper.test.ts` - 1 Test for 25+ Functions

`src/rx-storage-helper.ts` is a 1,120-line module exporting 25+ functions. The test file contains a single performance benchmark for `categorizeBulkWriteRows()`.

**Untested functions that need coverage:**
- `getSingleDocument()` - retrieving single documents from storage
- `writeSingle()` - single document writes
- `observeSingle()` - observable for single document changes
- `stackCheckpoints()` - merging replication checkpoints
- `throwIfIsStorageWriteError()` - error classification
- `stripAttachmentsDataFromRow()` / `stripAttachmentsDataFromDocument()` - attachment handling
- `flatCloneDocWithMeta()` - metadata-preserving clone
- `getWrappedStorageInstance()` - storage wrapping logic
- `ensureRxStorageInstanceParamsAreCorrect()` - parameter validation
- `hasEncryption()` - encryption detection
- `getChangedDocumentsSince()` - change tracking queries
- `getWrittenDocumentsFromBulkWriteResponse()` - bulk write response parsing
- `randomDelayStorage()` - delay-injecting storage wrapper

### 3. Core Internal Modules with No Dedicated Tests

These core files are only tested indirectly through integration tests:

| File | Lines | Purpose |
|------|-------|---------|
| `src/doc-cache.ts` | ~200 | Document caching and cache invalidation |
| `src/incremental-write.ts` | ~150 | Batching and ordering of incremental writes |
| `src/rx-document-prototype-merge.ts` | ~100 | Merging ORM methods onto document prototypes |
| `src/rx-query-single-result.ts` | ~80 | Optimization for queries returning single results |
| `src/plugin-helpers.ts` | ~120 | Shared plugin utilities |

**Why these matter:** Bugs in doc-cache or incremental-write are hard to trace when they only surface through higher-level integration tests. Dedicated unit tests would catch regressions faster.

## Modules Without Any Test Coverage

### 4. Vector Search Plugin (`src/plugins/vector/`)

4 source files (helper.ts, index.ts, types.ts, vector-distance.ts) with no test file. The `vector-distance.ts` file contains mathematical distance functions (cosine similarity, euclidean distance) that are ideal candidates for unit testing.

**Recommended tests:**
- Cosine similarity with known vectors
- Euclidean distance calculations
- Edge cases: zero vectors, single-dimension, high-dimensional vectors
- Vector search query construction and execution

### 5. Dev-Mode Validation Checks (`src/plugins/dev-mode/`)

10 source files containing runtime validation logic used in development mode. None have dedicated tests:
- `check-document.ts` - document structure validation
- `check-schema.ts` - schema validation rules
- `check-query.ts` - query validation
- `check-orm.ts` - ORM method validation
- `check-migration-strategies.ts` - migration strategy validation
- `unallowed-properties.ts` - property name blacklisting

These validators are the first line of defense for developer experience. Testing them ensures clear error messages are thrown for common mistakes.

### 6. Electron Plugin (`src/plugins/electron/`)

4 source files for Electron IPC storage transport. No tests exist, likely because testing requires an Electron environment. Consider adding:
- Unit tests for `electron-helper.ts` utilities
- Mock-based tests for IPC message serialization/deserialization

### 7. Flutter Plugin (`src/plugins/flutter/`)

No tests. If the TypeScript portion contains logic beyond type definitions, it should have unit tests.

### 8. Framework Reactivity Plugins

Two of three reactivity plugins lack tests:
- `reactivity-angular/index.ts` - no tests
- `reactivity-vue/index.ts` - no tests
- `reactivity-preact-signals/index.ts` - tested in reactivity.test.ts

## Areas with Indirect-Only Coverage

### 9. Replication Protocol Internals (`src/replication-protocol/`)

8 source files are tested only through `replication-protocol.test.ts` and `replication.test.ts` integration tests. The individual modules would benefit from targeted unit tests:

- `checkpoint.ts` - checkpoint calculation and comparison
- `conflicts.ts` - conflict detection logic
- `downstream.ts` - pull replication logic
- `upstream.ts` - push replication logic
- `meta-instance.ts` - replication metadata storage
- `helper.ts` - shared replication utilities

### 10. Utility Functions (`src/plugins/utils/`)

22 utility files with 118+ exported functions. `util.test.ts` covers about 59 test cases, which is solid but leaves gaps in:
- `utils-map.ts` - Map/WeakMap utilities
- `utils-promise.ts` - Promise utilities (PROMISE_RESOLVE_*, requestIdlePromise)
- `utils-error.ts` - error conversion utilities
- `utils-regex.ts` - regex patterns
- `utils-revision.ts` - revision string parsing/creation
- `utils-time.ts` - time utilities

## Well-Tested Areas (for reference)

These modules have thorough test coverage:
- `rx-collection.test.ts` - comprehensive CRUD and query tests
- `rx-database.test.ts` - database lifecycle tests
- `rx-document.test.ts` - document operations
- `rx-query.test.ts` - query building and execution
- `rx-schema.test.ts` - schema validation
- `rx-pipeline.test.ts` - pipeline functionality (13 tests)
- `change-event-buffer.test.ts` - all public methods covered (13 tests)
- `webmcp.test.ts` - tool registration and execution (9 tests)
- `util.test.ts` - broad utility coverage (59 tests)
- `rx-storage-implementations.test.ts` - storage adapter conformance suite

## Priority Recommendations

**High priority (critical functionality, easy to test):**
1. Fill `conflict-handling.test.ts` with actual tests
2. Add unit tests for `rx-storage-helper.ts` functions
3. Add unit tests for `src/plugins/vector/vector-distance.ts`

**Medium priority (improves regression detection):**
4. Add unit tests for `src/doc-cache.ts`
5. Add unit tests for `src/incremental-write.ts`
6. Add targeted tests for `src/replication-protocol/checkpoint.ts` and `conflicts.ts`
7. Add tests for dev-mode check modules (check-schema.ts, check-query.ts, check-document.ts)

**Lower priority (environment-specific or less logic):**
8. Add mock-based tests for Electron plugin helpers
9. Add tests for Angular/Vue reactivity plugins
10. Expand utility test coverage for utils-promise.ts, utils-revision.ts, utils-map.ts
