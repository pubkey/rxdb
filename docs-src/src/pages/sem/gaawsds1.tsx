import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaawsds1".
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
        title: <>The <b>Migration Path</b> When Your Sync Gets <b>Deprecated</b></>,
        text: <>Your offline sync engine is being sunset, but your app still needs local data and realtime sync. RxDB is open source and actively developed: store data on the device, query it instantly and replicate to the backend you already run.</>,
        bulletpoints: [
            <>Actively developed, no sunset risk</>,
            <>Keep your existing GraphQL backend</>,
            <>Works offline by default</>,
            <>Free and open source</>
        ]
    },
    c: {
        title: <><b>Migrate Once</b>, Never Get <b>Sunset</b> Again</>,
        text: <>RxDB runs inside your app and syncs to infrastructure you control. No vendor can deprecate your data layer: the core is open source, backend-agnostic and runs in browsers, mobile apps and desktop.</>,
        bulletpoints: [
            <>You own the stack, no lock-in</>,
            <>Backend-agnostic replication</>,
            <>Browser, mobile and desktop</>,
            <>Apache-2.0 licensed core</>
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
            metaTitle: 'RxDB: Migrate Off Deprecated Offline Sync',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
