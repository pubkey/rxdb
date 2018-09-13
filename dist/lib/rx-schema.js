"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getEncryptedPaths = getEncryptedPaths;
exports.hasCrypt = hasCrypt;
exports.getIndexes = getIndexes;
exports.getPrimary = getPrimary;
exports.getFinalFields = getFinalFields;
exports.normalize = normalize;
exports.create = create;
exports.isInstanceOf = isInstanceOf;
exports["default"] = exports.RxSchema = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _objectPath = _interopRequireDefault(require("object-path"));

var _deepEqual = _interopRequireDefault(require("deep-equal"));

var _util = require("./util");

var _rxError = _interopRequireDefault(require("./rx-error"));

var _hooks = require("./hooks");

var _rxDocument = require("./rx-document");

var RxSchema =
/*#__PURE__*/
function () {
  function RxSchema(jsonID) {
    this.jsonID = jsonID;
    this.compoundIndexes = this.jsonID.compoundIndexes;
    this.indexes = getIndexes(this.jsonID); // primary is always required

    this.primaryPath = getPrimary(this.jsonID);
    if (this.primaryPath) this.jsonID.required.push(this.primaryPath); // final fields are always required

    this.finalFields = getFinalFields(this.jsonID);
    this.jsonID.required = this.jsonID.required.concat(this.finalFields).filter(function (elem, pos, arr) {
      return arr.indexOf(elem) === pos;
    }); // unique;
    // add primary to schema if not there (if _id)

    if (!this.jsonID.properties[this.primaryPath]) {
      this.jsonID.properties[this.primaryPath] = {
        type: 'string',
        minLength: 1
      };
    }
  }
  /**
   * @return {number}
   */


  var _proto = RxSchema.prototype;

  _proto.getSchemaByObjectPath = function getSchemaByObjectPath(path) {
    path = path.replace(/\./g, '.properties.');
    path = 'properties.' + path;
    path = (0, _util.trimDots)(path);

    var ret = _objectPath["default"].get(this.jsonID, path);

    return ret;
  };

  /**
   * checks if a given change on a document is allowed
   * Ensures that:
   * - primary is not modified
   * - final fields are not modified
   * @throws {Error} if not valid
   */
  _proto.validateChange = function validateChange(dataBefore, dataAfter) {
    this.finalFields.forEach(function (fieldName) {
      if (!(0, _deepEqual["default"])(dataBefore[fieldName], dataAfter[fieldName])) {
        throw _rxError["default"].newRxError('DOC9', {
          dataBefore: dataBefore,
          dataAfter: dataAfter,
          fieldName: fieldName
        });
      }
    });
  };
  /**
   * validate if the obj matches the schema
   * @overwritten by plugin (required)
   * @param {Object} obj
   * @param {string} schemaPath if given, validates agains deep-path of schema
   * @throws {Error} if not valid
   * @param {Object} obj equal to input-obj
   */


  _proto.validate = function validate() {
    throw _rxError["default"].pluginMissing('validate');
  };

  /**
   * fills all unset fields with default-values if set
   * @param  {object} obj
   * @return {object}
   */
  _proto.fillObjectWithDefaults = function fillObjectWithDefaults(obj) {
    obj = (0, _util.clone)(obj);
    Object.entries(this.defaultValues).filter(function (_ref) {
      var k = _ref[0];
      return !obj.hasOwnProperty(k) || typeof obj[k] === 'undefined';
    }).forEach(function (_ref2) {
      var k = _ref2[0],
          v = _ref2[1];
      return obj[k] = v;
    });
    return obj;
  };

  _proto.swapIdToPrimary = function swapIdToPrimary(obj) {
    if (this.primaryPath === '_id' || obj[this.primaryPath]) return obj;
    obj[this.primaryPath] = obj._id;
    delete obj._id;
    return obj;
  };

  _proto.swapPrimaryToId = function swapPrimaryToId(obj) {
    var _this = this;

    if (this.primaryPath === '_id') return obj;
    var ret = {};
    Object.entries(obj).forEach(function (entry) {
      var newKey = entry[0] === _this.primaryPath ? '_id' : entry[0];
      ret[newKey] = entry[1];
    });
    return ret;
  };
  /**
   * returns true if key-compression should be done
   */


  _proto.doKeyCompression = function doKeyCompression() {
    /**
     * in rxdb 8.0.0 we renambed the keycompression-option
     * But when a data-migration is done with and old schema,
     * it might have the old option which then should be used
     * TODO: Remove this check in Sep 2019
     */
    if (this.jsonID.hasOwnProperty('disableKeyCompression')) {
      return !this.jsonID.disableKeyCompression;
    } else return this.jsonID.keyCompression;
  };
  /**
   * creates the schema-based document-prototype,
   * see RxCollection.getDocumentPrototype()
   */


  _proto.getDocumentPrototype = function getDocumentPrototype() {
    if (!this._getDocumentPrototype) {
      var proto = {};
      (0, _rxDocument.defineGetterSetter)(this, proto, '');
      this._getDocumentPrototype = proto;
    }

    return this._getDocumentPrototype;
  };

  (0, _createClass2["default"])(RxSchema, [{
    key: "version",
    get: function get() {
      return this.jsonID.version;
    }
    /**
     * @return {number[]} array with previous version-numbers
     */

  }, {
    key: "previousVersions",
    get: function get() {
      var c = 0;
      return new Array(this.version).fill(0).map(function () {
        return c++;
      });
    }
    /**
     * true if schema contains at least one encrypted path
     * @type {boolean}
     */

  }, {
    key: "crypt",
    get: function get() {
      if (!this._crypt) this._crypt = hasCrypt(this.jsonID);
      return this._crypt;
    }
  }, {
    key: "normalized",
    get: function get() {
      if (!this._normalized) this._normalized = normalize(this.jsonID);
      return this._normalized;
    }
  }, {
    key: "topLevelFields",
    get: function get() {
      return Object.keys(this.normalized.properties);
    }
  }, {
    key: "defaultValues",
    get: function get() {
      var _this2 = this;

      if (!this._defaultValues) {
        this._defaultValues = {};
        Object.entries(this.normalized.properties).filter(function (_ref3) {
          var v = _ref3[1];
          return v.hasOwnProperty('default');
        }).forEach(function (_ref4) {
          var k = _ref4[0],
              v = _ref4[1];
          return _this2._defaultValues[k] = v["default"];
        });
      }

      return this._defaultValues;
    }
    /**
     * get all encrypted paths
     */

  }, {
    key: "encryptedPaths",
    get: function get() {
      if (!this._encryptedPaths) this._encryptedPaths = getEncryptedPaths(this.jsonID);
      return this._encryptedPaths;
    }
  }, {
    key: "hash",
    get: function get() {
      if (!this._hash) this._hash = (0, _util.hash)(this.normalized);
      return this._hash;
    }
  }]);
  return RxSchema;
}();
/**
 * returns all encrypted paths of the schema
 * @param  {Object} jsonSchema [description]
 * @return {Object} with paths as attr and schema as value
 */


