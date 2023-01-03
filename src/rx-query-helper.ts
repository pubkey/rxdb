import { LOGICAL_OPERATORS } from './query-planner';
import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
import type {
    FilledMangoQuery,
    MangoQuery,
    RxDocumentData,
    RxJsonSchema
} from './types';
import {
    clone,
    firstPropertyNameOfObject,
    toArray,
    isMaybeReadonlyArray
} from './plugins/utils';

/**
 * Normalize the query to ensure we have all fields set
 * and queries that represent the same query logic are detected as equal by the caching.
 */
export function normalizeMangoQuery<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    mangoQuery: MangoQuery<RxDocType>
): FilledMangoQuery<RxDocType> {
    const primaryKey: string = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
    const normalizedMangoQuery: FilledMangoQuery<RxDocType> = clone(mangoQuery) as any;

    if (typeof normalizedMangoQuery.skip !== 'number') {
        normalizedMangoQuery.skip = 0;
    }

    if (!normalizedMangoQuery.selector) {
        normalizedMangoQuery.selector = {};
    } else {
        normalizedMangoQuery.selector = normalizedMangoQuery.selector;
        /**
         * In mango query, it is possible to have an
         * equals comparison by directly assigning a value
         * to a property, without the '$eq' operator.
         * Like:
         * selector: {
         *   foo: 'bar'
         * }
         * For normalization, we have to normalize this
         * so our checks can perform properly.
         *
         *
         * TODO this must work recursive with nested queries that
         * contain multiple selectors via $and or $or etc.
         */
        Object
            .entries(normalizedMangoQuery.selector)
            .forEach(([field, matcher]) => {
                if (typeof matcher !== 'object' || matcher === null) {
                    (normalizedMangoQuery as any).selector[field] = {
                        $eq: matcher
                    };
                }
            });
    }

    /**
     * Ensure that if an index is specified,
     * the primaryKey is inside of it.
     */
    if (normalizedMangoQuery.index) {
        const indexAr = toArray(normalizedMangoQuery.index);
        if (!indexAr.includes(primaryKey)) {
            indexAr.push(primaryKey);
        }
        normalizedMangoQuery.index = indexAr;
    }

    /**
     * To ensure a deterministic sorting,
     * we have to ensure the primary key is always part
     * of the sort query.
     * Primary sorting is added as last sort parameter,
     * similar to how we add the primary key to indexes that do not have it.
     *
     */
    if (!normalizedMangoQuery.sort) {
        /**
         * If no sort is given at all,
         * we can assume that the user does not care about sort order at al.
         *
         * we cannot just use the primary key as sort parameter
         * because it would likely cause the query to run over the primary key index
         * which has a bad performance in most cases.
         */
        if (normalizedMangoQuery.index) {
            normalizedMangoQuery.sort = normalizedMangoQuery.index.map((field: string) => {
                return { [field as any]: 'asc' } as any;
            });
        } else {
            /**
             * Find the index that best matches the fields with the logical operators
             */
            if (schema.indexes) {
                const fieldsWithLogicalOperator: Set<string> = new Set();
                Object.entries(normalizedMangoQuery.selector).forEach(([field, matcher]) => {
                    let hasLogical = false;
                    if (typeof matcher === 'object' && matcher !== null) {
                        hasLogical = !!Object.keys(matcher).find(operator => LOGICAL_OPERATORS.has(operator));
                    } else {
                        hasLogical = true;
                    }
                    if (hasLogical) {
                        fieldsWithLogicalOperator.add(field);
                    }
                });


                let currentFieldsAmount = -1;
                let currentBestIndexForSort: string[] | readonly string[] | undefined;
                schema.indexes.forEach(index => {
                    const useIndex = isMaybeReadonlyArray(index) ? index : [index];
                    const firstWrongIndex = useIndex.findIndex(indexField => !fieldsWithLogicalOperator.has(indexField));
                    if (
                        firstWrongIndex > 0 &&
                        firstWrongIndex > currentFieldsAmount
                    ) {
                        currentFieldsAmount = firstWrongIndex;
                        currentBestIndexForSort = useIndex;
                    }
                });
                if (currentBestIndexForSort) {
                    normalizedMangoQuery.sort = currentBestIndexForSort.map((field: string) => {
                        return { [field as any]: 'asc' } as any;
                    });
                }

            }

            /**
             * Fall back to the primary key as sort order
             * if no better one has been found
             */
            if (!normalizedMangoQuery.sort) {
                normalizedMangoQuery.sort = [{ [primaryKey]: 'asc' }] as any;
            }
        }
    } else {
        const isPrimaryInSort = normalizedMangoQuery.sort
            .find(p => firstPropertyNameOfObject(p) === primaryKey);
        if (!isPrimaryInSort) {
            normalizedMangoQuery.sort = normalizedMangoQuery.sort.slice(0);
            normalizedMangoQuery.sort.push({ [primaryKey]: 'asc' } as any);
        }
    }

    return normalizedMangoQuery;
}
