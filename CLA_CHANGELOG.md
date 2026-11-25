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
- Removed inherited upstream workflows that publish to npm, push docs/tags, ping Bing IndexNow for `rxdb.info`, notify `pubkey/rxdb-server`, or auto-create Copilot issues: `release.yml`, `notify-rxdb-server.yml`, `build.yml`, `cloudflare-pages.yml`, `main.yml`, `prevent-commit-to-generated.yml`, `reset-npm-cache.yml`, `test-without-fix.yml`.

### Verification & Benchmarks
- Pending final execution in Task T4/T6 (will be populated with exact measured timings, heap usage, executed suites, and unrunnable suite notes before completing v0.1.0).
