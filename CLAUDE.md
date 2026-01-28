# CLAUDE.md

## Build Commands
- **Build All**: `npm run build`
- **Documentation Build**: `npm run docs:build`

## Test Commands
- **Run All Tests**: `npm run test`
- **Fast Tests (Parallel)**: `npm run test:fast`
- **Fast Memory Tests**: `npm run test:fast:memory`
- **Node Tests**: `npm run test:node`
- **Browser Tests**: `npm run test:browser`
- **Performance Tests**: `npm run test:performance`
- **Lint**: `npm run lint`
- **Lint Fix**: `npm run lint:fix`
- **Check Types**: `npm run check-types`

## Development Scripts
- **Unwatch Tests**: `npm run dev`
- **Watch Example**: `npm run dev:example`
- **Generate Error Messages**: `npm run generate:error-messages`
- **Start Docs Server**: `npm run docs:serve`

## Code Style & Patterns
- **Language**: TypeScript
- **Database**: RxDB (local-first, NoSQL)
- **State Management**: Reactive (RxJS Observables)
- **Formatting**: Uses ESLint. Run `npm run lint` to check and `npm run lint:fix` to auto-fix.
- **Imports**: Uses ES modules (import/export).
- **Paths**: Source code in `src/`, tests in `test/`, documentation in `docs-src/`.
- **TypeScript**: Do not use enums. Prefer types instead of interfaces.

## Development Workflow

```sh
# 1. Make changes

# 2. Build
npm run build

# 3. Run tests
npm run test:fast:memory

# 4. Run lint
npm run lint

# 5. Check TypeScript types
npm run check-types
```
