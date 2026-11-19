# validate-effect

Validates RxDB documents with Effect Schema's stable Draft 2020-12 JSON Schema importer. The full
RxDB schema is imported, including `_deleted`, `_rev`, `_meta` and `_attachments`, and failures are
mapped to the same `RxValidationError` shape the Ajv plugin produces.

## Validation path

`getValidator(schema)` compiles the codec once. On each write it decodes with the published
`Schema.decodeUnknownResult` API, using `errors: "first"` and `onExcessProperty: "error"`, and maps
the failure to the RxDB 422 error shape. First-error collection matches RxDB's Ajv configuration
(allErrors is off), is enough to produce a 422, and avoids collecting every issue.

The issue mapper handles the `InvalidType` leaves that Effect 4.1.4 emits for failed type checks.
It ignores the implicit `effect/schema/Json` check that the importer adds for
`additionalProperties: true`, because that check is stricter than the authored schema and would
reject valid RxDB internal documents. All declared type checks are still enforced.

Two shared-suite cases are skipped for this validator because published Effect cannot pass them:

- typed `additionalProperties` combined with explicit `properties` is rejected by the importer;
- `format: "date-time"` is preserved as an annotation but not enforced
  (https://github.com/Effect-TS/effect/issues/10776).

## Dependency

`effect` is a regular dependency of the `rxdb` package, declared as `^4.1.4`, the same way `ajv` is
declared for `validate-ajv`. It is not a peer dependency: importing this plugin must be enough for
a consumer to validate. The submitted plugin works with published Effect 4.1.4.

## Benchmark

Validation is measured with RxDB's own validation benchmark, not a parallel harness. Current RxDB
main provides `npm run test:performance:validation` and `test/performance-validation.test.ts`;
the 17.6.0 tag has neither. This change adds the plugin case to that benchmark and ports the
`test:performance:validation` script to the tag for measurement. Run:

```sh
NODE_ENV=fast DEFAULT_STORAGE=memory npm run test:performance:validation
```

It compares no validator, Ajv and the Effect plugin on time-to-first-insert and bulk insert of
3,000 documents. With the submitted dependency, published Effect 4.1.4, one fast-mode run measured
time-to-first-insert of 0.72 ms (no validator), 4.11 ms (Ajv) and 1.41 ms (plugin), and insert of
3,000 documents of 1.6 ms, 2.92 ms and 13.46 ms. These are one-host medians, not an SLA.

## Alternatives considered

- An options overload on `Schema.is` was rejected upstream: the optional parameter conflicts with
  `Array.prototype.filter`'s index argument and removes type-predicate narrowing. `Schema.validate`
  was added instead.
- Two-phase validation with an `Option` boolean decode gave no valid-path gain and was slower on
  errors. A compiled `is` guard avoids output construction, but any two-phase path still decodes
  twice on a rejection.
- `Schema.is` without options is faster but cannot honour `onExcessProperty: "error"`; that contract
  trade was not adopted.
- Replacing the excess scan's `.some()` closure with a loop gave no separable gain, and switching
  from `Reflect.ownKeys` to `Object.keys` was redundant because upstream already had an equivalent
  helper.
- Recompiling the decoder per document is about 34x slower; validators are cached.
- JIT enabled without the upstream AOT fast-path fix for `Schema.Json` index signatures gives no
  measurable gain.
- A build-time standalone precompile is not usable yet: the generated module still needs its ASTs,
  so there is no time-to-first-insert gain and the module would be additive (~39 KB gzipped).
- A build-time standalone precompile is not usable yet: the generated module still needs its ASTs
  and the registry is keyed by AST identity, so there is no time-to-first-insert gain and the module
  would be additive (~39 KB gzipped).
- The storage performance suite is not evidence for validation; hence the dedicated script.
- `pnpm runtimeperf` timed out with no output and was not used.

## Measured outcomes of the remaining ideas

- Batched validation was measured with `scripts/benchmark-batch-validation.mjs` against the same
  prebuilt arrays validated row by row. Batch-16 gained about 16% on one run and was flat or slower
  on another; batch-64 was slower. The gain is inconsistent and would require a core wrapper change,
  so it was rejected. The benchmark script is kept as evidence.
- A generated field-code mapper is blocked: a prototype was 10x faster on the failure path but 2x
  slower on valid input, and Effect codegen has no issue/field-code emission operation.
- Interpreter dispatch for Date and transform declarations is blocked by an upstream policy:
  compiler-regression tests deliberately assert those declarations are not generated.
- Standalone precompile was rejected: module evaluation measured 3.7 ms versus 2.7 ms to build the
  schemas at runtime, and the module still needs its ASTs.
