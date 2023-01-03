"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getValidator = getValidator;
exports.wrappedValidateAjvStorage = void 0;
var _ajv = _interopRequireDefault(require("ajv"));
var _pluginHelpers = require("../../plugin-helpers");
/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 */

var ajv = new _ajv.default({
  strict: false
});
function getValidator(schema) {
  var validator = ajv.compile(schema);
  return docData => {
    var isValid = validator(docData);
    if (isValid) {
      return [];
    } else {
      return validator.errors;
    }
  };
}
var wrappedValidateAjvStorage = (0, _pluginHelpers.wrappedValidateStorageFactory)(getValidator, 'ajv');
exports.wrappedValidateAjvStorage = wrappedValidateAjvStorage;
//# sourceMappingURL=index.js.map