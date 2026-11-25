# CLA DB Changelog

This file tracks modifications specific to the CLA DB fork (`@clatech/db`).
For upstream RxDB history, see `CHANGELOG.md`.

## [0.1.0] - 2026-11-24

### Upstream Base
- **Upstream repository**: `https://github.com/pubkey/rxdb`
- **Upstream base**: RxDB `17.6.0+522`
- **Upstream commit**: `9d5849cf4c695ffc27d60e134b2039539e77a9b0` (2026-11-25)
- **Rationale for commit over tag `17.6.0` (`9d60a86373`)**: Includes 200 `src/` bugfixes post-17.6.0 covering Dexie `remove()` (`#9843`), duplicate schema migration execution (`#9827`), paused initial-sync push batch handling (`#9591`), replication conflict attachments (`#9671`), `incrementalUpsert()` ordering (`#9699`), and `localStorage` cleanup data-loss prevention (`#9475`), with zero breaking changes in core, storages, or replication.

### Added
- Fork technical documentation: `SYSTEM_DESIGN.md`, `ROADMAP.md`, `UPSTREAM.md`, `CLA_CHANGELOG.md`, `CONTRIBUTING.md`, plus updated `README.md` and `AGENTS.md`.
- CLA DB verification and benchmark suite (`test/unit/cla-db.test.ts`) covering 14, 20, 50, and 100 simultaneous collections, CRUD, reactive queries, persistence across restarts, bidirectional replication, conflict resolution, schema migration, and Dexie storage compatibility.
- Safe CLA DB GitHub Actions CI workflow (`.github/workflows/ci.yml`) running dependency install, lint, typecheck, build, memory and Dexie test suites, packed consumer validation, and Apache 2.0 license verification.

### Changed
- **Removed artificial collection limit**: Removed the `NON_PREMIUM_COLLECTION_LIMIT` (`COL23`) enforcement block in `src/rx-collection.ts` (`RxCollectionBase.prepare()`). Preserved `OPEN_COLLECTIONS` lifecycle tracking, `src/plugins/utils/utils-premium.ts` public exports, and all Premium flag utilities untouched to prevent API breakage and avoid falsifying Premium state.
- **Package identity (`@clatech/db`)**: Updated `package.json` metadata (`name`, `version: "0.1.0"`, `author: "CLA Tech"`, `repository`, `homepage`, `publishConfig.access: "public"`, and `claDb` upstream tracking metadata) and plugin shim naming in `scripts/generate-plugins-package-json.mjs`.
- **Decoupled `RXDB_VERSION` from fork SemVer**: Updated `scripts/update-version-variable.mjs` to read `package.json#claDb.upstreamVersion` (`"17.6.0"`) for `RXDB_VERSION` so on-disk compatibility checks (`DM5` in `src/rx-database-internal-store.ts`) remain compatible with RxDB 16/17 databases and future CLA DB `0.x -> 1.0` upgrades.
- Updated `test/unit/rx-collection.test.ts` to assert that opening more than `NON_PREMIUM_COLLECTION_LIMIT` collections succeeds without throwing `COL23`.
- Disabled `automerge` in `renovate.json`.

### Removed / Disabled
- Removed inherited upstream workflows that publish to npm, push docs/tags, ping Bing IndexNow for `rxdb.info`, notify `pubkey/rxdb-server`, or run upstream automation: `release.yml`, `notify-rxdb-server.yml`, `build.yml`, `cloudflare-pages.yml`, `main.yml`, `copilot-setup-steps.yml`, `reset-npm-cache.yml`, `test-without-fix.yml` (kept `prevent-commit-to-generated.yml`).

### Verification & Benchmarks (Node v22.23.2, npm 10.9.8, `--expose-gc`)

#### Multi-Collection Initialization & Heap Usage (`test/unit/cla-db.test.ts`, Ajv-validated storages)
| Collections | Memory Init (ms) | Memory Heap Delta (MB) | Dexie (`fake-indexeddb`) Init (ms) | Dexie Heap Delta (MB) |
| --- | --- | --- | --- | --- |
| 14 | 157.24 (cold JIT) | +6.78 | 25.02 | +6.47 |
| 20 | 3.78 | +1.83 | 15.55 | +7.82 |
| 50 | 7.92 | +4.42 | 31.05 | +7.31 |
| 100 | 12.63 | +8.65 | 57.44 | +14.79 |

Notes: Removing the artificial 13-collection cap does not remove physical memory or handle limits. Dexie/IndexedDB initialization time and heap footprint scale linearly with open collection count.

#### Executed Suites (All Passing)
- `npm run lint`: PASS (0 errors, 0 warnings)
- `npm run check-types`: PASS (`tsc --noEmit`)
- `npm run build`: PASS (289 CJS files, 289 ESM files, `.d.ts` types, 55 plugin shims, dbviewer bundle)
- `npm run test:typings`: PASS
- `npm run test:circular`: PASS (0 circular dependencies in core ESM, Dexie ESM, and tests)
- `npm run test:fast:memory`: PASS (1,894 passing, 0 failing, includes `cla-db.test.ts` 13/13 and updated `rx-collection.test.ts`)
- `npm run test:fast:dexie`: PASS (1,898 passing, 0 failing)
- `node ./scripts/verify-pack-consumer.mjs`: PASS (`clatech-db-0.1.0.tgz`, 2222.4 KB; verified ESM, CommonJS, and TypeScript `NodeNext` compilation with 15 simultaneous collections, reactive queries, and Dexie restart persistence)

#### Suites Not Executed in This Environment (Recorded Honestly)
- `test:browser:*` (Karma/Chrome): Not executed because no browser binary/display server is configured in this headless shell environment.
- `test:replication-*` (CouchDB, MongoDB, Appwrite, Firestore, Supabase, FoundationDB, NATS): Not executed because external Docker/database service containers are not running in this environment.
- `test:bun:*` / `test:deno:*`: Not executed because Bun and Deno runtimes are not installed in this environment.

