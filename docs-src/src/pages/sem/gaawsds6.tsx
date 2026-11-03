import { useEffect, useState } from 'react';
import Home from '..';
import { getSemVariation } from '../../components/a-b-tests';

/**
 * SEM landingpage for "gaawsds6".
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
        title: <>Keep <b>Offline Support</b> When You Replace Your <b>Sync Layer</b></>,
        text: <>Swapping an offline sync engine for a plain API client means every screen needs a network connection again. RxDB keeps the data on the device, so reads stay instant and writes are queued until the backend is reachable.</>,
        bulletpoints: [
            <>Reads work without network</>,
            <>Writes queue and sync later</>,
            <>Background replication</>,
            <>No loading spinners for local data</>
        ]
    },
    b: {
        title: <><b>Live Queries</b> Without Hand-Built <b>Subscriptions</b></>,
        text: <>Without an observable local store you rebuild live updates from a list query and several subscriptions per screen. In RxDB one query is observable: your UI re-renders whenever matching data changes, locally or from the server.</>,
        bulletpoints: [
            <>One observable query per view</>,
            <>Updates from local and remote writes</>,
            <>React hooks and Signals support</>,
            <>No subscription wiring per screen</>
        ]
    },
    c: {
        title: <><b>Offline Sync</b> You Can <b>Log, Test and Debug</b></>,
        text: <>Data that silently stops syncing is hard to fix when the sync engine is a black box. RxDB's replication is open source and runs in your code, with conflict handling you define and events you can observe.</>,
        bulletpoints: [
            <>Open-source replication protocol</>,
            <>Custom conflict handlers</>,
            <>Observable replication state</>,
            <>Same behavior on every platform</>
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
            metaTitle: 'RxDB: Keep Offline Support When Your Sync Layer Ends',
            metaDescription: 'Replacing an offline sync engine with a plain API client drops offline support. RxDB keeps data on the device, live queries in the UI and syncs later.',
            title: variation.title,
            text: variation.text,
            bulletpoints: variation.bulletpoints
        }
    });
}
