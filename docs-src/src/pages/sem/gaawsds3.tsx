import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaawsds3".
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
        title: <><b>Offline Sync</b> You Can Actually <b>Debug</b></>,
        text: <>Data that silently stops syncing is not a fact of life. RxDB's replication is open source and runs in your code: you can inspect it, log it and test it, with conflict resolution you define.</>,
        bulletpoints: [
            <>Open, inspectable sync protocol</>,
            <>Conflict resolution you control</>,
            <>Offline writes never get lost</>,
            <>Works the same on every platform</>
        ]
    },
    b: {
        title: <><b>Realtime Sync</b> Without the <b>Metered Bill</b></>,
        text: <>Per-connection and per-update pricing punishes successful apps. RxDB syncs to infrastructure you already pay for, so realtime updates and always-on devices stop showing up on your cloud invoice.</>,
        bulletpoints: [
            <>No per-update billing</>,
            <>No per-connection billing</>,
            <>Self-host on your own servers</>,
            <>Free, open-source core</>
        ]
    },
    c: {
        title: <>Your Offline Sync <b>Retires in 2027</b>. RxDB <b>Won't</b>.</>,
        text: <>If your app's sync layer has an end-of-life date, the migration is coming either way. RxDB keeps the local-first model you already use: write locally, observe queries, sync in the background, even to your existing GraphQL backend.</>,
        bulletpoints: [
            <>Same local-first programming model</>,
            <>Keep your GraphQL backend</>,
            <>Actively developed and maintained</>,
            <>Migrate on your schedule, not theirs</>
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
            metaTitle: 'RxDB: Reliable Offline Sync You Control',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
