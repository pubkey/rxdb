---
title: The State of Local-First Sync Engines in 2026
slug: local-first-sync-engines-2026.html
description: A vendor-neutral comparison of ElectricSQL, PowerSync, Zero, InstantDB, RxDB, Jazz, LiveStore, Automerge, Yjs and more. Architecture, conflicts, auth, licensing and what changed in 2025 and 2026.
image: /headers/local-first-sync-engines-2026.jpg
---

# The State of Local-First Sync Engines in 2026

The last 18 months reshaped the sync engine space more than the five years before them. MongoDB shut down Atlas Device Sync, the largest commercial sync service, on September 30, 2025, six years after buying Realm for $39M ([EOL notice](https://www.mongodb.com/community/forums/t/atlas-device-sync-end-of-life-and-deprecation/296687)). Triplit was acqui-hired by Supabase in October 2025 ([announcement](https://supabase.com/blog/triplit-joins-supabase)). ElectricSQL rewrote its product in 2024, shipped 1.0 in March 2025, and by April 2026 had repositioned itself as an agent platform on a new domain. Rocicorp retired Replicache and Reflect, and shipped Zero 1.0 in June 2026 ([InfoQ](https://www.infoq.com/news/2026/06/zero-version-1/)). PouchDB moved into the Apache Incubator. Liveblocks open-sourced its sync engine.

If you evaluated this space in 2023 or 2024, your notes are stale. This article is a fresh map: what each engine does, how it handles writes and conflicts, what it costs, who maintains it, and where the bodies are buried.

**Disclosure:** I build [RxDB](https://rxdb.info/), one of the projects compared below. RxDB appears as one row among many, the same criteria are applied to it as to everyone else, and its weaknesses are listed like everyone else's. All version numbers and dates were checked against npm, GitHub and vendor announcements in June 2026. Corrections are welcome.

## What is a sync engine

A sync engine keeps data on the client and reconciles it with a server (or with peers) in the background. The app reads and writes against local state, so interactions do not wait for the network. The hard parts are everything around that sentence: which subset of data reaches each device, what happens when two offline clients edit the same row, where permissions are enforced, and how to migrate a schema when some clients have been offline for a month.

Aaron Boodman (Rocicorp) draws a useful line between two product shapes ([source](https://x.com/aboodman/status/1843049082237170036)):

- A **sync engine** is a transport layer on top of the database you already have. ElectricSQL, PowerSync and Zero sync your Postgres. Your database stays the system of record.
- A **syncing datastore** replaces your database and your API. InstantDB, Convex and Triplit are the backend.

A third group does not fit either bucket: client-side databases with a replication protocol (RxDB, PouchDB, WatermelonDB) and CRDT toolkits (Automerge, Yjs, Jazz, Evolu) where merge logic lives in the data structure itself. Matthew Weidner's [server architecture taxonomy](https://mattweidner.com/2024/06/04/server-architectures.html) classifies the same projects by mechanism instead of product shape, and is worth reading if you want the theory.

This article groups the engines into five architecture families:

1. **Read-path replication**: the engine syncs data out of your database to clients. Writes go through your own API. (ElectricSQL)
2. **Server-authoritative replication into a client database**: bidirectional sync where the server decides what wins. (PowerSync, WatermelonDB)
3. **Query-driven sync with server reconciliation**: the client subscribes to queries, mutations are rebased on the server. (Zero, InstantDB)
4. **Client database with a replication protocol**: a full database on the client that replicates with any backend. (RxDB, PouchDB/CouchDB, Couchbase Lite)
5. **CRDT-native**: conflict resolution is built into the data type, no central authority required. (Automerge, Yjs, Jazz, Evolu)

LiveStore (event sourcing) and Ditto (proprietary P2P mesh) sit outside these families and get their own sections.

## What matters when choosing

Before the per-engine details, here is what practitioners converge on when they compare these tools in public threads. The quotes are from Hacker News discussions between 2024 and 2026.

**Partial sync is the make-or-break feature.** Boodman, who built Replicache before Zero: "Previous sync engines really want you to sync all data. This is impractical for most apps." ([thread](https://news.ycombinator.com/item?id=43397640)) Almost every engine's roadmap in 2025/2026 was dominated by this: Electric's shapes, PowerSync's Sync Streams, Zero's query-driven sync.

**The write path splits the field philosophically.** One camp (Electric, PowerSync) says writes must flow through your existing API so your auth, validation and business logic keep working. The other camp (Zero, InstantDB, CRDT engines) moves writes into the sync layer for better optimistic UX. Developers who got burned pick the first camp: "Start adding permissions and evolving business logic, migrations, growing product and such, and I can't see how they can hold up for very long." ([thread](https://news.ycombinator.com/item?id=44833834))

**Conflict resolution is less solved than the marketing says.** Most engines below default to last-write-wins at row or column level. Whether that is fine depends entirely on your domain. Boodman counters the panic: "None of our customers have ~ever complained about conflict resolution." Both things can be true: LWW is fine for a task tracker and a disaster for an invoice ledger.

**Schema migration with stale clients is a named fear.** "Needing to support clients that don't phone home for an extended period and therefore need to be rolled forward from a really old schema state seems like a major hassle." ([thread](https://news.ycombinator.com/item?id=44833834)) Almost no engine solves this; most work around it (see the unsolved problems section).

**Vendor durability now weighs as much as architecture.** After Realm's shutdown and Triplit's absorption, "what happens if the vendor disappears" is a first-class selection criterion. "My concern with DB startups is always the business model." ([thread](https://news.ycombinator.com/item?id=42383136)) Check the license, check whether you can self-host, check whether your data is in an open format.

## Family 1: Read-path replication

### ElectricSQL

[ElectricSQL](https://electric-sql.com/) is the cleanest expression of the "sync engine as transport" idea. An Elixir service consumes Postgres logical replication and serves **shapes** (a table, a where clause, a column list) to clients over plain HTTP with CDN caching. Initial sync is a cacheable snapshot, then clients long-poll or use SSE for live changes. Electric 1.0 shipped March 17, 2025 with a benchmark of one million concurrent clients against a single Postgres ([release post](https://electric.ax/blog/2025/03/17/electricsql-1.0-released)).

The catch is in the docs: "Electric does not do write-path sync." Writes go through your own API, and the [writes guide](https://electric-sql.com/docs/guides/writes) describes four patterns of increasing complexity, from plain online writes to a PGlite shadow database with triggers. Offline writes are therefore a do-it-yourself project. Shapes are still single-table; where-clause subqueries shipped in preview for membership-style filtering. On a breaking schema change the server invalidates the shape and clients re-sync from scratch (HTTP 409 plus `must-refetch`).

Two more things to know. First, Electric's recommended client stack is [TanStack DB](https://tanstack.com/db/latest) (built largely by Electric employees), which added SQLite-backed persistence and optimistic transactional mutations in version 0.6 (March 2026, npm latest 0.6.8). Second, the company has pivoted twice: from a CRDT-based local-first database (until July 2024) to a read-path sync engine, and in April 2026 to "the agent platform built on sync" under the new electric.ax domain ([Electric Agents](https://electric.ax/blog/2026/04/29/introducing-electric-agents)). The sync engine is Apache-2.0, well-built and production-proven (Trigger.dev pushes 20,000 updates per second through it). The strategic churn is something to price in.

- **Conflicts:** none in Electric itself, the server (your API) is authoritative.
- **Partial sync:** shapes (single table + where clause, subquery preview).
- **Auth:** proxy or gatekeeper pattern in front of the HTTP API.
- **License/pricing:** Apache-2.0; Electric Cloud pay-as-you-go since April 2026 ($1 per million writes, reads free, Pro $249/month).
- **Best fit:** read-heavy apps on Postgres that keep writes in their existing API.

### PGlite, in one paragraph

[PGlite](https://pglite.dev/) is Postgres compiled to WASM, about 3 MB gzipped, MIT/PostgreSQL-licensed, 15.4k GitHub stars and embedded in the Firebase emulator and Prisma tooling. It is the enabler technology for "Postgres in the browser" demos and for Electric's through-the-database write pattern. Its proven niche in 2026 is development environments and tests rather than production app storage: it is single-connection, and its OPFS persistence does not work in Safari. Compare that with [browser storage options](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md) before betting an app on it.

## Family 2: Server-authoritative replication into a client database

### PowerSync

[PowerSync](https://www.powersync.com/) is the most production-hardened option in this family, spun out of JourneyApps' internal engine that ran for years in mining and energy deployments. The service consumes change streams from Postgres, MongoDB, MySQL or SQL Server, partitions rows into buckets, and streams them into a client-side SQLite database. The read path is declarative; the write path is yours: the SDK queues local writes and calls your `uploadData()` function, your backend applies them, and unacknowledged changes are reverted on the client. Conflict resolution is whatever your backend does, which in the simple case means last-write-wins.

2025 and 2026 were busy: the sync client was rewritten in Rust inside the SQLite extension (about 35% faster on large React Native syncs), and **Sync Streams** went GA in May 2026, replacing the old YAML sync rules with on-demand, JOIN-capable subscriptions ([changelog](https://powersync.com/blog/powersync-changelog-may-2026)). The old rules had a painful property: changing them reprocessed every bucket and forced clients into full re-syncs.

The licensing is honest but worth understanding: client SDKs are Apache-2.0, the sync service is FSL-1.1, a source-available license that converts each release to Apache-2.0 after two years. You can self-host the Open Edition for free (without the dashboard). Cloud starts free and moves to $49/month plus $1/GB synced. SDK coverage is the broadest in the field: Flutter, React Native, web, Kotlin Multiplatform, Swift, .NET, Node.js.

- **Conflicts:** server-authoritative via your backend; client reverts rejected writes.
- **Partial sync:** Sync Streams (GA May 2026), parameterized queries with JOINs.
- **Auth:** JWT against your existing auth provider; write authorization in your API.
- **License/pricing:** Apache-2.0 SDKs, FSL-1.1 service; cloud free tier, then from $49/month.
- **Best fit:** mobile-first apps with existing Postgres/MongoDB backends that need real offline writes today.

### WatermelonDB

[WatermelonDB](https://github.com/Nozbe/WatermelonDB) deserves a paragraph because many React Native teams still run it. It is a fast, lazy, observable SQLite database for React Native (MIT, 11.7k stars) where you implement two HTTP endpoints (`pullChanges`, `pushChanges`) and the library applies changesets with per-column last-write-wins. It is battle-tested in Nozbe, Mattermost and Rocket.Chat. The risk profile changed though: one stable release since late 2023 (0.28.0, April 2025), no pushes to master since August 2025, around 300 open issues, and an unanswered question about React Native New Architecture support ([#1851](https://github.com/Nozbe/WatermelonDB/issues/1851)). Treat it as maintenance mode with a single maintainer. There is a longer [WatermelonDB comparison](./alternatives/watermelondb-alternative.md) on this site.

## Family 3: Query-driven sync with server reconciliation

### Zero

[Zero](https://zero.rocicorp.dev/) is Rocicorp's third take on this problem after Replicache and Reflect, and it reached 1.0 on June 8, 2026 after two years and 50+ releases. The model: you write queries in ZQL (a TypeScript query language) in app code, Zero syncs exactly the data those queries need into a normalized client store, and falls back to the server when a query needs more. Writes are **custom mutators**: your TypeScript functions run optimistically on the client, then re-run authoritatively on the server, which means arbitrary validation and conflict logic instead of blind LWW. Zero's docs are refreshingly blunt about positioning: "Zero is not local-first. It's a client-server system with an authoritative server."

Two honest caveats. Zero deprecated its declarative permission system in 2025 after admitting the rule compiler "is very simple-minded (read: dumb)", replacing it with synced queries and custom mutators, in other words: your own server code on the query path ([docs](https://zero.rocicorp.dev/docs/deprecated/rls-permissions)). And the architecture adds a moving part, zero-cache, between client and Postgres, which InfoQ's coverage flagged as a complexity cost. Developers who chose it praise the DX in unusually strong terms: "With Zero I define a table schema, relationships, and permissions in beautifully simple code." ([thread](https://news.ycombinator.com/item?id=44833834))

- **Conflicts:** server reconciliation, custom mutator logic, no silent merges.
- **Partial sync:** the core design, query-driven.
- **Auth:** synced queries + mutators on your server; JWT-based identity.
- **License/pricing:** Apache-2.0; self-hosting free, managed Cloud Zero optional (from $30/month).
- **Best fit:** ambitious web apps on Postgres that want Linear-grade interaction speed; recommended dataset size below 100 GB. Know the boundaries: Zero is web-only (no React Native), the client is 232 KB gzipped, and there are no offline writes at all. When the connection drops, [writes are rejected](https://zero.rocicorp.dev/docs/offline). This is online-optimistic, not offline-first.

### InstantDB

[InstantDB](https://www.instantdb.com/) is the strongest "syncing datastore" (it replaces your backend). Data lives in a triple store, clients query with InstaQL (a graph query language), permissions are CEL expressions per namespace, and optimistic updates plus offline queueing are built in. It launched on Hacker News with one of the biggest Show HN posts of 2024, raised a $3.4M seed from Paul Graham, Greg Brockman, Jeff Dean and the ex-Firebase CEO James Tamplin, and shipped 1.0 in April 2026, explicitly repositioned as "a backend for AI-coded apps" ([architecture essay](https://www.instantdb.com/essays/architecture)). The core is open source.

The trade-off is the datastore shape itself: your data lives in Instant's triple format on Instant's infrastructure (or your self-hosted instance), not in a database your other services already read. The most-asked question in its launch threads was "how does authorization work", which the CEL rules answer for row-level reads but which still concentrates trust in client-visible rules. For teams that want Firebase ergonomics with relational queries and sync, it is the most complete offering of its kind.

### Triplit, a cautionary footnote

[Triplit](https://github.com/aspen-cloud/triplit) shipped a 1.0 in early 2025 and was a real contender in this family: a full-stack TypeScript database with attribute-level last-writer-wins CRDT sync over WebSockets, AGPL-3.0. In October 2025 its co-founder joined Supabase ([announcement](https://supabase.com/blog/triplit-joins-supabase)), Triplit Cloud closed to new users, and the repo has been quiet since January 2026. Users had also hit scale walls ("subscriptions timeout above 100k entities"). It is the second data point, after Replicache and Reflect, that query-sync startups consolidate fast. Evaluate accordingly.

## Family 4: Client database with a replication protocol

### RxDB

[RxDB](https://rxdb.info/) (disclosure: my project) approaches the problem from the opposite end of Electric and PowerSync. Instead of syncing your server database down to clients, RxDB is a full reactive NoSQL database that runs on the client, in browsers on IndexedDB or OPFS, in React Native, Electron, Capacitor and Node.js, and replicates with whatever backend you have through its [Sync Engine](../replication.md), which works like git: the client pulls a checkpoint stream, pushes its forked document states, and resolves conflicts client-side with a [custom conflict handler](../transactions-conflicts-revisions.md). The backend contract is three endpoints (pull, push, pullStream), so it replicates with [your own HTTP API](../replication-http.md), [GraphQL](../replication-graphql.md), [CouchDB](../replication-couchdb.md), [Firestore](../replication-firestore.md), [MongoDB](../replication-mongodb.md), [Supabase](../replication-supabase.md), [Appwrite](../replication-appwrite.md), [NATS](../replication-nats.md) or [WebRTC P2P](../replication-webrtc.md). Offline writes are the default mode of existence, queries are observables, and v17 (March 2026) is the current major after continuous releases since 2018.

The honest weaknesses, applying the same standard as everywhere else in this article: RxDB is document-based NoSQL, so teams that want client-side JOINs over a relational schema will prefer a SQLite-based engine. Conflict handling defaults to a revision-based first-write-wins unless you write a real conflict handler, which is exactly the "the domain has to decide" problem every other engine has, just stated openly. The core is Apache-2.0, while some advanced storages and plugins (OPFS, SQLite, encryption, compression) are paid [premium plugins](/premium/), which funds full-time maintenance, a model worth comparing against FSL services and venture-funded free tiers when you assess vendor durability. Partial sync is controlled by your pull endpoint and [filtered replication](../partial-sync.md) rather than a declarative server-side rules engine, which gives you full control and also means you write that logic yourself.

- **Conflicts:** detected on push, resolved client-side by your handler (default: first-write-wins per revision).
- **Partial sync:** your pull endpoint decides what each client gets.
- **Auth:** your backend's auth, replication carries your tokens.
- **License/pricing:** Apache-2.0 core, paid premium storages/plugins.
- **Best fit:** offline-first apps in the JavaScript ecosystem that need to sync with an existing or unusual backend, multi-tab support, and reactive queries without adopting a hosted platform.

### PouchDB and CouchDB

The grandfather stack. The [CouchDB replication protocol](https://docs.couchdb.org/en/stable/replication/protocol.html) (changes feed, revision diffs, bulk docs, deterministic winner picking on revision trees) influenced nearly everything else on this page. The news in 2025: PouchDB was donated to the Apache Software Foundation and is now PouchDB (Incubating), which secures governance. The client library itself has had no release since 9.0.0 in June 2024, and the community runs triage sessions to work through the backlog. CouchDB server is healthy (3.5.2, May 2026). Pick this stack if you want a proven, self-hostable multi-master server and accept revision-tree storage overhead, converge-then-fix-up conflict handling, and a slow-moving client. RxDB [deprecated its PouchDB storage](../rx-storage-pouchdb.md) years ago for performance reasons, so my bias is on record; the HN consensus in 2025 threads was similar ("ahead of its time", but pick newer tools).

### Couchbase Lite

[Couchbase Lite](https://www.couchbase.com/products/lite/) is the enterprise survivor of the CouchDB lineage: embedded JSON database with SQL++ queries, channel-based partial sync through Sync Gateway or the hosted Capella App Services, and a 4.0 release (October 2025) that replaced revision trees with version vectors and made last-write-wins the default conflict resolution. It ships a JavaScript edition since late 2025. Two structural facts: the source is BSL 1.1 (not open source, converts to Apache-2.0 after four years per release), and Couchbase was taken private by Haveli Investments in September 2025. A solid choice for enterprises that buy support contracts; a poor fit for open-source-first projects. MongoDB's Device Sync shutdown sent many Realm refugees here and to PowerSync and Ditto.

## Family 5: CRDT-native

### Automerge and Yjs

The two mature CRDT libraries solve one problem extremely well, deterministic merging of concurrent edits, and leave the rest of the stack to you. Both are MIT-licensed and in active development.

[Automerge](https://automerge.org/) 3.0 (July 2025) was a step change: by using its compressed columnar format at runtime, memory dropped by over 10x (their example: pasting Moby Dick into a document took 700 MB in Automerge 2 and 1.3 MB in Automerge 3). Automerge keeps full edit history, which enables time travel and diffs, and automerge-repo 2.x adds storage and network adapters plus React hooks. It is stewarded by Ink &amp; Switch with institutionally funded full-time staff.

[Yjs](https://yjs.dev/) remains the default for collaborative text editing through its editor bindings (ProseMirror, Tiptap, CodeMirror, Lexical). It garbage-collects deleted content rather than keeping history, which keeps documents small. Yjs 13.6.31 shipped May 2026 and v14 is in release candidate. The commercial ecosystem around it churned: Jamsocket (y-sweet) was absorbed by Modal and is shutting down, PartyKit lives inside Cloudflare, Liveblocks open-sourced its sync engine under AGPL in February 2026, and Hocuspocus 4 (May 2026) is the healthy self-hosted server.

Use a CRDT library when collaborative documents are the product. For ordinary business data, note the practitioner skepticism: "CRDTs have been a distraction... immature and highly complex and thus hard to debug" is a representative HN take, and "Why CRDT didn't work out for xi-editor" remains a widely cited postmortem. A CRDT merges concurrent edits deterministically; whether the merged result makes business sense is still your problem.

### Jazz

[Jazz](https://jazz.tools/) wrapped CRDTs (CoValues) into a full framework with auth (passkeys), permissions, file handling and a sync server (Jazz Cloud or self-hosted). Developers who tried it called the DX "unique and highly productive" while flagging two costs: CRDT event history means storage only grows, and the auth options were passkey-centric ([field report](https://news.ycombinator.com/item?id=44833834)).

Then came the most telling pivot of 2026. [Jazz v2](https://jazz.tools/blog/what-is-jazz) (alpha, April 2026) is a Rust-core rewrite that the team itself calls a "fairly radical departure": permissions move from cryptographic enforcement to a trusted server applying policies at sync time, concurrent history moves from CRDT replay to a git-like snapshot and branching model, and the API becomes relational with query-driven partial sync and JWT-tied row-level security. The original framework lives on as classic-jazz for migrations, both MIT-licensed. Jazz is now the third project, after Electric's 2024 rewrite and Zero's never-CRDT stance, to retreat from pure CRDT architecture toward server-mediated sync once real apps needed permissions and partial sync. That pattern is the single most informative trend line in this article.

### Evolu and TinyBase

[Evolu](https://www.evolu.dev/) is a small, MIT-licensed local SQLite database with a custom CRDT (last-write-wins), end-to-end encryption with user-owned keys, and a self-hostable relay. E2EE has a structural consequence: the server cannot index or partially evaluate what it cannot read, so sync is per-owner full history. The right niche is privacy-first personal apps; the risk is a single maintainer and a v8 still in beta.

[TinyBase](https://tinybase.org/) (MIT, v8.4.2 May 2026) is a reactive in-memory store with persisters (IndexedDB, SQLite, Postgres) and synchronizers built on a mergeable-store CRDT, plus integrations with Yjs, Automerge and PowerSync. It ships consistently and is a pleasure for small to medium app state. It is a client-side store with sync plumbing, not a server-backed engine with auth and partial replication, and it is also primarily one author.

### cr-sqlite, dormant

[cr-sqlite](https://github.com/vlcn-io/cr-sqlite), the CRDT extension for SQLite, was an influential experiment: last npm release December 2023, last commits October 2024, author Matt Wonlaw moved to Rocicorp to work on Zero. Do not start new projects on it. Its ideas live on in Zero and in SQLite-CRDT successors.

## Outside the families

### LiveStore: event sourcing

[LiveStore](https://livestore.dev/) (by Prisma founder Johannes Schickling, launched May 2025) takes a third architectural path: the client commits events, not state; SQL materializers turn the event log into a local reactive SQLite database, and the event log is what syncs. Conflicts are handled by rebasing pending local events on the upstream log, like a git pull. Schema evolution becomes event versioning, and you get devtools that replay history. It is Apache-2.0, in beta (v0.4), funded through GitHub sponsors instead of venture capital, and Expo promotes it for React Native. The known limitation: one event log maps to one SQLite database, sized for tens to low hundreds of concurrent users, so shared multi-tenant data means partitioning into many stores ([review](https://johnny.sh/blog/choosing-a-sync-engine-in-2026/)). Watch this one; event sourcing dodges several conflict problems by storing intent instead of state.

### Ditto: proprietary edge mesh

[Ditto](https://ditto.live/) is what sync looks like when the requirement is "two iPads in an airplane cabin with no internet": CRDT documents syncing over Bluetooth LE, P2P Wi-Fi and LAN mesh, with optional cloud. Customers include Alaska Airlines, Delta, Lufthansa, Chick-fil-A and a US Air Force contract; it raised an $82M Series B in March 2025 at a $462M valuation, and MongoDB points former Device Sync users to it. It is closed source with enterprise pricing. For browsers and ordinary SaaS it is the wrong tool; for offline-critical co-located devices it has no real open-source competitor.

### Firestore offline persistence: a cache, not a sync engine

[Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline)'s offline mode is frequently mistaken for local-first. It is a 100 MB read/write cache: offline queries only see documents the client already read, transactions fail offline, conflict handling is hard-coded last-write-wins with no hooks and no way to detect that a conflict happened, and there is no way to declare what should be available offline. It is a resilience feature for short gaps, with full Google lock-in. See the [Firestore alternatives](./firestore-alternative.md) page for a deeper treatment.

## The graveyard

Worth a moment of silence, because each one was someone's production dependency:

- **MongoDB Atlas Device Sync / Realm Sync**: deprecated September 2024, dead September 30, 2025. The Realm SDKs survive as community-maintained local-only databases without sync.
- **Replicache and Reflect**: Rocicorp retired Reflect's servers in late 2024 and put Replicache into free maintenance mode; Zero is the successor.
- **cr-sqlite**: dormant since 2024.
- **Triplit**: cloud closed to new users after the Supabase acqui-hire in October 2025; repo quiet since January 2026.
- **Jamsocket / y-sweet hosted**: shutting down after the Modal acquisition (2025).
- **Old ElectricSQL**: the pre-2024 CRDT-based active-active product was scrapped in the rewrite.

The pattern across the graveyard: proprietary hosted sync dies with its vendor, and free products from venture-funded startups die with their pivots. The survivors are either open protocols (CouchDB replication), boring open-source libraries with sustainable funding, or enterprise products with paying customers. Weigh that when the demo looks magical.

## Comparison table

| Engine | Family | Backend | Offline writes | Conflict model | Partial sync | License | State (June 2026) |
|---|---|---|---|---|---|---|---|
| [ElectricSQL](https://electric-sql.com/) | Read-path replication | Postgres | DIY (via your API) | Yours (server-authoritative) | Shapes (single table + where) | Apache-2.0 | 1.6.x; pivoted to agents Apr 2026 |
| [PowerSync](https://www.powersync.com/) | Server-authoritative client SQLite | Postgres, MongoDB, MySQL, SQL Server | Yes (upload queue) | Yours (backend applies writes) | Sync Streams (GA May 2026) | Apache-2.0 SDKs, FSL service | Active, broad SDK coverage |
| [Zero](https://zero.rocicorp.dev/) | Query-driven, server reconciliation | Postgres | No (rejected offline) | Custom mutators rerun on server | Query-driven (core design) | Apache-2.0 | 1.0 June 2026, web-only |
| [InstantDB](https://www.instantdb.com/) | Syncing datastore | Hosted/self-hosted triple store | Yes | Server reconciliation + CEL perms | Query subscriptions | Open core | 1.0 Apr 2026, AI-apps focus |
| [RxDB](https://rxdb.info/) | Client DB + replication protocol | Any (3-endpoint contract) | Yes (native) | Client-side conflict handler | Your pull endpoint / filtered replication | Apache-2.0 core + paid plugins | v17, continuous since 2018 |
| [PouchDB/CouchDB](https://pouchdb.com/) | Client DB + replication protocol | CouchDB-compatible | Yes | Revision trees, manual fix-up | Filtered/per-user databases | Apache-2.0 | Apache incubation; client slow |
| [WatermelonDB](https://github.com/Nozbe/WatermelonDB) | Client DB + DIY sync | Your two endpoints | Yes | Per-column LWW | Your endpoints | MIT | Maintenance mode |
| [Automerge](https://automerge.org/) | CRDT library | Any (automerge-repo) | Yes | CRDT auto-merge, full history | Document-granular | MIT | 3.x, active, Ink &amp; Switch |
| [Yjs](https://yjs.dev/) | CRDT library | Providers (Hocuspocus etc.) | Yes | CRDT auto-merge, GC'd history | Document-granular | MIT | Active, v14 RC |
| [Jazz](https://jazz.tools/) | CRDT framework (v2: server-mediated) | Jazz Cloud / self-host | Yes | CRDT (v2: git-like snapshots) | Per-CoValue (v2: query-driven) | MIT | v2 alpha Apr 2026, pivoting |
| [Evolu](https://www.evolu.dev/) | CRDT + E2EE SQLite | Self-hostable relay | Yes | LWW CRDT | No (E2EE, per-owner history) | MIT | Active, solo maintainer |
| [TinyBase](https://tinybase.org/) | Reactive store + CRDT sync | Composable | Yes | Mergeable store (LWW) | Store-granular | MIT | Active |
| [LiveStore](https://livestore.dev/) | Event sourcing | Sync provider model | Yes | Event rebase (git-like) | Per-store (storeId) | Apache-2.0 | Beta v0.4, launched 2025 |
| [Ditto](https://ditto.live/) | P2P mesh + cloud | Ditto platform | Yes | CRDT merge | Channels/queries | Proprietary | $82M Series B, enterprise |
| [Firestore offline](https://firebase.google.com/docs/firestore) | Offline cache | Google Cloud | Cache-only | Hard-coded LWW | No (cache of reads) | Proprietary | Active service |
| [Couchbase Lite](https://www.couchbase.com/products/lite/) | Client DB + Sync Gateway | Couchbase | Yes | Version vectors, LWW default | Channels | BSL 1.1 | 4.0.x, private equity owned |

## What is still unsolved in 2026

Across all sixteen rows above, the same problems keep resurfacing, and it is worth being honest that nobody has cracked them.

**Permissions plus partial sync.** When there is no API layer between client and data, where do row-level rules live? Zero deprecated its declarative permissions and moved authorization back into server code. Electric tells you to put a proxy in front. PowerSync warns that client parameters must not be used for access control. The research frontier is cryptographic: Ink &amp; Switch's Keyhive project builds CRDT-based access control lists, and Martin Kleppmann calls it one of the open problems of the field ([keynote](https://martin.kleppmann.com/2025/03/31/papoc-keynote-byzantine.html)). In practice, every production system in this article enforces permissions with trusted server code.

**Schema migration against offline clients.** A client that has been offline for a month holds writes in schema version 3 while the server is on version 7. The shipped answers are all workarounds: Evolu allows only additive changes, LiveStore demands backwards-compatible events, Electric invalidates the shape and re-syncs from zero, PowerSync stores data schemaless and applies the schema as views, and RxDB ships [migration strategies](../migration-schema.md) that run per-document when the client comes back. The research answer, Ink &amp; Switch's Cambria lenses, never reached production maturity. Ask any vendor how they handle this before you sign.

**Browser-scale limits.** Practitioners hit walls between 10,000 and 100,000 rows in browser storage, and IndexedDB remains the weakest primitive in the stack (see [why IndexedDB is slow](../slow-indexeddb.md)). SQLite WASM over OPFS improved things; memory pressure for enterprise-sized datasets remains, and one camp argues sync engines are simply a poor match for enterprise data volumes. Partial sync is the only real answer, which is why every roadmap converged on it.

**Business durability.** The graveyard section is the argument. The field's own creators say it plainly: tools that work with any backend are harder to monetize than hosted platforms, which is why most sync products lock to one. Whatever you pick, demand an exit: an open license on the engine, a self-hostable server, and your data in a format you can read without the vendor.

**The AI agent angle.** The newest shift: Electric rebranded around it ("agents are not compute, agents are data, multi-agent is a sync problem"), InstantDB calls itself a backend for AI-coded apps, and Cloudflare ships agent-state sync in its Agents SDK. The claim is that agents are long-lived state that many clients observe, which is exactly the sync problem. It is too early to say which abstractions stick; it is not too early to notice that every funded player repositioned toward it within twelve months.

## How to choose

Compressing the research into recommendations, with the repeated disclaimer that I build one of these tools:

- **You have Postgres, your API stays, you want fast reads everywhere:** ElectricSQL, or Zero if you want optimistic writes with server reconciliation and accept running zero-cache.
- **You need real offline writes on mobile against Postgres/MongoDB/MySQL:** PowerSync, with your own write endpoint.
- **You want Firebase ergonomics with sync and relational queries, and a hosted platform is fine:** InstantDB.
- **You need offline-first in JavaScript against an arbitrary or existing backend, with reactive queries and multi-tab:** RxDB. PouchDB/CouchDB if CouchDB's server-side ecosystem is the requirement.
- **Collaborative documents are the product:** Yjs (text editing, biggest ecosystem) or Automerge (history, version-control semantics). Jazz if you want a batteries-included framework and accept that v2 is an alpha in the middle of an architectural pivot.
- **E2EE personal data:** Evolu.
- **Devices syncing with each other without internet:** Ditto, if the budget is enterprise.
- **You enjoy event sourcing and want devtools that replay history:** LiveStore.

And three questions to ask any vendor, learned from the 2025 casualties: Can I self-host the server under an open license? What happens to my data format if you pivot? How do schema migrations reach a client that was offline for a month?

## FAQ

<details>
    <summary>Is local-first the same as offline-first?</summary>

Local-first is the stricter term from the 2019 Ink &amp; Switch essay: the local data is the primary copy and software keeps working if the vendor disappears. Offline-first is the pragmatic subset most production apps implement: a client database plus background sync with an authoritative server. Most engines in this article, including Zero by its own admission and most RxDB setups, are offline-first/sync-engine systems rather than pure local-first. See the [downsides of offline-first](../downsides-of-offline-first.md) for the costs of either approach.

</details>

<details>
    <summary>Do I need CRDTs for a local-first app?</summary>

Only if multiple writers edit the same data concurrently and you cannot route conflicts through a server. For client-server apps, server reconciliation (Zero), server-authoritative writes (PowerSync, Electric) or client-side conflict handlers (RxDB) are simpler to reason about and easier to debug. CRDTs shine for collaborative documents and peer-to-peer topologies. The xi-editor postmortem and the 2024-2026 HN threads are good antidotes to CRDT maximalism.

</details>

<details>
    <summary>What replaced MongoDB Atlas Device Sync after the shutdown?</summary>

MongoDB formally partnered with PowerSync (October 2024) and Ditto as migration paths. Couchbase and ObjectBox also market migration programs, and RxDB ships a [MongoDB replication plugin](../replication-mongodb.md). The Realm SDKs themselves continue as community-maintained local-only databases without any sync capability.

</details>

<details>
    <summary>Which sync engine is the most mature?</summary>

Depends on the axis. The CouchDB replication protocol has run in production since around 2010. Among modern engines, PowerSync inherits a decade of industrial deployments, RxDB has shipped continuously since 2018, and Yjs/Automerge are the proven CRDT cores. The youngest are Zero (1.0 in June 2026), Jazz v2 (alpha, April 2026) and LiveStore (beta, launched 2025).

</details>

<details>
    <summary>Why does every comparison article disagree about categories?</summary>

Because the field has at least three live taxonomies: product shape (sync engine vs syncing datastore, Boodman), mechanism (rebasing strategy and operation type, Weidner), and dimensions (size, update rate, consistency and six more, Jayakar's "Map of Sync"). The same tool lands differently in each. This article groups by architecture family because that is what determines your write path, your auth story and your migration story, the three things that bite in production.

</details>
