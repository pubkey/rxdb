import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaawsds2".
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
        title: <>The <b>Reactive</b> Database for <b>JavaScript</b> Apps</>,
        text: <>RxDB is a NoSQL database for JavaScript and TypeScript. Observable queries re-render your React, React Native, Angular or Vue components on every data change, online or offline.</>,
        bulletpoints: [
            <>First-class TypeScript support</>,
            <>Bindings for major frameworks</>,
            <>JSON schema validation</>,
            <>Works in every JS runtime</>
        ]
    },
    b: {
        title: <>A <b>Local Database</b> That Syncs With Your <b>GraphQL</b> API</>,
        text: <>RxDB replicates over GraphQL, HTTP or WebSocket, so you keep the backend you already run. Offline writes queue locally and sync with conflict handling when the connection returns.</>,
        bulletpoints: [
            <>GraphQL replication built in</>,
            <>Keep your existing backend</>,
            <>Offline queue and conflict handling</>,
            <>Realtime two-way sync</>
        ]
    },
    c: {
        title: <>An <b>Open-Source</b> Database You Can <b>Self-Host</b></>,
        text: <>RxDB's core is free and open source. Replication works against your own servers: no proprietary cloud, no metered realtime billing, no vendor deciding when your data layer dies.</>,
        bulletpoints: [
            <>Free, open-source core</>,
            <>Self-hostable replication</>,
            <>Runs on IndexedDB, OPFS or SQLite</>,
            <>No vendor lock-in</>
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
            metaTitle: 'RxDB: Open-Source Local-First Database for JavaScript',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
