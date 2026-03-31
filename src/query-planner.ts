import { countUntilNotMatching } from './plugins/utils/index.ts';
import { newRxError } from './rx-error.ts';
import { getSchemaByObjectPath } from './rx-schema-helper.ts';
import type {
    FilledMangoQuery,
    MangoQuerySelector,
    RxDocumentData,
    RxJsonSchema,
    RxQueryPlan,
    RxQueryPlanKey,
    RxQueryPlanerOpts
} from './types/index.d.ts';

export const INDEX_MAX = String.fromCharCode(65535);

/**
 * Do not use -Infinity here because it would be
 * transformed to null on JSON.stringify() which can break things
 * when the query plan is sent to the storage as json.
 * @link https://stackoverflow.com/a/16644751
 * Notice that for IndexedDB IDBKeyRange we have
 * to transform the value back to -Infinity
 * before we can use it in IDBKeyRange.bound.
 */
export const INDEX_MIN = Number.MIN_SAFE_INTEGER;

/**
 * Returns the query plan which contains
 * information about how to run the query
 * and which indexes to use.
 *
 * This is used in some storage like Memory, dexie.js and IndexedDB.
 */
export function getQueryPlan<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    query: FilledMangoQuery<RxDocType>
): RxQueryPlan {
    const selector = query.selector;
    let indexes: string[][] = schema.indexes ? schema.indexes.slice(0) as any : [];
    if (query.index) {
        indexes = [query.index];
    }

    /**
     * Most storages do not support descending indexes
     * so having a 'desc' in the sorting, means we always have to re-sort the results.
     */
    const hasDescSorting = !!query.sort.find(sortField => Object.values(sortField)[0] === 'desc');

    /**
     * Some fields can be part of the selector while not being relevant for sorting
     * because their selector operators specify that in all cases all matching docs
     * would have the same value.
     * For example the boolean field _deleted or enum fields.
     */
    const sortIrrelevevantFields = new Set();
    Object.keys(selector).forEach(fieldName => {
        const schemaPart = getSchemaByObjectPath(schema, fieldName);
        if (
            schemaPart &&
            (
                schemaPart.type === 'boolean' ||
                schemaPart.enum
            ) &&
            Object.prototype.hasOwnProperty.call((selector as any)[fieldName], '$eq')
        ) {
            sortIrrelevevantFields.add(fieldName);
        }
    });


    const optimalSortIndex = query.sort.map(sortField => Object.keys(sortField)[0]);
    const optimalSortIndexCompareString = optimalSortIndex
        .filter(f => !sortIrrelevevantFields.has(f))
        .join(',');

    let currentBestQuality = -1;
    let currentBestQueryPlan: RxQueryPlan | undefined;

    /**
     * Calculate one query plan for each index
     * and then test which of the plans is best.
     */
    indexes.forEach((index) => {
        let inclusiveEnd = true;
        let inclusiveStart = true;
        const opts: RxQueryPlanerOpts[] = index.map(indexField => {
            const matcher = (selector as any)[indexField];
            const operators = matcher ? Object.keys(matcher) : [];

            let matcherOpts: RxQueryPlanerOpts = {} as any;
            if (
                !matcher ||
                !operators.length
            ) {
                const startKey = inclusiveStart ? INDEX_MIN : INDEX_MAX;
                matcherOpts = {
                    startKey,
                    endKey: inclusiveEnd ? INDEX_MAX : INDEX_MIN,
                    inclusiveStart: true,
                    inclusiveEnd: true
                };
            } else {
                operators.forEach(operator => {
                    if (LOGICAL_OPERATORS.has(operator)) {
                        const operatorValue = matcher[operator];
                        const partialOpts = getMatcherQueryOpts(operator, operatorValue);
                        matcherOpts = Object.assign(matcherOpts, partialOpts);
                    }
                });
            }

            // fill missing attributes
            if (typeof matcherOpts.startKey === 'undefined') {
                matcherOpts.startKey = INDEX_MIN;
            }
            if (typeof matcherOpts.endKey === 'undefined') {
                matcherOpts.endKey = INDEX_MAX;
            }
            if (typeof matcherOpts.inclusiveStart === 'undefined') {
                matcherOpts.inclusiveStart = true;
            }
            if (typeof matcherOpts.inclusiveEnd === 'undefined') {
                matcherOpts.inclusiveEnd = true;
            }

            if (inclusiveStart && !matcherOpts.inclusiveStart) {
                inclusiveStart = false;
            }
            if (inclusiveEnd && !matcherOpts.inclusiveEnd) {
                inclusiveEnd = false;
            }

            return matcherOpts;
        });


        const startKeys = opts.map(opt => opt.startKey);
        const endKeys = opts.map(opt => opt.endKey);

        /**
         * Compute the index compare string once per index,
         * not inside the queryPlan object literal, to avoid
         * creating a filtered array and joining on every iteration.
         */
        let indexCompareString: string;
        if (sortIrrelevevantFields.size === 0) {
            indexCompareString = index.join(',');
        } else {
            indexCompareString = index.filter(f => !sortIrrelevevantFields.has(f)).join(',');
        }

        const queryPlan: RxQueryPlan = {
            index,
            startKeys,
            endKeys,
            inclusiveEnd,
            inclusiveStart,
            sortSatisfiedByIndex: !hasDescSorting && optimalSortIndexCompareString === indexCompareString,
            selectorSatisfiedByIndex: isSelectorSatisfiedByIndex(index, query.selector, startKeys, endKeys)
        };
        const quality = rateQueryPlan(
            schema,
            query,
            queryPlan
        );
        if (
            (
                quality >= currentBestQuality
            ) ||
            query.index
        ) {
            currentBestQuality = quality;
            currentBestQueryPlan = queryPlan;
        }
    });

    /**
     * In all cases and index must be found
     */
    if (!currentBestQueryPlan) {
        throw newRxError('SNH', {
            query
        });
    }

    return currentBestQueryPlan;
}

