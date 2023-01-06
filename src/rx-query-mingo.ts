import { useOperators, OperatorType } from 'mingo/core';
import { Query } from 'mingo/query';
import type { MangoQuerySelector } from './types';
import { $sort, $project } from 'mingo/operators/pipeline';
import {
    $and,
    $eq,
    $elemMatch,
    $exists,
    $gt,
    $gte,
    $in,
    $lt,
    $lte,
    $ne,
    $nin,
    $mod,
    $nor,
    $not,
    $or,
    $regex,
    $size,
    $type,
} from 'mingo/operators/query';

let mingoInitDone = false;


/**
 * The MongoDB query library is huge and we do not need all the operators.
 * If you add an operator here, make sure that you properly add a test in
 * the file /test/unit/rx-storage-query-correctness.test.ts
 *
 * @link https://github.com/kofrasa/mingo#es6
 */
export function getMingoQuery<RxDocType>(
    selector?: MangoQuerySelector<RxDocType>
) {
    if (!mingoInitDone) {

        useOperators(OperatorType.PIPELINE, {
            $sort,
            $project
        } as any);
        useOperators(OperatorType.QUERY, {
            $and,
            $eq,
            $elemMatch,
            $exists,
            $gt,
            $gte,
            $in,
            $lt,
            $lte,
            $ne,
            $nin,
            $mod,
            $nor,
            $not,
            $or,
            $regex,
            $size,
            $type,
        } as any);
        mingoInitDone = true;
    }
    return new Query(selector as any);
}
