import type { DeterministicSortComparator } from 'event-reduce-js';
import type { RxDocumentData, RxJsonSchema, RxStorageStatics, MangoQuery } from './types';
/**
 * Most RxStorage implementations use these static functions.
 * But you can use anything that implements the interface,
 * for example if your underlying database already has a query engine.
 */
export declare const RxStorageDefaultStatics: RxStorageStatics;
/**
 * Default mango query sort comparator.
 * @hotPath
 */
export declare function getDefaultSortComparator<RxDocType>(_schema: RxJsonSchema<RxDocumentData<RxDocType>>, query: MangoQuery<RxDocType>): DeterministicSortComparator<RxDocType>;
