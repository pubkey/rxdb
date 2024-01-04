import { getIndexableStringMonad } from "../../custom-index.js";
import { getPrimaryFieldOfPrimaryKey } from "../../rx-schema-helper.js";
import { toArray } from "../../plugins/utils/index.js";
export function addIndexesToInternalsState(state, schema) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  var useIndexes = !schema.indexes ? [] : schema.indexes.map(row => toArray(row));

  // we need this index for running cleanup()
  useIndexes.push(['_deleted', '_meta.lwt', primaryPath]);
  useIndexes.forEach(indexAr => {
    state.byIndex[getMemoryIndexName(indexAr)] = {
      index: indexAr,
      docsWithIndex: [],
      getIndexableString: getIndexableStringMonad(schema, indexAr)
    };
  });
}
export function getMemoryIndexName(index) {
  return index.join(',');
}
//# sourceMappingURL=memory-indexes.js.map