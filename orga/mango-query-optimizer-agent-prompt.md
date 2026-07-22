# Agent Prompt: Build the `mango-query-optimizer` npm package

You are building a new, standalone npm package that normalizes and optimizes
MongoDB-style (Mango) queries. It must work for RxDB but also for other NoSQL
databases like MongoDB, CouchDB and PouchDB. This prompt is self-contained:
it lists the goal, the API, the complete rewrite-rule catalog with correctness
guards, the testing strategy and the performance-test setup.

## 1. Goal and constraints

- Package name: `mango-query-optimizer` (check npm availability first, fallback `mango-query-normalizer`).
- Language: TypeScript. Do not use enums, prefer `type` over `interface`.
- Zero runtime dependencies. Dev dependencies are fine.
- Pure functions only. Never mutate the input query object. Deep-clone or build new objects.
- Ship ESM and CJS builds plus `.d.ts` typings. Node >= 18. Must also run in browsers.
- The package rewrites query objects BEFORE execution. It never executes queries itself.
- Input type (subset, keep compatible with RxDB and MongoDB drivers):

```ts
export type MangoQuery = {
    selector: MangoSelector;
    sort?: { [field: string]: 'asc' | 'desc' }[];
    skip?: number;
    limit?: number;
    index?: string | string[];
};
```

- Optional schema input: JSON Schema (draft-07 subset: `type`, `enum`, `required`,
  `minimum`, `maximum`, `maxLength`, `properties`, nested objects). RxDB provides
  such schemas; MongoDB users may not have one. Every rule is classified as
  schema-free (always on) or schema-dependent (only on when a schema is given).

## 2. Public API

```ts
// Canonical form only, no semantic changes. Deterministic output.
export function normalizeMangoQuery(query: MangoQuery): MangoQuery;

export type OptimizeOptions = {
    schema?: JsonSchema;
    primaryKey?: string;
    // 'mongodb': full MQL semantics (missing fields, type bracketing, arrays).
    // 'plain-js': simple JS comparison semantics (RxDB storages, mingo-like).
    semantics: 'mongodb' | 'plain-js';
    // which passes to run; default: all that are legal for the given inputs
    passes?: string[];
    maxPassLoops?: number; // fixpoint bound, default 10
};

export type OptimizeResult = {
    query: MangoQuery;
    // true when the query can never match any document.
    // Callers short-circuit to an empty result without hitting storage.
    neverMatch: boolean;
    hints: ExecutionHints;
    appliedRules: string[]; // for debugging and tests
};

export function optimizeMangoQuery(query: MangoQuery, options: OptimizeOptions): OptimizeResult;

// Value-agnostic canonical string for plan caching
// (same shape for {a: 1} and {a: 2}; different shape for different operators/fields).
export function getQueryShape(query: MangoQuery): string;

export type ExecutionHints = {
    // set when selector has $eq (or single-value $in) on the primary key:
    // fetch by id, then post-filter with `postFilterSelector`.
    findById?: { id: any; postFilterSelector?: MangoSelector };
    // derived index bounds per field, e.g. from prefix $regex
    addedRestrictiveOperators?: string[]; // field paths that got injected bounds
    sortSatisfiedByIndex?: boolean; // only when `index` given
};
```

Architecture requirements (lessons from production optimizers):

- Each rule is a named, pluggable pass (MongoDB keeps normalization behind a
  separate `normalizeMatchExpression()`; copy that separation).
- Run passes in a loop until a fixpoint is reached (rewrites unlock further
  rewrites: `$in` single item to `$eq` unlocks `$eq`-vs-range intersection,
  which unlocks contradiction detection). Bound the loop with `maxPassLoops`.
- After the fixpoint, emit a stable deterministic ordering (sorted field names,
  sorted operator keys, sorted `$in` values). MongoDB shipped a critical
  wrong-results bug (SERVER-84013) because a pass kept reordering predicates
  that a later stage depended on. Order must be stable at the output boundary.
- Represent never-match as a result flag, not as a magic selector value.

## 3. Rule catalog

### 3.1 Normalization (schema-free, no semantic change)

| Rule | Before | After |
|---|---|---|
| Shorthand to `$eq` | `{foo: 'bar'}` | `{foo: {$eq: 'bar'}}` |
| Flatten nested `$and`/`$or` | `{$and: [A, {$and: [B, C]}]}` | `{$and: [A, B, C]}` |
| Collapse single-operand logical | `{$and: [A]}` | `A` |
| Drop neutral children | always-true child in `$and` removed; always-false child in `$or`/`$nor` removed; always-true child in `$or` collapses `$or` to always-true | |
| Lift top-level `$and` into root | `{$and: [{a: {$eq: 1}}, {b: {$eq: 2}}]}` | `{a: {$eq: 1}, b: {$eq: 2}}` (only when field paths do not collide) |
| Deterministic ordering | any key order | sorted fields, sorted operators, sorted `$in` values |
| Fill defaults | missing `skip` | `skip: 0` |

