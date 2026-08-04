import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaidxdb3".
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
        title: <>Fix IndexedDB <b>Limits</b>, <b>Speed</b> and <b>Sync</b></>,
        text: <>Quota errors, slow bulk writes, data evicted by the browser? RxDB manages storage carefully, keeps queries fast with caching and indexes, and protects your data by syncing it to your server.</>,
        bulletpoints: [
            <>Handles storage quotas gracefully</>,
            <>Fast queries via caching and indexes</>,
            <>Data survives via server sync</>,
            <>Works offline by default</>
        ]
    },
    b: {
        title: <><b>IndexedDB</b> That <b>Syncs</b> With Your Backend</>,
        text: <>IndexedDB keeps data on one device, RxDB replicates it. Sync browser data to any backend over HTTP, WebSocket or GraphQL, with conflict handling and offline queueing built in.</>,
        bulletpoints: [
            <>Realtime two-way replication</>,
            <>Conflict resolution included</>,
            <>Offline writes sync later</>,
            <>Your servers, your data</>
        ]
    },
    c: {
        title: <>Browser Storage You Can <b>Rely On</b></>,
        text: <>RxDB coordinates writes across tabs, validates every document against your schema and migrates data between app versions, so browser storage stops being the scary part of your stack.</>,
        bulletpoints: [
            <>Multi-tab write coordination</>,
            <>Schema validation on every write</>,
            <>Versioned data migrations</>,
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
            metaTitle: 'RxDB: Fix IndexedDB Limits, Speed and Sync',
            appName: 'Browser',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
