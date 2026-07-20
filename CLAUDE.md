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
- **Errors**: Do not use `throw new Error()`. Use `throw newRxError()` or `throw newRxTypeError()` instead to reduce build size and do not include full error messages in production builds. Use the error codes from `src/rx-error.ts` and add new error codes if needed like `PL1`, `PL2`. Example: `throw newRxError('PL1', { plugin });`
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

## Changelog Rule
- Whenever you add a testcase or implement a FIX, add a changelog entry file under `orga/changelog/`.
- Prefer including a link to the root issue or pull request in that changelog line.
- Do NOT add a changelog entry for changes that are neither a testcase nor a FIX. For example, adding a SEM landingpage under `docs-src/src/pages/sem/` must not produce a changelog entry.

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

## Documentation Writing Style Guide

This guide is derived from an analysis of all existing pages in `docs-src/docs/`. Older pages (2023-era) contain hype vocabulary that is now banned; when patterns conflict, follow this guide and the rules above, not legacy pages. Good style models: `articles/realm-to-rxdb-migration.md`, `webmcp.md`, `testing.md`, `rx-storage-localstorage.md`, the newer `articles/alternatives/*.md` pages.

### Frontmatter
- Exactly four fields, always in this order: `title`, `slug`, `description`, `image`. No other fields.
- `slug`: kebab-case filename plus `.html`, for example `slug: partial-sync.html`.
- `image`: `/headers/<slug-basename>.jpg`. Alternative articles use `/headers/alternatives/<slug-basename>.jpg`.
- `title`: Title Case, 40 to 80 chars, keyword first. Use a plain hyphen `-` as separator, never an em dash or `|`. Two modes: plain feature name for reference pages ("Key Compression", "RxQuery") or keyword phrase for articles ("RxDB as a Dexie.js Alternative with Mango Queries and Replication"). The H1 may differ slightly from the title.
- `description`: 1 to 2 sentences, about 120 to 160 chars, contains the primary keyword. Openers like "Compare X with RxDB." or "Learn how ...". Do not use the banned words even though older descriptions contain them.

### Page structure
- MDX component imports go between the frontmatter and the H1.
- One H1 per page. Integration and feature landing pages may use `<HeadlineWithIcon h1 icon={...}>` with an optional `subtitle`.
- Opening paragraph: define the topic in 1 to 4 sentences, bold the primary keyword on first mention, link `[RxDB](https://rxdb.info/)` on first mention in articles, and include 2 to 6 internal links. Articles add a roadmap sentence: "This page explains what X is, where it falls short, and how RxDB ...".
- Place `<RxdbLogo alt="<keyword phrase>" />` after the intro paragraph in articles. It is globally registered, no import needed.
- Article flow: What is X → why X matters or its limits → What RxDB adds (numbered `### 1. ...` subsections) → code samples → FAQ → `## Follow Up` link list.
- Alternative-article flow (`articles/alternatives/`): competitor-first intro that credits the competitor honestly → `## A Short History of X` (with `### A Brief Timeline` bold-year bullets) → `## What is RxDB?` → `## Where X Falls Short` → what RxDB adds → `## Code Sample: ...` sections → a concession section ("When X Still Makes Sense") → `## FAQ` → `## Comparison Table` with header `| Feature | X | RxDB |` (competitor column before RxDB) → `## Follow Up` paragraph plus a `More resources:` bullet list of internal links.
- Plugin and storage page flow: intro ("With the `plugin-name` plugin you can ..." or "The X [RxStorage](./rx-storage.md) is ...") → key features as bold-label bullets → `<PremiumBlock />` or `<BetaBlock since="X.0.0" />` if applicable → usage steps wrapped in `<Steps>` → options → limitations or known problems → FAQ.
- API method headings are the literal API name: `## putAttachment()`, `### awaitInitialReplication()`.
- Headings: Title Case for H2/H3. Question headings ("What is a Vector Database?") and how-to gerund headings ("Using the sharding plugin") are fine.
- End articles with `## Follow Up`: a bullet list of internal links, usually the Quickstart (`../quickstart.md`), the GitHub repo as `/code/`, the chat as `/chat/`, and related articles. A star CTA "leave a star ⭐" is allowed. Reference pages may simply end after the last technical section.

### Voice and tone
- Second person "you" for the reader. "we" only in tutorial walkthroughs. Do not use "I" (it appears only in release notes and personal opinion pieces written by the maintainer).
- Present tense. Imperative for steps. Short paragraphs of 1 to 4 sentences. Follow longer sentences with short declarative closers ("Nothing is hidden.", "Switching storages is a configuration change, not a rewrite.").
- Be fair to competitors: name what they do well before explaining their limits, link to their official site, and include a section on when the competitor is still the right choice.
- Be honest about RxDB tradeoffs: Pros/Cons pairs, Limitations sections, and "when not to use this" notes are a house signature.
- Back claims with specifics: concrete numbers ("saves up to 40% disc space", "3x-4x faster compared to IndexedDB"), dates, named users, GitHub issue links, and links to `rx-storage-performance.md` or benchmark repos. If no numbers exist, keep performance claims qualitative and add a link.
- Common caveat openers: "Notice that ...", "Keep in mind that ...", "It is recommended to ...".
- No exclamation marks in prose. No rhetorical flourish. Use a spaced hyphen " - " where a dash-like separator is needed, never an em dash.

