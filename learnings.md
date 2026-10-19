# Learnings

Notes about things that went wrong and had to be fixed, reverted, or reworked.

## examples/todo-http-sse

- **Hooks race with manual builds**: The first `npm run build` failed with `ENOTEMPTY: directory not empty, rmdir dist/...` because a hook ran a build at the same time. Retrying the build fixed it. Do not run two builds of the repo in parallel.
- **Lint covers new example folders**: The root `eslint .` lints every folder under `examples/` that is not in the ignore list of `eslint.config.mjs`. The first version of the example used non-null assertions (`querySelector(...)!`), a type literal without a trailing semicolon, and a value that was only used as a type. All three are lint errors in this repo. Write example code with the repo lint rules in mind.
- **`count()` needs an index-satisfied selector**: A test ran `count({ selector: { id: { $regex: '^bulk-' } } })` and dev-mode threw `QU14`. `$regex` on the primary key is fine in a `find()` query. The problem was `count()`: a count query must use a selector that the index fully satisfies (or the database must set `allowSlowCount: true`), and a `$regex` selector cannot be satisfied by an index. A range like `{ $gte: 'bulk-', $lt: 'bulk.' }` works with `count()`.
- **Read the error before writing it down**: The first version of the entry above said that `$regex` on the primary key is not allowed. That was a guess from a truncated test output, not from the error code. Look up the error code (here `QU14` in `src/plugins/dev-mode/check-query.ts`) before drawing a conclusion.
- **Hand-written EventSource type**: The first version of `replication.ts` declared its own `EventSourceLike` type. `tsc` rejected passing the browser `EventSource` because the DOM `onmessage` signature takes a full `MessageEvent`. Use `typeof EventSource` from the DOM lib instead of re-declaring browser types, and run `tsc` on the example before relying on the tests (tsx strips types and does not type-check).
