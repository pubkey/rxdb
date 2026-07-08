import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaencdb3".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gaencdb3';

const titles = [
    <>{/* variation 0 */}Browser Storage Is <b>Not Encrypted</b>. RxDB Is.</>,
    <>{/* variation 1 */}<b>Encrypt</b> Local Data, Keep the <b>Auditors</b> Happy</>,
    <>{/* variation 2 */}<b>Encrypted</b> Locally, <b>Synced</b> Everywhere</>
];

const texts = [
    <>IndexedDB and localStorage keep everything in plaintext, readable by anyone with access to the device. RxDB encrypts sensitive fields with AES before they are written, so stored data stays protected.</>,
    <>Storing personal or sensitive data on the client? RxDB's field-level encryption keeps it encrypted at rest while your app keeps working offline, and syncs it to servers you control.</>,
    <>Encryption should not cost you sync. RxDB encrypts fields on the device and still replicates your data in realtime to any backend, with offline queueing and conflict handling built in.</>
];

const bulletpoints = [
    [
        <>Encrypts data before it hits disk</>,
        <>Password-based AES encryption</>,
        <>Protects data on shared devices</>,
        <>Free and open source</>
    ],
    [
        <>Field-level encryption at rest</>,
        <>Offline access preserved</>,
        <>Sync to your own backend</>,
        <>Helps with data-protection rules</>
    ],
    [
        <>Encryption plus realtime sync</>,
        <>Works offline by default</>,
        <>Conflict handling included</>,
        <>Runs on browser and mobile</>
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
            metaTitle: 'RxDB: Encrypt Local App Data on Web and Mobile',
            appName: 'Browser',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
