import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaencdb2".
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
        title: <><b>Field-Level Encryption</b> for <b>JavaScript</b> Apps</>,
        text: <>RxDB is a NoSQL database for JavaScript and TypeScript. Mark properties as encrypted in your JSON schema and RxDB encrypts them transparently, in the browser, React Native, Electron and Node.js.</>,
        bulletpoints: [
            <>Declare encrypted fields in your schema</>,
            <>Browser, mobile and desktop</>,
            <>First-class TypeScript support</>,
            <>JSON schema validation</>
        ]
    },
    b: {
        title: <>An <b>Encrypted</b> Database You Can <b>Self-Host</b></>,
        text: <>RxDB's core and its AES encryption plugin are free and open source. Replicate encrypted data to your own servers over HTTP, WebSocket or GraphQL. No proprietary cloud, no per-read pricing, no lock-in.</>,
        bulletpoints: [
            <>Free, open-source core</>,
            <>AES encryption plugin included</>,
            <>Self-hostable replication</>,
            <>No vendor lock-in</>
        ]
    },
    c: {
        title: <>Fast, <b>Encrypted</b> Storage for <b>Production</b> Apps</>,
        text: <>RxDB combines encryption with the features real products need: schema validation, migrations, compression and multi-tab support. The Web Crypto based premium plugin encrypts at native browser speed.</>,
        bulletpoints: [
            <>Native Web Crypto performance</>,
            <>Schema and data migrations</>,
            <>Multi-tab out of the box</>,
            <>Works with any framework</>
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
            metaTitle: 'RxDB: Field-Level Encryption for JavaScript Apps',
            appName: 'JavaScript',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
