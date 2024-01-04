"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addIndexesToInternalsState = addIndexesToInternalsState;
exports.getMemoryIndexName = getMemoryIndexName;
var _customIndex = require("../../custom-index.js");
var _rxSchemaHelper = require("../../rx-schema-helper.js");
var _index = require("../../plugins/utils/index.js");
function addIndexesToInternalsState(state, schema) {
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
  var useIndexes = !schema.indexes ? [] : schema.indexes.map(row => (0, _index.toArray)(row));

  // we need this index for running cleanup()
  useIndexes.push(['_deleted', '_meta.lwt', primaryPath]);
  useIndexes.forEach(indexAr => {
    state.byIndex[getMemoryIndexName(indexAr)] = {
      index: indexAr,
      docsWithIndex: [],
      getIndexableString: (0, _customIndex.getIndexableStringMonad)(schema, indexAr)
    };
  });
}
function getMemoryIndexName(index) {
  return index.join(',');
}
//# sourceMappingURL=memory-indexes.js.map