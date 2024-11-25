import type { DeterministicSortComparator, FilledMangoQuery, MangoQuery, PreparedQuery, QueryMatcher, RxDocument, RxDocumentData, RxJsonSchema, RxQuery } from './types/index.d.ts';
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
export declare function runQueryUpdateFunction<RxDocType, RxQueryResult>(rxQuery: RxQuery<RxDocType, RxQueryResult>, fn: (doc: RxDocument<RxDocType>) => Promise<RxDocument<RxDocType>>): Promise<RxQueryResult>;
/**
 * @returns a format of the query that can be used with the storage
 * when calling RxStorageInstance().query()
 */
export declare function prepareQuery<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, mutateableQuery: FilledMangoQuery<RxDocType>): PreparedQuery<RxDocType>;
