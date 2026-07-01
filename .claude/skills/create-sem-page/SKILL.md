---
name: create-sem-page
description: Create a new SEM (search engine marketing) landingpage under docs-src/src/pages/sem. Use when the user wants to add an ads/SEO landingpage for RxDB and provides a slug plus 3 titles, 3 descriptions and 3 sets of bulletpoints that should be a/b tested against each other on the same page.
---

# Create a SEM landingpage

SEM landingpages live in `docs-src/src/pages/sem/*.tsx`. Each file renders the
main landingpage (`docs-src/src/pages/index.tsx` -> `Home`) but swaps the hero
`title`, `text`, `bulletpoints` and optional `iconUrl`/`appName` through the
`sem` prop (type `SemPage` in `docs-src/src/pages/index.tsx`).

This skill creates one new page that a/b tests 3 variations of the title, the
description text and the bulletpoints. A visitor is randomly assigned one of the
3 variations, the choice is stored in `localStorage` so it stays stable across
visits, and the chosen variation index is attached to the tracking events so
conversions can be attributed to it.

## Inputs to collect

Ask the user for these if they are not already provided:

1. **slug** - the URL slug and file name, e.g. `sqlite-database`. The page will
   be reachable at `/sem/<slug>.html`. Use only lowercase letters, numbers and
   hyphens.
2. **metaTitle** - the `<title>` / meta title shown in search results and the
   browser tab (plain string, no JSX).
3. **3 titles** - the big `<h1>` for each variation. These are JSX, so `<b>`
   can highlight words, e.g. `<>The fastest <b>SQLite</b> Database for Apps</>`.
4. **3 descriptions** - the hero paragraph text for each variation (JSX).
5. **3 sets of bulletpoints** - each set is an array of short JSX items shown as
   the hero checklist. Keep the count per set consistent (the default page uses
   4 bulletpoints). Match variations by index: title[0] pairs with
   description[0] and bulletpoints[0], and so on.

Optional:

- **appName** - one of the `AppName` values in `docs-src/src/pages/index.tsx`
  (`'Capacitor' | 'React' | 'Angular' | 'JavaScript' | 'Browser' | 'Electron' |
  'Ionic' | 'Node.js' | 'React Native' | 'Expo' | 'Svelte' | 'Vue.js'`). It is
  interpolated into the sync/offline section copy. Omit if none fits.
- **iconUrl** - path to an icon shown above the hero title, e.g.
  `/files/icons/nodejs.svg`.

## Steps

1. Confirm the slug does not already exist as
   `docs-src/src/pages/sem/<slug>.tsx`. If it does, ask before overwriting.
2. Create `docs-src/src/pages/sem/<slug>.tsx` from the template below, filling
   in the collected values. Keep all 3 arrays the same length (3 entries).
3. Add a changelog entry file under `orga/changelog/` (see the Changelog Rule in
   `CLAUDE.md`), e.g. `orga/changelog/sem-<slug>-page.md` with a one line
   description and a link to the issue or PR if available.
4. If dependencies are installed, run `npm run check-types` and `npm run lint`
   inside the repo to verify the new page compiles. If `node_modules` is not
   installed these will fail for unrelated reasons, so it is fine to skip them
   in a fresh environment.

## Page template

Replace every `<< ... >>` placeholder. Do not leave placeholders in the output.

```tsx
import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "<<slug>>".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = '<<slug>>';

const titles = [
    <>{/* variation 0 */}<<title 0>></>,
    <>{/* variation 1 */}<<title 1>></>,
    <>{/* variation 2 */}<<title 2>></>
];

const texts = [
    <><<description 0>></>,
    <><<description 1>></>,
    <><<description 2>></>
];

const bulletpoints = [
    [
        <><<bulletpoint 0.1>></>,
        <><<bulletpoint 0.2>></>,
        <><<bulletpoint 0.3>></>,
        <><<bulletpoint 0.4>></>
    ],
    [
        <><<bulletpoint 1.1>></>,
        <><<bulletpoint 1.2>></>,
        <><<bulletpoint 1.3>></>,
        <><<bulletpoint 1.4>></>
    ],
    [
        <><<bulletpoint 2.1>></>,
        <><<bulletpoint 2.2>></>,
        <><<bulletpoint 2.3>></>,
        <><<bulletpoint 2.4>></>
    ]
];

export default function Page() {
    /**
     * Render the first variation on the server and on the first client render
     * to avoid a hydration mismatch, then swap to the assigned variation.
     */
    const [variation, setVariation] = useState(0);
    useEffect(() => {
        setVariation(getSemVariation(PAGE_ID, titles.length));
    }, []);

    return Home({
        sem: {
            id: 'gads',
            metaTitle: '<<metaTitle>>',
            // appName: '<<appName>>', // optional, remove if unused
            // iconUrl: '<<iconUrl>>', // optional, remove if unused
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
```

## Notes

- The `id: 'gads'` field is the SEM origin id used across the existing pages;
  keep it unless the user asks for a different tracking origin. The per page
  a/b variation is keyed off `PAGE_ID`, not `id`.
- `getSemVariation(pageId, variationCount)` lives in
  `docs-src/src/components/a-b-tests.tsx`. It returns `0` during server side
  rendering, and a stored random index in the browser.
- Look at existing pages like `docs-src/src/pages/sem/indexeddb-database-2.tsx`
  and `docs-src/src/pages/sem/localstorage-database.tsx` for tone and wording.
- Keep bulletpoints short (a few words). They render inside a checklist, so
  each item should read like a single value proposition.
