import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "galocal2".
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
        title: <>The <b>Local-First</b> Database for Your <b>JavaScript</b> Stack</>,
        text: <>RxDB is a reactive NoSQL database that runs in browsers, React Native, Capacitor, Electron, and Node.js. Observable queries keep your UI in sync, and replication connects any backend you choose.</>,
        bulletpoints: [
            <>React, Vue, Angular, and Svelte</>,
            <>React Native, Capacitor, Electron</>,
            <>Observable realtime queries</>,
            <>TypeScript support out of the box</>
        ]
    },
    b: {
        title: <><b>Local-First</b> With Sync <b>You Control</b></>,
        text: <>RxDB replicates over HTTP, WebSocket, GraphQL, or WebRTC to a backend you own. Open-source core, pluggable storage engines, and no per-read pricing. Your data stays your data.</>,
        bulletpoints: [
            <>Self-hostable replication</>,
            <>Open-source core</>,
            <>Pluggable storage engines</>,
            <>No vendor lock-in</>
        ]
    },
    c: {
        title: <>A <b>Local-First</b> Database With Real <b>Conflict Handling</b></>,
        text: <>Offline writes create conflicts. RxDB detects them and resolves them with custom handlers or CRDTs, keeps every browser tab consistent, and replicates changes in realtime to any backend.</>,
        bulletpoints: [
            <>Conflict detection and resolution</>,
            <>CRDT support included</>,
            <>Multi-tab consistency</>,
            <>Realtime replication</>
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
            appName: 'JavaScript',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
