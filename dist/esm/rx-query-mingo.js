import { useOperators } from 'mingo/core';
import { Query } from 'mingo/query';
import { $project, $sort } from 'mingo/operators/pipeline';
import { $and, $not, $or, $nor } from 'mingo/operators/query/logical';
import { $eq, $ne, $gt, $gte, $lt, $lte, $nin, $in } from 'mingo/operators/query/comparison';
import { $regex, $mod } from 'mingo/operators/query/evaluation';
import { $elemMatch, $size } from 'mingo/operators/query/array';
import { $exists, $type } from 'mingo/operators/query/element';
var mingoInitDone = false;

/**
 * The MongoDB query library is huge and we do not need all the operators.
 * If you add an operator here, make sure that you properly add a test in
 * the file /test/unit/rx-storage-query-correctness.test.ts
 *
 * @link https://github.com/kofrasa/mingo#es6
 */
export function getMingoQuery(selector) {
  if (!mingoInitDone) {
    useOperators('pipeline', {
      $sort,
      $project
    });
    useOperators('query', {
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
      $type
    });
    mingoInitDone = true;
  }
  return new Query(selector);
}
//# sourceMappingURL=rx-query-mingo.js.map