import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "garealm2".
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
        title: <>The <b>Local-First</b> Database for <b>JavaScript</b> Apps</>,
        text: <>RxDB is a NoSQL database for JavaScript and TypeScript. It runs in React Native, Capacitor, browsers, Electron and Node.js, with observable queries that update your UI in realtime.</>,
        bulletpoints: [
            <>First-class TypeScript support</>,
            <>React Native and Expo ready</>,
            <>Observable realtime queries</>,
            <>NoSQL JSON documents</>
        ]
    },
    b: {
        title: <>An <b>Open-Source</b> Database You Can <b>Self-Host</b></>,
        text: <>RxDB's core is free and open source. Replication runs over HTTP, WebSocket or GraphQL against your own backend: no proprietary sync cloud, no per-device pricing, no lock-in.</>,
        bulletpoints: [
            <>Free, open-source core</>,
            <>Self-hostable replication</>,
            <>Works with any backend</>,
            <>No vendor lock-in</>
        ]
    },
    c: {
        title: <>Built for <b>Production</b> <b>Offline-First</b> Apps</>,
        text: <>RxDB ships what a production migration needs: JSON schema validation, data migrations, conflict resolution, encryption and multi-tab support, proven in years of production use.</>,
        bulletpoints: [
            <>Schema validation and migrations</>,
            <>Conflict resolution built in</>,
            <>Encryption plugin available</>,
            <>Battle-tested sync protocol</>
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
            metaTitle: 'RxDB: The Local-First JavaScript Database With Sync',
            appName: 'JavaScript',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
