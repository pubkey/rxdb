import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gatrso2".
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
        title: <>The Local-First Database for <b>JavaScript</b></>,
        text: <>RxDB is a NoSQL database for JavaScript and TypeScript that runs inside your app. It stores JSON documents with a schema, answers MongoDB-style queries locally and replicates with your backend.</>,
        bulletpoints: [
            <>TypeScript types from your schema</>,
            <>MongoDB-style queries</>,
            <>Replication to any backend</>,
            <>Open source core</>
        ]
    },
    b: {
        title: <>One Database for <b>Mobile, Desktop and Web</b></>,
        text: <>Use SQLite in React Native, Expo and Electron, and IndexedDB or OPFS in the browser. The schema, the queries and the replication code stay the same on every platform.</>,
        bulletpoints: [
            <>React Native and Expo</>,
            <>Electron and Node.js</>,
            <>Browser with IndexedDB or OPFS</>,
            <>Same API everywhere</>
        ]
    },
    c: {
        title: <>JSON Documents, <b>Not SQL Tables</b></>,
        text: <>RxDB stores JSON documents validated by a JSON schema. Schema versions come with migration strategies, so the data on your users' devices moves forward with your app.</>,
        bulletpoints: [
            <>JSON schema validation</>,
            <>Data migrations included</>,
            <>Observable queries</>,
            <>Pluggable storage engines</>
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
            metaTitle: 'RxDB: Local-First NoSQL Database for JavaScript Apps',
            metaDescription: 'RxDB is a local-first NoSQL database for JavaScript with reactive queries, SQLite storage for React Native and Electron, and replication to any backend.',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
