"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports["default"] = exports.overwritable = exports.prototypes = exports.rxdb = exports.KeyCompressor = void 0;

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _util = require("../util");

/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */
var KeyCompressor =
/*#__PURE__*/
function () {
  function KeyCompressor(schema) {
    this.schema = schema;
  }

  var _proto = KeyCompressor.prototype;

  /**
   * compress the keys of an object via the compression-table
   */
  _proto.compress = function compress(obj) {
    if (!this.schema.doKeyCompression()) return obj;
    return _compressObj(this, obj);
  };

  _proto._decompressObj = function _decompressObj(obj) {
    var _this = this;

    var reverseTable = this.reverseTable; // non-object

    if (typeof obj !== 'object' || obj === null) return obj; // array

    if (Array.isArray(obj)) return obj.map(function (item) {
      return _this._decompressObj(item);
    }); // object
    else {
        var ret = {};
        Object.keys(obj).forEach(function (key) {
          var replacedKey = key;
          if ((key.startsWith('|') || key.startsWith('_')) && reverseTable[key]) replacedKey = reverseTable[key];
          ret[replacedKey] = _this._decompressObj(obj[key]);
        });
        return ret;
      }
  };

  _proto.decompress = function decompress(obj) {
    if (!this.schema.doKeyCompression()) return obj;

    var returnObj = this._decompressObj(obj);

    return returnObj;
  }
  /**
   * get the full compressed-key-path of a object-path
   */
  ;

  _proto.transformKey = function transformKey(prePath, prePathCompressed, remainPathAr) {
    var table = this.table;
    prePath = (0, _util.trimDots)(prePath);
    prePathCompressed = (0, _util.trimDots)(prePathCompressed);
    var nextPath = remainPathAr.shift();
    var nextFullPath = (0, _util.trimDots)(prePath + '.' + nextPath);
    if (table[nextFullPath]) prePathCompressed += '.' + table[nextFullPath];else prePathCompressed += '.' + nextPath;
    if (remainPathAr.length > 0) return this.transformKey(nextFullPath, prePathCompressed, remainPathAr);else return (0, _util.trimDots)(prePathCompressed);
  }
  /**
   * replace the keys of a query-obj with the compressed keys
   * @return compressed queryJSON
   */
  ;

  _proto.compressQuery = function compressQuery(queryJSON) {
    var _this2 = this;

    if (!this.schema.doKeyCompression()) return queryJSON;
    queryJSON = (0, _util.clone)(queryJSON); // selector

    var selector = {};
    Object.keys(queryJSON.selector).forEach(function (key) {
      var value = queryJSON.selector[key];

      if (key.startsWith('$')) {
        // $or, $not etc have different structure
        var setObj = value.map(function (obj) {
          var newObj = {};
          Object.keys(obj).forEach(function (k) {
            var transKey = _this2.transformKey('', '', k.split('.'));

            newObj[transKey] = obj[k];
          });
          return newObj;
        });
        selector[key] = setObj;
      } else {
        var transKey = _this2.transformKey('', '', key.split('.'));

        selector[transKey] = value;
      }
    });
    queryJSON.selector = selector; // sort

    if (queryJSON.sort) {
      queryJSON.sort = queryJSON.sort.map(function (sortObj) {
        var key = Object.keys(sortObj)[0];
        var value = sortObj[key];
        var ret = {};
        ret[_this2.transformKey('', '', key.split('.'))] = value;
        return ret;
      });
    }

    return queryJSON;
  };

  (0, _createClass2["default"])(KeyCompressor, [{
    key: "table",
    get: function get() {
      var _this3 = this;

      if (!this._table) {
        // create new table
        var lastKeyNumber = 0;

        var nextKey = function nextKey() {
          lastKeyNumber++;
          return (0, _util.numberToLetter)(lastKeyNumber - 1);
        };

        this._table = {};
        var jsonSchema = this.schema.normalized;

        var propertiesToTable = function propertiesToTable(path, obj) {
          Object.keys(obj).map(function (key) {
            var propertyObj = obj[key];
            var fullPath = key === 'properties' ? path : (0, _util.trimDots)(path + '.' + key);
            if (typeof propertyObj === 'object' && // do not add schema-attributes
            !Array.isArray(propertyObj) && // do not use arrays
            !_this3._table[fullPath] && fullPath !== '' && key.length > 3 && // do not compress short keys
            !fullPath.startsWith('_') // _id/_rev etc should never be compressed
            ) _this3._table[fullPath] = '|' + nextKey(); // primary-key is always compressed to _id

            if (propertyObj.primary === true) _this3._table[fullPath] = '_id';
            if (typeof propertyObj === 'object' && !Array.isArray(propertyObj)) propertiesToTable(fullPath, propertyObj);
          });
        };

        propertiesToTable('', jsonSchema);
      }

      return this._table;
    }
  }, {
    key: "reverseTable",
    get: function get() {
      var _this4 = this;

      if (!this._reverseTable) {
        var table = this.table;
        this._reverseTable = {};
        Object.keys(table).forEach(function (key) {
          var value = table[key];
          var fieldName = key.split('.').pop();
          _this4._reverseTable[value] = fieldName;
        });
      }

      return this._reverseTable;
    }
  }]);
  return KeyCompressor;
}();

exports.KeyCompressor = KeyCompressor;

function _compressObj(keyCompressor, obj) {
  var path = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  var ret = {};
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(function (o) {
      return _compressObj(keyCompressor, o, (0, _util.trimDots)(path + '.item'));
    });
  }

  Object.keys(obj).forEach(function (key) {
    var propertyObj = obj[key];
    var fullPath = (0, _util.trimDots)(path + '.' + key);
    var replacedKey = keyCompressor.table[fullPath] ? keyCompressor.table[fullPath] : key;
    var nextObj = propertyObj;
    nextObj = _compressObj(keyCompressor, propertyObj, fullPath);
    ret[replacedKey] = nextObj;
  });
  return ret;
}

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
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
exports["default"] = _default;

//# sourceMappingURL=key-compression.js.map