export const LOGICAL_OPERATORS = new Set(['$eq', '$gt', '$gte', '$lt', '$lte']);
export const LOWER_BOUND_LOGICAL_OPERATORS = new Set(['$eq', '$gt', '$gte']);
export const UPPER_BOUND_LOGICAL_OPERATORS = new Set(['$eq', '$lt', '$lte']);


export function isSelectorSatisfiedByIndex(
    index: string[],
    selector: MangoQuerySelector<any>,
    startKeys: RxQueryPlanKey[],
    endKeys: RxQueryPlanKey[]
): boolean {

    /**
     * Not satisfied if contains $and or $or operations.
     */
    if (selector.$and || selector.$or) {
        return false;
    }

    /**
     * Check all selector entries in a single pass:
     * - Ensure all fields are in the index
     * - Ensure all operators are logical
     * - Track lower/upper bound operators
     */
    const selectorEntries = Object.entries(selector);
    const lowerOperatorFieldNames = new Set<string>();
    const upperOperatorFieldNames = new Set<string>();
    let hasNonEqLowerBound = false;
    let hasNonEqUpperBound = false;

    for (const [fieldName, operation] of selectorEntries) {
        if (!index.includes(fieldName)) {
            return false;
        }

        const operationKeys = Object.keys(operation as any);

        let lowerLogicOpCount = 0;
        let lastLowerLogicOp: string | undefined;
        let upperLogicOpCount = 0;
        let lastUpperLogicOp: string | undefined;

        for (const op of operationKeys) {
            if (!LOGICAL_OPERATORS.has(op)) {
                return false;
            }
            if (LOWER_BOUND_LOGICAL_OPERATORS.has(op)) {
                lowerLogicOpCount++;
                lastLowerLogicOp = op;
            }
            if (UPPER_BOUND_LOGICAL_OPERATORS.has(op)) {
                upperLogicOpCount++;
                lastUpperLogicOp = op;
            }
        }

        // If more than one logic op on the same field per bound direction, we have to selector-match.
        if (lowerLogicOpCount > 1 || upperLogicOpCount > 1) {
            return false;
        }

        if (lastLowerLogicOp) {
            lowerOperatorFieldNames.add(fieldName);
        }
        if (lastLowerLogicOp !== '$eq') {
            if (hasNonEqLowerBound) {
                return false;
            }
            hasNonEqLowerBound = true;
        }

        if (lastUpperLogicOp) {
            upperOperatorFieldNames.add(fieldName);
        }
        if (lastUpperLogicOp !== '$eq') {
            if (hasNonEqUpperBound) {
                return false;
            }
            hasNonEqUpperBound = true;
        }
    }


    /**
     * If the index contains a non-relevant field between
     * the relevant fields, then the index is not satisfying.
     */
    let i = 0;
    for (const fieldName of index) {
        for (const set of [
            lowerOperatorFieldNames,
            upperOperatorFieldNames
        ]) {
            if (
                !set.has(fieldName) &&
                set.size > 0
            ) {
                return false;
            }
            set.delete(fieldName);
        }

        const startKey = startKeys[i];
        const endKey = endKeys[i];

        if (
            startKey !== endKey && (
                lowerOperatorFieldNames.size > 0 &&
                upperOperatorFieldNames.size > 0
            )
        ) {
            return false;
        }

        i++;
    }

    return true;
}

export function getMatcherQueryOpts(
    operator: string,
    operatorValue: any
): Partial<RxQueryPlanerOpts> {
    switch (operator) {
        case '$eq':
            return {
                startKey: operatorValue,
                endKey: operatorValue,
                inclusiveEnd: true,
                inclusiveStart: true
            };
        case '$lte':
            return {
                endKey: operatorValue,
                inclusiveEnd: true
            };
        case '$gte':
            return {
                startKey: operatorValue,
                inclusiveStart: true
            };
        case '$lt':
            return {
                endKey: operatorValue,
                inclusiveEnd: false
            };
        case '$gt':
            return {
                startKey: operatorValue,
                inclusiveStart: false
            };
        default:
            throw newRxError('SNH');
    }
}


/**
 * Returns a number that determines the quality of the query plan.
 * Higher number means better query plan.
 */
export function rateQueryPlan<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    query: FilledMangoQuery<RxDocType>,
    queryPlan: RxQueryPlan
): number {
    let quality: number = 0;
    const addQuality = (value: number) => {
        if (value > 0) {
            quality = quality + value;
        }
    };

    const pointsPerMatchingKey = 10;

    const nonMinKeyCount = countUntilNotMatching(queryPlan.startKeys, keyValue => keyValue !== INDEX_MIN && keyValue !== INDEX_MAX);
    addQuality(nonMinKeyCount * pointsPerMatchingKey);

    const nonMaxKeyCount = countUntilNotMatching(queryPlan.endKeys, keyValue => keyValue !== INDEX_MAX && keyValue !== INDEX_MIN);
    addQuality(nonMaxKeyCount * pointsPerMatchingKey);

    const equalKeyCount = countUntilNotMatching(queryPlan.startKeys, (keyValue, idx) => {
        if (keyValue === queryPlan.endKeys[idx]) {
            return true;
        } else {
            return false;
        }
    });
    addQuality(equalKeyCount * pointsPerMatchingKey * 1.5);

    const pointsIfNoReSortMustBeDone = queryPlan.sortSatisfiedByIndex ? 5 : 0;
    addQuality(pointsIfNoReSortMustBeDone);

    return quality;
}
