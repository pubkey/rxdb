"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.hooks = exports.prototypes = exports.rxdb = void 0;

var _zSchema = _interopRequireDefault(require("z-schema"));

var _rxError = require("../rx-error");

var _util = require("../util");

/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using z-schema as jsonschema-validator
 * @link https://github.com/zaggino/z-schema
 */

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
var VALIDATOR_CACHE = new Map();
/**
 * returns the parsed validator from z-schema
 * @param schemaPath if given, the schema for the sub-path is used
 * @
 */

function _getValidator(rxSchema) {
  var hash = rxSchema.hash;

  if (!VALIDATOR_CACHE.has(hash)) {
    var validator = new _zSchema["default"]();

    var validatorFun = function validatorFun(obj) {
      validator.validate(obj, rxSchema.jsonID);
      return validator;
    };

    VALIDATOR_CACHE.set(hash, validatorFun);
  }

  return VALIDATOR_CACHE.get(hash);
}
/**
 * validates the given object against the schema
 * @param  schemaPath if given, the sub-schema will be validated
 * @throws {RxError} if not valid
 */


var validate = function validate(obj) {
  var validator = _getValidator(this);

  var useValidator = validator(obj);
  var errors = useValidator.getLastErrors();
  if (!errors) return obj;else {
    var formattedZSchemaErrors = errors.map(function (_ref) {
      var title = _ref.title,
          description = _ref.description,
          message = _ref.message;
      return {
        title: title,
        description: description,
        message: message
      };
    });
    throw (0, _rxError.newRxError)('VD2', {
      errors: formattedZSchemaErrors,
      obj: obj,
      schema: this.jsonID
    });
  }
};

var runAfterSchemaCreated = function runAfterSchemaCreated(rxSchema) {
  // pre-generate the validator-z-schema from the schema
  (0, _util.requestIdleCallbackIfAvailable)(function () {
    return _getValidator.bind(rxSchema, rxSchema);
  });
};

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  /**
   * set validate-function for the RxSchema.prototype
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

//# sourceMappingURL=validate-z-schema.js.map