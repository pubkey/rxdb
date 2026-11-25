# Contributing to CLA DB

Thank you for contributing to CLA DB (`@clatech/db`).
CLA DB is an Apache 2.0 fork of [RxDB](https://github.com/pubkey/rxdb) maintained by CLA Tech. Every contribution must preserve minimal-fork discipline, original licenses, and public API compatibility.

## Core Contribution Rules

1. **Minimal fork surface**: Keep changes tightly scoped. Do not refactor unrelated upstream files. Mark every core modification in `src/` with a short `// CLA-DB:` comment explaining why it diverges from upstream.
2. **No proprietary code**: Never copy, port, or derive code from RxDB Premium. Never falsify Premium flags or bypass license validation mechanisms.
3. **Separate extensions from core**: New adapters (Cloudflare D1/R2, custom SQLite, custom OPFS, diagnostics, visual tools) belong in independent external packages consuming CLA DB's public interfaces, not inside `src/`.
4. **Preserve attributions and license**: Retain Apache 2.0 headers, `LICENSE.txt`, and upstream RxDB credits.
5. **Commit hygiene**: Use small, atomic [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`). Never use force push on shared branches.

## Prerequisites

- Node.js `>= 20` (tested on Node 22)
- npm `>= 10`

Install dependencies:

```sh
npm install
```

## Development Workflow

Run these checks locally before opening a pull request:

```sh
# 1. Lint TypeScript/JavaScript files
npm run lint

# 2. Type-check
npm run check-types

# 3. Build CJS, ESM, TypeScript declarations, and plugin shims
npm run build

# 4. Run fast unit test suites
npm run test:fast:memory
npm run test:fast:dexie
```

### Additional Verification Commands

- **Type declarations test**: `npm run test:typings`
- **Circular dependency check**: `npm run test:circular`
- **Dependency check**: `npm run test:deps`
- **Single test file (memory)**:
  ```sh
  npm run transpile && NODE_ENV=fast DEFAULT_STORAGE=memory npx mocha --config ./config/.mocharc.cjs ./test_tmp/unit/cla-db.test.js
  ```
- **External package consumption test**:
  ```sh
  npm run build
  npm pack --pack-destination /tmp/cla-db-pack
  ```
  Install the generated `.tgz` tarball in a clean temporary directory and verify ESM imports, CommonJS `require`, subpath plugin imports (`@clatech/db/plugins/storage-dexie`), and TypeScript compilation (`tsc --noEmit`).

## Code Style and Patterns

Preserved from upstream RxDB guidelines:
- **Language**: TypeScript with ES modules (`import`/`export`).
- **Formatting**: ESLint (`npm run lint` / `npm run lint:fix`).
- **TypeScript conventions**: Do not use `enum`; prefer `type` over `interface` where consistent with surrounding files.
- **Error handling**: Do not use `throw new Error()` in core runtime code. Use `throw newRxError('CODE', { ... })` from `src/rx-error.ts`.
- **Generated directories**: Never edit `/docs`, `/dist`, or `/plugins` directly; they are generated artifacts.
- **Documentation**: Use clear, plain English without em dashes.

## Changelog Updates

- Record every CLA DB fork change in `CLA_CHANGELOG.md` under the target release section.
- Do not publish npm packages or GitHub releases automatically from pull requests.

## Reporting Bugs

Before opening an issue, check `orga/bug-checklist.md` and include:
- CLA DB version and upstream base commit (from `package.json#claDb`).
- Runtime environment (Node.js/browser version) and storage engine used.
- Minimal reproducible test case.
