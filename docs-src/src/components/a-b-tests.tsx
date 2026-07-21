import { randomOfArray } from '../../../plugins/utils';
import { getUtmCampaign, SEM_VARIATION_STORAGE_PREFIX } from './trigger-event';
// import { HeroEmojiChat } from './hero-section/T4_hero_b';
// import { ReplicationDiagram } from './replication-diagram';
// import { ScrollToSection, SemPage } from '../pages';
// import { OfflineSection } from './offline-section';
// import { RealtimeSection } from './realtime-section';
// import { RuntimesSection } from './runtimes-section';
// import { SyncSection } from './sync-section';
// import { ScrollToSection, SemPage } from '../pages';
// import { HeroSection_B } from './hero-section/T4_hero_b';
// import { HeroSection_A } from './hero-section/T4_hero_a';
// import { HeroSection_C } from './hero-section/T4_hero_c';
// import { HeroSection_D } from './hero-section/T4_hero_d';

const CURRENT_TEST_RUN = {
    /**
     * @link https://docs.google.com/spreadsheets/d/1ryPOhhwFHIqkVnIlpup6neV7u1FDnPMTlgzbvE62kB8/edit?gid=1330239462#gid=1330239462
     */
    id: 'TX',
    variations: {
        A: <>The easiest way to <b>store</b> and <b>sync</b> Data inside of your App</>,
        // B: <>The local-first <b>Database</b> for <b>JavaScript</b> Applications</>,
        // C: <>The Reactive Local-First <b>Database</b> for Modern <b>JavaScript</b> Apps</>,
        // D: <>The Local-First Database to <b>Store</b> and <b>Sync</b> App Data</>,
        // E: <>The Local-First <b>Database</b> for <b>JavaScript</b> Apps</>
    }
};

export type TestGroup = {
    variation: string;
    deviceType: 'm' | 'd'; // mobile/desktop
    originId?: string;
};
let testGroup: TestGroup;

const TEST_GROUP_STORAGE_ID = 'test-group-' + CURRENT_TEST_RUN.id;

export function getTestGroup(originId: string = 'main'): TestGroup {
    if (testGroup) {
        return testGroup;
    }

    if (typeof localStorage === 'undefined') {
        return {
            variation: Object.keys(CURRENT_TEST_RUN.variations)[0],
            deviceType: 'd',
            originId: originId ? originId : ''
        };
    }

    const groupFromStorage = localStorage.getItem(TEST_GROUP_STORAGE_ID);
    if (groupFromStorage) {
        testGroup = JSON.parse(groupFromStorage);
    } else {
        testGroup = {
            variation: randomOfArray(Object.keys(CURRENT_TEST_RUN.variations)),
            deviceType: window.screen.width <= 900 ? 'm' : 'd',
            originId: originId ? originId : ''
        };
        localStorage.setItem(TEST_GROUP_STORAGE_ID, JSON.stringify(testGroup));
    }
    console.log('currentTestGroup:');
    console.dir(testGroup);
    return testGroup;
}

export function getABTestOrder(key: string): number {
    const group = getTestGroup();
    const variation = CURRENT_TEST_RUN.variations[group.variation];
    const order = variation[key];
    if (!order) {
        return 0;
    }
    return order;
}
export function getABTestDark(key: string): boolean {
    const order = getABTestOrder(key);
    return order % 2 !== 0;
}
export function ABTestContent(
    // props: {
    //     refs: any;
    //     sem?: SemPage;
    //     scrollToSection: ScrollToSection;
    // }
) {
    const variationId = getTestGroup().variation;
    //     return <>
    //         <RuntimesSection sem={props.sem} runtimesRef={props.refs.runtimesRef} dark={true} />
    //         <SyncSection sem={props.sem} replicationRef={props.refs.replicationRef} dark={false} />
    //         <OfflineSection sem={props.sem} offlineRef={props.refs.offlineRef} dark={true} />
    //         <RealtimeSection sem={props.sem} realtimeRef={props.refs.realtimeRef} dark={false} />
    //     </>;
    // return <></>;
    const VariationElement = CURRENT_TEST_RUN.variations[variationId];
    // return <VariationElement sem={props.sem} scrollToSection={props.scrollToSection} />;
    return VariationElement;
}


/**
 * SEM landingpages a/b test multiple sets of title, text and
 * bulletpoints on the same page. getSemVariation() picks one variation
 * randomly per visitor and stores the choice in localStorage so that the
 * visitor always sees the same variation on later visits.
 *
 * Variations are identified by stable letter keys ('a', 'b', 'c', …), NOT by
 * their position in an array: a letter keeps its meaning when variations are
 * added or removed later, so stored assignments and GA events stay comparable
 * over time. The rules when a page's variations get updated:
 * - a new variation always gets the next unused letter - letters are NEVER
 *   reused for different copy,
 * - a variation is never deleted from the page file - it gets commented out
 *   instead, so its letter and copy stay on record.
 *
 * The variation is keyed off the utm_campaign of the ad click (our ad final
 * URLs carry the full utm parameter set), so every sem page of the same
 * campaign shows the same variation letter and the tracking events can carry
 * it in their utm-based prefix, e.g. "utm_indexeddb_va_join_newsletter"
 * (see getUtmEventPrefix() in trigger-event.tsx). Visitors without a stored
 * campaign (organic traffic) share the 'organic' key - their variation stays
 * stable too, it is just not attributed to any campaign.
 *
 * localStorage is the single source of truth for the assigned variation -
 * the event prefix reads it back directly, so there is no in-memory state
 * that could go stale on client side navigations (docusaurus is a SPA) or
 * when a dev server keeps the module alive via hot module replacement.
 */
export function getSemVariation(variationKeys: string[]): string {
    const fallback = variationKeys[0];
    if (variationKeys.length <= 1) {
        return fallback;
    }

    // server side rendering always uses the first variation
    if (typeof localStorage === 'undefined') {
        return fallback;
    }

    const campaign = getUtmCampaign();
    const storageId = SEM_VARIATION_STORAGE_PREFIX + (campaign ? campaign : 'organic');
    let key: string;
    const fromStorage = localStorage.getItem(storageId);
    if (fromStorage !== null && variationKeys.includes(fromStorage)) {
        key = fromStorage;
    } else {
        /**
         * Either no assignment yet, or the stored variation has been removed
         * from the page since (or is a numeric index from the pre-letter
         * system) - assign a fresh one.
         */
        key = randomOfArray(variationKeys);
        localStorage.setItem(storageId, key);
    }

    console.log('currentSemVariation: ' + storageId + ' -> ' + key);
    return key;
}
