import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gajsondb3".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gajsondb3';

const titles = [
    <>{/* variation 0 */}Outgrown JSON Files? Get a Real <b>JSON Database</b></>,
    <>{/* variation 1 */}<b>JSON Documents</b> That Sync Across Devices</>,
    <>{/* variation 2 */}<b>JSON Storage</b> That Scales With Your App</>
];

const texts = [
    <>Writing app data to JSON files means rewriting the whole file on every change, looping instead of querying, and corrupted data under concurrent writes. RxDB keeps your data JSON and fixes all of that.</>,
    <>A JSON file lives on one machine. RxDB replicates JSON documents between your clients and your backend, with offline queueing and conflict handling built in.</>,
    <>RxDB queries JSON documents through indexes instead of loading everything into memory, and keeps working offline. Grow from a prototype to production without changing your data model.</>
];

const bulletpoints = [
    [
        <>Indexed queries on JSON</>,
        <>Safe concurrent writes</>,
        <>Schemas and migrations</>,
        <>Realtime UI updates</>
    ],
    [
        <>Two-way realtime replication</>,
        <>Conflict resolution included</>,
        <>Offline writes sync later</>,
        <>Your servers, your data</>
    ],
    [
        <>Indexes, not full scans</>,
        <>Zero-latency local reads</>,
        <>Works offline by default</>,
        <>Production-ready open source</>
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
            metaTitle: 'RxDB: Outgrown JSON Files? Get a Real JSON Database',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
