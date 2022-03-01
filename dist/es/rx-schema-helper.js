import objectPath from 'object-path';
import { newRxError } from './rx-error';
import { flatClone, trimDots } from './util';
/**
 * Helper function to create a valid RxJsonSchema
 * with a given version.
 */

export function getPseudoSchemaForVersion(version, primaryKey) {
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

export function getSchemaByObjectPath(rxJsonSchema, path) {
  var usePath = path;
  usePath = usePath.replace(/\./g, '.properties.');
  usePath = 'properties.' + usePath;
  usePath = trimDots(usePath);
  var ret = objectPath.get(rxJsonSchema, usePath);
  return ret;
}
export function fillPrimaryKey(primaryPath, jsonSchema, documentData) {
  var cloned = flatClone(documentData);
  var newPrimary = getComposedPrimaryKeyOfDocumentData(jsonSchema, documentData);
  var existingPrimary = documentData[primaryPath];

  if (existingPrimary && existingPrimary !== newPrimary) {
    throw newRxError('DOC19', {
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
export function getPrimaryFieldOfPrimaryKey(primaryKey) {
  if (typeof primaryKey === 'string') {
    return primaryKey;
  } else {
    return primaryKey.key;
  }
}
/**
 * Returns the composed primaryKey of a document by its data.
 */

export function getComposedPrimaryKeyOfDocumentData(jsonSchema, documentData) {
  if (typeof jsonSchema.primaryKey === 'string') {
    return documentData[jsonSchema.primaryKey];
  }

  var compositePrimary = jsonSchema.primaryKey;
  return compositePrimary.fields.map(function (field) {
    var value = objectPath.get(documentData, field);

    if (typeof value === 'undefined') {
      throw newRxError('DOC18', {
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