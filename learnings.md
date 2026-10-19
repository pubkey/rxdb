# Learnings

Notes about things that went wrong and had to be fixed, reverted, or reworked.

## examples/todo-http-sse

- **Hooks race with manual builds**: The first `npm run build` failed with `ENOTEMPTY: directory not empty, rmdir dist/...` because a hook ran a build at the same time. Retrying the build fixed it. Do not run two builds of the repo in parallel.
- **Lint covers new example folders**: The root `eslint .` lints every folder under `examples/` that is not in the ignore list of `eslint.config.mjs`. The first version of the example used non-null assertions (`querySelector(...)!`), a type literal without a trailing semicolon, and a value that was only used as a type. All three are lint errors in this repo. Write example code with the repo lint rules in mind.
- **`$regex` in dev-mode**: A test counted documents with `{ id: { $regex: '^bulk-' } }` and the dev-mode query check threw. Dev-mode rejects `$regex` on fields that are not plain queryable in that way. Use other selectors (or compare full counts) in tests instead of `$regex` on the primary key.
- **Hand-written EventSource type**: The first version of `replication.ts` declared its own `EventSourceLike` type. `tsc` rejected passing the browser `EventSource` because the DOM `onmessage` signature takes a full `MessageEvent`. Use `typeof EventSource` from the DOM lib instead of re-declaring browser types, and run `tsc` on the example before relying on the tests (tsx strips types and does not type-check).
