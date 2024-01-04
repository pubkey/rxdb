import { Query } from 'mingo/query';
import type { MangoQuerySelector } from './types/index.d.ts';
/**
 * The MongoDB query library is huge and we do not need all the operators.
 * If you add an operator here, make sure that you properly add a test in
 * the file /test/unit/rx-storage-query-correctness.test.ts
 *
 * @link https://github.com/kofrasa/mingo#es6
 */
export declare function getMingoQuery<RxDocType>(selector?: MangoQuerySelector<RxDocType>): Query;
