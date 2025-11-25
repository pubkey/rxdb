"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMingoQuery = getMingoQuery;
var _core = require("mingo/core");
var _query = require("mingo/query");
var _pipeline = require("mingo/operators/pipeline");
var _logical = require("mingo/operators/query/logical");
var _comparison = require("mingo/operators/query/comparison");
var _evaluation = require("mingo/operators/query/evaluation");
var _array = require("mingo/operators/query/array");
var _element = require("mingo/operators/query/element");
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
    (0, _core.useOperators)('pipeline', {
      $sort: _pipeline.$sort,
      $project: _pipeline.$project
    });
    (0, _core.useOperators)('query', {
      $and: _logical.$and,
      $eq: _comparison.$eq,
      $elemMatch: _array.$elemMatch,
      $exists: _element.$exists,
      $gt: _comparison.$gt,
      $gte: _comparison.$gte,
      $in: _comparison.$in,
      $lt: _comparison.$lt,
      $lte: _comparison.$lte,
      $ne: _comparison.$ne,
      $nin: _comparison.$nin,
      $mod: _evaluation.$mod,
      $nor: _logical.$nor,
      $not: _logical.$not,
      $or: _logical.$or,
      $regex: _evaluation.$regex,
      $size: _array.$size,
      $type: _element.$type
    });
    mingoInitDone = true;
  }
  return new _query.Query(selector);
}
//# sourceMappingURL=rx-query-mingo.js.map