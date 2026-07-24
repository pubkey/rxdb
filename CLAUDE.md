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

## Article Internal Linking Rule
- Whenever you CREATE a new article under `docs-src/docs/` (for example a page under `docs-src/docs/articles/`), internal links MUST go in both directions.
- Inbound: you MUST add internal links to the new article from existing related articles in the same topic cluster. A new article that nothing links to does not rank.
- Outbound: the new article itself MUST link to existing related articles and reference pages in the same cluster. Nearly every first mention of an RxDB concept should link to its page (for example `[RxStorage](./rx-storage.md)`, `[replication](../replication.md)`, the quickstart), and it should link to its sibling articles.
- All these links MUST be in-text links inside prose, placed on a relevant keyword phrase where the topic already comes up. Search the related pages for the concept (for example `grep` for "encrypt", "sensitive data", "plain text") and link from that sentence.
- Do NOT just append a bullet to a `## Follow Up` list. Dumping the link into a Follow Up list is lazy and does not count as satisfying this rule. Find real in-text opportunities.
- Use a descriptive keyword phrase as the anchor text, never "click here". Do this in the same change that creates the article, not as a follow-up.

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

### Voice and tone: the author fingerprint

The docs have one dominant authorial voice: the maintainer, a German native speaker who writes direct, pragmatic, evidence-driven English. New pages must sound like this voice. The fingerprint below was measured on his most personally written pages (release notes, slow-indexeddb.md, why-nosql.md, downsides-of-offline-first.md, offline-first.md, leader-election.md, transactions-conflicts-revisions.md, replication.md, contribute.md, the websockets and localstorage-indexeddb articles).

**Persona and register**
- Second person "you" for the reader. "we" only in tutorial walkthroughs. Do not use "I" (it appears only in release notes and personal opinion pieces written by the maintainer).
- Present tense. Imperative for steps. Benchmark-empiricist stance: every claim invites verification ("You can reproduce all performance tests in this repo", "(lower is better)").
- Be fair to competitors: name what they do well before explaining their limits, link to their official site, and include a section on when the competitor is still the right choice.
- Be honest about RxDB tradeoffs: Pros/Cons pairs, Limitations sections, and "when not to use this" notes are a house signature.
- Back claims with specifics: concrete numbers ("saves up to 40% disk space", "3x-4x faster compared to IndexedDB"), dates, named users, GitHub issue links, and links to `rx-storage-performance.md` or benchmark repos. If no numbers exist, keep performance claims qualitative and add a link.
- Humor is dry, deadpan, and rare: state the naive solution, then refute it with facts ("Well, IndexedDB was slow in 2013 and it is still slow today. Waiting is not an option."). Playful code examples are welcome (heroes schema, 'foobar', Alice and Bob, "console.log('Long lives the king!')"). No jokes in reference sections.
- Direct reader involvement is allowed in articles: blunt commands, "Count them, I will wait..", "you did something wrong". Use sparingly.

**Rhythm and burstiness (measured)**
- Sentence length: mean 17 words, median 16, standard deviation 8 (coefficient of variation 0.45, high burstiness). About 75% of sentences have 9 to 25 words, 11 to 14% have 8 or fewer, 6 to 8% have 30 or more.
- The signature rhythm: one or two long multi-clause explanation sentences (30 to 50 words, chained with "because", "and", "which") followed by a short verdict sentence of 2 to 7 words that lands the point: "IndexedDB is slow.", "This will not work.", "Waiting is not an option.", "But there is no free lunch.", "This is done."
- Escalating repetition as an emphasis device: "the in-memory plugin was slow. Really slow, even slower than just using the indexeddb adapter."
- Paragraphs: mean 2.2 to 2.5 sentences, about 35% of paragraphs are a single sentence, fewer than 5% exceed 4 sentences. One-sentence paragraphs are used as pitch beats.
- Bullet density: roughly 1 bullet line per 3 to 4 prose sentences. Prose never runs long before a list or code block breaks it up.
- The author historically used question-then-answer transitions ("So what are the differences?"); the rules above ban rhetorical questions, so express these as statements in new pages.

**Clause preference and sentence anatomy**
- Main clause first in about 60% of sentences; about 40% start with a fronted adverbial or subordinate clause from a fixed set: "In the past,", "By default,", "To fix this,", "Because X,", "When you X,", "Instead of X,", "With X,", "On the client,".
- Favorite subordinators, in order of frequency: "because" (fronted and trailing), "when", "so that" (purpose), "which/that", "where" (all-purpose situational relative: "use cases where ..."). "as soon as" for escalation ("But as soon as your app gets bigger ..."), "while" for concessions.
- "when" vs "if": "when" for expected or recurring conditions ("When a query without a limit is done, ..."), "if" only for genuinely uncertain ones. This is the German wenn/falls split and is a core tell of the voice.
- Sentence-initial coordinators are a signature, at 1 to 2 per page: "But" (always preferred over "however"), "So", "Also", "Instead", "Therefore", "Now", and occasionally "And" for a dramatic beat ("And there we have it.").
- Tail relative "which is why ..." closes explanations: "This was confusing behavior which is why I changed the default."
- Passive and impersonal voice for change descriptions ("was renamed", "has been removed", "is now done via"); active second person for explanations and guides.
- Prefer finite clauses over participle constructions. Gerund subjects are fine ("Keeping too many deleted documents in the storage can slow down queries") but never followed by a comma.
- Prefer timeline narration ("In the past, X. Now Y.") over subjunctive conditionals. "From now on, ..." introduces new behavior.

