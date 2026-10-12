import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "galocal3".
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
        title: <><b>Local-First</b> Without the <b>Hand-Rolled Sync</b></>,
        text: <>Building your own sync engine means retries, conflicts, and edge cases that bite back. RxDB ships the sync engine: replication to any backend, conflict handling, and offline support in one database.</>,
        bulletpoints: [
            <>No hand-written sync code</>,
            <>Conflict handling included</>,
            <>Automatic retries on reconnect</>,
            <>Works offline by default</>
        ]
    },
    /**
     * Variation 'b' was retired on 2026-10-12. Kept on record (commented out,
     * not deleted) so its letter and copy stay reserved and are never reused
     * for different copy.
     */
    // b: {
    //     title: <>Your Users Should <b>Never See a Spinner</b></>,
    //     text: <>When data lives on the device, the UI never waits for the network. RxDB gives you instant queries, background sync, and an app that keeps working when the connection drops.</>,
    //     bulletpoints: [
    //         <>Instant UI from local data</>,
    //         <>Background sync when online</>,
    //         <>Keeps working offline</>,
    //         <>Open source, any backend</>
    //     ]
    // },
    c: {
        title: <><b>Local-First</b> Sync Without the <b>SaaS Bill</b></>,
        text: <>Cloud-first backends charge for every read and hold your data. RxDB stores data on the device and syncs to infrastructure you already run. No per-read pricing, no lock-in, open source.</>,
        bulletpoints: [
            <>Sync to your own backend</>,
            <>No per-read pricing</>,
            <>Open-source core</>,
            <>You keep your data</>
        ]
    },
    d: {
        title: <>An <b>Offline-First Sync Engine</b> for <b>JavaScript</b></>,
        text: <>Local-first architecture means writes land on the device first and sync later. RxDB is that architecture as one open-source database: local storage, replication to any backend and conflict handling.</>,
        bulletpoints: [
            <>Writes land on the device first</>,
            <>Replication to any backend</>,
            <>Conflict handling included</>,
            <>Open-source core</>
        ]
    }
};

const variationKeys = Object.keys(variations) as (keyof typeof variations)[];

export default function Page() {
    /**
     * Render the first live variation on the server and on the first client
     * render to avoid a hydration mismatch, then swap to the assigned one.
     * The key comes from Object.keys(), never a hardcoded 'a': once variation
     * 'a' is retired (commented out) a hardcoded default renders nothing.
     */
    const [variationKey, setVariationKey] = useState(variationKeys[0] as string);
    useEffect(() => {
        setVariationKey(getSemVariation(variationKeys));
    }, []);
    const variation = variations[variationKey as keyof typeof variations] ?? variations[variationKeys[0]];

    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'RxDB: Offline-First Sync Engine for JavaScript',
            appName: 'JavaScript',
            metaDescription: 'RxDB is an offline-first sync engine for JavaScript: writes land on the device first, then replicate to any backend with conflict handling.',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
