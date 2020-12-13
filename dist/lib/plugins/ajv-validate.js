"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._getValidator = _getValidator;
exports.RxDBAjvValidatePlugin = exports.hooks = exports.prototypes = exports.rxdb = void 0;

var _ajv = _interopRequireDefault(require("ajv"));

var _rxError = require("../rx-error");

var _util = require("../util");

/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 */

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
var VALIDATOR_CACHE = new Map();
var ajv = new _ajv["default"]();
/**
 * returns the parsed validator from ajv
 */

function _getValidator(rxSchema) {
  var hash = rxSchema.hash;

  if (!VALIDATOR_CACHE.has(hash)) {
    var validator = ajv.compile(rxSchema.jsonSchema);
    VALIDATOR_CACHE.set(hash, validator);
  }

  return VALIDATOR_CACHE.get(hash);
}
/**
 * validates the given object against the schema
 */


function validate(obj) {
  var useValidator = _getValidator(this);

  var isValid = useValidator(obj);
  if (isValid) return obj;else {
    throw (0, _rxError.newRxError)('VD2', {
      errors: useValidator.errors,
      obj: obj,
      schema: this.jsonSchema
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
var RxDBAjvValidatePlugin = {
  name: 'ajv-validate',
  rxdb: rxdb,
  prototypes: prototypes,
  hooks: hooks
};
exports.RxDBAjvValidatePlugin = RxDBAjvValidatePlugin;

//# sourceMappingURL=ajv-validate.js.map