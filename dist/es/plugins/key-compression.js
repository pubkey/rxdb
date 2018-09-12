import _createClass from "@babel/runtime/helpers/createClass";

/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */
import { numberToLetter, trimDots, clone } from '../util';

var KeyCompressor =
/*#__PURE__*/
function () {
  /**
   * @param {RxSchema} schema
   */
  function KeyCompressor(schema) {
    this.schema = schema;
    this._table;
    this._reverseTable;
    this._fullTable;
  }

  var _proto = KeyCompressor.prototype;

  /**
   * compress the keys of an object via the compression-table
   * @param {Object} obj
   * @param {Object} compressed obj
   */
  _proto.compress = function compress(obj) {
    if (!this.schema.doKeyCompression()) return clone(obj);
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
    if (!this.schema.doKeyCompression()) return clone(obj);

    var returnObj = this._decompressObj(obj);

    return returnObj;
  };
  /**
   * get the full compressed-key-path of a object-path
   * @param {string} prePath | 'mainSkill'
   * @param {string} prePathCompressed | '|a'
   * @param {string[]} remainPathAr | ['attack', 'count']
   * @return {string} compressedPath | '|a.|b.|c'
   */


  _proto.transformKey = function transformKey(prePath, prePathCompressed, remainPathAr) {
    var table = this.table;
    prePath = trimDots(prePath);
    prePathCompressed = trimDots(prePathCompressed);
    var nextPath = remainPathAr.shift();
    var nextFullPath = trimDots(prePath + '.' + nextPath);
    if (table[nextFullPath]) prePathCompressed += '.' + table[nextFullPath];else prePathCompressed += '.' + nextPath;
    if (remainPathAr.length > 0) return this.transformKey(nextFullPath, prePathCompressed, remainPathAr);else return trimDots(prePathCompressed);
  };
  /**
   * replace the keys of a query-obj with the compressed keys
   * @param {{selector: {}}} queryJSON
   * @return {{selector: {}}} compressed queryJSON
   */


  _proto.compressQuery = function compressQuery(queryJSON) {
    var _this2 = this;

    queryJSON = clone(queryJSON);
    if (!this.schema.doKeyCompression()) return queryJSON; // selector

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

  _createClass(KeyCompressor, [{
    key: "table",
    get: function get() {
      var _this3 = this;

      if (!this._table) {
        // create new table
        var lastKeyNumber = 0;

        var nextKey = function nextKey() {
          lastKeyNumber++;
          return numberToLetter(lastKeyNumber - 1);
        };

        this._table = {};
        var jsonSchema = this.schema.normalized;

        var propertiesToTable = function propertiesToTable(path, obj) {
          Object.keys(obj).map(function (key) {
            var propertyObj = obj[key];
            var fullPath = key === 'properties' ? path : trimDots(path + '.' + key);
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

function _compressObj(keyCompressor, obj) {
  var path = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  var ret = {};
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(function (o) {
      return _compressObj(keyCompressor, o, trimDots(path + '.item'));
    });
  }

  Object.keys(obj).forEach(function (key) {
    var propertyObj = obj[key];
    var fullPath = trimDots(path + '.' + key);
    var replacedKey = keyCompressor.table[fullPath] ? keyCompressor.table[fullPath] : key;
    var nextObj = propertyObj;
    nextObj = _compressObj(keyCompressor, propertyObj, fullPath);
    ret[replacedKey] = nextObj;
  });
  return ret;
}

export function create(schema) {
  return new KeyCompressor(schema);
}
export var rxdb = true;
export var prototypes = {};
export var overwritable = {
  createKeyCompressor: create
};
export default {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};