"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPseudoSchemaForVersion = getPseudoSchemaForVersion;
exports.getSchemaByObjectPath = getSchemaByObjectPath;

var _objectPath = _interopRequireDefault(require("object-path"));

var _util = require("./util");

/**
 * Helper function to create a valid RxJsonSchema
 * with a given version.
 */
function getPseudoSchemaForVersion(version, primaryKey) {
  var _properties;

  var pseudoSchema = {
    version: version,
    type: 'object',
    primaryKey: primaryKey,
    properties: (_properties = {}, _properties[primaryKey] = {
      type: 'string'
    }, _properties),
    required: [primaryKey]
  };
  return pseudoSchema;
}
/**
 * Returns the sub-schema for a given path
 */


function getSchemaByObjectPath(rxJsonSchema, path) {
  var usePath = path;
  usePath = usePath.replace(/\./g, '.properties.');
  usePath = 'properties.' + usePath;
  usePath = (0, _util.trimDots)(usePath);

  var ret = _objectPath["default"].get(rxJsonSchema, usePath);

  return ret;
}

//# sourceMappingURL=rx-schema-helper.js.map