# RxDB Feature Research & Brainstorm

A deep brainstorm of new feature ideas for RxDB, grounded in what already
exists in `src/plugins/`, what's already listed in
[`orga/BACKLOG.md`](./BACKLOG.md), and what is missing relative to peers in
the local-first / sync-engine space (Replicache/Zero, ElectricSQL, Triplit,
Jazz, InstantDB, PowerSync, Automerge/Yjs, WatermelonDB, LiveStore,
PouchDB, Turso embedded replicas).

Ideas already on `BACKLOG.md` are flagged so they are not double-counted.
Each idea includes the rough scope, why it matters, and the smallest
shippable slice.

---

## 1. AI / LLM stack on top of RxDB

The `src/plugins/vector/` module today is essentially a `type Vector = number[]`
plus distance functions. There is a large opportunity to make RxDB the
default local-first database for on-device AI apps, since RxDB already
handles persistence, reactivity, replication, and multi-tab coordination,
which every "local RAG" app re-implements badly.

### 1.1 Vector index plugin (HNSW / IVF on top of any RxStorage)
- Persist an HNSW or IVF-PQ index in a sibling collection or attachment
  blob, kept consistent via collection hooks.
- Reactive `db.docs.findNearest(queryVector, { k, filter })` that emits
  when matching documents change.
- Hybrid search: combine BM25 from the fulltext-search plugin with
  cosine similarity (Reciprocal Rank Fusion).
- Smallest slice: brute-force cosine over a cached `Float32Array` view of
  one field, with incremental updates on bulkWrite. HNSW is phase two.

### 1.2 Embedding pipeline plugin
- A first-class `embeddingPipeline({ field, model, output })` built on the
  existing `pipeline` plugin. Auto-recomputes embeddings when the source
  text changes; survives offline (queues until model is reachable).
- Pluggable backends: Transformers.js (local), Workers AI, OpenAI,
  Anthropic, Voyage, Cohere. The point is not to ship every adapter, it
  is to standardise the contract.
- Survives schema migrations via a "model version" field so re-embedding
  is incremental.

### 1.3 RAG primitives
- `rxRetrieve({ query, collections, k, hybrid: true })` returning ranked
  documents with citations (collection name + primary key + score).
- Optional MCP tool that wraps it, so the existing `webmcp` plugin can
  expose "search my data" to an agent in one line.

### 1.4 LLM-aware change feed
- Surface `collection.aiSummary$`: a debounced observable that ships
  recent changes through an LLM-supplied summariser. Useful for activity
  feeds, audit logs, "what happened while I was offline" UIs.

### 1.5 MCP server endpoint for RxServer (already on BACKLOG)
- Pair with WebMCP so the same tool schema works locally (in-browser
  agent) and remotely (server-hosted agent).

### 1.6 Agent memory plugin (opinionated schemas + retrieval)
- The 2026 consensus is that production AI agents need a layered
  memory system: working memory (recent turns), episodic memory
  (past conversations), semantic memory (long-term facts). Every
  agent framework re-implements this on SQLite + a vector store.
- An `rxdb/plugin-agent-memory` that ships the schemas, retrieval
  policies, and a `useAgentMemory({ agentId })` hook on top of §1.1
  and §1.2 would be a turnkey local-first memory layer with sync
  across devices for free. Differentiates RxDB from raw vector
  stores like LanceDB or pgvector.

---

## 2. Storage adapters (closing gaps + emerging platforms)

### 2.1 Tauri 2 storage (`storage-tauri`)
- RxDB has `electron`, `capacitor-database`, `flutter`, Expo filesystem,
  but no first-class Tauri storage. Tauri 2 ships its own SQL plugin and
  filesystem APIs; an adapter would unblock the entire Rust-desktop crowd.

### 2.2 ReactNative-MMKV storage (on BACKLOG)
- Faster than AsyncStorage, smaller than SQLite for small docs; great
  fit for settings/state collections.

### 2.3 PostgreSQL / PGLite / PostgREST replication (on BACKLOG)
- PGLite specifically is a high-leverage win because it lets the *same*
  schema run in the browser and on the server, which closes the
  "isomorphic local-first" loop ElectricSQL marketed heavily.

### 2.4 Turso / libSQL embedded replicas as a replication adapter
- Turso ships embedded replicas that auto-sync via the server. An
  RxDB replication plugin that targets libSQL's HTTP protocol would
  give RxDB users a managed sync backend with zero ops.

