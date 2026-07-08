import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaencdb2".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor and kept stable via localStorage.
 */
const PAGE_ID = 'gaencdb2';

const titles = [
    <>{/* variation 0 */}<b>Field-Level Encryption</b> for <b>JavaScript</b> Apps</>,
    <>{/* variation 1 */}An <b>Encrypted</b> Database You Can <b>Self-Host</b></>,
    <>{/* variation 2 */}Fast, <b>Encrypted</b> Storage for <b>Production</b> Apps</>
];

const texts = [
    <>RxDB is a NoSQL database for JavaScript and TypeScript. Mark properties as encrypted in your JSON schema and RxDB encrypts them transparently, in the browser, React Native, Electron and Node.js.</>,
    <>RxDB's core and its AES encryption plugin are free and open source. Replicate encrypted data to your own servers over HTTP, WebSocket or GraphQL. No proprietary cloud, no per-read pricing, no lock-in.</>,
    <>RxDB combines encryption with the features real products need: schema validation, migrations, compression and multi-tab support. The Web Crypto based premium plugin encrypts at native browser speed.</>
];

const bulletpoints = [
    [
        <>Declare encrypted fields in your schema</>,
        <>Browser, mobile and desktop</>,
        <>First-class TypeScript support</>,
        <>JSON schema validation</>
    ],
    [
        <>Free, open-source core</>,
        <>AES encryption plugin included</>,
        <>Self-hostable replication</>,
        <>No vendor lock-in</>
    ],
    [
        <>Native Web Crypto performance</>,
        <>Schema and data migrations</>,
        <>Multi-tab out of the box</>,
        <>Works with any framework</>
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
            metaTitle: 'RxDB: Field-Level Encryption for JavaScript Apps',
            appName: 'JavaScript',
            title: titles[variation],
            text: texts[variation],
            bulletpoints: bulletpoints[variation]
        }
    });
}
