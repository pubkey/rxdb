"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getValidator = getValidator;
exports.wrappedValidateAjvStorage = void 0;
var _ajv = _interopRequireDefault(require("ajv"));
var _pluginHelpers = require("../../plugin-helpers.js");
/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 * @link https://github.com/ajv-validator/ajv/issues/2132#issuecomment-1537224620
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
var wrappedValidateAjvStorage = exports.wrappedValidateAjvStorage = (0, _pluginHelpers.wrappedValidateStorageFactory)(getValidator, 'ajv');
//# sourceMappingURL=index.js.map