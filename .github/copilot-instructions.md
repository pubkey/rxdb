# GitHub Copilot Instructions

## Project Overview
- **Database**: RxDB (local-first, NoSQL)
- **Language**: TypeScript
- **State Management**: Reactive (RxJS Observables)
- **Paths**: Source code in `src/`, tests in `test/`, documentation in `docs-src/`.

## Code Style & Patterns
- **Formatting**: Uses ESLint. Run `npm run lint` to check and `npm run lint:fix` to auto-fix.
- **Imports**: Uses ES modules (import/export).
- **TypeScript**: Do not use enums. Prefer types instead of interfaces.
- **Errors**: Do not use `throw new Error()`. Use `throw newRxError()` or `throw newRxTypeError()` instead. Use error codes from `src/rx-error.ts` and add new error codes if needed (e.g., `PL1`, `PL2`). Example: `throw newRxError('PL1', { plugin });`

## Development Workflow

After making any code changes, run these checks in order and fix any issues before finishing:

```sh
# 1. Lint JavaScript/TypeScript files
npm run lint

# 2. Check TypeScript types
npm run check-types

# 3. Build source files
npm run build

# 4. Run fast memory tests
npm run test:fast:memory
```

## Not Allowed Edits
- Do not edit anything in the `/docs` folder. It is generated. Edit `/docs-src` instead.
- Do not edit anything in `plugins/`.