Recurse into `$and`, `$or`, `$nor`, `$not` and `$elemMatch` sub-selectors when
normalizing shorthands. Never recurse into operator payloads like
`{$regex: 'x', $options: 'i'}`.

### 3.2 Schema-free optimizations

All verified against the MongoDB `MatchExpression` optimizer and the MySQL 8.0
range optimizer:

1. **`$in` canonicalization**
   - `{f: {$in: ['x']}}` -> `{f: {$eq: 'x'}}`
   - `{f: {$in: []}}` -> neverMatch for this conjunct
   - `$in` with exactly one regex and no equality values -> `$regex`
   - mixed regex+values `$in`: leave untouched
2. **`$or` of same-field equalities -> `$in`**
   - `{$or: [{name: {$eq: 'Don'}}, {name: {$eq: 'Alice'}}]}` -> `{name: {$in: ['Alice', 'Don']}}`
   - Guards: at least two disjuncts share the path; all share the same collation;
     never fold `$eq` whose operand is a regex value (`$eq: /x/` compares the
     regex literally, `$in: [/x/]` matches the pattern). Plain `$regex`
     disjuncts on the same path may be folded in.
3. **Interval arithmetic on `$gt`/`$gte`/`$lt`/`$lte`**
   - `$and` = intersection: `{$gt: 3}` + `{$gt: 5}` -> `{$gt: 5}` (subsumption);
     `{$gte: 5}` + `{$gt: 5}` -> `{$gt: 5}`
   - empty intersection -> neverMatch: `{age: {$gt: 10, $lt: 5}}`
   - `$or` = union: `{$or: [{k: {$lt: 'abc'}}, {k: {$lt: 'bar'}}]}` -> `{k: {$lt: 'bar'}}`
   - `$eq` vs range: keep `$eq` if inside, neverMatch if outside
   - `$in` vs range: drop non-matching values, then re-apply rule 1
   - GUARD: under `semantics: 'mongodb'` this is only legal when the schema says
     the field is not an array (`{a: {$gt: 10, $lt: 5}}` matches `a: [3, 20]`
     because different elements satisfy each bound). Under `'plain-js'` it is
     always legal. Cross-type comparisons follow BSON type bracketing under
     `'mongodb'`; do not fold across type brackets.
4. **Duplicate predicate dedup**: identical conjuncts in `$and` collapse to one.
5. **Complement-law contradiction detection**
   - `$eq: X` + `$ne: X` on the same field -> neverMatch (safe in MQL because
     `$ne` is the exact negation of `$eq`, including missing fields and arrays)
   - `{$or: [{$and: [{a: {$eq: 1}}, {a: {$ne: 1}}]}, {b: {$eq: 2}}]}` -> `{b: {$eq: 2}}`
   - Do NOT treat `$gt: X` / `$lte: X` as complements (missing fields match neither).
6. **`$not`/`$nor` normalization (De Morgan)**
   - `{$nor: [A, B]}` -> `{$and: [{$not: A}, {$not: B}]}` (internal form)
   - `$not: {$in: [...]}` <-> `$nin: [...]` (safe both ways)
   - `$not: {$gt: x}` -> `$lte: x` ONLY when schema marks the field required and
     non-array; otherwise leave it (missing-field semantics differ)
7. **Optional advanced pass: guarded DNF boolean simplifier**
   - bitset DNF + Quine-McCluskey + absorption law + Petrick's method
   - MUST estimate the resulting term count before each transformation and skip
     the pass when too high (DNF is worst-case exponential; 20 predicates
     already mean over a million truth-table entries). Ship it off by default,
     opt-in via `passes`.

### 3.3 Schema-dependent optimizations

1. **Impossible `$eq` vs schema** -> neverMatch: value not in `enum`, wrong
   `type`, string longer than `maxLength`, number outside `minimum`/`maximum`.
