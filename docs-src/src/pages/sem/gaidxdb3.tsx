import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaidxdb3".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gaidxdb3';

const titles = [
    <>{/* variation 0 */}Fix IndexedDB <b>Limits</b>, <b>Speed</b> and <b>Sync</b></>,
    <>{/* variation 1 */}<b>IndexedDB</b> That <b>Syncs</b> With Your Backend</>,
    <>{/* variation 2 */}Browser Storage You Can <b>Rely On</b></>
];

const texts = [
    <>Quota errors, slow bulk writes, data evicted by the browser? RxDB manages storage carefully, keeps queries fast with caching and indexes, and protects your data by syncing it to your server.</>,
    <>IndexedDB keeps data on one device, RxDB replicates it. Sync browser data to any backend over HTTP, WebSocket or GraphQL, with conflict handling and offline queueing built in.</>,
    <>RxDB coordinates writes across tabs, validates every document against your schema and migrates data between app versions, so browser storage stops being the scary part of your stack.</>
];

const bulletpoints = [
    [
        <>Handles storage quotas gracefully</>,
        <>Fast queries via caching and indexes</>,
        <>Data survives via server sync</>,
        <>Works offline by default</>
    ],
    [
        <>Realtime two-way replication</>,
        <>Conflict resolution included</>,
        <>Offline writes sync later</>,
        <>Your servers, your data</>
    ],
    [
        <>Multi-tab write coordination</>,
        <>Schema validation on every write</>,
        <>Versioned data migrations</>,
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
            metaTitle: 'RxDB: Fix IndexedDB Limits, Speed and Sync',
            appName: 'Browser',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
