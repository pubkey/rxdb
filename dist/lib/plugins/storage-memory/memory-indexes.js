"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addIndexesToInternalsState = addIndexesToInternalsState;
exports.getMemoryIndexName = getMemoryIndexName;
var _customIndex = require("../../custom-index");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _utils = require("../../plugins/utils");
function addIndexesToInternalsState(state, schema) {
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
  var useIndexes = !schema.indexes ? [] : schema.indexes.map(row => (0, _utils.toArray)(row));

  // we need this as default index
  useIndexes.push([primaryPath]);

  // we need this index for running cleanup()
  useIndexes.push(['_meta.lwt', primaryPath]);
  useIndexes.forEach(indexAr => {
    /**
     * Running a query will only return non-deleted documents
     * so all indexes must have the the deleted field as first index field.
     */
    indexAr.unshift('_deleted');
    state.byIndex[getMemoryIndexName(indexAr)] = {
      index: indexAr,
      docsWithIndex: [],
      getIndexableString: (0, _customIndex.getIndexableStringMonad)(schema, indexAr)
    };
  });

  // we need this index for the changes()
  var changesIndex = ['_meta.lwt', primaryPath];
  var indexName = getMemoryIndexName(changesIndex);
  state.byIndex[indexName] = {
    index: changesIndex,
    docsWithIndex: [],
    getIndexableString: (0, _customIndex.getIndexableStringMonad)(schema, changesIndex)
  };
}
function getMemoryIndexName(index) {
  return index.join(',');
}
//# sourceMappingURL=memory-indexes.js.map