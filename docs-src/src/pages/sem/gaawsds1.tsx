import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaawsds1".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gaawsds1';

const titles = [
    <>{/* variation 0 */}The <b>Local-First</b> Database for <b>JavaScript</b> Apps</>,
    <>{/* variation 1 */}The <b>Migration Path</b> When Your Sync Gets <b>Deprecated</b></>,
    <>{/* variation 2 */}<b>Migrate Once</b>, Never Get <b>Sunset</b> Again</>
];

const texts = [
    <>RxDB is a NoSQL database for JavaScript that runs directly in your app. With a local-first design, it delivers zero-latency queries even offline, and syncs seamlessly with any backend.</>,
    <>Your offline sync engine is being sunset, but your app still needs local data and realtime sync. RxDB is open source and actively developed: store data on the device, query it instantly and replicate to the backend you already run.</>,
    <>RxDB runs inside your app and syncs to infrastructure you control. No vendor can deprecate your data layer: the core is open source, backend-agnostic and runs in browsers, mobile apps and desktop.</>
];

const bulletpoints = [
    [
        <>Build apps that work offline</>,
        <>Sync with any Backend</>,
        <>Observable Realtime Queries</>,
        <>All JavaScript Runtimes Supported</>
    ],
    [
        <>Actively developed, no sunset risk</>,
        <>Keep your existing GraphQL backend</>,
        <>Works offline by default</>,
        <>Free and open source</>
    ],
    [
        <>You own the stack, no lock-in</>,
        <>Backend-agnostic replication</>,
        <>Browser, mobile and desktop</>,
        <>Apache-2.0 licensed core</>
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
            metaTitle: 'RxDB: Migrate Off Deprecated Offline Sync',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