### 2.5 Cloudflare D1 + Durable Object SQLite
- Two angles: (a) Durable Object SQLite as a **server-side storage
  adapter** so RxDB collections can live inside a DO, one DO per tenant
  or per workspace. (b) D1 for warm read replicas and DOs as the
  sync coordinator. Electric's Cloudflare DO demo and TanStack DB's
  built-in DO adapter show this is now table stakes for edge-deployed
  local-first apps.

### 2.6 Cloudflare R2 / S3 attachment store
- Attachments today live next to documents in the storage. An adapter
  that streams attachment binaries to/from S3-compatible storage with
  signed URLs would let RxDB hold metadata locally while the heavy
  blobs live in object storage.

### 2.7 Bun SQLite + Deno KV improvements
- Bun's built-in `bun:sqlite` is faster than `better-sqlite3`. A
  dedicated adapter avoids the Node compatibility shim cost.

### 2.8 Event-log / event-sourced storage adapter
- LiveStore's design: data is an append-only event log, materialised
  into SQLite views. Benefits: deterministic replay, free time-travel,
  server-side reconciliation without CRDTs, dramatically better
  devtools (see §5.1). RxDB's revision system is already close to
  this; an opt-in `storage-eventlog` adapter that exposes the log as
  a first-class artifact would unlock the same primitives without
  rewriting the core. Pairs with §6.1 (time-travel) and §3.3 (rebase).

---

## 3. Sync model improvements

### 3.1 Query-driven partial sync (the dominant 2026 pattern)
- Zero, ElectricSQL Shapes, and TanStack DB have converged on the same
  primitive: the client declares a regular query, the server streams
  only matching rows plus subsequent deltas, and the result is
  CDN-cacheable. RxDB's `partial-sync.md` recipe asks users to wire
  this up manually with one replication state per scope.
- Proposed primitive: `db.users.syncQuery(mangoQuery)` that returns a
  replication state bound to a server-side "shape" endpoint. Multiple
  shapes share one transport. Closes the gap to Electric/Zero in a
  single feature.

### 3.2 Server-driven sync rules / row-level filters
- Adjacent to 3.1: a declarative `syncRules` DSL on the server that
  expresses "user X can see rows where tenant_id = X". Maps cleanly
  onto the existing replication protocol and the `serverOnlyFields`
  machinery already in RxServer.