**Recurring syntactic frames (use these)**
- "This + verb" anaphoric openers: "This means ...", "This ensures that ...", "This makes ...", "This was confusing, so ...". The most frequent frame in the corpus.
- "Notice that ...", "Keep in mind that ...", "It is recommended to ..." as caveat openers.
- "It can happen that ..." for edge cases.
- "There is/are ..." existential openers.
- "It is + adjective + to ...": "it is not possible to create a transaction between multiple maybe-offline client devices".
- "Let's say ..." to introduce examples (the author writes "Lets"; use the apostrophe in new pages).
- "Imagine ..." scenario openers for articles: "Imagine two of your users modify the same JSON document, while both are offline."
- "Same goes for ...", "Same as X, Y" for parallel cases.
- "In the following ..." to announce structure; "At first, ..." for the first step.
- "So you have a JavaScript web application that needs to ..." second-person scenario page openers.
- "Now that you know X, let's compare Y" as a bridge between sections.
- Section closers tie the technique back to RxDB with an internal link ("RxDB uses batched cursors in the [IndexedDB RxStorage](./rx-storage-indexeddb.md).") or end with "[Read more](...)" as a terminal sentence.

**Function word profile (per 1000 words of authorial prose)**
- Signature high rates: "the" 68, "you" 17, "not" 8.7, "when" 7.7, "also" 4.2, "so" 4.2, "because" 3.4, "instead (of)" 3.6, "only" 3.7, "have to" 2.7.
- Obligation modals, ranked: "have to" (dominant, everyday obligation) > "must" (hard spec requirements, sometimes typographically amplified: "the primary key MUST be set") > "should" (advice) > "need to". Hedge: "you might want to just ...".
- Characteristic small words: "no longer" (never "anymore"), "just" as downtoner, "pretty" and "way" as informal intensifiers ("way faster", "pretty easy" - articles only), "of course", "at the same time", "for now", "so called", "at first", "anyway".
- Connectives the author never uses: thus, hence, furthermore, moreover, nevertheless, additionally, consequently. "however" is rare; "But" does that job. This matches the banned-words list above.
- "stuff" and "things" appear in his informal register; allowed at most once per page in articles, never in reference pages.
- Contractions: the body prose spells things out ("do not", "cannot", "it is"). Avoid contractions except in quoted speech and marketing lines.

**Page and section endings**
- Articles end with "## Follow Up" (bullet list of internal links, star CTA allowed). Release notes end with "## You can help!". Reference pages may simply stop after the last technical section; do not pad with a summary.
- No exclamation marks in analytical prose. They are reserved for rally headings ("You can help!"), code comments ("// This works!"), and marketing lines.

### Lexical metrics (measured fingerprint)
- Vocabulary is deliberately plain and repetitive: standardized type-token ratio is about 0.37 to 0.40 per 1000-word window (6,500 distinct words over 145,000 tokens corpus-wide). Repetition of the exact technical term is preferred over elegant variation: "database" stays "database", "replication" stays "replication". Never rotate synonyms to avoid repetition.
- Hapax legomena are 37 to 45% of the vocabulary, and they are technical compounds and API names, not rare literary words. If a word would be the only fancy word on the page, cut it.
- Punctuation per 1000 words of prose: commas 37 to 48, colons about 6, parentheses 3 to 4, question marks under 2, semicolons about 0 (do not use them), exclamation marks about 0, em dashes exactly 0, ellipsis near 0.
- Commas are used lightly: no comma after short fronted adverbs ("So instead of doing that you can send data ..."), no comma between subject and verb, comma before "which" relatives is inconsistent in the corpus; default to standard English comma rules.
- Parentheses carry defaults, asides, and meta notes: "(optional)", "(default: 100)", "(lower is better)", "(for now)", "(aka offline first)".
- Single quotes as scare quotes: 'normal' applications. Backticks aggressively for any technical token, even mid-clause. Mid-sentence bold for key nouns ("**better defaults**", "**never in parallel**") and CAPS for logical emphasis ("MUST", "NOT").

### Hyphenation
- Heavy compound-building is part of the voice: "offline-first", "local-first", "real-time", "client-side", "server-side", "in-memory", "built-in", "multi-tab", "key-value", "peer-to-peer", "conflict-free".
- Ad-hoc German-style compounds appear in his prose ("browser-tabs", "find-by-query", "time-to-first"): acceptable in benchmark labels and headings, but prefer standard spacing in body text ("browser tabs").
- Compound adjectives are always hyphenated before a noun ("offline-first apps", "client-side database").
- The only dash is the spaced hyphen " - ", used in titles and timeline bullets ("**2012** - First published"). Never an em dash.

