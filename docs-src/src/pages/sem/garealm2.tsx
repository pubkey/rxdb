import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "garealm2".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'garealm2';

const titles = [
    <>{/* variation 0 */}The <b>Local-First</b> Database for <b>JavaScript</b> Apps</>,
    <>{/* variation 1 */}An <b>Open-Source</b> Database You Can <b>Self-Host</b></>,
    <>{/* variation 2 */}Built for <b>Production</b> <b>Offline-First</b> Apps</>
];

const texts = [
    <>RxDB is a NoSQL database for JavaScript and TypeScript. It runs in React Native, Capacitor, browsers, Electron and Node.js, with observable queries that update your UI in realtime.</>,
    <>RxDB's core is free and open source. Replication runs over HTTP, WebSocket or GraphQL against your own backend: no proprietary sync cloud, no per-device pricing, no lock-in.</>,
    <>RxDB ships what a production migration needs: JSON schema validation, data migrations, conflict resolution, encryption and multi-tab support, proven in years of production use.</>
];

const bulletpoints = [
    [
        <>First-class TypeScript support</>,
        <>React Native and Expo ready</>,
        <>Observable realtime queries</>,
        <>NoSQL JSON documents</>
    ],
    [
        <>Free, open-source core</>,
        <>Self-hostable replication</>,
        <>Works with any backend</>,
        <>No vendor lock-in</>
    ],
    [
        <>Schema validation and migrations</>,
        <>Conflict resolution built in</>,
        <>Encryption plugin available</>,
        <>Battle-tested sync protocol</>
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
            metaTitle: 'RxDB: The Local-First JavaScript Database With Sync',
            appName: 'JavaScript',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
