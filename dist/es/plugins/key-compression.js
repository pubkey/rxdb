import _createClass from "@babel/runtime/helpers/createClass";

/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */
import { createCompressionTable, compressObject, decompressObject, compressedPath, compressQuery as _compressQuery, DEFAULT_COMPRESSION_FLAG } from 'jsonschema-key-compression';
import { overwriteGetterForCaching } from '../util';
export var KeyCompressor = /*#__PURE__*/function () {
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
      return compressObject(this.table, obj);
    }
  };

  _proto.decompress = function decompress(compressedObject) {
    if (!this.schema.doKeyCompression()) {
      return compressedObject;
    } else {
      return decompressObject(this.table, compressedObject);
    }
  }
  /**
   * get the full compressed-key-path of a object-path
   */
  ;

  _proto.transformKey = function transformKey(objectPath) {
    return compressedPath(this.table, objectPath); // > '|a.|b'
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
      return _compressQuery(this.table, queryJSON);
    }
  };

  _createClass(KeyCompressor, [{
    key: "table",
    get: function get() {
      var jsonSchema = this.schema.normalized;
      var table = createCompressionTable(jsonSchema, DEFAULT_COMPRESSION_FLAG, [this.schema.primaryPath, '_rev', '_attachments']);
      return overwriteGetterForCaching(this, 'table', table);
    }
  }]);

  return KeyCompressor;
}();
export function create(schema) {
  return new KeyCompressor(schema);
}
export var rxdb = true;
export var prototypes = {};
export var overwritable = {
  createKeyCompressor: create
};
export var RxDBKeyCompressionPlugin = {
  name: 'key-compression',
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
//# sourceMappingURL=key-compression.js.map