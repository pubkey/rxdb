import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaencdb1".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gaencdb1';

const titles = [
    <>{/* variation 0 */}The <b>Local-First</b> Database for <b>JavaScript</b> Apps</>,
    <>{/* variation 1 */}The <b>Encrypted</b> Local Database for <b>JavaScript</b></>,
    <>{/* variation 2 */}Your Data, <b>Encrypted</b> on the <b>Device</b></>
];

const texts = [
    <>RxDB is a NoSQL database for JavaScript that runs directly in your app. With a local-first design, it delivers zero-latency queries even offline, and syncs seamlessly with any backend.</>,
    <>RxDB is a local database for JavaScript apps with AES encryption built in. Your data is encrypted before it is written to disk, stays available offline and syncs to any backend you choose.</>,
    <>RxDB stores your app's data locally and encrypts sensitive fields before they touch storage. No plaintext at rest, no required cloud, and your app keeps working with zero network latency.</>
];

const bulletpoints = [
    [
        <>Build apps that work offline</>,
        <>Sync with any Backend</>,
        <>Observable Realtime Queries</>,
        <>All JavaScript Runtimes Supported</>
    ],
    [
        <>AES encryption at rest</>,
        <>Works fully offline</>,
        <>Sync with any backend</>,
        <>Free and open source</>
    ],
    [
        <>No plaintext at rest</>,
        <>Data stays on the device</>,
        <>Zero-latency local queries</>,
        <>Open source and auditable</>
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
            metaTitle: 'RxDB: The Encrypted Local Database for Your App',
            appName: 'JavaScript',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
