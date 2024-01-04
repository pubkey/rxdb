"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getValidator = getValidator;
exports.wrappedValidateIsMyJsonValidStorage = void 0;
var _isMyJsonValid = _interopRequireDefault(require("is-my-json-valid"));
var _pluginHelpers = require("../../plugin-helpers.js");
/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */

function getValidator(schema) {
  var validator = (0, _isMyJsonValid.default)(schema);
  return docData => {
    var isValid = validator(docData);
    if (isValid) {
      return [];
    } else {
      return validator.errors;
    }
  };
}
var wrappedValidateIsMyJsonValidStorage = exports.wrappedValidateIsMyJsonValidStorage = (0, _pluginHelpers.wrappedValidateStorageFactory)(getValidator, 'is-my-json-valid');
//# sourceMappingURL=index.js.map