import { randomOfArray } from '../../../plugins/utils';
import { ScrollToSection, SemPage } from '../pages';
import { HeroSection_A } from './hero-section/hero_a';
import { HeroSection_B } from './hero-section/hero_b';
import { HeroSection_C } from './hero-section/hero_c';
import { HeroSection_D } from './hero-section/hero_d';

const CURRENT_TEST_RUN = {
    id: 'T3', // test hero page content type
    variations: {
        A: HeroSection_A,
        B: HeroSection_B,
        C: HeroSection_C,
        D: HeroSection_D
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
        console.log('currentTestGroup:');
        console.dir(testGroup);
    } else {
        testGroup = {
            variation: randomOfArray(Object.keys(CURRENT_TEST_RUN.variations)),
            deviceType: window.screen.width <= 900 ? 'm' : 'd',
            originId: originId ? originId : ''
        };
        localStorage.setItem(TEST_GROUP_STORAGE_ID, JSON.stringify(testGroup));
    }
    return testGroup;
}

export function ABTestContent(props: {
    sem?: SemPage;
    scrollToSection: ScrollToSection;
}) {
    const variationId = getTestGroup().variation;
    const VariationElement = CURRENT_TEST_RUN.variations[variationId];
    return <VariationElement sem={props.sem} scrollToSection={props.scrollToSection} />;
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
