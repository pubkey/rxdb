# CLA DB Roadmap

This roadmap defines version milestones for CLA DB (`@clatech/db`).
Core fork changes stay minimal; new adapters and operational tooling are designed as independent packages built on top of the public core interfaces (`RxStorage`, `RxStorageInstance`, `RxDatabase`, `replicateRxCollection`).

## v0.1.0 - Foundation (Current)

Goal: Establish a clean, maintainable, Apache 2.0 fork ready for local package evaluation and offline-first multi-collection workloads.

- Anchor fork on verified RxDB base (`17.6.0+522`, commit `9d5849cf4c695ffc27d60e134b2039539e77a9b0`).
- Remove only the artificial non-premium collection limit (`COL23`) without modifying Premium license checks or proprietary features.
- Configure `@clatech/db` package identity, dual ESM/CJS exports, TypeScript declarations, and decoupled `RXDB_VERSION` (`17.6.0`) storage-format compatibility.
- Add core technical documentation (`AGENTS.md`, `SYSTEM_DESIGN.md`, `ROADMAP.md`, `UPSTREAM.md`, `CLA_CHANGELOG.md`, `CONTRIBUTING.md`, updated `README.md`).
- Add CLA DB verification suite (14, 20, 50, 100 collections with memory/init benchmarks, CRUD, reactive queries, restart persistence, bidirectional replication, conflict handling, schema migration, Dexie compatibility, and external `npm pack` consumer validation).
- Replace inherited upstream publish/notify GitHub Actions with a safe CLA DB CI pipeline.

## v0.2.0 - Sync & Persistence Extensions (Planned, External Modules)

All items below are out of scope for v0.1.0 and will live in independent packages using public CLA DB interfaces:

- **Cloudflare Workers + D1 replication adapter**: HTTP/checkpoint backend reference and client helper for serverless credit-sales synchronization.
- **Cloudflare R2 attachment/blob storage integration**: Offload large binary attachments (receipts, photos, contracts) outside IndexedDB.
- **Custom open-source SQLite storage adapter**: Unrestricted `RxStorage` implementation without the 500-document trial cap for Node.js, Electron, and mobile runtimes.
- **Custom open-source OPFS storage adapter**: High-throughput browser Origin Private File System `RxStorage` implementation.

## v0.3.0 - Operational & Developer Tooling (Planned, External Modules)

- **Diagnostics toolkit**: CLI and runtime helpers to inspect storage health, checkpoint lag, memory footprint, and open collection handles.
- **Visual collection inspector**: Local-only UI without upstream telemetry or external signaling servers.
- **Synchronization monitor**: Real-time visibility into offline queues, conflict counts, retry backoff, and sync latency.
- **Backup and recovery tooling**: Deterministic export/import snapshots and verification checksums for field devices.

## Non-Goals

- Copying, reverse-engineering, or bundling RxDB Premium proprietary plugins.
- Rewriting core RxDB internals where upstream already provides a stable solution.
- Breaking RxDB public APIs or on-disk storage compatibility without an explicit major-version migration path.
