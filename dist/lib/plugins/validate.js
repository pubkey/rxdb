"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBValidatePlugin = exports.hooks = exports.prototypes = exports.rxdb = void 0;

var _isMyJsonValid = _interopRequireDefault(require("is-my-json-valid"));

var _rxError = require("../rx-error");

var _util = require("../util");

/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
var VALIDATOR_CACHE = new Map();
/**
 * returns the parsed validator from is-my-json-valid
 */

function _getValidator(rxSchema) {
  var hash = rxSchema.hash;

  if (!VALIDATOR_CACHE.has(hash)) {
    var validator = (0, _isMyJsonValid["default"])(rxSchema.jsonSchema);
    VALIDATOR_CACHE.set(hash, validator);
  }

  return VALIDATOR_CACHE.get(hash);
}
/**
 * validates the given object against the schema
 * @param  schemaPath if given, the sub-schema will be validated
 * @throws {RxError} if not valid
 */


var validate = function validate(obj) {
  var useValidator = _getValidator(this);

  var isValid = useValidator(obj);
  if (isValid) return obj;else {
    throw (0, _rxError.newRxError)('VD2', {
      errors: useValidator.errors,
      obj: obj,
      schema: this.jsonSchema
    });
  }
};

var runAfterSchemaCreated = function runAfterSchemaCreated(rxSchema) {
  // pre-generate the isMyJsonValid-validator from the schema
  (0, _util.requestIdleCallbackIfAvailable)(function () {
    _getValidator(rxSchema);
  });
};

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  /**
   * set validate-function for the RxSchema.prototype
   * @param prototype of RxSchema
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
var RxDBValidatePlugin = {
  name: 'validate',
  rxdb: rxdb,
  prototypes: prototypes,
  hooks: hooks
};
exports.RxDBValidatePlugin = RxDBValidatePlugin;

//# sourceMappingURL=validate.js.map