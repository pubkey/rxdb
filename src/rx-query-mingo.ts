import { useOperators, OperatorType } from 'mingo/core';
import { Query } from 'mingo/query';
import type {
    MangoQuerySelector,
    RxAggregationOperation
} from './types/index.d.ts';
import {
    $project,
    $sort
} from 'mingo/operators/pipeline';
import {
    $and,
    $not,
    $or,
    $nor
} from 'mingo/operators/query/logical';
import {
    $eq,
    $ne,
    $gt,
    $gte,
    $lt,
    $lte,
    $nin,
    $in
} from 'mingo/operators/query/comparison';
import {
    $regex,
    $mod
} from 'mingo/operators/query/evaluation';
import {
    $elemMatch,
    $size
} from 'mingo/operators/query/array';
import {
    $exists,
    $type
} from 'mingo/operators/query/element';

let mingoQueryInitDone = false;

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
    if (!mingoQueryInitDone) {

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
        mingoQueryInitDone = true;
    }
    return new Query(selector as any);
}


import { Aggregator } from 'mingo/aggregator';
import { $match, $group } from 'mingo/operators/pipeline';
import { $min } from 'mingo/operators/accumulator';

let mingoAggregatorInitDone = false;
export function getMingoAggregator(pipeline: RxAggregationOperation[]) {
    if (!mingoAggregatorInitDone) {
        useOperators(OperatorType.PIPELINE, { $match, $group });
        useOperators(OperatorType.ACCUMULATOR, { $min });
        mingoAggregatorInitDone = true;
    }
    const aggregator = new Aggregator(pipeline);
    return aggregator;
}
