"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAjv = getAjv;
exports.getValidator = getValidator;
exports.wrappedValidateAjvStorage = void 0;
var _ajv = _interopRequireDefault(require("ajv"));
var _ajvFormats = _interopRequireDefault(require("ajv-formats"));
var _pluginHelpers = require("../../plugin-helpers.js");
/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 * @link https://github.com/ajv-validator/ajv/issues/2132#issuecomment-1537224620
 */

var ajv;
function getAjv() {
  if (!ajv) {
    ajv = new _ajv.default({
      strict: true
    });
    ajv.addKeyword('version');
    ajv.addKeyword('keyCompression');
    ajv.addKeyword('primaryKey');
    ajv.addKeyword('indexes');
    ajv.addKeyword('encrypted');
    ajv.addKeyword('final');
    ajv.addKeyword('sharding');
    ajv.addKeyword('internalIndexes');
    ajv.addKeyword('attachments');
    ajv.addKeyword('ref');
    ajv.addKeyword('crdt');
    (0, _ajvFormats.default)(ajv);
  }
  return ajv;
}
function getValidator(schema) {
  var validator = getAjv().compile(schema);
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