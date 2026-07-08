import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "garealm3".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'garealm3';

const titles = [
    <>{/* variation 0 */}Stranded by a <b>Deprecated</b> Sync Service?</>,
    <>{/* variation 1 */}Never Get <b>Locked Into</b> a Sync Cloud Again</>,
    <>{/* variation 2 */}One <b>Database</b> for Web, Mobile and Desktop</>
];

const texts = [
    <>When a managed sync service shuts down, the local database keeps working but your realtime sync is gone. RxDB restores it: local NoSQL storage plus replication to a backend you control.</>,
    <>RxDB is open source and backend-agnostic. Sync over HTTP, WebSocket or GraphQL to infrastructure you own, with no per-device pricing and no proprietary service that can be discontinued.</>,
    <>Native mobile databases leave the browser behind. RxDB runs the same code in React Native, the web, Electron and Node.js, so one data layer serves every platform you ship to.</>
];

const bulletpoints = [
    [
        <>Realtime two-way sync restored</>,
        <>Keep working fully offline</>,
        <>Your backend, your rules</>,
        <>Clear migration documentation</>
    ],
    [
        <>No proprietary sync cloud</>,
        <>No per-device pricing</>,
        <>Open source, auditable code</>,
        <>Backend-agnostic replication</>
    ],
    [
        <>Full browser support</>,
        <>React Native and Capacitor</>,
        <>Electron and Node.js</>,
        <>One API on every platform</>
    ]
];

export default function Page() {
    /**
     * Render the first variation on the server and on the first client render
     * to avoid a hydration mismatch, then swap to the assigned variation.
     */
    const [variation, setVariation] = useState(0);
    useEffect(() => {
        setVariation(getSemVariation(PAGE_ID, titles.length));
    }, []);

    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'RxDB: Replace Your Deprecated Mobile Sync Stack',
            appName: 'React Native',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
