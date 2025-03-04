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
 * when the query plan is send to the storage as json.
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
     * For example the boolean field _deleted.
     * TODO similar thing could be done for enums.
     */
    const sortIrrelevevantFields = new Set();
    Object.keys(selector).forEach(fieldName => {
        const schemaPart = getSchemaByObjectPath(schema, fieldName);
        if (
            schemaPart &&
            schemaPart.type === 'boolean' &&
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
        const queryPlan: RxQueryPlan = {
            index,
            startKeys,
            endKeys,
            inclusiveEnd,
            inclusiveStart,
            sortSatisfiedByIndex: !hasDescSorting && optimalSortIndexCompareString === index.filter(f => !sortIrrelevevantFields.has(f)).join(','),
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
     * Not satisfied if one or more operators are non-logical
     * operators that can never be satisfied by an index.
     */
    const selectorEntries = Object.entries(selector);
    const hasNonMatchingOperator = selectorEntries
        .find(([fieldName, operation]) => {
            if (!index.includes(fieldName)) {
                return true;
            }
            const hasNonLogicOperator = Object.entries(operation as any)
                .find(([op, _value]) => !LOGICAL_OPERATORS.has(op));
            return hasNonLogicOperator;
        });

    if (hasNonMatchingOperator) {
        return false;
    }

    /**
     * Not satisfied if contains $and or $or operations.
     */
    if (selector.$and || selector.$or) {
        return false;
    }



    // ensure all lower bound in index
    const satisfieldLowerBound: string[] = [];
    const lowerOperatorFieldNames = new Set<string>();
    for (const [fieldName, operation] of Object.entries(selector)) {
        if (!index.includes(fieldName)) {
            return false;
        }

        // If more then one logic op on the same field, we have to selector-match.
        const lowerLogicOps = Object.keys(operation as any).filter(key => LOWER_BOUND_LOGICAL_OPERATORS.has(key));
        if (lowerLogicOps.length > 1) {
            return false;
        }

        const hasLowerLogicOp = lowerLogicOps[0];
        if (hasLowerLogicOp) {
            lowerOperatorFieldNames.add(fieldName);
        }
        if (hasLowerLogicOp !== '$eq') {
            if (satisfieldLowerBound.length > 0) {
                return false;
            } else {
                satisfieldLowerBound.push(hasLowerLogicOp);
            }
        }
    }

    // ensure all upper bound in index
    const satisfieldUpperBound: string[] = [];
    const upperOperatorFieldNames = new Set<string>();
    for (const [fieldName, operation] of Object.entries(selector)) {
        if (!index.includes(fieldName)) {
            return false;
        }

        // If more then one logic op on the same field, we have to selector-match.
        const upperLogicOps = Object.keys(operation as any).filter(key => UPPER_BOUND_LOGICAL_OPERATORS.has(key));
        if (upperLogicOps.length > 1) {
            return false;
        }

        const hasUperLogicOp = upperLogicOps[0];
        if (hasUperLogicOp) {
            upperOperatorFieldNames.add(fieldName);
        }
        if (hasUperLogicOp !== '$eq') {
            if (satisfieldUpperBound.length > 0) {
                return false;
            } else {
                satisfieldUpperBound.push(hasUperLogicOp);
            }
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
            throw new Error('SNH');
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

    const nonMaxKeyCount = countUntilNotMatching(queryPlan.startKeys, keyValue => keyValue !== INDEX_MAX && keyValue !== INDEX_MIN);
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
