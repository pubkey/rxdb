import { Context } from 'mingo/core';
import { Query } from 'mingo/query';
import { resolve } from 'mingo/util';
import type { MangoQuerySelector } from './types/index.d.ts';
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
    $size
} from 'mingo/operators/query';

/**
 * The $mod operator of mingo also matches null values
 * because null % 5 === 0 in JavaScript.
 * Like in MongoDB, $mod must only match numbers.
 */
function $modNumbersOnly(selector: string, value: any) {
    return (obj: any) => {
        if (!Array.isArray(value) || value.length !== 2) {
            return false;
        }
        const lhs = resolve(obj, selector, { unwrapArray: true });
        const values = Array.isArray(lhs) ? lhs : [lhs];
        return values.some(v => typeof v === 'number' && v % value[0] === value[1]);
    };
}

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
                $mod: $modNumbersOnly as any,
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
