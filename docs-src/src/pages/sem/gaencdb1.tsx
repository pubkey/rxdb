import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaencdb1".
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
        title: <>The <b>Encrypted</b> Local Database for <b>JavaScript</b></>,
        text: <>RxDB is a local database for JavaScript apps with AES encryption built in. Your data is encrypted before it is written to disk, stays available offline and syncs to any backend you choose.</>,
        bulletpoints: [
            <>AES encryption at rest</>,
            <>Works fully offline</>,
            <>Sync with any backend</>,
            <>Free and open source</>
        ]
    },
    c: {
        title: <>Your Data, <b>Encrypted</b> on the <b>Device</b></>,
        text: <>RxDB stores your app's data locally and encrypts sensitive fields before they touch storage. No plaintext at rest, no required cloud, and your app keeps working with zero network latency.</>,
        bulletpoints: [
            <>No plaintext at rest</>,
            <>Data stays on the device</>,
            <>Zero-latency local queries</>,
            <>Open source and auditable</>
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
            metaTitle: 'RxDB: The Encrypted Local Database for Your App',
            appName: 'JavaScript',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
