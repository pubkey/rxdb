"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMingoQuery = getMingoQuery;
var _core = require("mingo/core");
var _query = require("mingo/query");
var _project = require("mingo/operators/pipeline/project");
var _sort = require("mingo/operators/pipeline/sort");
var _and = require("mingo/operators/query/logical/and");
var _not = require("mingo/operators/query/logical/not");
var _or = require("mingo/operators/query/logical/or");
var _nor = require("mingo/operators/query/logical/nor");
var _eq = require("mingo/operators/query/comparison/eq");
var _ne = require("mingo/operators/query/comparison/ne");
var _gt = require("mingo/operators/query/comparison/gt");
var _gte = require("mingo/operators/query/comparison/gte");
var _lt = require("mingo/operators/query/comparison/lt");
var _lte = require("mingo/operators/query/comparison/lte");
var _regex = require("mingo/operators/query/evaluation/regex");
var _mod = require("mingo/operators/query/evaluation/mod");
var _elemMatch = require("mingo/operators/query/array/elemMatch");
var _exists = require("mingo/operators/query/element/exists");
var _nin = require("mingo/operators/query/comparison/nin");
var _in = require("mingo/operators/query/comparison/in");
var _size = require("mingo/operators/query/array/size");
var _type = require("mingo/operators/expression/type/type");
var mingoInitDone = false;

/**
 * The MongoDB query library is huge and we do not need all the operators.
 * If you add an operator here, make sure that you properly add a test in
 * the file /test/unit/rx-storage-query-correctness.test.ts
 *
 * @link https://github.com/kofrasa/mingo#es6
 */
function getMingoQuery(selector) {
  if (!mingoInitDone) {
    (0, _core.useOperators)(_core.OperatorType.PIPELINE, {
      $sort: _sort.$sort,
      $project: _project.$project
    });
    (0, _core.useOperators)(_core.OperatorType.QUERY, {
      $and: _and.$and,
      $eq: _eq.$eq,
      $elemMatch: _elemMatch.$elemMatch,
      $exists: _exists.$exists,
      $gt: _gt.$gt,
      $gte: _gte.$gte,
      $in: _in.$in,
      $lt: _lt.$lt,
      $lte: _lte.$lte,
      $ne: _ne.$ne,
      $nin: _nin.$nin,
      $mod: _mod.$mod,
      $nor: _nor.$nor,
      $not: _not.$not,
      $or: _or.$or,
      $regex: _regex.$regex,
      $size: _size.$size,
      $type: _type.$type
    });
    mingoInitDone = true;
  }
  return new _query.Query(selector);
}
//# sourceMappingURL=rx-query-mingo.js.map