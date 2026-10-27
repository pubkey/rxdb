import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gatrso1".
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
        title: <>SQLite Storage With <b>Sync Built In</b></>,
        text: <>RxDB is a local-first database for JavaScript that can store its data in SQLite. Writes land on the device first, replication to your backend runs in the background, and queries update your UI when data changes.</>,
        bulletpoints: [
            <>SQLite storage on mobile and desktop</>,
            <>Replication to your own backend</>,
            <>Reactive queries</>,
            <>Works offline</>
        ]
    },
    b: {
        title: <>Sync Conflicts, <b>Merged Your Way</b></>,
        text: <>When two devices edit the same document while offline, RxDB calls your conflict handler on replication. You decide which fields win, or use the CRDT plugin to merge automatically.</>,
        bulletpoints: [
            <>Custom conflict handlers</>,
            <>CRDT plugin for automatic merges</>,
            <>Offline writes, synced later</>,
            <>Open source core</>
        ]
    },
    c: {
        title: <>Local SQLite, <b>Any Backend</b></>,
        text: <>RxDB replicates over HTTP, GraphQL, WebSocket or to Supabase, CouchDB and Firestore. Your data lives in SQLite on the device and in the backend you already run.</>,
        bulletpoints: [
            <>HTTP and GraphQL replication</>,
            <>Supabase, CouchDB, Firestore</>,
            <>No vendor cloud required</>,
            <>Self-hostable sync</>
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
            metaTitle: 'RxDB: SQLite Storage With Sync and Reactive Queries',
            metaDescription: 'RxDB runs on SQLite in React Native, Electron and Node.js, writes locally, replicates to your backend and lets you decide how sync conflicts merge.',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