### 3.3 Server-authoritative rebase-on-conflict
- Zero's headline conflict story: client writes optimistically, server
  re-runs the mutation against its current state, client rebases. This
  avoids the "every collection needs a custom conflict handler"
  ergonomic problem and removes a lot of CRDT-vs-server-truth confusion
  (see Cinapse's "why we moved away from CRDTs" post).
- Implementable as a built-in `conflictHandler: 'rebase'` strategy plus
  an opt-in server-side mutator registry.

### 3.4 Bidirectional / mixed-version schema migrations
- Today schemas are versioned per device. A new client on v5 talking to
  peers or a server on v3 has no good story.
- Bidirectional migrations: every migration strategy declares both
  forward and backward transforms. Server-mediated schema negotiation
  during the replication handshake then lets clients on N-1 keep
  syncing while v5 writes are downcasted on the fly.

### 3.5 Differential / patch-based replication
- Send JSON-Patch ops instead of full docs over the wire. Reuses the
  CRDT plugin's op log infrastructure but applies to plain JSON. Big
  bandwidth win for documents with large arrays or embeddings.

### 3.6 Background sync via the Background Sync API + Web Push
- A plugin that registers a service worker and resumes paused replications
  when the browser fires `sync` events, even with the tab closed. Pair
  with Web Push so the server can wake a client to pull urgent updates.

### 3.7 Replication health / observability standard
- Standardised RED metrics (rate, errors, duration) exposed via the
  logger plugin: pull lag, push backlog, conflict rate, retry budget.
  Today every user rolls these on top of `error$`/`active$`.

### 3.8 Presence / awareness layer (like Yjs `awareness`)
- For multiplayer apps: who's online, cursor positions, selection
  ranges. Doesn't need to be persisted; piggybacks on the WebRTC or
  WebSocket replication channel. Today RxDB users reach for Liveblocks
  for this even when they already have replication wired up.

### 3.9 Redis / Pocketbase / PostgREST plugins (on BACKLOG)
- All three have steady community demand on Discord/GitHub.

### 3.10 Optional Yjs / Automerge field type (selective CRDT)
- Notion's pattern: rich text and lists are CRDTs, everything else is
  server-authoritative. The existing CRDT plugin is whole-document.
  A `field: { crdt: 'yjs' | 'automerge' }` annotation that swaps in
  CRDT merge for just that field would let users keep simple
  reconciliation everywhere else and only pay the CRDT cost for
  collaborative rich-text or list fields.

### 3.11 Storage quota / eviction handling
- Browsers can silently evict IndexedDB / OPFS under pressure, which
  corrupts the local-first contract. A `storage.onEvictionRisk$`
  observable and a `navigator.storage.persist()` helper baked into
  storage adapters would make this visible and recoverable instead
  of a silent footgun.

---

## 4. Query engine

### 4.1 Query normalizer + optimizer package (on BACKLOG, big)
- Listed in `BACKLOG.md` with a great spec already. This is probably
  the single highest-leverage internal change: a real optimiser would
  improve every storage adapter at once.

### 4.2 Materialised views / persisted derived queries
- `db.derive('topUsers', { source: db.users, pipeline: [...] })` that
  maintains a separate collection updated by the existing `pipeline`
  plugin under the hood. Reactive joins fall out for free.

### 4.3 Reactive joins / population caches
- `populate()` exists but isn't reactive across changes in the joined
  collection. A `populate$()` variant that re-emits when *either* side
  changes, with batched cache invalidation.

### 4.4 Geospatial index + queries
- `geoNear`, `geoWithin` over GeoJSON points. Implementable as a
  geohash-prefix index using existing string-index machinery.

### 4.5 Time-series collection type
- Collection with retention windows, automatic downsampling rollups,
  and append-only optimisation. Mostly useful for metrics, IoT, and
  analytics dashboards inside an RxDB app.

### 4.6 Stable cursors / async iterators for large scans
- `for await (const doc of collection.find().cursor())` that doesn't
  materialise the full result set. Today large `find().exec()` calls
  can OOM on mobile.

### 4.7 Recursive populate / typed graph traversal
- `populate({ depth: 3 })`. Already-typed via the schema's `ref`
  fields, so the result type can be inferred.

### 4.8 End-to-end TypeScript inference for Mango selectors
- Triplit and Zero both make "your query types your result" a
  headline feature. Today RxDB's Mango selectors lose type info: the
  selector accepts any string field name and the result type isn't
  narrowed by `select` projections.
- A typed Mango builder where `find({ selector: { age: { $gt: 5 } } })`
  errors when `age` isn't a number, and `.select(['name'])` returns
  `RxDocument<Pick<T, 'name'>>`. Removes the single most-cited DX
  paper cut in onboarding.

---

## 5. Developer experience

### 5.1 Database inspector / dev UI (on BACKLOG)
- The single most-requested feature on Discord. Two flavours:
  - **In-browser devtool**: floating panel that lists collections,
    documents, replication states, query cache; with edit / delete.
  - **Standalone Electron / Tauri app** that connects to a running
    RxServer or to a remote tab via the `storage-remote` plugin.
- Shippable as `rxdb-devtools` so it can iterate independently of core.

### 5.2 Schema generators from Zod / Valibot / ArkType / Effect Schema
- Today users write JSON Schema by hand and re-declare types in Zod for
  form validation. A two-way generator (`fromZod`, `toZod`) eliminates
  the duplication and is a top developer-experience pain point.

### 5.3 First-class Svelte 5 / Solid / Qwik / Vue Vapor reactivity
- Has React, Vue, Angular, Preact. Svelte 5 runes and Solid signals are
  the two most-requested missing bindings. Both are tiny adapters on
  top of the existing reactivity hook.

### 5.4 Test utils: snapshot / fork / seed helpers
- `db.fork()` that produces an in-memory copy of any storage instance,
  for test isolation. Already half-implementable using the memory
  storage + replication, but no public API.

### 5.5 Storybook / Playwright fixtures
- Seedable `MockRxDatabase` plus a Vite plugin that resets state between
  tests. Drops the boilerplate every project re-invents.

### 5.6 Error catalog as IDE tooling
- The error-code system (`SC1`, `PL1`, etc.) is great but discoverability
  is poor. A TypeScript LSP plugin or VSCode extension that hovers any
  error code and links to docs + likely fix would lift the perceived
  quality bar a lot.

---

## 6. Data model features

### 6.1 Time-travel / audit log plugin
- Append-only change log per collection with `db.users.history(id)`
  and `db.users.at(timestamp)`. Implementable on top of the existing
  revision system.

### 6.2 Undo / redo primitive
- One-line `db.undo()` / `db.redo()` scoped to a session, built on
  6.1. Major win for editors, forms, drawing apps.

### 6.3 Soft-delete + retention policies
- Configurable retention per collection: keep deleted documents for N
  days, then purge via the cleanup plugin. Today it's binary.

### 6.4 Branch / merge for offline scenarios
- Optional opt-in "draft branch" per user that holds changes until they
  are accepted on commit. Useful for "save as draft", "review before
  publish" flows. Builds on the existing replication checkpoint logic.

### 6.5 Schema-level access control (client-side hints)
- `field: { readableBy: 'owner', writableBy: 'admin' }` that the
  RxServer can enforce and the client can use to dim fields in dev-mode
  warnings.

### 6.6 Sub-document references with cascading deletes
- Schema declares `onDelete: 'cascade' | 'restrict' | 'set null'`,
  enforced at write time. Today users implement this in collection hooks.

### 6.7 Composite / multi-collection transactions
- `db.transaction(['users', 'orders'], async tx => ...)` with rollback
  semantics. Already half-supported by bulkWrite atomicity within one
  collection, just needs cross-collection coordination.

### 6.8 Conflict UI primitive
- Standard conflict handler that returns `{ mine, theirs, base }` so
  apps can render a three-way merge UI. Today the conflict handler
  contract is correct but unfriendly for human resolution.

---

## 7. Security / multi-tenancy

### 7.1 Per-document encryption keys
- Today the `encryption-crypto-js` plugin uses one password per
  database. A key-per-document or key-per-tenant scheme unlocks
  end-to-end encrypted multi-tenant apps without separate databases.

### 7.2 Encrypted indices
- Searchable encryption (deterministic for `$eq`, order-preserving for
  `$gt`/`$lt`) so queries work over encrypted data. Niche but a real
  requirement for healthcare / finance customers and a premium-tier fit.

### 7.3 Audit log signed with WebCrypto
- Tamper-evident change log: each entry signed with the user's device
  key, replicated alongside the data. Pairs with 6.1.

### 7.4 OAuth/JWT-aware replication middleware
- Today every replication plugin reimplements auth header handling.
  A `withAuth({ refreshToken, onUnauthorized })` higher-order wrapper
  around `replicateRxCollection` that handles token refresh, retries,
  and 401 backoff in one place.

---

## 8. Performance

### 8.1 Hot / cold tiering
- Hot working set in memory, cold pages in OPFS/SQLite, transparent
  promotion on access. Today users hand-roll this with two collections
  and a pipeline.

### 8.2 Multi-reader single-writer in one tab
- Many subscribers, one writer worker — reduces lock contention in
  React apps that re-render aggressively. Adjacent to the existing
  Worker / SharedWorker premium plugins.

### 8.3 Read-replicas across tabs
- Leader-election plugin already exists. Add an opt-in "secondary"
  mode so non-leader tabs read from an in-memory mirror that the leader
  streams writes to, eliminating cross-tab IndexedDB roundtrips.

### 8.4 JSON1 in SQLite when available (on BACKLOG)
- Listed in `BACKLOG.md`. PowerSync's blog post measured order-of-
  magnitude wins.

### 8.5 Batched UI updates (`liveQueryUpdateThrottleTime` already beta)
- Promote to stable. Add per-query throttle policies (`leading`,
  `trailing`, `requestIdleCallback`-based).

---

## 9. Server-side / edge

### 9.1 RxServer as a Cloudflare Worker / Bun / Deno Deploy target
- Today RxServer ships Fastify and Koa adapters (Pro Plus). Edge-runtime
  adapters open up the "deploy your sync server to the edge" story.

### 9.2 Auto-scaling RxServer with stateless replication
- Replication checkpoints stored in Redis or D1 so multiple RxServer
  instances can share load. Today each instance is implicitly sticky.

### 9.3 RxServer MCP endpoint (on BACKLOG)
- Already mentioned in 1.5. Worth restating as a server feature too.

### 9.4 Server-side hooks / triggers / cron
- `db.users.onWrite(...)`, `db.orders.cron('0 * * * *', ...)` as
  first-class primitives in RxServer. Today this is DIY around the
  existing `eventBulks$` stream.

### 9.5 Swagger / OpenAPI generation from schemas (on BACKLOG)
- `BACKLOG.md` says "tool to generate sync endpoints in swagger".
  Generalise to OpenAPI 3 + Postman collection + a TypeScript client.

---

## 10. Ecosystem & integrations

### 10.1 Adapters package for popular framework data layers
- Drop-in adapters for TanStack Query, SWR, Tanstack DB, Apollo cache.
  Most users still build their own RxDB-to-TanStack-Query bridge.

### 10.2 OpenTelemetry export
- Premium logger plugin already targets Sentry / Datadog / Bugsnag /
  Elastic. Adding OTLP would make it portable to any observability
  backend with one extra adapter.

### 10.3 First-class Next.js App Router story
- An `rxdb/next` integration that handles SSR/RSC boundaries, hydration,
  and the server-component data-fetching pattern. Next is the single
  largest React deployment surface and currently the integration story
  is "use it like any client lib", which loses to InstantDB / Zero.

### 10.4 Astro / Nuxt / SolidStart bindings
- Smaller but cheap once Next is done.

### 10.5 Drizzle / Prisma schema converter
- Bidirectional converter so server-side ORMs and RxDB schemas stay in
  sync. Pairs with 5.2.

---

## Suggested prioritisation

If I had to pick six to ship in the next two minor releases, ordered by
leverage-per-effort:

1. **Query-driven partial sync** (§3.1) — the dominant 2026 pattern
   that Zero, Electric Shapes, and TanStack DB have all converged on.
   This is the biggest single differentiator gap and the feature
   most-cited by users evaluating RxDB vs alternatives.
2. **Query optimizer package** (§4.1) — improves every storage at once,
   spec already exists on `BACKLOG.md`.
3. **Database inspector / devtools** (§5.1) — highest user pull, listed
   on `BACKLOG.md`, unblocks a lot of debugging support cost. LiveStore
   has raised the bar here.
4. **Vector index + embedding pipeline + agent memory** (§1.1, §1.2,
   §1.6) — turns the vector-plugin stub into a real differentiator
   while the AI wave is still cresting.
5. **Server-authoritative rebase-on-conflict** (§3.3) — removes the
   biggest CRDT-vs-server-truth confusion point and matches Zero's
   conflict story.
6. **End-to-end TS inference for Mango** (§4.8) + **Zod schema
   generator** (§5.2) — pair of cheap DX wins that remove the most-
   cited onboarding paper cuts.

Lower-priority but high-leverage candidates for the release after:
**Tauri storage** (§2.1), **Durable Object SQLite adapter** (§2.5),
**event-log storage** (§2.8), **presence layer** (§3.8), **bidirectional
migrations** (§3.4), **Svelte 5 / Solid bindings** (§5.3), **time-travel
plugin** (§6.1), **PGLite replication** (§2.3).

## Key external references

- Zero docs — sync model and rebase-on-conflict: `zero.rocicorp.dev/docs/sync`
- ElectricSQL Shapes — query-driven sync: `electric-sql.com/docs/guides/shapes`
- TanStack DB 0.6 — persistence and includes: `tanstack.com/blog/tanstack-db-0.6-app-ready-with-persistence-and-includes`
- LiveStore — event sourcing + devtools: `docs.livestore.dev/evaluation/event-sourcing/`
- Turso Sync benchmark: `turso.tech/blog/sync-benchmark`
- State of AI Agent Memory 2026: `mem0.ai/blog/state-of-ai-agent-memory-2026`
- Cinapse: why we moved away from CRDTs: `powersync.com/blog/why-cinapse-moved-away-from-crdts-for-sync`
- RxDB local-first future: `rxdb.info/articles/local-first-future.html`
- Cloudflare Durable Object SQLite + Electric demo: `github.com/KyleAMathews/electric-demo-cloudflare-sqlite`
- Jazz architecture: `jazz.tools/blog/what-is-jazz`
- Triplit 1.0 announcement: `triplit.dev/blog/triplit-1.0`
