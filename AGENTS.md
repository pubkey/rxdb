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
- SHOULD use data and examples to support claims when possible.
- SHOULD be informative.
- SHOULD focus on practical, actionable insights.
- AVOID using em dashes (–) anywhere.
- AVOID constructions like "not just this, but also this".
- AVOID metaphors and cliches.
- AVOID generalizations.
- AVOID upfront warnings or notes, just the output requested.
- AVOID rhetorical questions.
- AVOID specific words like: very, really, literally, actually, certainly, probably, basically, delve, embark, enlightening, esteemed, shed light, craft, creative, imagine, realm, game-changer, unlock, discover, skyrocket, abyss, not alone, in a world where, revolutionize, disruptive, utilize, utilizing, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, realm, however, harness, exciting, groundbreaking, cutting-edge, remarkable, it remains to be seen, glimpse into, navigating, landscape, stark, testament, in summary, in conclusion, moreover, boost, skyrocket, opened up, powerful, inquiries, ever-evolving.
- Review your response and ensure no em dashes.
- MUST format FAQ sections using HTML `<details>` and `<summary>` tags. Ensure there is an empty line before and after the inner markdown content so it parses correctly.
- SHOULD try to use components from the `docs-src/src/components` folder when writing docs.

### Page Structure and Voice (analyzed from existing docs)

The rules above are word-level constraints. The following patterns describe how existing docs pages in `docs-src/docs/` are actually structured and written. New pages SHOULD match them.

**Page structure**
- Start every page with YAML frontmatter containing `title`, `slug` (ends in `.html`), `description` (one or two SEO-oriented sentences), and `image` (`/headers/<name>.jpg`).
- Open the body with a plain-language sentence that defines what the thing is and which problem it solves, before going into detail.
- Use descriptive, benefit-oriented section headings ("Multi-tab usage just works", "Latency is more important than bandwidth") instead of generic labels.
- End longer pages with a "Next steps" section that links to further docs, the example repositories, the Discord chat, the GitHub repo, and the 👑 Premium package.

**Voice and sentences**
- Write in second person ("you can", "you have to"). Use "we" for step-by-step tutorials ("here we'll learn", "now we have an RxCollection").
- Keep sentences short and direct. Mix short statements with medium explanatory ones.
- Explain a new concept by comparing it to a familiar one ("similar to an SQL table", "works like git").
- Bold the key term or phrase the first time it matters (`**realtime**`, `**share the state**`).

**Linking and terminology**
- Link generously. On first mention, link each RxDB concept (RxDatabase, RxCollection, RxDocument, RxStorage, replication) to its own docs page with a relative link like `./rx-collection.md`.
- Mark premium-only features with the 👑 emoji and link to `/premium/`.

**Code examples**
- Follow a short explanation with a minimal, runnable code block. Annotate the language (`ts`, `bash`).
- Keep imports explicit so a reader can copy and run the example.

**Components** (from `docs-src/src/components`)
- Use `<HeadlineWithIcon h1 icon={...}>` for the page h1 with a matching icon component from `docs-src/src/components/icons`.
- Use `<Steps>` for sequential tutorials, `<Tabs>` for alternative options (storages, frameworks, replication targets), and `<details>`/`<summary>` for FAQs.
- Use `<RxdbLogo />` and other existing components instead of raw markup where one fits.



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

## Changelog Rule
- Whenever you add a testcase or implement a FIX, add a changelog entry file under `orga/changelog/`.
- Prefer including a link to the root issue or pull request in that changelog line.


## Not allowed edits

- Do never edit anything in the `/docs` folder. This folder is generated only. The documentation page sources are in `/docs-src`, edit these instead.
