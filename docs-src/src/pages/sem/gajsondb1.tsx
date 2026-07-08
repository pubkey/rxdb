import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gajsondb1".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gajsondb1';

const titles = [
    <>{/* variation 0 */}The Local-First <b>Database</b> for JavaScript Apps</>,
    <>{/* variation 1 */}The <b>JSON Database</b> Built for JavaScript</>,
    <>{/* variation 2 */}Instant Queries on <b>JSON Documents</b></>
];

const texts = [
    <>RxDB is a NoSQL database for JavaScript that runs directly in your app. With a local-first design, it delivers zero-latency queries even offline, and syncs seamlessly with any backend.</>,
    <>RxDB is a NoSQL database that stores your data as plain JSON documents. Query them with a Mongo-like syntax, observe changes in realtime and keep your app state JSON from the UI to storage to your backend.</>,
    <>RxDB runs inside your app and answers JSON queries with zero network latency. Your documents stay available offline and your UI updates the moment the data changes.</>
];

const bulletpoints = [
    [
        <>Build apps that work offline</>,
        <>Sync with any Backend</>,
        <>Observable Realtime Queries</>,
        <>All JavaScript Runtimes Supported</>
    ],
    [
        <>Plain JSON documents</>,
        <>Mongo-like query syntax</>,
        <>Realtime observable queries</>,
        <>Free and open source</>
    ],
    [
        <>Zero-latency local reads</>,
        <>Works fully offline</>,
        <>Indexes for fast JSON queries</>,
        <>Live UI updates</>
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
            metaTitle: 'RxDB: The JSON Database for JavaScript Apps',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
