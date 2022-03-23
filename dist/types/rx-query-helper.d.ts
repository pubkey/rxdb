import type { FilledMangoQuery, MangoQuery, RxJsonSchema } from './types';
/**
 * Normalize the query to ensure we have all fields set
 * and queries that represent the same query logic are detected as equal by the caching.
 */
export declare function normalizeMangoQuery<RxDocType>(schema: RxJsonSchema<RxDocType>, mangoQuery: MangoQuery<RxDocType>): FilledMangoQuery<RxDocType>;
