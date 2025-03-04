import { LOGICAL_OPERATORS, getQueryPlan } from './query-planner.ts';
import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper.ts';
import type {
    DeepReadonly,
    DeterministicSortComparator,
    FilledMangoQuery,
    MangoQuery,
    MangoQuerySortDirection,
    PreparedQuery,
    QueryMatcher,
    RxDocument,
    RxDocumentData,
    RxJsonSchema,
    RxQuery
} from './types/index.d.ts';
import {
    clone,
    firstPropertyNameOfObject,
    toArray,
    isMaybeReadonlyArray,
    flatClone,
    objectPathMonad,
    ObjectPathMonadFunction
} from './plugins/utils/index.ts';
import {
    compare as mingoSortComparator
} from 'mingo/util';
import { newRxError } from './rx-error.ts';
import { getMingoQuery } from './rx-query-mingo.ts';

/**
 * Normalize the query to ensure we have all fields set
 * and queries that represent the same query logic are detected as equal by the caching.
 */
export function normalizeMangoQuery<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    mangoQuery: MangoQuery<RxDocType>
): FilledMangoQuery<RxDocType> {
    const primaryKey: string = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
    mangoQuery = flatClone(mangoQuery);

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
             * If no good index was found as default sort-order,
             * just use the first index of the schema.
             * If no index is in the schema, use the default-index which
             * is created by RxDB ONLY if there is no other index defined.
             */
            if (!normalizedMangoQuery.sort) {
                if (schema.indexes && schema.indexes.length > 0) {
                    const firstIndex = schema.indexes[0];
                    const useIndex = isMaybeReadonlyArray(firstIndex) ? firstIndex : [firstIndex];
                    normalizedMangoQuery.sort = useIndex.map(field => ({ [field]: 'asc' })) as any;
                } else {
                    normalizedMangoQuery.sort = [{ [primaryKey]: 'asc' }] as any;
                }
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

/**
 * Returns the sort-comparator,
 * which is able to sort documents in the same way
 * a query over the db would do.
 */
export function getSortComparator<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    query: FilledMangoQuery<RxDocType>
): DeterministicSortComparator<RxDocType> {
    if (!query.sort) {
        throw newRxError('SNH', { query });
    }
    const sortParts: {
        key: string;
        direction: MangoQuerySortDirection;
        getValueFn: ObjectPathMonadFunction<RxDocType>;
    }[] = [];
    query.sort.forEach(sortBlock => {
        const key = Object.keys(sortBlock)[0];
        const direction = Object.values(sortBlock)[0];
        sortParts.push({
            key,
            direction,
            getValueFn: objectPathMonad(key)
        });
    });
    const fun: DeterministicSortComparator<RxDocType> = (a: RxDocType, b: RxDocType) => {
        for (let i = 0; i < sortParts.length; ++i) {
            const sortPart = sortParts[i];
            const valueA = sortPart.getValueFn(a);
            const valueB = sortPart.getValueFn(b);
            if (valueA !== valueB) {
                const ret = sortPart.direction === 'asc' ? mingoSortComparator(valueA, valueB) : mingoSortComparator(valueB, valueA);
                return ret as any;
            }
        }
    };

    return fun;
}


/**
 * Returns a function
 * that can be used to check if a document
 * matches the query.
 */
export function getQueryMatcher<RxDocType>(
    _schema: RxJsonSchema<RxDocType> | RxJsonSchema<RxDocumentData<RxDocType>>,
    query: FilledMangoQuery<RxDocType>
): QueryMatcher<RxDocumentData<RxDocType>> {
    if (!query.sort) {
        throw newRxError('SNH', { query });
    }

    const mingoQuery = getMingoQuery(query.selector as any);
    const fun: QueryMatcher<RxDocumentData<RxDocType>> = (doc: RxDocumentData<RxDocType> | DeepReadonly<RxDocumentData<RxDocType>>) => {
        return mingoQuery.test(doc);
    };
    return fun;
}


export async function runQueryUpdateFunction<RxDocType, RxQueryResult>(
    rxQuery: RxQuery<RxDocType, RxQueryResult>,
    fn: (doc: RxDocument<RxDocType>) => Promise<RxDocument<RxDocType>>
): Promise<RxQueryResult> {
    const docs = await rxQuery.exec();
    if (!docs) {
        // only findOne() queries can return null
        return null as any;
    }
    if (Array.isArray(docs)) {
        return Promise.all(
            docs.map(doc => fn(doc))
        ) as any;
    } else if (docs instanceof Map) {
        return Promise.all(
            [...docs.values()].map((doc) => fn(doc))
        ) as any;
    } else {
        // via findOne()
        const result = await fn(docs as any);
        return result as any;
    }
}

/**
 * @returns a format of the query that can be used with the storage
 * when calling RxStorageInstance().query()
 */
export function prepareQuery<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    mutateableQuery: FilledMangoQuery<RxDocType>
): PreparedQuery<RxDocType> {
    if (!mutateableQuery.sort) {
        throw newRxError('SNH', {
            query: mutateableQuery
        });
    }

    /**
     * Store the query plan together with the
     * prepared query to save performance.
     */
    const queryPlan = getQueryPlan(
        schema,
        mutateableQuery
    );

    return {
        query: mutateableQuery,
        queryPlan
    };
}
