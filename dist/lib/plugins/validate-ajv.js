"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wrappedValidateAjvStorage = void 0;

var _ajv = _interopRequireDefault(require("ajv"));

var _rxError = require("../rx-error");

var _pluginHelpers = require("../plugin-helpers");

/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 */
var ajv = new _ajv["default"]({
  strict: false
});
var wrappedValidateAjvStorage = (0, _pluginHelpers.wrappedValidateStorageFactory)(function (schema) {
  var validator = ajv.compile(schema);
  return function (docData) {
    var isValid = validator(docData);

    if (!isValid) {
      throw (0, _rxError.newRxError)('VD2', {
        errors: validator.errors,
        document: docData,
        schema: schema
      });
    }
  };
}, 'ajv');
exports.wrappedValidateAjvStorage = wrappedValidateAjvStorage;
//# sourceMappingURL=validate-ajv.js.map