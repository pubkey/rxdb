import { MAX_CHAR } from './custom-index';
import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
import type {
    FilledMangoQuery,
    RxDocumentData,
    RxJsonSchema,
    RxQueryPlan,
    RxQueryPlanerOpts
} from './types';

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
    const indexes: string[][] = schema.indexes ? schema.indexes as any : [];
    const optimalSortIndex = query.sort.map(sortField => Object.keys(sortField)[0]);
    const optimalSortIndexCompareString = optimalSortIndex.join(',');

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
                    startKey: '',
                    endKey: MAX_CHAR,
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
                matcherOpts.startKey = '';
            }
            if (typeof matcherOpts.endKey === 'undefined') {
                matcherOpts.startKey = MAX_CHAR;
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
            sortFieldsSameAsIndexFields: optimalSortIndexCompareString === index.join(',')
        };
        const quality = rateQueryPlan(
            schema,
            query,
            queryPlan
        );
        if (
            quality > 0 &&
            quality > currentBestQuality
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
            startKeys: [''],
            endKeys: [MAX_CHAR],
            inclusiveEnd: true,
            inclusiveStart: true,
            sortFieldsSameAsIndexFields: optimalSortIndexCompareString === primaryPath
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
export function rateQueryPlan(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    query: FilledMangoQuery<RxDocType>,
    queryPlan: RxQueryPlan
): number {
    return 6;
}
