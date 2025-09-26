import { randomOfArray } from '../../../plugins/utils';
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
    id: 'T10',
    /**
     * @link https://chatgpt.com/c/68d532de-4844-8331-8a2f-9a14b2d08cd9
     */
    variations: {
        A: 'RxDB is a JavaScript NoSQL database that lives inside your application. It enables local-first, offline-ready apps with instant queries and seamless sync across multiple backends.',
        B: 'RxDB is a NoSQL database for JavaScript that runs directly inside your app. It\'s local-first, keeps working offline, offers observable queries, and syncs with a wide range of backends.',
        C: 'A JavaScript NoSQL database built for offline-ready apps. RxDB runs in the client, provides instant local queries, observable state, and seamless backend sync.',
        D: 'RxDB is a NoSQL database for JavaScript that runs directly in your app. With a local-first design, it delivers zero-latency queries even offline, and syncs seamlessly with many backends. With observable queries, your UI updates instantly as data changes.',
        E: 'RxDB is a NoSQL database for JavaScript that runs directly inside your app. It keeps data available offline and syncs with a wide range of backends when online.',
        F: 'RxDB powers local-first apps by embedding a NoSQL JavaScript database directly into your app, with robust sync support for a wide range of backend systems.',
        G: ''
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
