"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getValidator = getValidator;
exports.wrappedValidateZSchemaStorage = void 0;
var _zSchema = _interopRequireDefault(require("z-schema"));
var _pluginHelpers = require("../../plugin-helpers.js");
/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using z-schema as jsonschema-validator
 * @link https://github.com/zaggino/z-schema
 */

function getValidator(schema) {
  var validatorInstance = new _zSchema.default();
  var validator = obj => {
    validatorInstance.validate(obj, schema);
    return validatorInstance;
  };
  return docData => {
    var useValidator = validator(docData);
    if (useValidator === true) {
      return;
    }
    var errors = useValidator.getLastErrors();
    if (errors) {
      var formattedZSchemaErrors = errors.map(({
        title,
        description,
        message,
        path
      }) => ({
        title,
        description,
        message,
        path
      }));
      return formattedZSchemaErrors;
    } else {
      return [];
    }
  };
}
var wrappedValidateZSchemaStorage = exports.wrappedValidateZSchemaStorage = (0, _pluginHelpers.wrappedValidateStorageFactory)(getValidator, 'z-schema');
//# sourceMappingURL=index.js.map