exports.RxSchema = RxSchema;

function getEncryptedPaths(jsonSchema) {
  var ret = {};

  function traverse(currentObj, currentPath) {
    if ((0, _typeof2["default"])(currentObj) !== 'object') return;

    if (currentObj.encrypted) {
      ret[currentPath.substring(1)] = currentObj;
      return;
    }

    for (var attributeName in currentObj) {
      var nextPath = currentPath;
      if (attributeName !== 'properties') nextPath = nextPath + '.' + attributeName;
      traverse(currentObj[attributeName], nextPath);
    }
  }

  traverse(jsonSchema.properties, '');
  return ret;
}
/**
 * returns true if schema contains an encrypted field
 * @param  {object} jsonSchema with schema
 * @return {boolean} isEncrypted
 */


function hasCrypt(jsonSchema) {
  var paths = getEncryptedPaths(jsonSchema);
  if (Object.keys(paths).length > 0) return true;else return false;
}

function getIndexes(jsonID) {
  var flattened = (0, _util.flattenObject)(jsonID);
  var keys = Object.keys(flattened);
  var indexes = keys // flattenObject returns only ending paths, we need all paths pointing to an object
  .map(function (key) {
    var splitted = key.split('.');
    splitted.pop(); // all but last

    return splitted.join('.');
  }).filter(function (key) {
    return key !== '';
  }).filter(function (elem, pos, arr) {
    return arr.indexOf(elem) === pos;
  }) // unique
  .filter(function (key) {
    // check if this path defines an index
    var value = _objectPath["default"].get(jsonID, key);

    if (value.index) return true;else return false;
  }).map(function (key) {
    // replace inner properties
    key = key.replace('properties.', ''); // first

    key = key.replace(/\.properties\./g, '.'); // middle

    return [(0, _util.trimDots)(key)];
  }); // add compound-indexes

  var addCompound = jsonID.compoundIndexes || [];
  indexes = indexes.concat(addCompound);
  return indexes;
}
/**
 * returns the primary path of a jsonschema
 * @param {Object} jsonID
 * @return {string} primaryPath which is _id if none defined
 */