### German L1 patterns: keep the flavor, fix the errors
The author's English carries German transfer. Some of it is the voice; some of it is plain error that reviewers fix. Keep the first list, never reproduce the second.

Keep (grammatical, part of the voice):
- Sentence-initial "Also", "So", "But", "Therefore", "Instead".
- "In the past, X ... Now Y." and "From now on, ..." frames.
- "In the following ...", "At first, ...", "as soon as", "at the same time", "so called".
- "It can happen that ...", "Notice that ...".
- "when" for expected conditions, "if" for uncertain ones.
- Uncontracted forms ("do not", "cannot") and the modal ranking "have to" > "must" > "should".
- Plain, repetitive vocabulary and short verdict sentences.

Do not reproduce (authentic errors in old pages; write the correct form):
- where/were confusion: "there where some things" → "there were".
- Participle collapse: "was build" → "was built", "is send" → "is sent", "I spend one month" (past) → "I spent".
- "loose" → "lose"; "then" → "than" in comparisons; "let/lead to" (past) → "led to".
- Adjective as adverb: "works different" → "works differently", "scales pretty bad" → "scales badly", "improves performance significant" → "significantly".
- "allows to do X" → "allows you to do X" or "makes it possible to do X"; "requires to open" → "requires you to open".
- German commas: no comma between a gerund subject and its verb ("Syncing all the messages a user could write, can be done" → drop the comma); no comma before "that" ("the time has shown, that" → "has shown that").
- Dropped genitive apostrophes: "the clients device" → "the client's device", "a documents value" → "a document's value".
- "lets" → "let's"; "it's" for possession → "its".
- Quantifiers: "much small improvements" → "many small improvements", "less operations" → "fewer operations", "amount of collections" → "number of collections", "6 month ago" → "6 months ago".
- Articles: "a OPFS storage" → "an OPFS storage", "the modifyjs" → "modifyjs" (no article before bare library names).
- "how it looks like" → "what it looks like"; "different to" → "different from"; "in a later point in time" → "at a later point in time"; "In difference to" → "In contrast to".
- Literal idiom translations: "make problems" → "cause problems", "up to impossible" → "next to impossible", "in good hope" → "confident", "and backwards" → "and back".
- "has shown to be" → "has proven to be" or "has turned out to be".
- German number formatting: "1,5 years" → "1.5 years", "10.000 documents" → "10,000 documents".
- "would" inside if-clauses: "if you would now inspect" → "if you now inspect".

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
- US English ("behavior", "optimize", "synchronize"). The corpus has rare UK slips ("initialisation", "realised", "optimisation"); do not copy them. Oxford comma throughout.
- Correct casing: JavaScript, TypeScript, Node.js, IndexedDB, NoSQL, RxJS, CouchDB, GraphQL, WebSocket, WebRTC, SQLite, WebAssembly (WASM), SharedWorker, OPFS (expand "Origin Private File System" on first use), localStorage (as the API; the corpus also has "LocalStorage" and "Localstorage" - use "localStorage"). The corpus has lapses ("javascript", "nodejs", "pouchdb" lowercase); write the correct casing in new pages.
- RxDB terms: RxDatabase, RxCollection, RxDocument, RxQuery, RxSchema, RxStorage, RxState, and "Sync Engine" (capitalized, linked to `./replication.md`).
- "local-first" and "offline-first" are hyphenated and lowercase in prose, capitalized as "Local-First"/"Offline-First" in headings and bullet labels. Prefer "local-first" in new pages and link it to `./articles/local-first-future.md` or `./offline-first.md`.
- "realtime" is written as one word in prose ("realtime replication", "realtime database"); "Real-Time" appears in titles and subtitles. Do not write "real time" as two unhyphenated words.
- Always write "disk" for hard drive storage ("saves to disk", "disk space"). Older pages contain the misspelling "disc"; do not copy it, and correct it to "disk" when you edit a passage that contains it.
- Numbers: backticked shorthand for counts and limits (`10k` documents, `2k`), bold for percentages ("**43%** faster"), US date format ("May 1, 2027"), period as decimal separator, comma as thousands separator.
- RxDB one-liner for "What is RxDB" sections: "RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript applications". Follow with the runtime list: browser, Node.js, Electron, React Native, Capacitor, Deno, and Bun.
- Query language is described as "MongoDB-style (Mango) queries".
- Recurring vocabulary that carries the voice: "out of the box", "under the hood", "battle-tested", "first-class", "vendor lock-in", "source of truth", "The trouble starts when ...", "falls short", "bite back", "Switching storages is a configuration change, not a rewrite". Reuse these; do not invent new marketing vocabulary.

### SEO
- The primary keyword appears in the title, slug, description, H1, bolded in the first paragraph, in several H2s, and in image alt text.
- Cross-link sibling articles to knit the cluster together (framework articles link each other; alternative articles link `local-first-future.md`, `realtime-database.md`).
- FAQ `<details>` questions target long-tail search queries.
