import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaidxdb1".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gaidxdb1';

const titles = [
    <>{/* variation 0 */}The <b>Local-First</b> Database for <b>JavaScript</b> Apps</>,
    <>{/* variation 1 */}<b>IndexedDB</b> Without the <b>Pain</b></>,
    <>{/* variation 2 */}<b>Instant Queries</b> on <b>IndexedDB</b></>
];

const texts = [
    <>RxDB is a NoSQL database for JavaScript that runs directly in your app. With a local-first design, it delivers zero-latency queries even offline, and syncs seamlessly with any backend.</>,
    <>RxDB gives you a clean NoSQL API on top of IndexedDB. No transaction boilerplate, no callback chains, just schemas, queries and observables that keep your UI in sync with your data.</>,
    <>RxDB runs directly inside your app and answers queries with zero network latency. Your data lives in IndexedDB, stays available offline and updates your UI the moment it changes.</>
];

const bulletpoints = [
    [
        <>Build apps that work offline</>,
        <>Sync with any Backend</>,
        <>Observable Realtime Queries</>,
        <>All JavaScript Runtimes Supported</>
    ],
    [
        <>No IndexedDB boilerplate</>,
        <>Reactive queries out of the box</>,
        <>JSON schemas and migrations</>,
        <>Free and open source</>
    ],
    [
        <>Zero-latency local reads</>,
        <>Works fully offline</>,
        <>Optimized IndexedDB storage</>,
        <>Observable realtime queries</>
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
            metaTitle: 'RxDB: IndexedDB Without the Pain',
            appName: 'JavaScript',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
