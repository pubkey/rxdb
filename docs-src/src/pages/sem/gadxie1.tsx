import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gadxie1".
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
        title: <>Keep <b>IndexedDB</b>. Add <b>Realtime Sync</b>.</>,
        text: <>RxDB is a local-first NoSQL database that runs on IndexedDB. You keep the storage you know and get the parts every wrapper leaves out: realtime sync to any backend, conflict handling, and multi-tab support.</>,
        bulletpoints: [
            <>Runs on the IndexedDB you already use</>,
            <>Sync with any backend, self-hosted</>,
            <>Conflict handling built in</>,
            <>Multi-tab support out of the box</>
        ]
    },
    b: {
        title: <><b>Local Data</b> Without the <b>Pain</b></>,
        text: <>Hand-rolled sync code, broken multi-tab state, and schema drift are what an IndexedDB wrapper leaves you to solve alone. RxDB solves them once: reactive queries, replication, and migrations in one open-source database.</>,
        bulletpoints: [
            <>No hand-written sync code</>,
            <>Reactive queries across tabs</>,
            <>Schema migrations included</>,
            <>Open source and battle-tested</>
        ]
    },
    c: {
        title: <>From <b>Single-Tab Cache</b> to <b>Synced App</b></>,
        text: <>Your app already stores data locally. RxDB turns that local store into an offline-first, multi-device app: data syncs in realtime to any backend and every open tab stays consistent.</>,
        bulletpoints: [
            <>Offline-first by design</>,
            <>Realtime sync across devices</>,
            <>Every tab stays consistent</>,
            <>Works with React, Angular, Vue</>
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
            metaTitle: 'RxDB: The Upgrade Path From Your IndexedDB Wrapper',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
