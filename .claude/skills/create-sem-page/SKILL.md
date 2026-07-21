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
visits, and the chosen variation letter is attached to the tracking events so
conversions can be attributed to it.

Variations are identified by **stable letter keys** (`a`, `b`, `c`, …), never
by array position: a letter keeps its meaning when variations are added or
removed later, so stored assignments and GA events stay comparable over time.
Whenever a page's variations (titles, texts, bulletpoints) get updated, two
hard rules apply:

- **Never reuse a letter.** A new variation always gets the next unused
  letter — even if an earlier letter is free because its variation was
  retired. GA events are attributed by letter, so re-assigning one would mix
  two different copies under one identifier.
- **Never delete a variation.** Retire it by **commenting it out** in the
  `variations` object instead, so its letter and copy stay on record in the
  file and the letter can't be re-assigned by accident.

The a/b test is keyed off the **`utm_campaign`** URL parameter: our ad final
URLs carry the full utm parameter set, `getUtmCampaign()`
(`docs-src/src/components/trigger-event.tsx`) persists the campaign in
`localStorage`, and `getSemVariation()` stores the assigned variation letter
under that campaign. All sem pages of one campaign therefore show the same
variation letter, and the tracking events carry a `utm_<campaign>_v<letter>`
prefix (e.g. `utm_indexeddb_va_…`). There is no per-page id anymore — the page
file itself needs no tracking constant.

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
   4 bulletpoints). Match by letter: variation `a` gets the first title,
   description and bulletpoint set (= Option A in the campaign file), `b` the
   second, `c` the third.

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
3. Do NOT add a changelog entry. A SEM landingpage is neither a testcase nor a
   FIX, so the Changelog Rule in `CLAUDE.md` does not apply. Adding one here is
   wrong.
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
 * The variation is picked randomly per visitor, keyed off the utm_campaign
 * of the ad click and kept stable via localStorage.
 */

/**
 * The a/b test variations, identified by stable letter keys - NOT by array
 * position. Letters keep their meaning when variations change over time:
 * - NEVER reuse a letter: a new variation always gets the next unused letter.
 * - NEVER delete a variation: comment it out instead, so its letter and copy
 *   stay on record and cannot be re-assigned by accident.
 */
const variations = {
    a: {
        title: <><<title a>></>,
        text: <><<description a>></>,
        bulletpoints: [
            <><<bulletpoint a.1>></>,
            <><<bulletpoint a.2>></>,
            <><<bulletpoint a.3>></>,
            <><<bulletpoint a.4>></>
        ]
    },
    b: {
        title: <><<title b>></>,
        text: <><<description b>></>,
        bulletpoints: [
            <><<bulletpoint b.1>></>,
            <><<bulletpoint b.2>></>,
            <><<bulletpoint b.3>></>,
            <><<bulletpoint b.4>></>
        ]
    },
    c: {
        title: <><<title c>></>,
        text: <><<description c>></>,
        bulletpoints: [
            <><<bulletpoint c.1>></>,
            <><<bulletpoint c.2>></>,
            <><<bulletpoint c.3>></>,
            <><<bulletpoint c.4>></>
        ]
    }
};

export default function Page() {
    /**
     * Render variation "a" on the server and on the first client render
     * to avoid a hydration mismatch, then swap to the assigned variation.
     */
    const [variationKey, setVariationKey] = useState('a');
    useEffect(() => {
        setVariationKey(getSemVariation(Object.keys(variations)));
    }, []);
    const variation = variations[variationKey as keyof typeof variations] ?? variations.a;

    return Home({
        sem: {
            id: 'gads',
            metaTitle: '<<metaTitle>>',
            // appName: '<<appName>>', // optional, remove if unused
            // iconUrl: '<<iconUrl>>', // optional, remove if unused
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
```

## Notes

- The `id: 'gads'` field is the SEM origin id used across the existing pages;
  keep it unless the user asks for a different tracking origin. The a/b
  variation is keyed off the visitor's stored `utm_campaign`, not `id` and not
  the slug.
- `getSemVariation(variationKeys)` lives in
  `docs-src/src/components/a-b-tests.tsx`. It takes the list of variation
  letters (`Object.keys(variations)`) and returns one of them: the first
  letter during server side rendering, and a stored random letter (keyed off
  the visitor's `utm_campaign`, falling back to `organic`) in the browser. A
  stored letter that no longer exists on the page (variation removed) gets
  re-assigned automatically.
- Look at existing pages like `docs-src/src/pages/sem/indexeddb-database-2.tsx`
  and `docs-src/src/pages/sem/localstorage-database.tsx` for tone and wording.
- Keep bulletpoints short (a few words). They render inside a checklist, so
  each item should read like a single value proposition.
