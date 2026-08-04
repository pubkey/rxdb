import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaencdb3".
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
        title: <>Browser Storage Is <b>Not Encrypted</b>. RxDB Is.</>,
        text: <>IndexedDB and localStorage keep everything in plaintext, readable by anyone with access to the device. RxDB encrypts sensitive fields with AES before they are written, so stored data stays protected.</>,
        bulletpoints: [
            <>Encrypts data before it hits disk</>,
            <>Password-based AES encryption</>,
            <>Protects data on shared devices</>,
            <>Free and open source</>
        ]
    },
    b: {
        title: <><b>Encrypt</b> Local Data, Keep the <b>Auditors</b> Happy</>,
        text: <>Storing personal or sensitive data on the client? RxDB's field-level encryption keeps it encrypted at rest while your app keeps working offline, and syncs it to servers you control.</>,
        bulletpoints: [
            <>Field-level encryption at rest</>,
            <>Offline access preserved</>,
            <>Sync to your own backend</>,
            <>Helps with data-protection rules</>
        ]
    },
    c: {
        title: <><b>Encrypted</b> Locally, <b>Synced</b> Everywhere</>,
        text: <>Encryption should not cost you sync. RxDB encrypts fields on the device and still replicates your data in realtime to any backend, with offline queueing and conflict handling built in.</>,
        bulletpoints: [
            <>Encryption plus realtime sync</>,
            <>Works offline by default</>,
            <>Conflict handling included</>,
            <>Runs on browser and mobile</>
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
            metaTitle: 'RxDB: Encrypt Local App Data on Web and Mobile',
            appName: 'Browser',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
