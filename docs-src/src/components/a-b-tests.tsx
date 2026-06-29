import { randomOfArray } from '../../../plugins/utils';

/**
 * A/B testing for the search-engine-marketing (SEM) landing pages
 * in `docs-src/src/pages/sem/*`.
 *
 * Each SEM page can A/B-test its hero title, hero paragraph, meta title,
 * meta description and hero bullets. To create a variation, wrap the field
 * value in `ab(...)`:
 *
 * ```tsx
 * import { ab } from '../../components/a-b-tests';
 *
 * Home({
 *   sem: {
 *     id: 'react-database',
 *     appName: 'React',
 *     metaTitle: ab(
 *       'The local Database for React Apps',
 *       'React Local-First Database'
 *     ),
 *     title: ab(
 *       <>The easiest way to <b>store</b> and <b>sync</b> Data in React</>,
 *       <>The Local-First <b>Database</b> for <b>React</b> Apps</>
 *     )
 *   }
 * });
 * ```
 *
 * On the first visit a variant index is randomly assigned per page-id and
 * persisted in localStorage. Every conversion event is then tagged with the
 * page-id and variant (see `getTestGroupEventPrefix`) so the variants can be
 * compared in Google Analytics.
 *
 * After editing the variations of an existing page, bump `abVersion` on the
 * SemPage so returning users get re-assigned instead of keeping a stale index.
 */

/**
 * Wraps a set of A/B variations for a single SemPage field.
 * Use the `ab()` helper to create one.
 */
export type ABVariants<T> = { variants: T[]; };

/**
 * A SemPage field that is either a single value or a set of A/B variations.
 */
export type Variable<T> = T | ABVariants<T>;

/**
 * Marks a SemPage field as A/B-testable by listing its variations.
 * Using an explicit wrapper (instead of a bare array) keeps fields like
 * `bullets` - which are arrays themselves - unambiguous.
 */
export function ab<T>(...variants: T[]): ABVariants<T> {
    return { variants };
}

function isABVariants<T>(field: Variable<T>): field is ABVariants<T> {
    return !!field && typeof field === 'object' && Array.isArray((field as any).variants);
}

/**
 * Resolves a possibly-variable field to the value for the given variant index.
 * Plain (non-`ab`) values are returned unchanged so existing pages keep working.
 */
export function resolveVariable<T>(field: Variable<T>, variantIndex: number): T {
    if (isABVariants(field)) {
        const variants = field.variants;
        return variants[variantIndex % variants.length];
    }
    return field;
}

/**
 * The fields of a SemPage that can hold A/B variations.
 * Typed structurally to avoid importing SemPage (would create an import cycle).
 */
type ABTestableSem = {
    id: string;
    abVersion?: number;
    metaTitle?: Variable<any>;
    metaDescription?: Variable<any>;
    title?: Variable<any>;
    text?: Variable<any>;
    bullets?: Variable<any>;
};

const AB_TESTABLE_FIELDS: (keyof ABTestableSem)[] = [
    'metaTitle',
    'metaDescription',
    'title',
    'text',
    'bullets'
];

/**
 * Amount of A/B variations defined for a SemPage,
 * which is the largest variation count across all testable fields.
 */
export function countSemVariants(sem: ABTestableSem): number {
    let count = 1;
    for (const field of AB_TESTABLE_FIELDS) {
        const value = sem[field];
        if (isABVariants(value) && value.variants.length > count) {
            count = value.variants.length;
        }
    }
    return count;
}

export type TestGroup = {
    variation: number;
    deviceType: 'm' | 'd'; // mobile/desktop
    originId: string;
};

/**
 * The variant assignment of the currently rendered SEM page.
 * Set by `getSemVariant` so the tracking events can read it.
 */
let currentSemTestGroup: TestGroup | undefined;

/**
 * Returns the A/B variant index for the given SEM page.
 * Randomly assigns one on the first visit and persists it in localStorage
 * so the same user keeps seeing the same variation.
 */
export function getSemVariant(sem: ABTestableSem): number {
    const variantCount = countSemVariants(sem);

    if (typeof localStorage === 'undefined') {
        currentSemTestGroup = {
            variation: 0,
            deviceType: 'd',
            originId: sem.id
        };
        return 0;
    }

    const storageId = 'sem-ab-' + sem.id + '-v' + (sem.abVersion ?? 1);
    const fromStorage = localStorage.getItem(storageId);
    if (fromStorage) {
        currentSemTestGroup = JSON.parse(fromStorage);
    } else {
        const variationKeys = Array.from({ length: variantCount }, (_, i) => i);
        currentSemTestGroup = {
            variation: randomOfArray(variationKeys),
            deviceType: window.screen.width <= 900 ? 'm' : 'd',
            originId: sem.id
        };
        localStorage.setItem(storageId, JSON.stringify(currentSemTestGroup));
    }

    console.log('currentSemTestGroup:');
    console.dir(currentSemTestGroup);
    return currentSemTestGroup.variation;
}

/**
 * Prefix added to the tracking events so that conversions can be attributed
 * to a given SEM page and A/B variant in Google Analytics.
 * Returns false when no SEM A/B page has been rendered.
 */
export function getTestGroupEventPrefix(): string | false {
    if (!currentSemTestGroup) {
        return false;
    }
    const tg = currentSemTestGroup;
    return [
        'semab',
        tg.originId,
        'V' + tg.variation,
        'D' + tg.deviceType
    ].join('_');
}
