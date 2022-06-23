"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxSchema = void 0;
exports.createRxSchema = createRxSchema;
exports.getIndexes = getIndexes;
exports.getPreviousVersions = getPreviousVersions;
exports.isInstanceOf = isInstanceOf;
exports.toTypedRxJsonSchema = toTypedRxJsonSchema;

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _fastDeepEqual = _interopRequireDefault(require("fast-deep-equal"));

var _util = require("./util");

var _rxError = require("./rx-error");

var _hooks = require("./hooks");

var _rxDocument = require("./rx-document");

var _rxSchemaHelper = require("./rx-schema-helper");

var _overwritable = require("./overwritable");

var _rxCollectionHelper = require("./rx-collection-helper");

var RxSchema = /*#__PURE__*/function () {
  function RxSchema(jsonSchema) {
    this.jsonSchema = jsonSchema;
    this.indexes = getIndexes(this.jsonSchema); // primary is always required

    this.primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(this.jsonSchema.primaryKey);
    this.finalFields = (0, _rxSchemaHelper.getFinalFields)(this.jsonSchema);
  }

  var _proto = RxSchema.prototype;

  /**
   * checks if a given change on a document is allowed
   * Ensures that:
   * - final fields are not modified
   * @throws {Error} if not valid
   */
  _proto.validateChange = function validateChange(dataBefore, dataAfter) {
    var _this = this;

    this.finalFields.forEach(function (fieldName) {
      if (!(0, _fastDeepEqual["default"])(dataBefore[fieldName], dataAfter[fieldName])) {
        throw (0, _rxError.newRxError)('DOC9', {
          dataBefore: dataBefore,
          dataAfter: dataAfter,
          fieldName: fieldName,
          schema: _this.jsonSchema
        });
      }
    });
  }
  /**
   * validate if the given document data matches the schema
   * @param schemaPath if given, validates against deep-path of schema
   * @throws {Error} if not valid
   * @param obj equal to input-obj
   *
   */
  ;

  _proto.validate = function validate(obj, schemaPath) {
    if (!this.validateFullDocumentData) {
      return;
    } else {
      var fullDocData = (0, _rxCollectionHelper.fillObjectDataBeforeInsert)(this, obj);
      return this.validateFullDocumentData(fullDocData, schemaPath);
    }
  }
  /**
   * @overwritten by the given validation plugin
   */
  ;

  _proto.validateFullDocumentData = function validateFullDocumentData(_docData, _schemaPath) {
    /**
     * This method might be overwritten by a validation plugin,
     * otherwise do nothing, because if not validation plugin
     * was added to RxDB, we assume all given data is valid.
     */
  }
  /**
   * fills all unset fields with default-values if set
   */
  ;

  _proto.fillObjectWithDefaults = function fillObjectWithDefaults(obj) {
    obj = (0, _util.flatClone)(obj);
    Object.entries(this.defaultValues).filter(function (_ref) {
      var k = _ref[0];
      return !obj.hasOwnProperty(k) || typeof obj[k] === 'undefined';
    }).forEach(function (_ref2) {
      var k = _ref2[0],
          v = _ref2[1];
      return obj[k] = v;
    });
    return obj;
  }
  /**
   * creates the schema-based document-prototype,
   * see RxCollection.getDocumentPrototype()
   */
  ;

  _proto.getDocumentPrototype = function getDocumentPrototype() {
    var proto = {};
    (0, _rxDocument.defineGetterSetter)(this, proto, '');
    (0, _util.overwriteGetterForCaching)(this, 'getDocumentPrototype', function () {
      return proto;
    });
    return proto;
  };

  _proto.getPrimaryOfDocumentData = function getPrimaryOfDocumentData(documentData) {
    return (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(this.jsonSchema, documentData);
  };

  (0, _createClass2["default"])(RxSchema, [{
    key: "version",
    get: function get() {
      return this.jsonSchema.version;
    }
  }, {
    key: "defaultValues",
    get: function get() {
      var values = {};
      Object.entries(this.jsonSchema.properties).filter(function (_ref3) {
        var v = _ref3[1];
        return v.hasOwnProperty('default');
      }).forEach(function (_ref4) {
        var k = _ref4[0],
            v = _ref4[1];
        return values[k] = v["default"];
      });
      return (0, _util.overwriteGetterForCaching)(this, 'defaultValues', values);
    }
    /**
        * true if schema contains at least one encrypted path
        */

  }, {
    key: "crypt",
    get: function get() {
      if (!!this.jsonSchema.encrypted && this.jsonSchema.encrypted.length > 0 || this.jsonSchema.attachments && this.jsonSchema.attachments.encrypted) {
        return true;
      } else {
        return false;
      }
    }
    /**
     * @overrides itself on the first call
     */

  }, {
    key: "hash",
    get: function get() {
      return (0, _util.overwriteGetterForCaching)(this, 'hash', (0, _util.hash)(this.jsonSchema));
    }
  }]);
  return RxSchema;
}();

exports.RxSchema = RxSchema;

function getIndexes(jsonSchema) {
  return (jsonSchema.indexes || []).map(function (index) {
    return (0, _util.isMaybeReadonlyArray)(index) ? index : [index];
  });
}
/**
 * array with previous version-numbers
 */


function getPreviousVersions(schema) {
  var version = schema.version ? schema.version : 0;
  var c = 0;
  return new Array(version).fill(0).map(function () {
    return c++;
  });
}

function createRxSchema(jsonSchema) {
  var runPreCreateHooks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

  if (runPreCreateHooks) {
    (0, _hooks.runPluginHooks)('preCreateRxSchema', jsonSchema);
  }

  var useJsonSchema = (0, _rxSchemaHelper.fillWithDefaultSettings)(jsonSchema);
  useJsonSchema = (0, _rxSchemaHelper.normalizeRxJsonSchema)(useJsonSchema);

  _overwritable.overwritable.deepFreezeWhenDevMode(useJsonSchema);

  var schema = new RxSchema(useJsonSchema);
  (0, _hooks.runPluginHooks)('createRxSchema', schema);
  return schema;
}

function isInstanceOf(obj) {
  return obj instanceof RxSchema;
}
/**
 * Used as helper function the generate the document type out of the schema via typescript.
 * @link https://github.com/pubkey/rxdb/discussions/3467
 */


function toTypedRxJsonSchema(schema) {
  return schema;
}
//# sourceMappingURL=rx-schema.js.map