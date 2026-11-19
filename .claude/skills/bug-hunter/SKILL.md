---
name: bug-hunter
description: Hunts for bugs in RxDB and fixes them, one pull request per bug with a failing test and the fix. Defines what is a bug in this repository and what is not, with examples, and how a bug has to be reproduced and fixed, and how the pull requests are handled until they are merged. Use it when the user asks to find bugs, review the code for bugs, run a bug hunt, or fix a bug that was found by reading the code.
---

# Bug Hunter

A bug hunt reads the RxDB source, finds behavior that is wrong, proves it with a test, fixes it, and opens one pull request per bug. Most suspected bugs turn out to be invalid. This skill defines what is valid, so that no time is spent on findings that the maintainer will close.

Read `CLAUDE.md` first. Its rules apply to everything here. This skill adds the rules that are specific to bug hunting.

## What is a bug

A bug is behavior of RxDB that is wrong for an app that uses RxDB correctly, in an environment that works correctly. All of these must be true:

1. **It is reproduced with the normal public API.** Correct TypeScript types, no `as any` to get around the types, no monkeypatching, no access to internal or underscore members.
2. **The usage is correct.** The app passes valid data and valid options and does not close things while calls are running.
3. **The environment works correctly.** The browser, the runtime, and the storage do what they are supposed to do.
4. **The result is wrong.** Data is lost or wrong, a query returns the wrong documents, an event is missing or emitted twice, a promise never settles, there is an unhandled rejection or a crash, the typings do not match the runtime, or the docs describe something the code does not do.
5. **It is not intended behavior.** Check the docs, the existing tests, and the history (`git log`, GitHub issues and pull requests).
6. **It is not fixed already.** Check `master`, the open pull requests, and `orga/before-next-major.md`.

User-supplied code is part of the normal API. A reproduction may use replication `pull` and `push` handlers that reject, a dropped network connection, hooks, conflict handlers, and migration strategies. An in-process message channel for the remote storage is allowed too.

### Examples of bugs

These were found by reading the code, reproduced with the normal API, and merged:

