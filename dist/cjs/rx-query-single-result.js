"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxQuerySingleResult = void 0;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _docCache = require("./doc-cache.js");
var _index = require("./plugins/utils/index.js");
var _rxError = require("./rx-error.js");
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

  function RxQuerySingleResult(query,
  // only used internally, do not use outside, use this.docsData instead
  docsDataFromStorageInstance,
  // can be overwritten for count-queries
  count) {
    this.time = (0, _index.now)();
    this.query = query;
    this.count = count;
    this.documents = (0, _docCache.mapDocumentsDataToCacheDocs)(this.query.collection._docCache, docsDataFromStorageInstance);
  }

  /**
   * Instead of using the newResultData in the result cache,
   * we directly use the objects that are stored in the RxDocument
   * to ensure we do not store the same data twice and fill up the memory.
   * @overwrites itself with the actual value
   */
  var _proto = RxQuerySingleResult.prototype;
  _proto.getValue = function getValue(throwIfMissing) {
    var op = this.query.op;
    if (op === 'count') {
      return this.count;
    } else if (op === 'findOne') {
      // findOne()-queries emit RxDocument or null
      var doc = this.documents.length === 0 ? null : this.documents[0];
      if (!doc && throwIfMissing) {
        throw (0, _rxError.newRxError)('QU10', {
          collection: this.query.collection.name,
          query: this.query.mangoQuery,
          op
        });
      } else {
        return doc;
      }
    } else if (op === 'findByIds') {
      return this.docsMap;
    } else {
      // find()-queries emit RxDocument[]
      // Flat copy the array so it won't matter if the user modifies it.
      return this.documents.slice(0);
    }
  };
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