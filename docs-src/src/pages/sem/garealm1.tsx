import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "garealm1".
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
        title: <><b>Sync</b> That No Vendor Can <b>Shut Down</b></>,
        text: <>Your managed mobile sync reached end of life. RxDB is open source: the local database and the replication layer run on your infrastructure, so nobody can switch them off again.</>,
        bulletpoints: [
            <>Open-source local database</>,
            <>Self-hosted realtime sync</>,
            <>Actively maintained and funded</>,
            <>No proprietary cloud required</>
        ]
    },
    c: {
        title: <>Keep <b>Offline-First</b>. Replace the <b>Dead Sync</b>.</>,
        text: <>RxDB keeps the model you already built on: a local NoSQL database with live queries plus realtime replication. Move your data layer without rewriting your app's offline logic.</>,
        bulletpoints: [
            <>Local NoSQL with live queries</>,
            <>Realtime two-way replication</>,
            <>Offline writes queue and sync</>,
            <>Runs in React Native and the web</>
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
            metaTitle: 'RxDB: The Maintained Local Database With Realtime Sync',
            appName: 'JavaScript',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
