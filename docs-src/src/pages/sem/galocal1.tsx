import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "galocal1".
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
        title: <>The <b>Local-First</b> Database for <b>JavaScript</b> Apps</>,
        text: <>RxDB is a NoSQL database for JavaScript that runs directly in your app. With a local-first design, it delivers zero-latency queries even offline, and syncs seamlessly with any backend.</>,
        bulletpoints: [
            <>Build apps that work offline</>,
            <>Sync with any Backend</>,
            <>Observable Realtime Queries</>,
            <>All JavaScript Runtimes Supported</>
        ]
    },
    b: {
        title: <><b>Zero Latency</b>. Your Data Is <b>Already There</b>.</>,
        text: <>RxDB keeps your app's data on the device, so every query answers instantly. No request waterfalls, no loading spinners. The network is only used for sync, and your app works with or without it.</>,
        bulletpoints: [
            <>Instant queries, no network round trip</>,
            <>Works offline out of the box</>,
            <>Realtime sync in the background</>,
            <>Open source, works with any backend</>
        ]
    },
    c: {
        title: <><b>Local-First</b> Is the Future. Build It With <b>RxDB</b>.</>,
        text: <>You own your data, in spite of the cloud. RxDB brings the local-first architecture to JavaScript: data lives on the device, syncs to any backend you choose, and your app keeps working offline.</>,
        bulletpoints: [
            <>Local-first architecture, ready today</>,
            <>You own your data and your backend</>,
            <>Conflict handling built in</>,
            <>Works with React, Vue, and Angular</>
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
            metaTitle: 'RxDB: Build Local-First Apps With Zero-Latency Queries',
            appName: 'JavaScript',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
