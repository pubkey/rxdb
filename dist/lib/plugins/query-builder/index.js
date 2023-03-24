"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  runBuildingStep: true,
  applyBuildingStep: true,
  RxDBQueryBuilderPlugin: true
};
exports.RxDBQueryBuilderPlugin = void 0;
exports.applyBuildingStep = applyBuildingStep;
exports.runBuildingStep = runBuildingStep;
var _nosqlQueryBuilder = require("./mquery/nosql-query-builder");
Object.keys(_nosqlQueryBuilder).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _nosqlQueryBuilder[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _nosqlQueryBuilder[key];
    }
  });
});
var _rxQuery = require("../../rx-query");
var _utils = require("../../plugins/utils");
// if the query-builder plugin is used, we have to save its last path
var RXQUERY_OTHER_FLAG = 'queryBuilderPath';
function runBuildingStep(rxQuery, functionName, value) {
  var queryBuilder = (0, _nosqlQueryBuilder.createQueryBuilder)((0, _utils.clone)(rxQuery.mangoQuery), rxQuery.other[RXQUERY_OTHER_FLAG]);
  queryBuilder[functionName](value); // run

  var queryBuilderJson = queryBuilder.toJSON();
  return (0, _rxQuery.createRxQuery)(rxQuery.op, queryBuilderJson.query, rxQuery.collection, {
    ...rxQuery.other,
    [RXQUERY_OTHER_FLAG]: queryBuilderJson.path
  });
}
function applyBuildingStep(proto, functionName) {
  proto[functionName] = function (value) {
    return runBuildingStep(this, functionName, value);
  };
}
var RxDBQueryBuilderPlugin = {
  name: 'query-builder',
  rxdb: true,
  prototypes: {
    RxQuery(proto) {
      ['where', 'equals', 'eq', 'or', 'nor', 'and', 'mod', 'exists', 'elemMatch', 'sort'].forEach(attribute => {
        applyBuildingStep(proto, attribute);
      });
      _nosqlQueryBuilder.OTHER_MANGO_ATTRIBUTES.forEach(attribute => {
        applyBuildingStep(proto, attribute);
      });
      _nosqlQueryBuilder.OTHER_MANGO_OPERATORS.forEach(operator => {
        applyBuildingStep(proto, operator);
      });
    }
  }
};
exports.RxDBQueryBuilderPlugin = RxDBQueryBuilderPlugin;
//# sourceMappingURL=index.js.map