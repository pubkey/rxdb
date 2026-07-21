import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gajsondb1".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */

/**
 * The a/b test variations, identified by stable letter keys - NOT by array
 * position. Letters keep their meaning when variations change over time:
 * - NEVER reuse a letter: a new variation always gets the next unused letter.
 * - NEVER delete a variation: comment it out instead, so its letter and copy
 *   stay on record and cannot be re-assigned by accident.
 */
const variations = {
    a: {
        title: <>The Local-First <b>Database</b> for JavaScript Apps</>,
        text: <>RxDB is a NoSQL database for JavaScript that runs directly in your app. With a local-first design, it delivers zero-latency queries even offline, and syncs seamlessly with any backend.</>,
        bulletpoints: [
            <>Build apps that work offline</>,
            <>Sync with any Backend</>,
            <>Observable Realtime Queries</>,
            <>All JavaScript Runtimes Supported</>
        ]
    },
    b: {
        title: <>The <b>JSON Database</b> Built for JavaScript</>,
        text: <>RxDB is a NoSQL database that stores your data as plain JSON documents. Query them with a Mongo-like syntax, observe changes in realtime and keep your app state JSON from the UI to storage to your backend.</>,
        bulletpoints: [
            <>Plain JSON documents</>,
            <>Mongo-like query syntax</>,
            <>Realtime observable queries</>,
            <>Free and open source</>
        ]
    },
    c: {
        title: <>Instant Queries on <b>JSON Documents</b></>,
        text: <>RxDB runs inside your app and answers JSON queries with zero network latency. Your documents stay available offline and your UI updates the moment the data changes.</>,
        bulletpoints: [
            <>Zero-latency local reads</>,
            <>Works fully offline</>,
            <>Indexes for fast JSON queries</>,
            <>Live UI updates</>
        ]
    }
};

export default function Page() {
    /**
     * Render variation "a" on the server and on the first client render
     * to avoid a hydration mismatch, then swap to the assigned variation.
     */
    const [variationKey, setVariationKey] = useState('a');
    useEffect(() => {
        setVariationKey(getSemVariation(Object.keys(variations)));
    }, []);
    const variation = variations[variationKey as keyof typeof variations] ?? variations.a;

    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'RxDB: The JSON Database for JavaScript Apps',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
