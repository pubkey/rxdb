import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaawsds5".
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
        title: <>The <b>Offline Database</b> for <b>React</b> and <b>React Native</b> Apps</>,
        text: <>RxDB is a local-first NoSQL database for JavaScript and TypeScript. Reactive queries update your React, React Native, Angular or Vue components whenever data changes, online or offline.</>,
        bulletpoints: [
            <>TypeScript types for every query</>,
            <>React, React Native, Angular, Vue</>,
            <>JSON schema validation</>,
            <>One API in every JavaScript runtime</>
        ]
    },
    b: {
        title: <>A <b>Local Database</b> That Syncs With Your <b>GraphQL API</b></>,
        text: <>RxDB replicates over GraphQL with pull, push and realtime streams, so you keep the API and the data you already have. Offline writes are stored locally and sync when the connection returns.</>,
        bulletpoints: [
            <>GraphQL replication plugin</>,
            <>Pull, push and live streams</>,
            <>Offline writes sync later</>,
            <>Custom conflict handlers</>
        ]
    }
    /**
     * Variation 'c' is retired, the page tests 'a' against 'b'.
     * Kept commented out so its letter is never reused for different copy.
     */
    // c: {
    //     title: <><b>Offline Sync</b> You Run on <b>Your Own Servers</b></>,
    //     text: <>RxDB's core is free and open source, and its replication works against backends you control. No proprietary cloud decides your pricing or when your data layer gets retired.</>,
    //     bulletpoints: [
    //         <>Free, open-source core</>,
    //         <>Self-hostable replication</>,
    //         <>Runs on IndexedDB, OPFS or SQLite</>,
    //         <>No vendor lock-in</>
    //     ]
    // }
};

const variationKeys = Object.keys(variations) as (keyof typeof variations)[];

export default function Page() {
    /**
     * Render the first live variation on the server and on the first client
     * render to avoid a hydration mismatch, then swap to the assigned one.
     * The key comes from Object.keys(), never a hardcoded 'a': once variation
     * 'a' is retired (commented out) a hardcoded default renders nothing.
     */
    const [variationKey, setVariationKey] = useState(variationKeys[0]);
    useEffect(() => {
        setVariationKey(getSemVariation(variationKeys) as keyof typeof variations);
    }, []);
    const variation = variations[variationKey] ?? variations[variationKeys[0]];

    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'RxDB: Offline Database for JavaScript and GraphQL Apps',
            metaDescription: 'RxDB is an open-source local-first database for React, React Native and TypeScript apps. Sync over your GraphQL API or self-host the backend.',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
