# CLA DB (`@clatech/db`)

A minimal, Apache 2.0 fork of [RxDB](https://github.com/pubkey/rxdb) maintained by **CLA Tech**.

CLA DB provides a reactive, local-first, offline-first NoSQL database for JavaScript and TypeScript applications without the artificial 13-collection cap, while preserving full compatibility with RxDB's public API, storage interfaces, and replication protocol.

- **Package**: `@clatech/db` (`v0.1.0`)
- **License**: [Apache-2.0](./LICENSE.txt)
- **Repository**: `https://github.com/AngelCLA/cla-db`
- **Upstream**: [pubkey/rxdb](https://github.com/pubkey/rxdb) (v0.1.0 base: RxDB `17.6.0+522`, commit `9d5849cf4c695ffc27d60e134b2039539e77a9b0`)

## Why CLA DB Exists

CLA Tech builds offline-first commercial applications (starting with field-sales credit furniture software) that model more than 13 domain collections locally and synchronize bidirectionally when connectivity returns.

CLA DB follows a **minimal fork, maximum compatibility** policy:
- Removes only the artificial `NON_PREMIUM_COLLECTION_LIMIT` check (`COL23`) in `src/rx-collection.ts`.
- Preserves all open-source RxDB core features, Mango queries, RxJS reactivity, schema migrations, conflict handling, and replication plugins.
- Contains zero proprietary RxDB Premium code and never falsifies Premium flags.
- Keeps future CLA Tech adapters (Cloudflare Workers + D1, R2, custom SQLite, custom OPFS, diagnostics) outside the core repository as separate packages over public interfaces.

## Open Storage Engines Included

| Storage | Import Path | Notes |
| --- | --- | --- |
| Dexie (IndexedDB) | `@clatech/db/plugins/storage-dexie` | Recommended persistent browser/PWA storage |
| Memory | `@clatech/db/plugins/storage-memory` | In-memory storage for tests and ephemeral workloads |
| LocalStorage | `@clatech/db/plugins/storage-localstorage` | Lightweight key-value persistence |
| FoundationDB | `@clatech/db/plugins/storage-foundationdb` | Node.js backend |
| MongoDB | `@clatech/db/plugins/storage-mongodb` | Node.js backend (`mongodb` peer dependency) |
| DenoKV | `@clatech/db/plugins/storage-denokv` | Deno runtime |
| Remote / WebSocket | `@clatech/db/plugins/storage-remote` | Cross-process / WebWorker storage bridge |

Note: `@clatech/db/plugins/storage-sqlite` is inherited from upstream RxDB as an open-source trial adapter capped at 500 documents (`SQL2`). An unrestricted open-source SQLite adapter is planned as an external package in `ROADMAP.md`.

## Quick Start

### Install (local evaluation)

Build and pack locally to evaluate `@clatech/db` in an application:

```sh
npm install
npm run build
npm pack
```

Then install the generated tarball alongside `rxjs`:

```sh
npm install ./clatech-db-0.1.0.tgz rxjs
```

### Usage Example

```ts
import { createRxDatabase } from '@clatech/db';
import { getRxStorageDexie } from '@clatech/db/plugins/storage-dexie';

const db = await createRxDatabase({
    name: 'field_sales_db',
    storage: getRxStorageDexie()
});

await db.addCollections({
    customers: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                name: { type: 'string' },
                balance: { type: 'number' }
            },
            required: ['id', 'name', 'balance']
        }
    }
});

await db.customers.insert({
    id: 'cust-001',
    name: 'Maria Lopez',
    balance: 1200
});

// Reactive query
db.customers.find({
    selector: { balance: { $gt: 0 } }
}).$.subscribe((docs) => {
    console.log('Active credit accounts:', docs.length);
});
```

## Documentation

- [System Design](./SYSTEM_DESIGN.md) - Architecture, core components, open storages, and replication model
- [Roadmap](./ROADMAP.md) - Planned milestones and future external adapter packages
- [Upstream Maintenance](./UPSTREAM.md) - Strategy and step-by-step procedure for syncing from RxDB
- [CLA DB Changelog](./CLA_CHANGELOG.md) - Fork-specific changes, upstream base tracking, and verification metrics
- [Contributing](./CONTRIBUTING.md) - Development workflow, coding conventions, and test commands
- [Agent Guidelines](./AGENTS.md) - Repository instructions for coding agents

For general API reference on RxDB queries, schemas, hooks, and replication protocols, see the upstream [RxDB documentation](https://rxdb.info/).

## Attribution and License

CLA DB is derived from [RxDB](https://github.com/pubkey/rxdb) created by Daniel Meyer (`pubkey`) and the RxDB contributors, licensed under the [Apache License 2.0](./LICENSE.txt).
All original copyright notices, licenses, and upstream changelog records (`CHANGELOG.md`) are preserved in full. CLA DB is an independent fork by CLA Tech and is not affiliated with or endorsed by RxDB or RxDB Premium.