### Formatting
- Bold the primary keyword on first mention, product names, and key terms. Standard bullet pattern: `- **Term**: explanation`.
- Bullets use `-`. Numbered lists for ordered steps, with a bold lead: `1. **Define a schema** for every datastore. ...`.
- Code fences: prefer `ts`; `bash` for npm install commands; `json`, `sql`, `graphql` as needed. Snippets are complete and runnable, with imports. Comments inside code carry the explanation (`// Reactive query: emits a new array whenever a matching doc changes.`). Option objects use JSDoc comments with `(optional)` and `[default=...]` markers. Placeholder is `/* ... */`. Show output as `// > ...` comments.
- Canonical snippet shape: `createRxDatabase` → `addCollections` with an inline JSON schema (string primary key with `maxLength: 100`) → insert → `.find({ selector }).$.subscribe(...)`.
- Inline code for API names, options, operators (`$gt`), field names (`_rev`), and counts like `10k`.
- Images are centered raw HTML: `<p align="center"><img src="./files/x.png" alt="keyword phrase" width="450" /></p>`. Alt text is a short keyword phrase. Use `className`, not `class`.
- Internal links are relative with the `.md` extension: `[RxStorage](./rx-storage.md)`, `[replication](../replication.md)` from articles. Site-root links for non-doc pages: `/premium/`, `/code/`, `/chat/`. Anchor text is a descriptive keyword phrase, never "click here". No UTM parameters.
- Link densely: nearly every first mention of an RxDB concept links to its page. Repeat links to canonical pages (replication, rx-storage, quickstart, offline-first) are fine.
- Admonitions `:::note` and `:::warning` (optionally titled) sparingly; not part of the default template.
- Comparison tables may use ✅ / ❌ / ⚠️ cells.
- Emoji only where functional: 👑 always accompanies "RxDB Premium" links, ⭐ for the star CTA, ✅/❌/⚠️ in tables. Never decorative emoji in prose.
- FAQ answers open with a "Yes." or "No." verdict, then 2 to 5 sentences with a bold internal link like `**[RxDB](./rx-database.md)**`. Questions are phrased as real search queries.

### Components (import from `@site/src/components/...`)
- `<Steps>` wraps a run of `###` step headings, each heading followed by a short sentence and a code block.
- `<Tabs>` wraps headings that become tab labels; can nest inside `<Steps>`.
- `<PremiumBlock />` after the intro on premium plugin pages.
- `<BetaBlock since="17.0.0" />` for beta features.
- `<PerformanceChart title="Browser Storages" data={PERFORMANCE_DATA_BROWSER} metrics={PERFORMANCE_METRICS} />` with data from `performance-data`.
- `<VideoBox videoId="..." title="..." duration="m:ss" />` inside `<center>`.
- `<QuoteBlock author="..." year="..." sourceLink="...">quote</QuoteBlock>` for cited quotes.
- `<HeadlineWithIcon h1 icon={<IconX />}>Title</HeadlineWithIcon>` for icon headlines.
- `<RxdbLogo alt="..." />` is global and needs no import.

### Terminology and spelling
- US English. Oxford comma.
- Correct casing: JavaScript, TypeScript, Node.js, IndexedDB, NoSQL, RxJS, CouchDB, GraphQL, WebSocket, WebRTC, OPFS (expand "Origin Private File System" on first use), localStorage.
- RxDB terms: RxDatabase, RxCollection, RxDocument, RxQuery, RxSchema, RxStorage, and "Sync Engine" (capitalized, linked to `./replication.md`).
- "local-first" and "offline-first" are hyphenated and lowercase in prose. Prefer "local-first" in new pages and link it to `./articles/local-first-future.md` or `./offline-first.md`.
- RxDB one-liner for "What is RxDB" sections: "RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript applications". Follow with the runtime list: browser, Node.js, Electron, React Native, Capacitor, Deno, and Bun.
- Query language is described as "MongoDB-style (Mango) queries".

### SEO
- The primary keyword appears in the title, slug, description, H1, bolded in the first paragraph, in several H2s, and in image alt text.
- Cross-link sibling articles to knit the cluster together (framework articles link each other; alternative articles link `local-first-future.md`, `realtime-database.md`).
- FAQ `<details>` questions target long-tail search queries.
