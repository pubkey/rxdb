"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMingoQuery = getMingoQuery;
var _core = require("mingo/core");
var _query = require("mingo/query");
var _pipeline = require("mingo/operators/pipeline");
var _query2 = require("mingo/operators/query");
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
      $sort: _pipeline.$sort,
      $project: _pipeline.$project
    });
    (0, _core.useOperators)(_core.OperatorType.QUERY, {
      $and: _query2.$and,
      $eq: _query2.$eq,
      $elemMatch: _query2.$elemMatch,
      $exists: _query2.$exists,
      $gt: _query2.$gt,
      $gte: _query2.$gte,
      $in: _query2.$in,
      $lt: _query2.$lt,
      $lte: _query2.$lte,
      $ne: _query2.$ne,
      $nin: _query2.$nin,
      $mod: _query2.$mod,
      $nor: _query2.$nor,
      $not: _query2.$not,
      $or: _query2.$or,
      $regex: _query2.$regex,
      $size: _query2.$size,
      $type: _query2.$type
    });
    mingoInitDone = true;
  }
  return new _query.Query(selector);
}
//# sourceMappingURL=rx-query-mingo.js.map