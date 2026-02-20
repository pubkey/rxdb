# AGENTS.md

## Project Overview
- **Database**: RxDB (local-first, NoSQL)
- **Language**: TypeScript
- **State Management**: Reactive (RxJS Observables)
- **Paths**: Source code in `src/`, tests in `test/`, documentation in `docs-src/`.

## Tooling
- **Build All**: `npm run build`
- **Documentation Build**: `npm run docs:build`
- **Run All Tests**: `npm run test`
- **Fast Tests (Parallel)**: `npm run test:fast`
- **Fast Memory Tests**: `npm run test:fast:memory`
- **Node Tests**: `npm run test:node`
- **Browser Tests**: `npm run test:browser`
- **Performance Tests**: `npm run test:performance`
- **Lint**: `npm run lint`
- **Lint Fix**: `npm run lint:fix`
- **Check Types**: `npm run check-types`
- **Unwatch Tests**: `npm run dev`

## Code Style & Patterns
- **Language**: TypeScript
- **Formatting**: Uses ESLint. Run `npm run lint` to check and `npm run lint:fix` to auto-fix.
- **Imports**: Uses ES modules (import/export).
- **TypeScript**: Do not use enums. Prefer types instead of interfaces.
- **Errors**: Do not use `throw new Error()`. Use `throw new RxError()` instead to reduce build size and do not include full error messages in production builds. Use the error codes from `src/rx-error.ts` and add new error codes if needed like `PL1`, `PL2`. Example: `throw newRxError('PL1', { plugin });`

## Documentation Style
- SHOULD use clear, simple language.
- SHOULD be spartan and informative.
- SHOULD use short, impactful sentences.
- SHOULD use active voice, avoid passive voice.
- SHOULD focus on practical, actionable insights.
- SHOULD use data and examples to support claims when possible.
- SHOULD use "you" and "your" to directly address the reader.
- AVOID using em dashes (–) anywhere.
- AVOID constructions like "not just this, but also this".
- AVOID metaphors and cliches.
- AVOID generalizations.
- AVOID common setup language.
- AVOID upfront warnings or notes, just the output requested.
- AVOID unnecessary adjectives and adverbs.
- AVOID starting sentences with "This".
- AVOID rhetorical questions.
- AVOID hashtags.
- AVOID semicolons.
- AVOID asterisks.
- AVOID specific words like: can, may, just, that, very, really, literally, actually, certainly, probably, basically, could, maybe, delve, embark, enlightening, esteemed, shed light, craft, creative, imagine, realm, game-changer, unlock, discover, skyrocket, abyss, not alone, in a world where, revolutionize, disruptive, utilize, utilizing, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, realm, however, harness, exciting, groundbreaking, cutting-edge, remarkable, it remains to be seen, glimpse into, navigating, landscape, stark, testament, in summary, in conclusion, moreover, boost, skyrocket, opened up, powerful, inquiries, ever-evolving.
- Review your response and ensure no em dashes.

## Development Workflow
1. Make changes
2. Build: `npm run build`
3. Run tests: `npm run test:fast:memory`
4. Run lint: `npm run lint`
5. Check TypeScript types: `npm run check-types`


## Not allowed edits

- Do never edit anything in the `/docs` folder. This folder is generated only. The documentation page sources are in `/docs-src`, edit these instead.
