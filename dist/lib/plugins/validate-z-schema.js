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
 * @type {Object<string, any>}
 */
var validatorsCache = {};
/**
 * returns the parsed validator from z-schema
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
      throw (0, _rxError.newRxError)('VD1', {
        schemaPath: schemaPath
      });
    }

    var validator = new _zSchema["default"]();

    validatorsOfHash[schemaPath] = function (obj) {
      validator.validate(obj, schemaPart);
      return validator;
    };
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

  var validator = _getValidator(this, schemaPath);

  var useValidator = validator(obj);
  /** @type {ZSchema.SchemaErrorDetail[]} */

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
      schemaPath: schemaPath,
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
