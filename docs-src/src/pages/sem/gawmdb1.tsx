import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gawmdb1".
 * A/b tests multiple variations of the title, description and bulletpoints.
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
        title: <>A <b>React Native</b> Database With <b>Sync Built In</b></>,
        text: <>RxDB is a local-first NoSQL database for React Native and the web. Replication to your backend is already built, so you connect an endpoint instead of designing a sync protocol.</>,
        bulletpoints: [
            <>Sync to any backend, already built</>,
            <>Runs on SQLite in React Native</>,
            <>Reactive queries update the UI</>,
            <>Open-source core</>
        ]
    },
    /**
     * Variations 'b' and 'c' were retired on 2026-10-18 to make room for
     * variation 'd', which names WatermelonDB like the ads of this campaign.
     * With about one click per day a 3-way test is not readable, so the page
     * now splits 50/50 between 'a' and 'd'. Kept on record (commented out,
     * not deleted) so their letters and copy stay reserved and are never
     * reused for different copy.
     */
    // b: {
    //     title: <><b>Offline Data</b> Without the <b>Sync Work</b></>,
    //     text: <>Pull and push endpoints, change tracking and conflict rules are the work an offline database usually leaves to you. RxDB ships them: replication, conflict handling and migrations in one open-source database.</>,
    //     bulletpoints: [
    //         <>No hand-written sync code</>,
    //         <>Conflict handling built in</>,
    //         <>Schema migrations included</>,
    //         <>Open source and battle-tested</>
    //     ]
    // },
    // c: {
    //     title: <><b>One Offline Database</b> for <b>Mobile and Web</b></>,
    //     text: <>RxDB runs in React Native, Expo, Electron and the browser with the same schema and the same queries. Your app works offline everywhere and syncs in realtime when the network returns.</>,
    //     bulletpoints: [
    //         <>React Native, Expo, Electron, web</>,
    //         <>Same schema on every platform</>,
    //         <>Realtime sync across devices</>,
    //         <>Works fully offline</>
    //     ]
    // },
    d: {
        title: <>A <b>WatermelonDB</b> Alternative With <b>Sync Built In</b></>,
        text: <>RxDB is a local-first NoSQL database for React Native and the web. Replication is part of the database: connect it to HTTP, GraphQL, Supabase or CouchDB and your app works offline on every device.</>,
        bulletpoints: [
            <>React Native, Expo and the web</>,
            <>Runs on SQLite</>,
            <>Replication to HTTP, GraphQL, Supabase</>,
            <>Open source core</>
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
            metaTitle: 'RxDB: A WatermelonDB Alternative for React Native',
            metaDescription: 'RxDB is a WatermelonDB alternative for React Native with sync built in. Runs on SQLite, works offline and replicates to HTTP, GraphQL, Supabase or CouchDB.',
            appName: 'React Native',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
