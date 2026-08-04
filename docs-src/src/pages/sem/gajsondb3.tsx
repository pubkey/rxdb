import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gajsondb3".
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
        title: <>Outgrown JSON Files? Get a Real <b>JSON Database</b></>,
        text: <>Writing app data to JSON files means rewriting the whole file on every change, looping instead of querying, and corrupted data under concurrent writes. RxDB keeps your data JSON and fixes all of that.</>,
        bulletpoints: [
            <>Indexed queries on JSON</>,
            <>Safe concurrent writes</>,
            <>Schemas and migrations</>,
            <>Realtime UI updates</>
        ]
    },
    b: {
        title: <><b>JSON Documents</b> That Sync Across Devices</>,
        text: <>A JSON file lives on one machine. RxDB replicates JSON documents between your clients and your backend, with offline queueing and conflict handling built in.</>,
        bulletpoints: [
            <>Two-way realtime replication</>,
            <>Conflict resolution included</>,
            <>Offline writes sync later</>,
            <>Your servers, your data</>
        ]
    },
    c: {
        title: <><b>JSON Storage</b> That Scales With Your App</>,
        text: <>RxDB queries JSON documents through indexes instead of loading everything into memory, and keeps working offline. Grow from a prototype to production without changing your data model.</>,
        bulletpoints: [
            <>Indexes, not full scans</>,
            <>Zero-latency local reads</>,
            <>Works offline by default</>,
            <>Production-ready open source</>
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
            metaTitle: 'RxDB: Outgrown JSON Files? Get a Real JSON Database',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
