import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gawmdb2".
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
        title: <><b>One Local Database</b> for Your <b>Whole Stack</b></>,
        text: <>RxDB runs in React Native, Expo, Electron, the browser and Node.js, with bindings for React, Angular, Vue and Svelte. You define a schema once and get reactive queries, migrations and sync on every platform.</>,
        bulletpoints: [
            <>React Native, Electron, browser, Node</>,
            <>React, Angular, Vue, Svelte</>,
            <>One schema, every platform</>,
            <>TypeScript support included</>
        ]
    },
    b: {
        title: <><b>Open Source</b> With <b>Self-Hosted Sync</b></>,
        text: <>RxDB replicates to HTTP, GraphQL, CouchDB, Supabase, Firestore and more. Every option either runs on your own servers or on a backend you already use, so your data stays where you decide.</>,
        bulletpoints: [
            <>Sync to a backend you control</>,
            <>Supabase and GraphQL replication</>,
            <>No proprietary cloud required</>,
            <>Open-source core</>
        ]
    },
    c: {
        title: <>Pick the <b>Storage</b> That <b>Fits Your App</b></>,
        text: <>RxDB separates your queries from the storage engine. Use SQLite or the Expo file system in React Native, IndexedDB or OPFS in the browser, and switch later without rewriting your data layer.</>,
        bulletpoints: [
            <>SQLite and Expo storage on mobile</>,
            <>IndexedDB and OPFS on the web</>,
            <>Same queries on every storage</>,
            <>Switch storage without a rewrite</>
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
            metaTitle: 'RxDB: One Local Database for Mobile, Desktop and Web',
            appName: 'React Native',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
