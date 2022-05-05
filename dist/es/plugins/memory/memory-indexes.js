import { getIndexableStringMonad } from '../../custom-index';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
export function addIndexesToInternalsState(state, schema) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  var useIndexes = !schema.indexes ? [] : schema.indexes.map(function (row) {
    return Array.isArray(row) ? row.slice(0) : [row];
  }); // we need this as default index

  useIndexes.push([primaryPath]); // we need this index for running cleanup()

  useIndexes.push(['_meta.lwt', primaryPath]);
  useIndexes.forEach(function (indexAr) {
    /**
     * Running a query will only return non-deleted documents
     * so all indexes must have the the deleted field as first index field.
     */
    indexAr.unshift('_deleted');
    var indexName = getMemoryIndexName(indexAr);
    state.byIndex[indexName] = {
      index: indexAr,
      docsWithIndex: [],
      getIndexableString: getIndexableStringMonad(schema, indexAr)
    };
  }); // we need this index for the changes()

  var changesIndex = ['_meta.lwt', primaryPath];
  var indexName = getMemoryIndexName(changesIndex);
  state.byIndex[indexName] = {
    index: changesIndex,
    docsWithIndex: [],
    getIndexableString: getIndexableStringMonad(schema, changesIndex)
  };
}
export function getMemoryIndexName(index) {
  return index.join(',');
}
//# sourceMappingURL=memory-indexes.js.map