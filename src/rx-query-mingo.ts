/**
 * TODO
 * FIX @link https://github.com/kofrasa/mingo/issues/308
 */
import { useOperators, OperatorType } from 'mingo/core';
import { Query } from 'mingo/query';
import type { MangoQuerySelector } from './types';
import { $project } from 'mingo/operators/pipeline/project';
import { $sort } from 'mingo/operators/pipeline/sort';
import { $and } from 'mingo/operators/query/logical/and';
import { $not } from 'mingo/operators/query/logical/not';
import { $or } from 'mingo/operators/query/logical/or';
import { $nor } from 'mingo/operators/query/logical/nor';
import { $eq } from 'mingo/operators/query/comparison/eq';
import { $ne } from 'mingo/operators/query/comparison/ne';
import { $gt } from 'mingo/operators/query/comparison/gt';
import { $gte } from 'mingo/operators/query/comparison/gte';
import { $lt } from 'mingo/operators/query/comparison/lt';
import { $lte } from 'mingo/operators/query/comparison/lte';
import { $regex } from 'mingo/operators/query/evaluation/regex';
import { $mod } from 'mingo/operators/query/evaluation/mod';
import { $elemMatch } from 'mingo/operators/query/array/elemMatch';
import { $exists } from 'mingo/operators/query/element/exists';
import { $nin } from 'mingo/operators/query/comparison/nin';
import { $in } from 'mingo/operators/query/comparison/in';
import { $size } from 'mingo/operators/query/array/size';
import { $type } from 'mingo/operators/expression/type/type';

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
