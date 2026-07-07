import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaidxdb2".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gaidxdb2';

const titles = [
    <>{/* variation 0 */}The <b>Reactive</b> JavaScript Database on <b>IndexedDB</b></>,
    <>{/* variation 1 */}An <b>Open-Source</b> Database You Can <b>Self-Host</b></>,
    <>{/* variation 2 */}From <b>Prototype</b> to <b>Production</b> on IndexedDB</>
];

const texts = [
    <>RxDB is a NoSQL database for JavaScript and TypeScript. Observable queries re-render your React, Angular, Vue or Svelte components on every data change, with your data stored in IndexedDB.</>,
    <>RxDB&apos;s core is free and open source. Replication works over HTTP, WebSocket or GraphQL against your own servers. No proprietary cloud, no per-read pricing, no lock-in.</>,
    <>RxDB adds what raw IndexedDB is missing for real products: schema validation, data migrations, encryption, compression and multi-tab handling, with a query API that scales with your app.</>
];

const bulletpoints = [
    [
        <>First-class TypeScript support</>,
        <>Bindings for major frameworks</>,
        <>JSON schema validation</>,
        <>Sync with any backend</>
    ],
    [
        <>Free, open-source core</>,
        <>Self-hostable replication</>,
        <>Runs on IndexedDB, OPFS or SQLite</>,
        <>No vendor lock-in</>
    ],
    [
        <>Schema and data migrations</>,
        <>Encryption and compression</>,
        <>Multi-tab leader election</>,
        <>Pluggable storage adapters</>
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
            metaTitle: 'RxDB: The Reactive JavaScript Database on IndexedDB',
            appName: 'JavaScript',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
