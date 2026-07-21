import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaidxdb2".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */

/**
 * The a/b test variations, identified by stable letter keys - NOT by array
 * position. Letters keep their meaning when variations are added or removed
 * later: use the next unused letter for a new variation, retire the letter
 * of a removed one and never re-assign it to different copy.
 */
const variations = {
    a: {
        title: <>The <b>Reactive</b> JavaScript Database on <b>IndexedDB</b></>,
        text: <>RxDB is a NoSQL database for JavaScript and TypeScript. Observable queries re-render your React, Angular, Vue or Svelte components on every data change, with your data stored in IndexedDB.</>,
        bulletpoints: [
            <>First-class TypeScript support</>,
            <>Bindings for major frameworks</>,
            <>JSON schema validation</>,
            <>Sync with any backend</>
        ]
    },
    b: {
        title: <>An <b>Open-Source</b> Database You Can <b>Self-Host</b></>,
        text: <>RxDB&apos;s core is free and open source. Replication works over HTTP, WebSocket or GraphQL against your own servers. No proprietary cloud, no per-read pricing, no lock-in.</>,
        bulletpoints: [
            <>Free, open-source core</>,
            <>Self-hostable replication</>,
            <>Runs on IndexedDB, OPFS or SQLite</>,
            <>No vendor lock-in</>
        ]
    },
    c: {
        title: <>From <b>Prototype</b> to <b>Production</b> on IndexedDB</>,
        text: <>RxDB adds what raw IndexedDB is missing for real products: schema validation, data migrations, encryption, compression and multi-tab handling, with a query API that scales with your app.</>,
        bulletpoints: [
            <>Schema and data migrations</>,
            <>Encryption and compression</>,
            <>Multi-tab leader election</>,
            <>Pluggable storage adapters</>
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
            metaTitle: 'RxDB: The Reactive JavaScript Database on IndexedDB',
            appName: 'JavaScript',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
