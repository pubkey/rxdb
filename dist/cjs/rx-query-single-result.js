"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxQuerySingleResult = void 0;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _docCache = require("./doc-cache.js");
var _index = require("./plugins/utils/index.js");
/**
 * RxDB needs the query results in multiple formats.
 * Sometimes as a Map or an array with only the documentData.
 * For better performance we work with this class
 * that initializes stuff lazily so that
 * we can directly work with the query results after RxQuery.exec()
 */
var RxQuerySingleResult = exports.RxQuerySingleResult = /*#__PURE__*/function () {
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
    this.time = (0, _index.now)();
    this.collection = collection;
    this.count = count;
    this.documents = (0, _docCache.mapDocumentsDataToCacheDocs)(this.collection._docCache, docsDataFromStorageInstance);
  }

  /**
   * Instead of using the newResultData in the result cache,
   * we directly use the objects that are stored in the RxDocument
   * to ensure we do not store the same data twice and fill up the memory.
   * @overwrites itself with the actual value
   */
  return (0, _createClass2.default)(RxQuerySingleResult, [{
    key: "docsData",
    get: function () {
      return (0, _index.overwriteGetterForCaching)(this, 'docsData', this.documents.map(d => d._data));
    }

    // A key->document map, used in the event reduce optimization.
  }, {
    key: "docsDataMap",
    get: function () {
      var map = new Map();
      this.documents.forEach(d => {
        map.set(d.primary, d._data);
      });
      return (0, _index.overwriteGetterForCaching)(this, 'docsDataMap', map);
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
      return (0, _index.overwriteGetterForCaching)(this, 'docsMap', map);
    }
  }]);
}();
//# sourceMappingURL=rx-query-single-result.js.map