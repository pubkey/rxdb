import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gadxie2".
 * A/b tests multiple variations of the title, description and bulletpoints.
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
    /**
     * Variations 'a' and 'c' were retired on 2026-08-18 after the first A/B
     * readout: variation 'b' beat both of them on engagement. Kept on record
     * (commented out, not deleted) so their letters and copy stay reserved
     * and are never reused for different copy.
     */
    // a: {
    //     title: <>The <b>Open-Source</b> Database With <b>Self-Hosted Sync</b></>,
    //     text: <>RxDB is an open-source, local-first NoSQL database for JavaScript. Replication works with CouchDB, GraphQL, HTTP, WebRTC, and more, all self-hostable. Your data stays on your infrastructure, with no proprietary sync cloud.</>,
    //     bulletpoints: [
    //         <>Apache-2.0 licensed core</>,
    //         <>Sync to any backend you control</>,
    //         <>No proprietary cloud required</>,
    //         <>Large plugin ecosystem</>
    //     ]
    // },
    b: {
        title: <>One <b>Local Database</b> for Your Whole <b>Stack</b></>,
        text: <>RxDB runs in the browser, Electron, Node.js, and React Native, with bindings for React, Angular, Vue, and Svelte. You define a schema once and get reactive queries, migrations, and sync on every platform.</>,
        bulletpoints: [
            <>Browser, Electron, Node.js, RN</>,
            <>React, Angular, Vue, Svelte</>,
            <>One schema, every platform</>,
            <>TypeScript support included</>
        ]
    },
    // c: {
    //     title: <>A <b>Local Database</b> Ready for <b>Production</b></>,
    //     text: <>RxDB ships the features production apps need: schema validation, data migrations, encryption, compression, and attachment handling. Reactive queries keep the UI consistent and replication keeps every device in sync.</>,
    //     bulletpoints: [
    //         <>Schema validation and migrations</>,
    //         <>Encryption and compression</>,
    //         <>Reactive queries everywhere</>,
    //         <>Battle-tested replication</>
    //     ]
    // },
    d: {
        title: <>Queries That <b>Re-Render</b> Your <b>UI</b></>,
        text: <>Define a schema, query your local data, and RxDB keeps every subscribed component up to date as the data changes, in every open tab and on every device. Storage is IndexedDB, OPFS or SQLite, whichever fits your app.</>,
        bulletpoints: [
            <>Observable queries, no refetching</>,
            <>Every open tab stays consistent</>,
            <>IndexedDB, OPFS or SQLite storage</>,
            <>Replication to your own backend</>
        ]
    }
};

const variationKeys = Object.keys(variations) as (keyof typeof variations)[];

export default function Page() {
    /**
     * Render the first live variation on the server and on the first client
     * render to avoid a hydration mismatch, then swap to the assigned one.
     */
    const [variationKey, setVariationKey] = useState(variationKeys[0] as string);
    useEffect(() => {
        setVariationKey(getSemVariation(variationKeys));
    }, []);
    const variation = variations[variationKey as keyof typeof variations] ?? variations[variationKeys[0]];

    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'RxDB: One Local Database for Your Whole JavaScript Stack',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
