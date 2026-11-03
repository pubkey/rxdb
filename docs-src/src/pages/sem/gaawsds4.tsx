import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaawsds4".
 * A/b tests 3 variations of the title, description and bulletpoints.
 * The variation is picked randomly per visitor, keyed off the utm_campaign
 * of the ad click and kept stable via localStorage.
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
        title: <>The <b>Open-Source Alternative</b> for <b>Offline Sync</b></>,
        text: <>RxDB is a local-first NoSQL database for JavaScript. It stores data on the device, answers queries without a network round trip and syncs to your backend in the background, so your app keeps working offline after the switch.</>,
        bulletpoints: [
            <>Works offline by default</>,
            <>Sync with any backend</>,
            <>Observable realtime queries</>,
            <>Free, open-source core</>
        ]
    },
    b: {
        title: <>Your Offline Sync Ends in <b>May 2027</b>. Start the <b>Switch</b> Now.</>,
        text: <>After the end-of-life date the old sync layer gets no more fixes. RxDB is actively developed and gives you the same local-first model: write locally, observe queries and replicate in the background.</>,
        bulletpoints: [
            <>Actively developed, no end-of-life date</>,
            <>Same write-locally, sync-later model</>,
            <>Migrate one collection at a time</>,
            <>Free and open source</>
        ]
    },
    c: {
        title: <>Same <b>Local-First Model</b>, New <b>Database</b></>,
        text: <>Your app already saves data locally, observes it and syncs in the background. RxDB works the same way, so the switch replaces the data layer and keeps your app architecture.</>,
        bulletpoints: [
            <>Save, query and observe locally</>,
            <>Background replication</>,
            <>Reactive queries for your UI</>,
            <>Keep your app architecture</>
        ]
    }
};

const variationKeys = Object.keys(variations) as (keyof typeof variations)[];

export default function Page() {
    /**
     * Render the first live variation on the server and on the first client
     * render to avoid a hydration mismatch, then swap to the assigned one.
     * The key comes from Object.keys(), never a hardcoded 'a': once variation
     * 'a' is retired (commented out) a hardcoded default renders nothing.
     */
    const [variationKey, setVariationKey] = useState(variationKeys[0]);
    useEffect(() => {
        setVariationKey(getSemVariation(variationKeys) as keyof typeof variations);
    }, []);
    const variation = variations[variationKey] ?? variations[variationKeys[0]];

    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'RxDB: The Offline Sync Alternative Before May 2027',
            metaDescription: 'Replace an offline sync layer that ends in May 2027 with RxDB, the open-source local-first database for JavaScript that syncs to any backend.',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
