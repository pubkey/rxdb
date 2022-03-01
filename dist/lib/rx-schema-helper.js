"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fillPrimaryKey = fillPrimaryKey;
exports.getComposedPrimaryKeyOfDocumentData = getComposedPrimaryKeyOfDocumentData;
exports.getPrimaryFieldOfPrimaryKey = getPrimaryFieldOfPrimaryKey;
exports.getPseudoSchemaForVersion = getPseudoSchemaForVersion;
exports.getSchemaByObjectPath = getSchemaByObjectPath;

var _objectPath = _interopRequireDefault(require("object-path"));

var _rxError = require("./rx-error");

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

function fillPrimaryKey(primaryPath, jsonSchema, documentData) {
  var cloned = (0, _util.flatClone)(documentData);
  var newPrimary = getComposedPrimaryKeyOfDocumentData(jsonSchema, documentData);
  var existingPrimary = documentData[primaryPath];

  if (existingPrimary && existingPrimary !== newPrimary) {
    throw (0, _rxError.newRxError)('DOC19', {
      args: {
        documentData: documentData,
        existingPrimary: existingPrimary,
        newPrimary: newPrimary
      },
      schema: jsonSchema
    });
  }

  cloned[primaryPath] = newPrimary;
  return cloned;
}

function getPrimaryFieldOfPrimaryKey(primaryKey) {
  if (typeof primaryKey === 'string') {
    return primaryKey;
  } else {
    return primaryKey.key;
  }
}
/**
 * Returns the composed primaryKey of a document by its data.
 */


function getComposedPrimaryKeyOfDocumentData(jsonSchema, documentData) {
  if (typeof jsonSchema.primaryKey === 'string') {
    return documentData[jsonSchema.primaryKey];
  }

  var compositePrimary = jsonSchema.primaryKey;
  return compositePrimary.fields.map(function (field) {
    var value = _objectPath["default"].get(documentData, field);

    if (typeof value === 'undefined') {
      throw (0, _rxError.newRxError)('DOC18', {
        args: {
          field: field,
          documentData: documentData
        }
      });
    }

    return value;
  }).join(compositePrimary.separator);
}
//# sourceMappingURL=rx-schema-helper.js.map