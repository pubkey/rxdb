import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaawsds3".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gaawsds3';

const titles = [
    <>{/* variation 0 */}<b>Offline Sync</b> You Can Actually <b>Debug</b></>,
    <>{/* variation 1 */}<b>Realtime Sync</b> Without the <b>Metered Bill</b></>,
    <>{/* variation 2 */}Your Offline Sync <b>Retires in 2027</b>. RxDB <b>Won't</b>.</>
];

const texts = [
    <>Data that silently stops syncing is not a fact of life. RxDB's replication is open source and runs in your code: you can inspect it, log it and test it, with conflict resolution you define.</>,
    <>Per-connection and per-update pricing punishes successful apps. RxDB syncs to infrastructure you already pay for, so realtime updates and always-on devices stop showing up on your cloud invoice.</>,
    <>If your app's sync layer has an end-of-life date, the migration is coming either way. RxDB keeps the local-first model you already use: write locally, observe queries, sync in the background, even to your existing GraphQL backend.</>
];

const bulletpoints = [
    [
        <>Open, inspectable sync protocol</>,
        <>Conflict resolution you control</>,
        <>Offline writes never get lost</>,
        <>Works the same on every platform</>
    ],
    [
        <>No per-update billing</>,
        <>No per-connection billing</>,
        <>Self-host on your own servers</>,
        <>Free, open-source core</>
    ],
    [
        <>Same local-first programming model</>,
        <>Keep your GraphQL backend</>,
        <>Actively developed and maintained</>,
        <>Migrate on your schedule, not theirs</>
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
            metaTitle: 'RxDB: Reliable Offline Sync You Control',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
