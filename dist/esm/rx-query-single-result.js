import _createClass from "@babel/runtime/helpers/createClass";
import { mapDocumentsDataToCacheDocs } from "./doc-cache.js";
import { now, overwriteGetterForCaching } from "./plugins/utils/index.js";
/**
 * RxDB needs the query results in multiple formats.
 * Sometimes as a Map or an array with only the documentData.
 * For better performance we work with this class
 * that initializes stuff lazily so that
 * we can directly work with the query results after RxQuery.exec()
 */
export var RxQuerySingleResult = /*#__PURE__*/function () {
  /**
   * Time at which the current _result state was created.
   * Used to determine if the result set has changed since X
   * so that we do not emit the same result multiple times on subscription.
   */

  function RxQuerySingleResult(collection,
  // only used internally, do not use outside, use this.docsData instead
  docsDataFromStorageInstance,
  // can be overwritten for count-queries
  count) {
    this.time = now();
    this.collection = collection;
    this.count = count;
    this.documents = mapDocumentsDataToCacheDocs(this.collection._docCache, docsDataFromStorageInstance);
  }

  /**
   * Instead of using the newResultData in the result cache,
   * we directly use the objects that are stored in the RxDocument
   * to ensure we do not store the same data twice and fill up the memory.
   * @overwrites itself with the actual value
   */
  return _createClass(RxQuerySingleResult, [{
    key: "docsData",
    get: function () {
      return overwriteGetterForCaching(this, 'docsData', this.documents.map(d => d._data));
    }

    // A key->document map, used in the event reduce optimization.
  }, {
    key: "docsDataMap",
    get: function () {
      var map = new Map();
      this.documents.forEach(d => {
        map.set(d.primary, d._data);
      });
      return overwriteGetterForCaching(this, 'docsDataMap', map);
    }
  }, {
    key: "docsMap",
    get: function () {
      var map = new Map();
      var documents = this.documents;
      for (var i = 0; i < documents.length; i++) {
        var doc = documents[i];
        map.set(doc.primary, doc);
      }
      return overwriteGetterForCaching(this, 'docsMap', map);
    }
  }]);
}();
//# sourceMappingURL=rx-query-single-result.js.map