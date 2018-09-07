"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.hooks = exports.prototypes = exports.rxdb = void 0;

var _isMyJsonValid = _interopRequireDefault(require("is-my-json-valid"));

var _rxError = _interopRequireDefault(require("../rx-error"));

var _util = require("../util");

/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 * @type {Object<string, any>}
 */
var validatorsCache = {};
/**
 * returns the parsed validator from is-my-json-valid
 * @param {string} [schemaPath=''] if given, the schema for the sub-path is used
 * @
 */

function _getValidator() {
  var schemaPath = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var hash = this.hash;
  if (!validatorsCache[hash]) validatorsCache[hash] = {};
  var validatorsOfHash = validatorsCache[hash];

  if (!validatorsOfHash[schemaPath]) {
    var schemaPart = schemaPath === '' ? this.jsonID : this.getSchemaByObjectPath(schemaPath);

    if (!schemaPart) {
      throw _rxError["default"].newRxError('VD1', {
        schemaPath: schemaPath
      });
    }

    validatorsOfHash[schemaPath] = (0, _isMyJsonValid["default"])(schemaPart);
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


var validate = function validate(obj) {
  var schemaPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

  var useValidator = this._getValidator(schemaPath);

  var isValid = useValidator(obj);
  if (isValid) return obj;else {
    throw _rxError["default"].newRxError('VD2', {
      errors: useValidator.errors,
      schemaPath: schemaPath,
      obj: obj,
      schema: this.jsonID
    });
  }
};

var runAfterSchemaCreated = function runAfterSchemaCreated(rxSchema) {
  // pre-generate the isMyJsonValid-validator from the schema
  (0, _util.requestIdleCallbackIfAvailable)(function () {
    rxSchema._getValidator();
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
    proto._getValidator = _getValidator;
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
