import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "garealm1".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'garealm1';

const titles = [
    <>{/* variation 0 */}The <b>Local-First</b> Database for <b>JavaScript</b> Apps</>,
    <>{/* variation 1 */}<b>Sync</b> That No Vendor Can <b>Shut Down</b></>,
    <>{/* variation 2 */}Keep <b>Offline-First</b>. Replace the <b>Dead Sync</b>.</>
];

const texts = [
    <>RxDB is a NoSQL database for JavaScript that runs directly in your app. With a local-first design, it delivers zero-latency queries even offline, and syncs seamlessly with any backend.</>,
    <>Your managed mobile sync reached end of life. RxDB is open source: the local database and the replication layer run on your infrastructure, so nobody can switch them off again.</>,
    <>RxDB keeps the model you already built on: a local NoSQL database with live queries plus realtime replication. Move your data layer without rewriting your app's offline logic.</>
];

const bulletpoints = [
    [
        <>Build apps that work offline</>,
        <>Sync with any Backend</>,
        <>Observable Realtime Queries</>,
        <>All JavaScript Runtimes Supported</>
    ],
    [
        <>Open-source local database</>,
        <>Self-hosted realtime sync</>,
        <>Actively maintained and funded</>,
        <>No proprietary cloud required</>
    ],
    [
        <>Local NoSQL with live queries</>,
        <>Realtime two-way replication</>,
        <>Offline writes queue and sync</>,
        <>Runs in React Native and the web</>
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
            metaTitle: 'RxDB: The Maintained Local Database With Realtime Sync',
            appName: 'JavaScript',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
