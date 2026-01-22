import { randomOfArray } from '../../../plugins/utils';
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
    id: 'T11',
    variations: {
        A: <>The easiest way to <b>store</b> and <b>sync</b> Data inside of your App</>,
        B: <>The local-first <b>Database</b> for <b>JavaScript</b> Applications</>,
        C: <>The Reactive Local-First <b>Database</b> for Modern <b>JavaScript</b> Apps</>,
        D: <>The Local-First Database to <b>Store</b> and <b>Sync</b> App Data</>,
        E: <>The Local-First <b>Database</b> for <b>JavaScript</b> Apps</>
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


export function getTestGroupEventPrefix() {
    const has = localStorage.getItem(TEST_GROUP_STORAGE_ID);
    if (!has) {
        return false;
    } else {
        const tg = getTestGroup();
        return [
            'abt',
            CURRENT_TEST_RUN.id,
            'O:' + tg.originId,
            'V:' + tg.variation,
            'D:' + tg.deviceType
        ].join('_');
    }
}