function getPrimary(jsonID) {
  var ret = Object.keys(jsonID.properties).filter(function (key) {
    return jsonID.properties[key].primary;
  }).shift();
  if (!ret) return '_id';else return ret;
}
/**
 * returns the final-fields of the schema
 * @param  {Object} jsonID
 * @return {string[]} field-names of the final-fields
 */


function getFinalFields(jsonID) {
  var ret = Object.keys(jsonID.properties).filter(function (key) {
    return jsonID.properties[key]["final"];
  }); // primary is also final

  ret.push(getPrimary(jsonID));
  return ret;
}
/**
 * orders the schemas attributes by alphabetical order
 * @param {Object} jsonSchema
 * @return {Object} jsonSchema - ordered
 */


function normalize(jsonSchema) {
  return (0, _util.sortObject)((0, _util.clone)(jsonSchema));
}
/**
 * fills the schema-json with default-settings
 * @param  {Object} schemaObj
 * @return {Object} cloned schemaObj
 */


var fillWithDefaultSettings = function fillWithDefaultSettings(schemaObj) {
  schemaObj = (0, _util.clone)(schemaObj); // additionalProperties is always false

  schemaObj.additionalProperties = false; // fill with key-compression-state ()

  if (!schemaObj.hasOwnProperty('keyCompression')) schemaObj.keyCompression = false; // compoundIndexes must be array

  schemaObj.compoundIndexes = schemaObj.compoundIndexes || []; // required must be array

  schemaObj.required = schemaObj.required || []; // add _rev

  schemaObj.properties._rev = {
    type: 'string',
    minLength: 1
  }; // add attachments

  schemaObj.properties._attachments = {
    type: 'object'
  }; // version is 0 by default

  schemaObj.version = schemaObj.version || 0;
  return schemaObj;
};

function create(jsonID) {
  var runPreCreateHooks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  if (runPreCreateHooks) (0, _hooks.runPluginHooks)('preCreateRxSchema', jsonID);
  var schema = new RxSchema(fillWithDefaultSettings(jsonID));
  (0, _hooks.runPluginHooks)('createRxSchema', schema);
  return schema;
}

function isInstanceOf(obj) {
  return obj instanceof RxSchema;
}

var _default = {
  RxSchema: RxSchema,
  getEncryptedPaths: getEncryptedPaths,
  hasCrypt: hasCrypt,
  getIndexes: getIndexes,
  getPrimary: getPrimary,
  getFinalFields: getFinalFields,
  normalize: normalize,
  create: create,
  isInstanceOf: isInstanceOf
};
exports["default"] = _default;