2. **Enum rewrites**: on an enum field, rewrite range/other operators to `$in`
   of matching enum values. Enum `['idle', 'in-progress', 'done']`:
   `{status: {$gt: 'done'}}` -> `{status: {$in: ['idle', 'in-progress']}}`
   (compare with the target semantics' string ordering). An `$in` containing
   ALL enum values of a required field is a tautology: drop the conjunct.
3. **Boolean fields**: `{done: {$ne: true}}` on a required boolean ->
   `{done: {$eq: false}}`.
4. **`$exists`/`$type` folding**: `$exists: true` on a required field is a
   tautology (drop); `$exists: false` on a required field -> neverMatch;
   `$type` folds to true/false against the schema type.
5. **Bound clamping**: clamp `$gt`/`$gte`/`$lt`/`$lte` to schema
   `minimum`/`maximum`; a bound strictly outside the range makes the predicate
   a tautology (drop) or neverMatch.
6. **Array-legality gate** for rule 3.2.3 as described above.

### 3.4 Execution hints (no selector change, emitted as `hints`)

1. **Primary-key fast path**: `$eq` (or single-value `$in`) on the primary key
   plus other operators -> `hints.findById = {id, postFilterSelector}` where
   `postFilterSelector` contains the remaining operators.
2. **Prefix `$regex` to range**: case-sensitive regex starting with `^` (or
   `\A`) followed by literal characters injects `$gte: prefix` and
   `$lt: prefix + '￿'` next to the `$regex` (kept as post-filter). Only
   literal prefixes (stop at the first regex metacharacter), never with the
   `i` flag. Record the field in `hints.addedRestrictiveOperators`.
3. **Restrictive operator injection from `$or` branches**: when every `$or`
   branch constrains the same field, inject the loosest common bound at the top
   level: `{$or: [{time: {$gt: 1234}}, {time: {$eq: 1234}, user: {$gt: 'foobar'}}]}`
   gains `time: {$gte: 1234}`. Same for enum `$in` sets (inject `$gte` of the
   smallest and `$lte` of the largest value).
4. **`sortSatisfiedByIndex`**: when `index` is provided and the sort is a prefix
   of the index in ascending order (fields with `$eq` on boolean/enum values may
   be skipped as sort-irrelevant), set the hint so callers skip re-sorting.

### 3.5 `$elemMatch`

Recurse with all rules into the inner selector, but NEVER lift predicates out
of `$elemMatch` (element-scoped vs document-scoped matching differs). Skip
`$size`/`$all` rewrites in v1.

### 3.6 Query shape for caching

Produce a value-agnostic string: operators and field paths, values replaced by
placeholders, sections for selector/sort/skip-limit/index separated by `|`
(model: MongoDB encodes `find({a: 1, b: 2}).sort({c: 1})` as
`an[eqa,eqb]|ac|||fc`). Document that a real plan-cache key must additionally
include schema and index versions.

## 4. Correctness tests

Use vitest or mocha. Structure:

1. **Unit tests per rule**: table-driven before/after pairs, one file per pass.
   Also test that guards HOLD: e.g. `$eq: /x/` is not folded into `$in`,
   `$not: {$gt: x}` is not flipped without schema, mixed regex `$in` untouched.
2. **Idempotency and determinism**:
   - `optimize(optimize(q).query)` equals `optimize(q).query` for all fixtures.
   - Shuffling object key order and `$and` array order of the input produces
     byte-identical normalized output and the identical query shape.
3. **Property-based equivalence testing (the core safety net)**, with
   fast-check:
   - Generate a random JSON schema (or use a handful of fixed schemas covering
     strings, numbers, booleans, enums, optional fields, arrays, nested paths).
   - Generate ~1000 random documents per schema, deliberately including missing
     fields, `null` values, arrays, and boundary values used in the queries.
   - Generate random selectors from the supported operator set, including
     nested `$and`/`$or`/`$nor`/`$not` up to depth 3.
   - Oracle A (`plain-js` semantics): filter the documents with mingo using the
     ORIGINAL query and with the OPTIMIZED query; the matched document-id sets
     must be identical. When `neverMatch` is true, the original query must
     match zero documents.
   - Oracle B (`mongodb` semantics): same equivalence against a real MongoDB
     (see below). This is the authority for missing-field, array and
     type-bracketing semantics; do not trust mingo for those cases.
4. **MongoDB equivalence harness**: use `mongodb-memory-server` (spawns a real
   `mongod`, no Docker needed) in CI. Insert the generated documents, run
   `collection.find(originalSelector)` and `collection.find(optimizedSelector)`,
   compare sorted `_id` lists. Run the full property-based suite through this
   at lower iteration counts (e.g. 200 queries per schema) and nightly at high
   counts.
5. **RxDB equivalence harness**: add `rxdb` as dev dependency, create a
   collection with the memory storage, insert the same documents, run
   `collection.find({selector: original}).exec()` vs the optimized query,
   compare primary-key sets. Also assert that queries flagged `neverMatch`
   return `[]` from RxDB.
6. **Semantics-flag tests**: cases where `'mongodb'` and `'plain-js'` must
   differ (array field range intersection, `$ne` on missing fields) with
   explicit expected outputs per flag.
7. **Known-bug regression fixtures**: encode the SERVER-84013 lesson as a test:
   run the optimizer twice, assert predicate order stable; encode the collation
   guard and the `$eq`-regex guard as dedicated fixtures.

CI: lint (eslint), `tsc --noEmit` type check, unit + property tests on Node 18/20/22,
MongoDB harness job, coverage report (target: 100% branch coverage on the rule passes).

## 5. Performance tests

Two separate questions, two separate suites:

### 5.1 Optimizer overhead (micro-benchmarks)

The optimizer runs on every query, so its own cost matters, especially for
client-side databases.

- Use `tinybench` (or `mitata`).
- Benchmark `normalizeMangoQuery` and `optimizeMangoQuery` on: a trivial
  selector (1 field), a typical selector (3 fields, one `$in`, one range), a
  deep selector (nested `$or`/`$and`, 20 predicates).
- Budget: typical query under 20 microseconds, deep query under 200
  microseconds on a current laptop. Fail the benchmark script when a budget is
  exceeded by more than 3x (loose gate, hardware varies).
- Store results as JSON in `perf-results/` so regressions are visible in PRs.

### 5.2 Optimization effect vs MongoDB

Measure that the rewrites make real queries cheaper, not only prettier.

- Setup: `mongodb-memory-server` or a local `mongod`. Seed 100k documents with
  realistic skewed distributions (e.g. users with `age` normal-distributed,
  `status` enum with 90% 'done', string `name` fields). Create indexes per
  scenario.
- For each scenario run BOTH the original and the optimized query with
  `collection.find(q).explain('executionStats')` and record
  `totalDocsExamined`, `totalKeysExamined`, `executionTimeMillis`, plus
  wall-clock over 50 iterations after 10 warmup runs (report median and p95).
- Scenarios keyed to the rules:
  1. contradictory range inside `$or` branch (rule 3.2.5): expect collection
     scan to become an index scan on the surviving branch
  2. `$or` of 10 equalities -> `$in` (rule 3.2.2): expect fewer keys examined
  3. enum range -> `$in` (rule 3.3.2) with an index on the enum field
  4. prefix `$regex` with injected bounds (rule 3.4.2): expect
     `totalDocsExamined` to drop from full scan to prefix range
  5. neverMatch queries (empty `$in`, impossible `$eq`): original goes to the
     server, optimized short-circuits client-side; report round-trips saved
  6. subsumed ranges `$gt: 3` + `$gt: 5`: expect identical stats (sanity check
     that the rewrite at least never makes plans worse)
- Assertion: for every scenario `optimized.totalDocsExamined <= original.totalDocsExamined`
  and `optimized.totalKeysExamined <= original.totalKeysExamined`. Time
  assertions are informational only (noisy).

### 5.3 Optimization effect vs RxDB

- Setup: RxDB with the memory storage in Node (optionally the localstorage or
  dexie storage in a browser run later). Seed the same 100k-document datasets,
  define schema indexes per scenario.
- Metrics:
  1. wall-clock of `collection.find(...).exec()` original vs optimized
     (median/p95 over 50 runs after warmup)
  2. plan quality: call RxDB's exported `getQueryPlan(schema, normalizedQuery)`
     for both variants and report the plan rating and
     `selectorSatisfiedByIndex`/`sortSatisfiedByIndex` flags
  3. primary-key fast path: compare `find({selector: {id, other}})` against
     `findByIds`-style fetch plus post-filter as suggested by `hints.findById`
- Run the same 6 scenarios as the MongoDB suite plus the fast-path scenario.
- Output one markdown table per scenario:
  `| scenario | docs examined before/after | median ms before/after | p95 before/after |`
  written to `perf-results/report.md`.

## 6. Repo layout and workflow

```
mango-query-optimizer/
  src/
    index.ts            // public API
    types.ts
    normalize/          // one file per normalization pass
    optimize/           // one file per optimization pass
    hints/
    query-shape.ts
  test/
    unit/
    property/
    mongodb-equivalence/
    rxdb-equivalence/
  perf/
    overhead.bench.ts
    mongodb-effect.ts
    rxdb-effect.ts
  perf-results/
```

Workflow for you, the coding agent:

1. Scaffold package, types, and the normalization passes with unit tests. Get
   idempotency/determinism tests green.
2. Implement schema-free optimization passes one by one, each with unit tests
   and property-based mingo equivalence.
3. Add the MongoDB equivalence harness, then implement the `'mongodb'`
   semantics guards until the harness is green.
4. Implement schema-dependent passes and execution hints, with the RxDB
   equivalence harness.
5. Add both performance suites and produce `perf-results/report.md`.
6. Write a README: what the package does, API, rule table with before/after
   examples, semantics flags, and the perf results table.

Definition of done: all equivalence harnesses green, no rule reachable without
a unit test, perf report generated, `npm pack` produces a publishable tarball
with ESM+CJS+types.
