# Research: Mango Query Normalization and Optimization Package

Research results for the planned npm package that normalizes and optimizes mango queries
(see `orga/BACKLOG.md` "query normalization and optimization").
The package must work for RxDB but also for other NoSQL databases like MongoDB and CouchDB.

Sources: MongoDB `MatchExpression` optimizer source (`expression_optimizer.cpp`, `matcher/README.md`),
MongoDB boolean simplification engineering blog, MongoDB plan cache README and `canonical_query.cpp`,
MySQL 8.0 range optimization manual, Apache Calcite `RexSimplify` javadoc, MongoDB BSON comparison
order docs, CouchDB Mango docs, and the existing RxDB code in `src/rx-query-helper.ts` and
`src/query-planner.ts`. All claims below passed 3-0 adversarial source verification.

## 1. Normalization rules (schema-free, canonical form)

These rules do not change what the query matches. They produce one canonical representation
so that equivalent queries get the same cache key and so that later optimization rules only
have to handle one shape.

- **Shorthand to `$eq`**: `{foo: 'bar'}` becomes `{foo: {$eq: 'bar'}}`. Recurse into
  `$and`, `$or`, `$nor`, `$not` and `$elemMatch` sub-selectors. RxDB already does this in
  `normalizeQuerySelectorShorthands()`.
- **Flatten nested `$and`/`$or` (associativity)**: an `$and` absorbs the children of any
  `$and` among its children, likewise for `$or`. MongoDB implements this verbatim in its
  `listOfOptimizer`.
  - Before: `{$and: [{a: {$eq: 1}}, {$and: [{b: {$eq: 2}}, {c: {$eq: 3}}]}]}`
  - After: `{$and: [{a: {$eq: 1}}, {b: {$eq: 2}}, {c: {$eq: 3}}]}`
- **Collapse single-operand logical nodes**: `{$and: [X]}` becomes `X`, same for `$or`.
- **Remove neutral children**: remove always-true children from `$and` and always-false
  children from `$or`/`$nor`. An always-true child inside `$or` collapses the whole `$or`
  to always-true.
- **Lift top-level `$and` into the implicit root selector** when field paths do not collide,
  because `{selector: {a: {$eq: 1}, b: {$eq: 2}}}` is the canonical form of
  `{$and: [{a: {$eq: 1}}, {b: {$eq: 2}}]}`.
- **Deterministic ordering**: sort field names and operator keys inside each selector object,
  and sort `$in`/`$nin` values. MongoDB sorts the values when folding `$or` into `$in`
  (`{$or: [{name: 'Don'}, {name: 'Alice'}]}` becomes `{name: {$in: ['Alice', 'Don']}}`).
  Needed for canonical cache keys.
- **Fill defaults**: `skip: 0`, explicit `sort` including the primary key as last sort field,
  primary key appended to a given `index`. RxDB already does this in `normalizeMangoQuery()`.

## 2. Schema-free optimization rules

Verified against the MongoDB matcher optimizer:

- **`$in` canonicalization (three rules)**:
  - `$in` with exactly one equality value becomes `$eq`: `{f: {$in: ['x']}}` to `{f: {$eq: 'x'}}`.
  - `$in` with exactly one regex and no equality values becomes `$regex`.
  - Empty `$in` becomes constant-false: the whole conjunct can never match.
  - A mixed regex-plus-equalities `$in` is left alone.
- **`$or` of equalities on one field becomes `$in`** (inverse of the first rule):
  `{$or: [{name: {$eq: 'Don'}}, {name: {$eq: 'Alice'}}]}` becomes `{name: {$in: ['Alice', 'Don']}}`.
  Guards used by MongoDB: more than one disjunct must share the same field path, all disjuncts
  must use the same collation, and an `$eq` whose operand is itself a regex value must not be
  folded because `$eq` compares a regex literally while `$in` interprets regex elements as
  patterns. Separate `$regex` disjuncts on the same path can be folded into the `$in`.
- **Interval arithmetic on `$gt`/`$gte`/`$lt`/`$lte`** (MySQL range extraction model):
  - `$and` of ranges is interval intersection: `{$gt: 3}` and `{$gt: 5}` merge to `{$gt: 5}`
    (subsumption), `{$gte: 5}` and `{$gt: 5}` merge to `{$gt: 5}`.
  - Empty intersection is a contradiction: `{age: {$gt: 10, $lt: 5}}` can never match,
    short-circuit to empty result.
  - `$or` of ranges is interval union: `{$or: [{k: {$lt: 'abc'}}, {k: {$lt: 'bar'}}]}`
    becomes `{k: {$lt: 'bar'}}`.
  - `$eq` intersected with a range either keeps the `$eq` (value inside range) or is a
    contradiction (value outside range). Same for `$eq` vs `$in` (drop non-matching values)
    and `$in` vs range (filter the `$in` values by the range).
  - CAVEAT: unsound for array fields under MongoDB semantics, see section 6.
