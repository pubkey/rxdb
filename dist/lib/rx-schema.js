"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxSchema = void 0;
exports.createRxSchema = createRxSchema;
exports.getIndexes = getIndexes;
exports.getPreviousVersions = getPreviousVersions;
exports.isRxSchema = isRxSchema;
exports.toTypedRxJsonSchema = toTypedRxJsonSchema;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _utils = require("./plugins/utils");
var _rxError = require("./rx-error");
var _hooks = require("./hooks");
var _rxDocument = require("./rx-document");
var _rxSchemaHelper = require("./rx-schema-helper");
var _overwritable = require("./overwritable");
var RxSchema = exports.RxSchema = /*#__PURE__*/function () {
  function RxSchema(jsonSchema, hashFunction) {
    this.jsonSchema = jsonSchema;
    this.hashFunction = hashFunction;
    this.indexes = getIndexes(this.jsonSchema);

    // primary is always required
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
    this.finalFields.forEach(fieldName => {
      if (!(0, _utils.deepEqual)(dataBefore[fieldName], dataAfter[fieldName])) {
        throw (0, _rxError.newRxError)('DOC9', {
          dataBefore,
          dataAfter,
          fieldName,
          schema: this.jsonSchema
        });
      }
    });
  }

  /**
   * creates the schema-based document-prototype,
   * see RxCollection.getDocumentPrototype()
   */;
  _proto.getDocumentPrototype = function getDocumentPrototype() {
    var proto = {};
    (0, _rxDocument.defineGetterSetter)(this, proto, '');
    (0, _utils.overwriteGetterForCaching)(this, 'getDocumentPrototype', () => proto);
    return proto;
  };
  _proto.getPrimaryOfDocumentData = function getPrimaryOfDocumentData(documentData) {
    return (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(this.jsonSchema, documentData);
  };
  (0, _createClass2.default)(RxSchema, [{
    key: "version",
    get: function () {
      return this.jsonSchema.version;
    }
  }, {
    key: "defaultValues",
    get: function () {
      var values = {};
      Object.entries(this.jsonSchema.properties).filter(([, v]) => v.hasOwnProperty('default')).forEach(([k, v]) => values[k] = v.default);
      return (0, _utils.overwriteGetterForCaching)(this, 'defaultValues', values);
    }

    /**
     * @overrides itself on the first call
     *
     * TODO this should be a pure function that
     * caches the hash in a WeakMap.
     */
  }, {
    key: "hash",
    get: function () {
      return (0, _utils.overwriteGetterForCaching)(this, 'hash', this.hashFunction(JSON.stringify(this.jsonSchema)));
    }
  }]);
  return RxSchema;
}();
function getIndexes(jsonSchema) {
  return (jsonSchema.indexes || []).map(index => (0, _utils.isMaybeReadonlyArray)(index) ? index : [index]);
}

/**
 * array with previous version-numbers
 */
function getPreviousVersions(schema) {
  var version = schema.version ? schema.version : 0;
  var c = 0;
  return new Array(version).fill(0).map(() => c++);
}
function createRxSchema(jsonSchema, hashFunction, runPreCreateHooks = true) {
  if (runPreCreateHooks) {
    (0, _hooks.runPluginHooks)('preCreateRxSchema', jsonSchema);
  }
  var useJsonSchema = (0, _rxSchemaHelper.fillWithDefaultSettings)(jsonSchema);
  useJsonSchema = (0, _rxSchemaHelper.normalizeRxJsonSchema)(useJsonSchema);
  _overwritable.overwritable.deepFreezeWhenDevMode(useJsonSchema);
  var schema = new RxSchema(useJsonSchema, hashFunction);
  (0, _hooks.runPluginHooks)('createRxSchema', schema);
  return schema;
}
function isRxSchema(obj) {
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