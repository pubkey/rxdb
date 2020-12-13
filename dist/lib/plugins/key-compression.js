"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.RxDBKeyCompressionPlugin = exports.overwritable = exports.prototypes = exports.rxdb = exports.KeyCompressor = void 0;

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _jsonschemaKeyCompression = require("jsonschema-key-compression");

var _util = require("../util");

/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */
var KeyCompressor = /*#__PURE__*/function () {
  function KeyCompressor(schema) {
    this.schema = schema;
  }
  /**
   * @overwrites itself on the first call
   */


  var _proto = KeyCompressor.prototype;

  /**
   * compress the keys of an object via the compression-table
   */
  _proto.compress = function compress(obj) {
    if (!this.schema.doKeyCompression()) {
      return obj;
    } else {
      return (0, _jsonschemaKeyCompression.compressObject)(this.table, obj);
    }
  };

  _proto.decompress = function decompress(compressedObject) {
    if (!this.schema.doKeyCompression()) {
      return compressedObject;
    } else {
      return (0, _jsonschemaKeyCompression.decompressObject)(this.table, compressedObject);
    }
  }
  /**
   * get the full compressed-key-path of a object-path
   */
  ;

  _proto.transformKey = function transformKey(objectPath) {
    return (0, _jsonschemaKeyCompression.compressedPath)(this.table, objectPath); // > '|a.|b'
  }
  /**
   * replace the keys of a query-obj with the compressed keys
   * @return compressed queryJSON
   */
  ;

  _proto.compressQuery = function compressQuery(queryJSON) {
    if (!this.schema.doKeyCompression()) {
      return queryJSON;
    } else {
      return (0, _jsonschemaKeyCompression.compressQuery)(this.table, queryJSON);
    }
  };

  (0, _createClass2["default"])(KeyCompressor, [{
    key: "table",
    get: function get() {
      var jsonSchema = this.schema.normalized;
      var table = (0, _jsonschemaKeyCompression.createCompressionTable)(jsonSchema, _jsonschemaKeyCompression.DEFAULT_COMPRESSION_FLAG, [this.schema.primaryPath, '_rev', '_attachments']);
      return (0, _util.overwriteGetterForCaching)(this, 'table', table);
    }
  }]);
  return KeyCompressor;
}();

exports.KeyCompressor = KeyCompressor;

function create(schema) {
  return new KeyCompressor(schema);
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {};
exports.prototypes = prototypes;
var overwritable = {
  createKeyCompressor: create
};
exports.overwritable = overwritable;
var RxDBKeyCompressionPlugin = {
  name: 'key-compression',
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
exports.RxDBKeyCompressionPlugin = RxDBKeyCompressionPlugin;

//# sourceMappingURL=key-compression.js.map