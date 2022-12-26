"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getValidator = getValidator;
exports.wrappedValidateZSchemaStorage = void 0;
var _zSchema = _interopRequireDefault(require("z-schema"));
var _rxError = require("../../rx-error");
var _pluginHelpers = require("../../plugin-helpers");
/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using z-schema as jsonschema-validator
 * @link https://github.com/zaggino/z-schema
 */

function getValidator(schema) {
  var validatorInstance = new _zSchema["default"]();
  var validator = function validator(obj) {
    validatorInstance.validate(obj, schema);
    return validatorInstance;
  };
  return function (docData) {
    var useValidator = validator(docData);
    if (useValidator === true) {
      return;
    }
    var errors = useValidator.getLastErrors();
    if (errors) {
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
        document: docData,
        schema: schema
      });
    }
  };
}
var wrappedValidateZSchemaStorage = (0, _pluginHelpers.wrappedValidateStorageFactory)(getValidator, 'z-schema');
exports.wrappedValidateZSchemaStorage = wrappedValidateZSchemaStorage;
//# sourceMappingURL=index.js.map