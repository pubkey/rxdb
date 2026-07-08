import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gajsondb2".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gajsondb2';

const titles = [
    <>{/* variation 0 */}The NoSQL <b>JSON Database</b> With Schemas</>,
    <>{/* variation 1 */}An Open-Source <b>JSON Database</b> You Can Self-Host</>,
    <>{/* variation 2 */}The Reactive <b>JSON Database</b> for Your Framework</>
];

const texts = [
    <>RxDB validates every document against your JSON Schema and ships full TypeScript typings. You get NoSQL flexibility without the anything goes chaos, plus versioned migrations when your data model evolves.</>,
    <>RxDB's core is free and open source. Replicate JSON documents to your own servers over HTTP, WebSocket or GraphQL: no proprietary cloud, no per-read pricing, no lock-in.</>,
    <>RxDB's observable queries re-render your React, Angular, Vue or Svelte components whenever a JSON document changes. One database, every JavaScript runtime: browser, Node.js, Electron and mobile.</>
];

const bulletpoints = [
    [
        <>JSON Schema validation</>,
        <>First-class TypeScript support</>,
        <>Versioned schema migrations</>,
        <>NoSQL query engine</>
    ],
    [
        <>Free, open-source core</>,
        <>Self-hostable replication</>,
        <>Runs on IndexedDB, OPFS or SQLite</>,
        <>No vendor lock-in</>
    ],
    [
        <>Bindings for major frameworks</>,
        <>Observable realtime queries</>,
        <>Browser, Node.js and mobile</>,
        <>Sync with any backend</>
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
            metaTitle: 'RxDB: Open-Source NoSQL JSON Database for JavaScript',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
