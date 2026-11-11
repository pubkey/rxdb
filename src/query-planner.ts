import { countUntilNotMatching } from './plugins/utils/index.ts';
import { newRxError } from './rx-error.ts';
import { getSchemaByObjectPath } from './rx-schema-helper.ts';
import { getStringLengthOfIndexNumber } from './custom-index.ts';
import {
    INDEX_MAX,
    INDEX_MIN
} from './query-planner-bounds.ts';
import type {
    FilledMangoQuery,
    MangoQuerySelector,
    RxDocumentData,
    RxJsonSchema,
    RxQueryPlan,
    RxQueryPlanKey,
    RxQueryPlanerOpts
} from './types/index.d.ts';

export {
    INDEX_MAX,
    INDEX_MIN
};

/**
 * The biggest single character string that is sorted
 * before all strings that start with INDEX_MAX.
 */
const INDEX_MAX_LOWER_BOUND = String.fromCharCode(65534);

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
     * Same goes for string and number fields that are matched with $eq
     * to a string or number value.
     * @performance Not having these fields in the compare strings
     * makes it possible to use the index order as sort order
     * so that the storage does not have to re-sort the results.
     */
    const sortIrrelevevantFields = new Set();
    Object.keys(selector).forEach(fieldName => {
        const schemaPart = getSchemaByObjectPath(schema, fieldName);
        const fieldSelector = (selector as any)[fieldName];
        if (
            !schemaPart ||
            !Object.prototype.hasOwnProperty.call(fieldSelector, '$eq')
        ) {
            return;
        }
        if (
            schemaPart.type === 'boolean' ||
            schemaPart.enum
        ) {
            sortIrrelevevantFields.add(fieldName);
        } else if (
            schemaPart.type === 'string' ||
            schemaPart.type === 'number' ||
            schemaPart.type === 'integer'
        ) {
            const eqValueType = typeof fieldSelector.$eq;
            if (eqValueType === 'string' || eqValueType === 'number') {
                sortIrrelevevantFields.add(fieldName);
            }
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
        let hasIndexMaxSelectorValue = false;
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
                    } else if (operator === '$in') {
                        const partialOpts = getInQueryRangeOpts(matcher[operator]);
                        if (partialOpts) {
                            matcherOpts = Object.assign(matcherOpts, partialOpts);
                        }
                    }
                });

                /**
                 * A selector value that is equal to INDEX_MAX cannot be
                 * told apart from the "no bound" marker in the query plan.
                 * As upper bound the marker already spans all values.
                 * As lower bound the next smaller string is used instead.
                 * The range is then wider than the selector,
                 * so the query matcher has to filter the results.
                 */
                if (matcherOpts.startKey === INDEX_MAX) {
                    matcherOpts.startKey = INDEX_MAX_LOWER_BOUND;
                    matcherOpts.inclusiveStart = true;
                    hasIndexMaxSelectorValue = true;
                }
                if (matcherOpts.endKey === INDEX_MAX) {
                    matcherOpts.inclusiveEnd = true;
                    hasIndexMaxSelectorValue = true;
                }
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

            /**
             * A query value can be any number, also one that is outside
             * of the schema minimum/maximum or between two steps of the
             * index precision. getNumberIndexString() cannot represent
             * these values, so the bound is moved to the next value
             * that is representable inside of the queried range.
             */
            const schemaPart = getSchemaByObjectPath(schema, indexField);
            if (
                schemaPart &&
                (schemaPart.type === 'number' || schemaPart.type === 'integer') &&
                typeof schemaPart.minimum === 'number' &&
                typeof schemaPart.maximum === 'number' &&
                typeof schemaPart.multipleOf === 'number'
            ) {
                const startKey = matcherOpts.startKey;
                const endKey = matcherOpts.endKey;
                const hasStart = typeof startKey === 'number' && startKey !== INDEX_MIN;
                const hasEnd = typeof endKey === 'number' && endKey !== INDEX_MIN;
                if (hasStart || hasEnd) {
                    const parsedLengths = getStringLengthOfIndexNumber(schemaPart);
                    if (hasStart) {
                        const bound = getRepresentableNumberBound(parsedLengths, startKey as number, true);
                        if (bound) {
                            matcherOpts.startKey = bound.key;
                            matcherOpts.inclusiveStart = bound.inclusive;
                        }
                    }
                    if (hasEnd) {
                        const bound = getRepresentableNumberBound(parsedLengths, endKey as number, false);
                        if (bound) {
                            matcherOpts.endKey = bound.key;
                            matcherOpts.inclusiveEnd = bound.inclusive;
                        }
                    }
                }
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
            selectorSatisfiedByIndex: !hasIndexMaxSelectorValue && isSelectorSatisfiedByIndex(index, query.selector, startKeys, endKeys)
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

/**
 * Returns the bound that must be used in the index range
 * when the given query value has no index string of its own,
 * or undefined when the value is representable.
 * A lower bound is moved up and an upper bound is moved down
 * to the next representable value, which is then inclusive.
 * A lower bound above the maximum or an upper bound below
 * the minimum becomes exclusive so that the range is empty.
 */
export function getRepresentableNumberBound(
    parsedLengths: ReturnType<typeof getStringLengthOfIndexNumber>,
    value: number,
    isLowerBound: boolean
): { key: number; inclusive: boolean; } | undefined {
    if (value < parsedLengths.minimum) {
        return { key: parsedLengths.minimum, inclusive: isLowerBound };
    }
    if (value > parsedLengths.maximum) {
        return { key: parsedLengths.maximum, inclusive: !isLowerBound };
    }
    const multiplier = parsedLengths.multiplier;
    const scaled = value * multiplier;
    /**
     * Values that differ from a step only by the floating point
     * error get the index string of that step, same as document values.
     */
    if (Math.abs(scaled - Math.round(scaled)) <= Number.EPSILON * 4 * Math.max(1, Math.abs(scaled))) {
        return undefined;
    }
    return {
        key: (isLowerBound ? Math.ceil(scaled) : Math.floor(scaled)) / multiplier,
        inclusive: true
    };
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

/**
 * $in can use an index by scanning the range between the
 * smallest and the largest of the given values.
 * That range can contain non-matching documents, so the
 * selector is never satisfied by the index alone and the
 * query matcher must still filter the results.
 * Only homogeneous arrays of strings or finite numbers are
 * used because min/max is not defined across mixed types.
 * @link https://github.com/pubkey/rxdb/issues/8631
 */
export function getInQueryRangeOpts(
    operatorValue: any
): Partial<RxQueryPlanerOpts> | undefined {
    if (
        !Array.isArray(operatorValue) ||
        operatorValue.length === 0
    ) {
        return undefined;
    }
    const valueType = typeof operatorValue[0];
    if (valueType !== 'string' && valueType !== 'number') {
        return undefined;
    }
    let min = operatorValue[0];
    let max = operatorValue[0];
    for (let i = 0; i < operatorValue.length; i++) {
        const value = operatorValue[i];
        if (
            typeof value !== valueType ||
            (valueType === 'number' && !isFinite(value))
        ) {
            return undefined;
        }
        if (value < min) {
            min = value;
        }
        if (value > max) {
            max = value;
        }
    }
    return {
        startKey: min,
        endKey: max,
        inclusiveStart: true,
        inclusiveEnd: true
    };
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
