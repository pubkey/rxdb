import type { DeterministicSortComparator, FilledMangoQuery, MangoQuery, QueryMatcher, RxDocumentData, RxJsonSchema } from './types/index.d.ts';
/**
 * Normalize the query to ensure we have all fields set
 * and queries that represent the same query logic are detected as equal by the caching.
 */
export declare function normalizeMangoQuery<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, mangoQuery: MangoQuery<RxDocType>): FilledMangoQuery<RxDocType>;
/**
 * Returns the sort-comparator,
 * which is able to sort documents in the same way
 * a query over the db would do.
 */
export declare function getSortComparator<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, query: FilledMangoQuery<RxDocType>): DeterministicSortComparator<RxDocType>;
/**
 * Returns a function
 * that can be used to check if a document
 * matches the query.
 */
export declare function getQueryMatcher<RxDocType>(_schema: RxJsonSchema<RxDocType> | RxJsonSchema<RxDocumentData<RxDocType>>, query: FilledMangoQuery<RxDocType>): QueryMatcher<RxDocumentData<RxDocType>>;
