import { createQueryBuilder, OTHER_MANGO_ATTRIBUTES, OTHER_MANGO_OPERATORS } from "./mquery/nosql-query-builder.js";
import { createRxQuery } from "../../rx-query.js";
import { clone } from "../../plugins/utils/index.js";
import { overwritable } from "../../overwritable.js";
import { newRxError } from "../../rx-error.js";

// if the query-builder plugin is used, we have to save its last path
var RXQUERY_OTHER_FLAG = 'queryBuilderPath';
export function runBuildingStep(rxQuery, functionName, value) {
  var queryBuilder = createQueryBuilder(clone(rxQuery.mangoQuery), rxQuery.other[RXQUERY_OTHER_FLAG]);
  queryBuilder[functionName](value); // run

  var queryBuilderJson = queryBuilder.toJSON();
  return createRxQuery(rxQuery.op, queryBuilderJson.query, rxQuery.collection, {
    ...rxQuery.other,
    [RXQUERY_OTHER_FLAG]: queryBuilderJson.path
  });
}
export function applyBuildingStep(proto, functionName) {
  proto[functionName] = function (value) {
    if (overwritable.isDevMode() && this.op === 'findByIds') {
      throw newRxError('QU17', {
        collection: this.collection.name,
        query: this.mangoQuery
      });
    }
    return runBuildingStep(this, functionName, value);
  };
}
export * from "./mquery/nosql-query-builder.js";
export var RxDBQueryBuilderPlugin = {
  name: 'query-builder',
  rxdb: true,
  prototypes: {
    RxQuery(proto) {
      ['where', 'equals', 'eq', 'or', 'nor', 'and', 'mod', 'exists', 'elemMatch', 'sort'].forEach(attribute => {
        applyBuildingStep(proto, attribute);
      });
      OTHER_MANGO_ATTRIBUTES.forEach(attribute => {
        applyBuildingStep(proto, attribute);
      });
      OTHER_MANGO_OPERATORS.forEach(operator => {
        applyBuildingStep(proto, operator);
      });
    }
  }
};
//# sourceMappingURL=index.js.map