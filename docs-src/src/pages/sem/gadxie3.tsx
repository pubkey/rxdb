import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gadxie3".
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
        title: <><b>Sync Code</b> You Do Not Have to <b>Write</b></>,
        text: <>Hand-written sync breaks on flaky networks, lost tabs, and concurrent edits. RxDB ships a replication protocol that handles offline writes, retries, and conflicts, and it works with any backend you already run.</>,
        bulletpoints: [
            <>Offline writes sync automatically</>,
            <>Retries and backoff handled</>,
            <>Conflict resolution built in</>,
            <>Works with your existing backend</>
        ]
    },
    b: {
        title: <>Every <b>Tab</b> Shows the <b>Same Data</b></>,
        text: <>When your app runs in two tabs, local state drifts and users see stale data. RxDB shares one reactive database across tabs, so a write in one tab updates every other tab instantly.</>,
        bulletpoints: [
            <>One database, every tab</>,
            <>Reactive queries update the UI</>,
            <>Leader election out of the box</>,
            <>No BroadcastChannel plumbing</>
        ]
    },
    /**
     * Variation 'c' was retired on 2026-09-02 after the A/B readout on this
     * page: variations 'a' and 'b' both beat it on engagement. Kept on record
     * (commented out, not deleted) so its letter and copy stay reserved and
     * are never reused for different copy.
     */
    // c: {
    //     title: <><b>Offline Edits</b> Without <b>Lost Data</b></>,
    //     text: <>Users edit offline, reconnect, and expect nothing to be lost. RxDB stores writes locally, replicates them when the network returns, and resolves conflicts with a strategy you control.</>,
    //     bulletpoints: [
    //         <>Local-first writes, zero latency</>,
    //         <>Automatic replication on reconnect</>,
    //         <>Custom conflict strategies</>,
    //         <>Data survives page reloads</>
    //     ]
    // }
};

const variationKeys = Object.keys(variations) as (keyof typeof variations)[];

export default function Page() {
    /**
     * Render the first live variation on the server and on the first client
     * render to avoid a hydration mismatch, then swap to the assigned one.
     * The key comes from Object.keys(), never a hardcoded 'a': once variation
     * 'a' is retired a hardcoded default renders nothing.
     */
    const [variationKey, setVariationKey] = useState(variationKeys[0] as string);
    useEffect(() => {
        setVariationKey(getSemVariation(variationKeys));
    }, []);
    const variation = variations[variationKey as keyof typeof variations] ?? variations[variationKeys[0]];

    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'RxDB Solves Sync, Multi-Tab State and Offline Conflicts',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