| Kind | Example |
|---|---|
| Wrong data | `insert()` of the CRDT plugin wrote a `crdts` field into the object of the caller and rejected frozen data ([#9537](https://github.com/pubkey/rxdb/pull/9537)) |
| Wrong data | A re-insert of a deleted document got an older write time than the writes in between ([#9622](https://github.com/pubkey/rxdb/pull/9622)) |
| Wrong query result | A query result was wrong when the event of another instance arrived during the query ([#9629](https://github.com/pubkey/rxdb/pull/9629)) |
| Wrong result of a getter | Nested property access returned `undefined` for keys that contain path syntax characters ([#9580](https://github.com/pubkey/rxdb/pull/9580)) |
| Promise never settles | `cleanup()` hung forever when a replication was canceled before its first sync ([#9636](https://github.com/pubkey/rxdb/pull/9636)) |
| Promise never settles | `migratePromise()` and `addCollections()` never settled when the migration was canceled by `close()` ([#9565](https://github.com/pubkey/rxdb/pull/9565)) |
| Crash or unhandled rejection | The websocket replication server crashed with an unhandled rejection on an invalid request of a client ([#9492](https://github.com/pubkey/rxdb/pull/9492)) |
| Valid input throws | The localStorage RxStorage threw when writing an empty attachment ([#9600](https://github.com/pubkey/rxdb/pull/9600)) |
| Missing error | `addCollections()` on a closed database did not throw ([#9647](https://github.com/pubkey/rxdb/pull/9647)) |
| Typings do not match the runtime | `RxLocalDocument.isLocal` was typed as a method but is a property ([#9539](https://github.com/pubkey/rxdb/pull/9539)) |
| Docs do not match the code | The docs said that parallel `upsert()` calls throw a `409` conflict, but they all resolve ([#9706](https://github.com/pubkey/rxdb/pull/9706)) |

## What is not a bug

Do not report, test, or fix these. Each rule comes from a decision of the maintainer.

1. **The storage is wrapped, mocked, or hacked.** Not to make it fail, not to delay it, not to record calls. Local reads and writes are not supposed to fail. When a storage fails, that storage has to be fixed. "This is only reproduced by hacking into a custom storage. This is not allowed to reproduce a bug. Either reproduce it with the normal API or this is not a valid bug."
2. **The environment misbehaves.** Assume that users do not reach the storage quota and that the browser does not throw at random on API calls.
3. **The app uses RxDB wrongly.** Wrong data or wrong options are a developer error, not a runtime error. The whole operation may fail then. Do not build handling per document, a recovery, or a retry for developer errors.
4. **A callback throws that must never throw.** For example a replication `pull.modifier` or `push.modifier`. Do not add retry logic. Emit the error and stop, so that nothing is skipped and nothing ends in a broken state.
5. **Something is closed during a running call.** It does not matter which error a call throws while its collection or database is closed.
6. **It needs an impossible state.** Random values like storage tokens never clash. A document always has its primary key.
7. **It is a missing feature.** A bugfix must not add a feature. When the existing API has a way to do it, document that way.
8. **It is a breaking change.** A fix that changes the behavior of existing apps is not merged now. It goes to `orga/before-next-major.md`.

### Examples of things that are not bugs

| Rule | Example and decision |
|---|---|
| Wrapped storage | About 15 findings were only reproducible with a storage whose read or write was made to reject. All were closed, for example [#9477](https://github.com/pubkey/rxdb/pull/9477) and [#9505](https://github.com/pubkey/rxdb/pull/9505) |
| Wrapped storage | A test held `close()` of a hand-built Dexie storage back with a wrapper to hit a race. It had to be rewritten to the storage of the test config without any wrapper ([#9666](https://github.com/pubkey/rxdb/pull/9666)) |
| Environment | A partial write in the localStorage RxStorage when `setItem()` throws a `QuotaExceededError`. Closed: "we assume users are careful enough to not reach the quota limit and that the browser always behaves correctly" ([#9670](https://github.com/pubkey/rxdb/pull/9670)) |
| Developer error | With key-compression, a document with a key that starts with `\|` made the whole `bulkInsert()` fail. Rejecting only that document was declined: "this is a developer error not a runtime error. the whole write should fail" ([#9604](https://github.com/pubkey/rxdb/pull/9604)) |
| Developer error | A write row with a new attachment without data got an error per row. Changed so that the whole `bulkWrite()` rejects ([#9470](https://github.com/pubkey/rxdb/pull/9470)) |
| Callback must not throw | A retry for a replication modifier that throws was declined. The error is emitted once and the replication is canceled ([#9480](https://github.com/pubkey/rxdb/pull/9480), [#9758](https://github.com/pubkey/rxdb/pull/9758)) |
| Closed during a call | Mapping the error that `exec()` throws while the collection is closed was declined: "people should not close it during queries" ([#9658](https://github.com/pubkey/rxdb/pull/9658)) |
| Impossible state | Two users with the same storage token: "storage tokens are random so assume they never clash" ([#9701](https://github.com/pubkey/rxdb/pull/9701)) |
| Impossible state | A test selector `passportId: { $exists: false }` on the primary key: "there is no way a document does not have its primary key" ([#9498](https://github.com/pubkey/rxdb/pull/9498)) |
| Missing feature | `RxState.set()` with a path into an array. Closed: "to update an array use a normal function that works on the plain array". Only the docs got an example ([#9694](https://github.com/pubkey/rxdb/pull/9694)) |
| Not needed | An own RxError for a query path that key-compression cannot handle, where the dependency already throws: "we do not need that. throwing from the keycompressionplugin is enough here" ([#9610](https://github.com/pubkey/rxdb/pull/9610)) |
| Breaking change | Fixes that change which stored data is found, or that change runtime behavior of working apps, were closed and written to `orga/before-next-major.md` |

Decisions of the maintainer that often come up while judging a finding:

- Queries are JSON only. No `RegExp` objects, `NaN`, or `Infinity`.
- `limit: 0` returns zero documents. A negative limit throws, also in production.
- Observables complete when their collection is closed.
- `insert()`, `bulkInsert()`, and the upsert methods accept an RxDocument instance as input.
- A hook like `preInsert` does not get new parameters.

## How to find a bug

1. Pick an area (a plugin, the replication protocol, the query planner, a storage). Read the source and the tests of that area.
2. For each suspect, write a short script or test that reproduces it on `config.storage.getStorage()`. A suspect without a reproduction is not a finding.
3. Check each finding against "What is a bug" and "What is not a bug". Drop it when one point fails. A dropped finding is a good result, not a failure.
4. Check `orga/before-next-major.md`. When the bug is listed there, it waits for the next major release.
5. Give the user a list of the valid findings before you open many pull requests, when they asked for a review first.

### One subagent per assumed bug

Whenever you find an assumed bug, spawn a subagent for it right away and continue the hunt in the main session. Do not analyze, reproduce, or fix the bug in the main session.

- Give each subagent exactly one assumed bug and its own git worktree with its own branch based on `master`.
- The prompt for the subagent must contain the suspected behavior, the affected files and functions, the short script or the steps that made you suspect it, and the instruction to read this skill and `CLAUDE.md` first.
- The subagent analyzes the assumed bug: it checks it against "What is a bug" and "What is not a bug", writes the failing test, and finds the real cause.
- When the bug is valid, the subagent fixes it and opens the pull request as described in this skill. When it is not valid, the subagent opens no pull request and reports which rule made it drop the finding.
- Run at most three test runs at the same time. Test servers use fixed ports, so an `EADDRINUSE` error is a collision with another test run. Wait and run again.
- Collect the results of the subagents and give the user one list with the pull requests and the dropped findings.

## How to reproduce a bug

A finding only counts with a test that fails because of the bug. Write the test first, see it fail, then fix.

- Put it into the matching existing file under `test/unit/`, inside a fitting `describe` block next to related tests. A new test file has to be imported in `test/unit.test.ts`.
- Use `config.storage.getStorage()`. Never a hardcoded storage, unless the feature needs one. Do not skip by storage name. Use the capability flags that neighboring tests use (`config.storage.hasPersistence`, `hasMultiInstance`, `hasAttachments`).
- Assert only what is visible through the public API: query results, emitted values, thrown errors, resolved promises.
- It must fail without the fix and pass with it. Run both and keep both outputs for the pull request. Never write test output from memory.
- When the bug only shows on some storages, say so in the pull request with the result per storage, and do not pin the test to that storage.
- Do not wait for an event that may have been emitted before the subscription, and wait for every condition you assert. Tests that pass on memory can still time out on Deno KV or Windows.
- Close every database you create.

Run one file like this, and repeat with `DEFAULT_STORAGE=dexie` and `DEFAULT_STORAGE=remote` when the change touches storages, attachments, or write paths:

```bash
npm run transpile
DEFAULT_STORAGE=memory NODE_ENV=fast npx mocha --config ./config/.mocharc.cjs \
    --require ./test_tmp/helper/parallel-setup.js ./test_tmp/unit/rx-collection.test.js
```

The remote storage rethrows a server error as a plain error with the serialized RxError in its message. A test that checks an error code has to work with that.

## How to fix a bug

- Fix the real cause with the smallest change. Do not special-case the test, and do not work around the problem.
- When an input or a combination can be made to work, make it work instead of throwing a new error.
- Checks for wrong usage belong into the dev-mode plugin, not into production code.
- Use `newRxError()` with a code from `src/plugins/dev-mode/error-messages.ts`. Check the open pull requests for codes that are reserved already.
- Do not reimplement a function of a dependency. Follow the "Bugs in dependencies" rule of `CLAUDE.md`.
- Avoid breaking changes. Keep a type or an export and mark it as `@deprecated` instead of removing it, add a changelog entry with the `CHANGE` prefix, and note the removal in `orga/before-next-major.md`.
- A fix that changes the behavior of existing apps, or that needs a fallback to not be breaking, goes to `orga/before-next-major.md` instead of into a pull request for now. The entry has the problem, a `Todo:` list with a "Breaking: ..." line, and a link to the pull request that has an implementation.
- Add a changelog entry under `orga/changelog/` with a link to the pull request.

Before you push, run the full fast suite and not only your test file, because a new check can break tests in other files:

```bash
npm run build
npm run test:fast:memory
npm run lint
npm run check-types
npm run test:bundle-size
```

Make sure `node_modules` matches `package.json` before you trust a local bundle size. When the size check fails because of an intended change, run `npm run bundle-size:update` and commit `config/bundle-size/limits.json`.

## The pull request

- One pull request per bug, based on `master`, independent of other open pull requests.
- Use the sections of `.github/PULL_REQUEST_TEMPLATE.md`. Describe the problem as a user sees it, then what changed.
- Include the test output without the fix and with the fix, and name what was not run.
- Name every change that goes beyond the fix, and every behavior that is different afterwards, in its own list. The maintainer decides on these.
- Prefix the title with `[BREAKING]` only when the "Pull Request Title Rule" of `CLAUDE.md` applies. A fix for something that threw or was broken before is not breaking.

## Until it is merged

- Answer every comment of the maintainer as a comment on the pull request: once right away to say what you will do, and again when it is pushed.
- Poll for new comments with the time of your last poll as the cutoff, not the time of the last comment, so that nothing between two polls is missed.
- When the maintainer asks a question, answer it with facts from the code (file and line) and offer the options. Change the code only after the decision, unless the comment already is one.
- Rebase a pull request when it has a merge conflict or when the maintainer asks for it. Keep the tests of both sides. After the rebase, run the test without the fix again: when it passes on `master`, the fix is there already. Then reduce the pull request to the test or propose to close it.
- When the CI is red, read the log first. When the failing test is not from the pull request, `master` is broken or the test is flaky. Then fix that test in its own pull request. Rebasing does not help before that is merged.
- Never skip or disable a test to get a green CI.
- Update the title and the description when the content of a pull request changes.
- Close a pull request only when the maintainer says so or calls it not a valid bug. Never merge.
- Add a rule to `CLAUDE.md` or to this skill only when the maintainer asks for it by name.
