import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gadxie2".
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
        title: <>The <b>Open-Source</b> Database With <b>Self-Hosted Sync</b></>,
        text: <>RxDB is an open-source, local-first NoSQL database for JavaScript. Replication works with CouchDB, GraphQL, HTTP, WebRTC, and more, all self-hostable. Your data stays on your infrastructure, with no proprietary sync cloud.</>,
        bulletpoints: [
            <>Apache-2.0 licensed core</>,
            <>Sync to any backend you control</>,
            <>No proprietary cloud required</>,
            <>Large plugin ecosystem</>
        ]
    },
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
    c: {
        title: <>A <b>Local Database</b> Ready for <b>Production</b></>,
        text: <>RxDB ships the features production apps need: schema validation, data migrations, encryption, compression, and attachment handling. Reactive queries keep the UI consistent and replication keeps every device in sync.</>,
        bulletpoints: [
            <>Schema validation and migrations</>,
            <>Encryption and compression</>,
            <>Reactive queries everywhere</>,
            <>Battle-tested replication</>
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
            metaTitle: 'RxDB: Open-Source Local Database With Self-Hosted Sync',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
