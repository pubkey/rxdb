"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._getValidator = _getValidator;
exports["default"] = exports.hooks = exports.prototypes = exports.rxdb = void 0;

var _ajv = _interopRequireDefault(require("ajv"));

var _rxError = _interopRequireDefault(require("../rx-error"));

var _util = require("../util");

/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 */

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 * @type {Object<string, any>}
 */
var validatorsCache = {};
/**
 * returns the parsed validator from ajv
 * @param {string} [schemaPath=''] if given, the schema for the sub-path is used
 * @
 */

function _getValidator(rxSchema) {
  var schemaPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var hash = rxSchema.hash;
  if (!validatorsCache[hash]) validatorsCache[hash] = {};
  var validatorsOfHash = validatorsCache[hash];

  if (!validatorsOfHash[schemaPath]) {
    var schemaPart = schemaPath === '' ? rxSchema.jsonID : rxSchema.getSchemaByObjectPath(schemaPath);

    if (!schemaPart) {
      throw _rxError["default"].newRxError('VD1', {
        schemaPath: schemaPath
      });
    } // const ajv = new Ajv({errorDataPath: 'property'});


    var ajv = new _ajv["default"]();
    validatorsOfHash[schemaPath] = ajv.compile(schemaPart);
  }

  return validatorsOfHash[schemaPath];
}
/**
 * validates the given object against the schema
 * @param  {any} obj
 * @param  {String} [schemaPath=''] if given, the sub-schema will be validated
 * @throws {RxError} if not valid
 * @return {any} obj if validation successful
 */


function validate(obj) {
  var schemaPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

  var useValidator = _getValidator(this, schemaPath);

  var isValid = useValidator(obj);
  if (isValid) return obj;else {
    throw _rxError["default"].newRxError('VD2', {
      errors: useValidator.errors,
      schemaPath: schemaPath,
      obj: obj,
      schema: this.jsonID
    });
  }
}

var runAfterSchemaCreated = function runAfterSchemaCreated(rxSchema) {
  // pre-generate validator-function from the schema
  (0, _util.requestIdleCallbackIfAvailable)(function () {
    return _getValidator(rxSchema);
  });
};

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  /**
   * set validate-function for the RxSchema.prototype
   * @param {[type]} prototype of RxSchema
   */
  RxSchema: function RxSchema(proto) {
    proto.validate = validate;
  }
};
exports.prototypes = prototypes;
var hooks = {
  createRxSchema: runAfterSchemaCreated
};
exports.hooks = hooks;
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  hooks: hooks
};
exports["default"] = _default;