- **Duplicate predicate dedup**: identical conjuncts inside `$and` collapse to one.
- **Contradiction and tautology detection via Boolean algebra**: MongoDB derived that the
  complement law (`A AND NOT A = false`), De Morgan and involution hold for MQL predicates
  because MQL negation has missing-field semantics baked in (`$ne` is the exact document-level
  negation of `$eq`, even for array fields). Payoff example from the MongoDB blog:
  `{$or: [{$and: [{a: 1}, {a: {$ne: 1}}]}, {b: 2}]}` simplifies to `{b: 2}`, turning a
  collection scan into an index scan on `b`.
- **Whole-tree boolean simplifier (advanced, optional pass)**: MongoDB 8.x converts the
  selector to a bitset DNF form, applies Quine-McCluskey reduction
  (`(x AND y) OR (x AND NOT y) = x`), the absorption law (`x OR (x AND y) = x`) and
  Petrick's method for a minimal cover, then converts back. DNF conversion is worst-case
  exponential, so MongoDB estimates the term count before each transformation and cancels
  when the estimate is too high. Any port needs the same guard.
- **`$not` push-down (De Morgan)**: `$nor: [A, B]` equals `$and: [{$not: A}, {$not: B}]`,
  `$not` over `$or` becomes `$and` of negations, and negated leaf operators flip:
  `$not: {$gt: x}` becomes `$lte: x` ONLY under non-array, field-present semantics,
  see section 6. Safe schema-free flips: `$not: {$in: [...]}` equals `$nin: [...]` and back.

## 3. Schema-dependent optimization rules

These need a JSON schema (RxDB always has one, MongoDB users can pass one):

- **Impossible `$eq` against schema**: `$eq` value outside the field's `enum`, wrong type,
  string longer than `maxLength`, number outside `minimum`/`maximum`. The query can never
  match, return empty result without touching the storage.
- **Enum rewrites**: on an enum field, rewrite range and other operators to `$in` of the
  enum values that satisfy them: with enum `['idle', 'in-progress', 'done']`,
  `{status: {$gt: 'done'}}` becomes `{status: {$in: ['idle', 'in-progress']}}`.
  This turns an index range scan plus filter into point lookups. Inverse consideration:
  an `$in` that contains ALL enum values on a required field is a tautology and can be
  dropped from the conjunct.
- **Boolean fields**: `{done: {$ne: true}}` on a required boolean field becomes
  `{done: {$eq: false}}`. Requires the field to be required (else missing-field semantics
  differ).
- **`$exists`/`$type` elimination**: `{f: {$exists: true}}` is a tautology on a required
  field and can be dropped; `{f: {$exists: false}}` on a required field can never match.
  `$type` checks against the schema type fold to always-true or always-false.
- **Interval intersection legality**: schema knowledge that the field is not an array makes
  the range-merge rules of section 2 sound (see caveat in section 6).
- **Bound clamping**: clamp `$gt`/`$lt` bounds to schema `minimum`/`maximum`; RxDB's query
  planner already promotes exclusive bounds outside the schema range to inclusive.
- **Sort-irrelevant fields**: fields with an `$eq` on a boolean or enum field are irrelevant
  for sort-index matching because all matching docs share one value (already in
  `src/query-planner.ts`).

## 4. Index and execution level rewrites

These do not change the selector semantics but change how the query executes. The package
should emit them as hints next to the normalized query, so any database can apply them:

- **Primary key `$eq` (or single-value `$in`) plus other operators**: execute as find-by-id,
  then post-filter the single document against the remaining operators. Fastest possible plan.
- **Prefix `$regex` to index range**: a case-sensitive regex anchored with `^` (or `\A`)
  followed by literal characters seeds an index range: `^abc` gives `$gte: 'abc'` plus
  `$lt: 'abd'` (or `$lt: 'abc' + INDEX_MAX`), with the full regex kept as post-filter.
  MySQL does the same for `LIKE 'abc%'`, MongoDB documents it for `$regex`.
  Only literal, non-metacharacter prefixes qualify, and `i` (case-insensitive) flags
  disqualify the rewrite.
- **Restrictive operator injection** (automates `docs-src/docs/nosql-performance-tips.md`):
  derive a common lower/upper bound from all `$or` branches on a field and add it as a
  top-level operator, so the planner scans a smaller index range:
  `{$or: [{time: {$gt: 1234}}, {time: {$eq: 1234}, user: {$gt: 'foobar'}}]}` gains
  `time: {$gte: 1234}`. Same for enum `$in` sets (add `$gte` smallest / `$lte` largest value).
- **Superset rule for partial index use**: when deriving index bounds, replace every
  non-indexable predicate with TRUE so the index range is a strict superset of the result,
  then re-filter fetched docs against the full original selector. This is the documented
  MySQL correctness rule and matches CouchDB Mango behavior (full selector applied after
  the index scan).
- **Compound index consumption**: consume index fields left to right while operators are
  equalities; the first range operator provides bounds and stops consumption of later
  fields. Post-filtering stays mandatory because the resulting interval over-approximates.
  Matches the MongoDB Equality-Sort-Range guideline and RxDB's planner.
