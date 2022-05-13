import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
import type {
    FilledMangoQuery,
    RxDocumentData,
    RxJsonSchema,
    RxQueryPlan,
    RxQueryPlanerOpts
} from './types';


export const INDEX_MAX = String.fromCharCode(65535);
export const INDEX_MIN = -Infinity;

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
    const primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
    const selector = query.selector;

    let indexes: string[][] = schema.indexes ? schema.indexes.slice(0) as any : [];
    if (query.index) {
        indexes = [query.index];
    } else {
        indexes.push([primaryPath]);
    }

    const optimalSortIndex = query.sort.map(sortField => Object.keys(sortField)[0]);
    const optimalSortIndexCompareString = optimalSortIndex.join(',');
    /**
     * Most storages do not support descending indexes
     * so having a 'desc' in the sorting, means we always have to re-sort the results.
     */
    const hasDescSorting = !!query.sort.find(sortField => Object.values(sortField)[0] === 'desc')

    let currentBestQuality = -1;
    let currentBestQueryPlan: RxQueryPlan | undefined;

    indexes.forEach((index) => {
        const opts: RxQueryPlanerOpts[] = index.map(indexField => {
            const matcher = selector[indexField];
            const operators = matcher ? Object.keys(matcher) : [];
            if (
                !matcher ||
                !operators.length
            ) {
                return {
                    startKey: INDEX_MIN,
                    endKey: INDEX_MAX,
                    inclusiveStart: true,
                    inclusiveEnd: true
                };
            }

            let matcherOpts: RxQueryPlanerOpts = {} as any;
            operators.forEach(operator => {
                if (isLogicalOperator(operator)) {
                    const operatorValue = matcher[operator];
                    const partialOpts = getMatcherQueryOpts(operator, operatorValue);
                    matcherOpts = Object.assign(matcherOpts, partialOpts);
                }
            });

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

            return matcherOpts;
        });

        const queryPlan: RxQueryPlan = {
            index,
            startKeys: opts.map(opt => opt.startKey),
            endKeys: opts.map(opt => opt.endKey),
            inclusiveEnd: !opts.find(opt => !opt.inclusiveEnd),
            inclusiveStart: !opts.find(opt => !opt.inclusiveStart),
            sortFieldsSameAsIndexFields: !hasDescSorting && optimalSortIndexCompareString === index.join(',')
        };
        const quality = rateQueryPlan(
            schema,
            query,
            queryPlan
        );
        if (
            (
                quality > 0 &&
                quality > currentBestQuality
            ) ||
            query.index
        ) {
            currentBestQuality = quality;
            currentBestQueryPlan = queryPlan;
        }
    });

    /**
     * No index found, use the default index
     */
    if (!currentBestQueryPlan) {
        return {
            index: [primaryPath],
            startKeys: [INDEX_MIN],
            endKeys: [INDEX_MAX],
            inclusiveEnd: true,
            inclusiveStart: true,
            sortFieldsSameAsIndexFields: !hasDescSorting && optimalSortIndexCompareString === primaryPath
        }
    }

    return currentBestQueryPlan;
}

const LOGICAL_OPERATORS = new Set(['$eq', '$gt', '$gte', '$lt', '$lte']);
export function isLogicalOperator(operator: string): boolean {
    return LOGICAL_OPERATORS.has(operator);
}

export function getMatcherQueryOpts(operator: string, operatorValue: any): Partial<RxQueryPlanerOpts> {
    switch (operator) {
        case '$eq':
            return {
                startKey: operatorValue,
                endKey: operatorValue
            };
        case '$lte':
            return {
                endKey: operatorValue
            };
        case '$gte':
            return {
                startKey: operatorValue
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

    const pointsPerMatchingKey = 10;
    const idxOfFirstMinStartKey = queryPlan.startKeys.findIndex(keyValue => keyValue === INDEX_MIN);
    if (idxOfFirstMinStartKey > 0) {
        quality = quality + (idxOfFirstMinStartKey * pointsPerMatchingKey)
    }

    const idxOfFirstMaxEndKey = queryPlan.endKeys.findIndex(keyValue => keyValue === INDEX_MAX);
    if (idxOfFirstMaxEndKey > 0) {
        quality = quality + (idxOfFirstMaxEndKey * pointsPerMatchingKey)
    }

    const pointsIfNoReSortMustBeDone = 5;
    if (queryPlan.sortFieldsSameAsIndexFields) {
        quality = quality + pointsIfNoReSortMustBeDone;
    }

    return quality;
}
