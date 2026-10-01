import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gawmdb3".
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
        text: <>Hand-written sync breaks on flaky networks, partial uploads and concurrent edits. RxDB ships a replication protocol that handles offline writes, retries and conflicts, and it works with the backend you already run.</>,
        bulletpoints: [
            <>Offline writes sync automatically</>,
            <>Retries and backoff handled</>,
            <>Conflict resolution built in</>,
            <>Works with your existing backend</>
        ]
    },
    b: {
        title: <><b>Conflicts</b> Resolved <b>Your Way</b></>,
        text: <>Last write wins is a default, not a strategy. RxDB detects conflicts on every replicated document and calls a conflict handler you define, so you decide what happens when two devices edit the same data offline.</>,
        bulletpoints: [
            <>Conflicts detected per document</>,
            <>Your own conflict handler</>,
            <>Revisions on every write</>,
            <>Works with any replication backend</>
        ]
    },
    c: {
        title: <>Change Your <b>Schema</b> Without Losing <b>Local Data</b></>,
        text: <>RxDB versions your schema. When you ship a new app version, the migration strategies you define transform the documents already stored on the user's device, so an update never starts from an empty database.</>,
        bulletpoints: [
            <>Versioned schemas with migrations</>,
            <>Existing device data is migrated</>,
            <>Validation before every write</>,
            <>TypeScript types from your schema</>
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
            metaTitle: 'RxDB: The Sync Layer for Offline Apps, Already Built',
            appName: 'React Native',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
