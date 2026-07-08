import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaawsds2".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gaawsds2';

const titles = [
    <>{/* variation 0 */}The <b>Reactive</b> Database for <b>JavaScript</b> Apps</>,
    <>{/* variation 1 */}A <b>Local Database</b> That Syncs With Your <b>GraphQL</b> API</>,
    <>{/* variation 2 */}An <b>Open-Source</b> Database You Can <b>Self-Host</b></>
];

const texts = [
    <>RxDB is a NoSQL database for JavaScript and TypeScript. Observable queries re-render your React, React Native, Angular or Vue components on every data change, online or offline.</>,
    <>RxDB replicates over GraphQL, HTTP or WebSocket, so you keep the backend you already run. Offline writes queue locally and sync with conflict handling when the connection returns.</>,
    <>RxDB's core is free and open source. Replication works against your own servers: no proprietary cloud, no metered realtime billing, no vendor deciding when your data layer dies.</>
];

const bulletpoints = [
    [
        <>First-class TypeScript support</>,
        <>Bindings for major frameworks</>,
        <>JSON schema validation</>,
        <>Works in every JS runtime</>
    ],
    [
        <>GraphQL replication built in</>,
        <>Keep your existing backend</>,
        <>Offline queue and conflict handling</>,
        <>Realtime two-way sync</>
    ],
    [
        <>Free, open-source core</>,
        <>Self-hostable replication</>,
        <>Runs on IndexedDB, OPFS or SQLite</>,
        <>No vendor lock-in</>
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
            metaTitle: 'RxDB: Open-Source Local-First Database for JavaScript',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
