import { createQueryBuilder, OTHER_MANGO_ATTRIBUTES, OTHER_MANGO_OPERATORS } from './mquery/nosql-query-builder';
import { RxQueryBase, tunnelQueryCache } from '../../rx-query';
import { clone } from '../../plugins/utils';
import { runPluginHooks } from '../../hooks';

// if the query-builder plugin is used, we have to save its last path
var RXQUERY_OTHER_FLAG = 'queryBuilderPath';
export function runBuildingStep(rxQuery, functionName, value) {
  var queryBuilder = createQueryBuilder(clone(rxQuery.mangoQuery));
  if (rxQuery.other[RXQUERY_OTHER_FLAG]) {
    queryBuilder._path = rxQuery.other[RXQUERY_OTHER_FLAG];
  }
  queryBuilder[functionName](value); // run

  var queryBuilderJson = queryBuilder.toJSON();
  runPluginHooks('preCreateRxQuery', {
    op: rxQuery.op,
    queryObj: queryBuilderJson.query,
    collection: rxQuery.collection
  });
  var newQuery = new RxQueryBase(rxQuery.op, queryBuilderJson.query, rxQuery.collection);
  if (queryBuilderJson.path) {
    newQuery.other[RXQUERY_OTHER_FLAG] = queryBuilderJson.path;
  }
  var tunneled = tunnelQueryCache(newQuery);
  return tunneled;
}
export function applyBuildingStep(proto, functionName) {
  proto[functionName] = function (value) {
    return runBuildingStep(this, functionName, value);
  };
}
export * from './mquery/nosql-query-builder';
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