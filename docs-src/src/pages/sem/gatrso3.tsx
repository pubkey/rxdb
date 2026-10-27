import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gatrso3".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor, keyed off the utm_campaign
 * of the ad click and kept stable via localStorage.
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
        title: <>Offline Writes That <b>Sync Later</b></>,
        text: <>RxDB writes every change to the local database first. When the connection comes back, replication pushes the changes and pulls what other devices wrote, with retries built in.</>,
        bulletpoints: [
            <>Writes never wait for the network</>,
            <>Push and pull replication</>,
            <>Automatic retries</>,
            <>Works fully offline</>
        ]
    },
    b: {
        title: <>Do Not <b>Lose Offline Edits</b></>,
        text: <>When two users change the same document offline, RxDB detects the conflict on replication and calls a handler you define. Merge fields, keep both versions, or use the CRDT plugin.</>,
        bulletpoints: [
            <>Conflict detection on every write</>,
            <>Your own conflict handler</>,
            <>CRDT plugin</>,
            <>Revision tracking per document</>
        ]
    },
    c: {
        title: <>Your UI Updates <b>When Data Changes</b></>,
        text: <>Every RxDB query is observable. When a local write or a replicated change touches the result, the query emits again, in React, Vue, Angular, Svelte or plain JavaScript.</>,
        bulletpoints: [
            <>Observable queries</>,
            <>Multi-tab updates in browsers</>,
            <>Works with any framework</>,
            <>No manual refresh code</>
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
            metaTitle: 'RxDB: Offline Writes, Conflict Handling and Sync',
            metaDescription: 'RxDB writes to the device first, replicates when the connection returns and resolves conflicts with your own handler. Open source, for JavaScript.',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
