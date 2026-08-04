import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gajsondb2".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
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
        title: <>The NoSQL <b>JSON Database</b> With Schemas</>,
        text: <>RxDB validates every document against your JSON Schema and ships full TypeScript typings. You get NoSQL flexibility without the anything goes chaos, plus versioned migrations when your data model evolves.</>,
        bulletpoints: [
            <>JSON Schema validation</>,
            <>First-class TypeScript support</>,
            <>Versioned schema migrations</>,
            <>NoSQL query engine</>
        ]
    },
    b: {
        title: <>An Open-Source <b>JSON Database</b> You Can Self-Host</>,
        text: <>RxDB's core is free and open source. Replicate JSON documents to your own servers over HTTP, WebSocket or GraphQL: no proprietary cloud, no per-read pricing, no lock-in.</>,
        bulletpoints: [
            <>Free, open-source core</>,
            <>Self-hostable replication</>,
            <>Runs on IndexedDB, OPFS or SQLite</>,
            <>No vendor lock-in</>
        ]
    },
    c: {
        title: <>The Reactive <b>JSON Database</b> for Your Framework</>,
        text: <>RxDB's observable queries re-render your React, Angular, Vue or Svelte components whenever a JSON document changes. One database, every JavaScript runtime: browser, Node.js, Electron and mobile.</>,
        bulletpoints: [
            <>Bindings for major frameworks</>,
            <>Observable realtime queries</>,
            <>Browser, Node.js and mobile</>,
            <>Sync with any backend</>
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
            metaTitle: 'RxDB: Open-Source NoSQL JSON Database for JavaScript',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
