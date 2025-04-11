import { randomOfArray } from '../../../plugins/utils';
// import { ScrollToSection, SemPage } from '../pages';
// import { HeroSection_B } from './hero-section/T4_hero_b';
// import { HeroSection_A } from './hero-section/T4_hero_a';
// import { HeroSection_C } from './hero-section/T4_hero_c';
// import { HeroSection_D } from './hero-section/T4_hero_d';

const CURRENT_TEST_RUN = {
    id: 'T5', // test hero page content type
    variations: {
        A: {
            realtime: 1,
            sync: 2,
            offline: 3,
            runtimes: 4
        },
        B: {
            realtime: 2,
            sync: 1,
            offline: 3,
            runtimes: 4
        },
        C: {
            realtime: 3,
            sync: 2,
            offline: 1,
            runtimes: 4
        },
        D: {
            realtime: 4,
            sync: 2,
            offline: 3,
            runtimes: 1
        },
        E: {
            realtime: 4,
            sync: 1,
            offline: 2,
            runtimes: 3
        }

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
    if (!order) { return 0; }
    return order;
}
export function getABTestDark(key: string): boolean {
    const order = getABTestOrder(key);
    return order % 2 !== 0;
}
export function ABTestContent(
    // props: {
    //     sem?: SemPage;
    //     scrollToSection: ScrollToSection;
    // }
) {
    const variationId = getTestGroup().variation;
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
