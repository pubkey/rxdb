import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "garealm3".
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
        title: <>Stranded by a <b>Deprecated</b> Sync Service?</>,
        text: <>When a managed sync service shuts down, the local database keeps working but your realtime sync is gone. RxDB restores it: local NoSQL storage plus replication to a backend you control.</>,
        bulletpoints: [
            <>Realtime two-way sync restored</>,
            <>Keep working fully offline</>,
            <>Your backend, your rules</>,
            <>Clear migration documentation</>
        ]
    },
    b: {
        title: <>Never Get <b>Locked Into</b> a Sync Cloud Again</>,
        text: <>RxDB is open source and backend-agnostic. Sync over HTTP, WebSocket or GraphQL to infrastructure you own, with no per-device pricing and no proprietary service that can be discontinued.</>,
        bulletpoints: [
            <>No proprietary sync cloud</>,
            <>No per-device pricing</>,
            <>Open source, auditable code</>,
            <>Backend-agnostic replication</>
        ]
    },
    c: {
        title: <>One <b>Database</b> for Web, Mobile and Desktop</>,
        text: <>Native mobile databases leave the browser behind. RxDB runs the same code in React Native, the web, Electron and Node.js, so one data layer serves every platform you ship to.</>,
        bulletpoints: [
            <>Full browser support</>,
            <>React Native and Capacitor</>,
            <>Electron and Node.js</>,
            <>One API on every platform</>
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
            metaTitle: 'RxDB: Replace Your Deprecated Mobile Sync Stack',
            appName: 'React Native',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
