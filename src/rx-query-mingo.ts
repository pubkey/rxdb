import { Context } from 'mingo/core';
import { Query } from 'mingo/query';
import type { MangoQuerySelector } from './types/index.d.ts';
import {
    $project,
    $sort
} from 'mingo/operators/pipeline';
import {

} from 'mingo/operators/expression';
import {
} from 'mingo/operators/projection';
import {
    $elemMatch,
    $eq,
    $nor,
    $exists,
    $regex,
    $ne,
    $gte,
    $lt,
    $lte,
    $nin,
    $in,
    $gt,
    $or,
    $and,
    $not,
    $type,
    $size,
    $mod
} from 'mingo/operators/query';
import {
} from 'mingo/operators/query/evaluation';
import {
} from 'mingo/operators/query/array';
import {
} from 'mingo/operators/query/element';

let mingoInitDone = false;
let context: Context;


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
        context = Context.init({
            pipeline: {
                $sort,
                $project
            },
            query: {
                $elemMatch,
                $eq,
                $nor,
                $exists,
                $regex,
                $and,
                $gt,
                $gte,
                $in,
                $lt,
                $lte,
                $ne,
                $nin,
                $mod,
                $not,
                $or,
                $size,
                $type,
            },
        });
        mingoInitDone = true;
    }

    return new Query(selector as any, {
        context
    });
}
