import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaidxdb1".
 * A/b tests multiple variations of the title, description and bulletpoints.
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
        title: <>The <b>Local-First</b> Database for <b>JavaScript</b> Apps</>,
        text: <>RxDB is a NoSQL database for JavaScript that runs directly in your app. With a local-first design, it delivers zero-latency queries even offline, and syncs seamlessly with any backend.</>,
        bulletpoints: [
            <>Build apps that work offline</>,
            <>Sync with any Backend</>,
            <>Observable Realtime Queries</>,
            <>All JavaScript Runtimes Supported</>
        ]
    },
    /**
     * Variation 'b' was retired on 2026-08-18 after the second A/B readout:
     * it lost to variation 'a' on every measured engagement signal. Kept on
     * record (commented out, not deleted) so its letter and copy stay
     * reserved and 'b' is never reused for different copy.
     */
    // b: {
    //     title: <><b>IndexedDB</b> Without the <b>Pain</b></>,
    //     text: <>RxDB gives you a clean NoSQL API on top of IndexedDB. No transaction boilerplate, no callback chains, just schemas, queries and observables that keep your UI in sync with your data.</>,
    //     bulletpoints: [
    //         <>No IndexedDB boilerplate</>,
    //         <>Reactive queries out of the box</>,
    //         <>JSON schemas and migrations</>,
    //         <>Free and open source</>
    //     ]
    // },
    /**
     * Variation 'c' was removed on 2026-07-27 after its first A/B readout:
     * it was the weakest of the three on engagement. Kept on record (commented
     * out, not deleted) so its letter and copy stay reserved and 'c' is never
     * reused for different copy, per the rules in getSemVariation().
     */
    // c: {
    //     title: <><b>Instant Queries</b> on <b>IndexedDB</b></>,
    //     text: <>RxDB runs directly inside your app and answers queries with zero network latency. Your data lives in IndexedDB, stays available offline and updates your UI the moment it changes.</>,
    //     bulletpoints: [
    //         <>Zero-latency local reads</>,
    //         <>Works fully offline</>,
    //         <>Optimized IndexedDB storage</>,
    //         <>Observable realtime queries</>
    //     ]
    // },
    d: {
        title: <><b>IndexedDB</b> With Queries, Schemas and <b>Sync</b></>,
        text: <>RxDB stores your data in IndexedDB and adds what an app actually needs on top: a NoSQL query API, JSON schemas with migrations, results that update themselves when the data changes, and replication to your own backend.</>,
        bulletpoints: [
            <>NoSQL queries over IndexedDB</>,
            <>JSON schemas and migrations</>,
            <>Results that update themselves</>,
            <>Replication to your own backend</>
        ]
    }
};

const variationKeys = Object.keys(variations) as (keyof typeof variations)[];

export default function Page() {
    /**
     * Render the first live variation on the server and on the first client
     * render to avoid a hydration mismatch, then swap to the assigned one.
     */
    const [variationKey, setVariationKey] = useState(variationKeys[0] as string);
    useEffect(() => {
        setVariationKey(getSemVariation(variationKeys));
    }, []);
    const variation = variations[variationKey as keyof typeof variations] ?? variations[variationKeys[0]];

    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'RxDB: The JavaScript Database on Top of IndexedDB',
            appName: 'JavaScript',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