- **`$in` on an index**: either scan the min-to-max range of the values (RxDB today) or,
  better for few values, run one point lookup per value and merge. The package can emit
  the sorted `$in` values so storages can choose.
- **Sort elimination**: report `sortSatisfiedByIndex` so the storage can skip in-memory
  re-sorting (already in RxDB's planner, keep it in the shared package).

## 5. Canonical cache keys

- MongoDB canonicalizes each query into a value-agnostic "query shape" used as plan cache
  key: `db.c.find({a: 1, b: 2}).sort({c: 1})` encodes to `an[eqa,eqb]|ac|||fc` with `|`
  delimiting filter, sort, projection and collation sections. Constants are
  auto-parameterized so queries differing only in values share one cache entry.
- The real `planCacheKey` also includes index availability and collation state. A cache key
  produced by the package must include the schema/index version, not only the selector shape.
- The package should expose two outputs: a fully normalized query (for equality checks like
  RxDB's query cache) and a value-agnostic shape string (for plan caching).

## 6. Correctness caveats (the load-bearing part)

- **Missing-field semantics**: in MQL, `$ne`, `$not` and `$nin` match documents where the
  field is missing. `{x: {$gt: 10}}` and `{x: {$lte: 10}}` are NOT complements: a document
  without `x` matches neither. Calcite only folds `x = 1 OR NOT x = 1` to TRUE when an
  `x IS NULL` disjunct is present. Tautology rewrites on operator pairs like `$gt`/`$lte`
  need the field to be required in the schema (or an added `$exists: true`).
  The complement law IS safe for `$eq`/`$ne` pairs because `$ne` includes the missing case.
- **Array fields break interval intersection**: `{a: {$gt: 10, $lt: 5}}` can match
  `a: [3, 20]` in MongoDB because different array elements satisfy each bound. Range merging
  on a field therefore requires schema knowledge that the field is not an array. RxDB
  documents do allow array fields, so the rule stays schema-gated.
- **Type bracketing**: MongoDB comparison operators only match values inside the same BSON
  type bracket, and numeric types compare as equivalent. A JS reimplementation (mingo,
  RxDB storages) must be checked against this before adopting cross-type contradiction
  rules. Keep cross-type rewrites behind a semantics flag (`mongodb` vs `plain-js`).
- **Collation**: never merge or fold predicates that carry different collations. The MongoDB
  `$or`-to-`$in` fold explicitly checks collator equality.
- **Regex operands**: `$eq: /x/` compares a stored regex value literally; `$in: [/x/]`
  matches strings against the pattern. Never rewrite between them.
- **Filter context is an advantage**: Calcite distinguishes general expression context from
  filter context (UNKNOWN treated as FALSE). Mango selectors are always filter predicates,
  so the package can use the stronger filter-context rules throughout.
- **Selector predicate order can be load-bearing**: MongoDB shipped a critical wrong-results
  bug (SERVER-84013) because a rewrite pass kept reordering predicates while index tagging
  depended on positions. The package must iterate rewrites to a fixpoint and only then hand
  a stable, deterministically ordered query to the planner.
- **`$elemMatch`**: treat the inner selector as a nested query and recurse with all rules,
  but never lift predicates out of `$elemMatch` (element-scoped vs document-scoped matching
  differs). `$size: 0` and `$all` rewrites produced no verified evidence, keep them out of
  v1.

## 7. Architecture lessons from production optimizers

- Keep normalization a distinct, pluggable pass. MongoDB's `canonical_query.cpp` delegates
  to a separate `normalizeMatchExpression()` behind a flag and reuses it from several call
  sites. The package should export composable passes:
  `normalize(query)`, `optimize(query, {schema?, semantics})`, `getQueryShape(query)`,
  `getExecutionHints(query, schema, indexes)`.
- Run rule passes to a fixpoint: rewrites unlock further rewrites
  (`$in` single item to `$eq` unlocks `$eq`-vs-range intersection, which unlocks
  contradiction detection). Bound the loop by pass count.
- Guard exponential passes (DNF simplifier) by estimated term count; 20 predicates already
  mean over one million truth-table evaluations.
- Return a marker for can-never-match queries instead of a mutated selector, so callers can
  short-circuit to an empty array without running the storage at all.
- Rules divide cleanly into schema-free (always on) and schema-dependent (on when a schema
  is provided). This keeps the package usable for MongoDB users without a schema.

## 8. Open questions for the implementation step

- CouchDB `mango_selector.erl` and Couchbase SQL++ internals produced no verified claims
  beyond MongoDB's rule set; a source read could still surface Mango-dialect-specific rules.
- Verify that mingo (used by RxDB) implements MQL missing-field semantics for
  `$ne`/`$not`/`$nor` before enabling complement/De Morgan rewrites by default.
- Selectivity ordering of post-filter predicates without statistics: static operator-class
  ordering (`$eq` before `$in` before ranges before `$regex`/`$elemMatch`) is plausible but
  unmeasured; benchmark before adopting.
- Decide the package name and repo location (inside the RxDB monorepo vs standalone repo).
