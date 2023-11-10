"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_META_SCHEMA = exports.DEFAULT_CHECKPOINT_SCHEMA = void 0;
exports.fillObjectWithDefaults = fillObjectWithDefaults;
exports.fillPrimaryKey = fillPrimaryKey;
exports.fillWithDefaultSettings = fillWithDefaultSettings;
exports.getComposedPrimaryKeyOfDocumentData = getComposedPrimaryKeyOfDocumentData;
exports.getFinalFields = getFinalFields;
exports.getLengthOfPrimaryKey = getLengthOfPrimaryKey;
exports.getPrimaryFieldOfPrimaryKey = getPrimaryFieldOfPrimaryKey;
exports.getPseudoSchemaForVersion = getPseudoSchemaForVersion;
exports.getSchemaByObjectPath = getSchemaByObjectPath;
exports.normalizeRxJsonSchema = normalizeRxJsonSchema;
var _rxError = require("./rx-error");
var _utils = require("./plugins/utils");
/**
 * Helper function to create a valid RxJsonSchema
 * with a given version.
 */
function getPseudoSchemaForVersion(version, primaryKey) {
  var pseudoSchema = fillWithDefaultSettings({
    version,
    type: 'object',
    primaryKey: primaryKey,
    properties: {
      [primaryKey]: {
        type: 'string',
        maxLength: 100
      }
    },
    required: [primaryKey]
  });
  return pseudoSchema;
}

/**
 * Returns the sub-schema for a given path
 */
function getSchemaByObjectPath(rxJsonSchema, path) {
  var usePath = path;
  usePath = usePath.replace(_utils.REGEX_ALL_DOTS, '.properties.');
  usePath = 'properties.' + usePath;
  usePath = (0, _utils.trimDots)(usePath);
  var ret = (0, _utils.getProperty)(rxJsonSchema, usePath);
  return ret;
}
function fillPrimaryKey(primaryPath, jsonSchema, documentData) {
  // optimization shortcut.
  if (typeof jsonSchema.primaryKey === 'string') {
    return documentData;
  }
  var newPrimary = getComposedPrimaryKeyOfDocumentData(jsonSchema, documentData);
  var existingPrimary = documentData[primaryPath];
  if (existingPrimary && existingPrimary !== newPrimary) {
    throw (0, _rxError.newRxError)('DOC19', {
      args: {
        documentData,
        existingPrimary,
        newPrimary
      },
      schema: jsonSchema
    });
  }
  documentData[primaryPath] = newPrimary;
  return documentData;
}
function getPrimaryFieldOfPrimaryKey(primaryKey) {
  if (typeof primaryKey === 'string') {
    return primaryKey;
  } else {
    return primaryKey.key;
  }
}
function getLengthOfPrimaryKey(schema) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  var schemaPart = getSchemaByObjectPath(schema, primaryPath);
  return (0, _utils.ensureNotFalsy)(schemaPart.maxLength);
}

/**
 * Returns the composed primaryKey of a document by its data.
 */
function getComposedPrimaryKeyOfDocumentData(jsonSchema, documentData) {
  if (typeof jsonSchema.primaryKey === 'string') {
    return documentData[jsonSchema.primaryKey];
  }
  var compositePrimary = jsonSchema.primaryKey;
  return compositePrimary.fields.map(field => {
    var value = (0, _utils.getProperty)(documentData, field);
    if (typeof value === 'undefined') {
      throw (0, _rxError.newRxError)('DOC18', {
        args: {
          field,
          documentData
        }
      });
    }
    return value;
  }).join(compositePrimary.separator);
}

/**
 * Normalize the RxJsonSchema.
 * We need this to ensure everything is set up properly
 * and we have the same hash on schemas that represent the same value but
 * have different json.
 *
 * - Orders the schemas attributes by alphabetical order
 * - Adds the primaryKey to all indexes that do not contain the primaryKey
 * - We need this for deterministic sort order on all queries, which is required for event-reduce to work.
 *
 * @return RxJsonSchema - ordered and filled
 */
function normalizeRxJsonSchema(jsonSchema) {
  var normalizedSchema = (0, _utils.sortObject)(jsonSchema, true);
  return normalizedSchema;
}

/**
 * fills the schema-json with default-settings
 * @return cloned schemaObj
 */
function fillWithDefaultSettings(schemaObj) {
  schemaObj = (0, _utils.flatClone)(schemaObj);
  var primaryPath = getPrimaryFieldOfPrimaryKey(schemaObj.primaryKey);
  schemaObj.properties = (0, _utils.flatClone)(schemaObj.properties);

  // additionalProperties is always false
  schemaObj.additionalProperties = false;

  // fill with key-compression-state ()
  if (!schemaObj.hasOwnProperty('keyCompression')) {
    schemaObj.keyCompression = false;
  }

  // indexes must be array
  schemaObj.indexes = schemaObj.indexes ? schemaObj.indexes.slice(0) : [];

  // required must be array
  schemaObj.required = schemaObj.required ? schemaObj.required.slice(0) : [];

  // encrypted must be array
  schemaObj.encrypted = schemaObj.encrypted ? schemaObj.encrypted.slice(0) : [];

  // add _rev
  schemaObj.properties._rev = {
    type: 'string',
    minLength: 1
  };

  // add attachments
  schemaObj.properties._attachments = {
    type: 'object'
  };

  // add deleted flag
  schemaObj.properties._deleted = {
    type: 'boolean'
  };

  // add meta property
  schemaObj.properties._meta = RX_META_SCHEMA;

  /**
   * meta fields are all required
   */
  schemaObj.required = schemaObj.required ? schemaObj.required.slice(0) : [];
  schemaObj.required.push('_deleted');
  schemaObj.required.push('_rev');
  schemaObj.required.push('_meta');
  schemaObj.required.push('_attachments');

  // final fields are always required
  var finalFields = getFinalFields(schemaObj);
  (0, _utils.appendToArray)(schemaObj.required, finalFields);
  schemaObj.required = schemaObj.required.filter(field => !field.includes('.')).filter((elem, pos, arr) => arr.indexOf(elem) === pos); // unique;

  // version is 0 by default
  schemaObj.version = schemaObj.version || 0;

  /**
   * Append primary key to indexes that do not contain the primaryKey.
   * All indexes must have the primaryKey to ensure a deterministic sort order.
   */
  if (schemaObj.indexes) {
    schemaObj.indexes = schemaObj.indexes.map(index => {
      var arIndex = (0, _utils.isMaybeReadonlyArray)(index) ? index.slice(0) : [index];
      if (!arIndex.includes(primaryPath)) {
        var modifiedIndex = arIndex.slice(0);
        modifiedIndex.push(primaryPath);
        return modifiedIndex;
      }
      return arIndex;
    });
  }
  return schemaObj;
}
var RX_META_SCHEMA = exports.RX_META_SCHEMA = {
  type: 'object',
  properties: {
    /**
     * The last-write time.
     * Unix time in milliseconds.
     */
    lwt: {
      type: 'number',
      /**
       * We use 1 as minimum so that the value is never falsy.
       */
      minimum: _utils.RX_META_LWT_MINIMUM,
      maximum: 1000000000000000,
      multipleOf: 0.01
    }
  },
  /**
   * Additional properties are allowed
   * and can be used by plugins to set various flags.
   */
  additionalProperties: true,
  required: ['lwt']
};

/**
 * returns the final-fields of the schema
 * @return field-names of the final-fields
 */
function getFinalFields(jsonSchema) {
  var ret = Object.keys(jsonSchema.properties).filter(key => jsonSchema.properties[key].final);

  // primary is also final
  var primaryPath = getPrimaryFieldOfPrimaryKey(jsonSchema.primaryKey);
  ret.push(primaryPath);

  // fields of composite primary are final
  if (typeof jsonSchema.primaryKey !== 'string') {
    jsonSchema.primaryKey.fields.forEach(field => ret.push(field));
  }
  return ret;
}

/**
 * fills all unset fields with default-values if set
 * @hotPath
 */
function fillObjectWithDefaults(rxSchema, obj) {
  var defaultKeys = Object.keys(rxSchema.defaultValues);
  for (var i = 0; i < defaultKeys.length; ++i) {
    var key = defaultKeys[i];
    if (!obj.hasOwnProperty(key) || typeof obj[key] === 'undefined') {
      obj[key] = rxSchema.defaultValues[key];
    }
  }
  return obj;
}
var DEFAULT_CHECKPOINT_SCHEMA = exports.DEFAULT_CHECKPOINT_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string'
    },
    lwt: {
      type: 'number'
    }
  },
  required: ['id', 'lwt'],
  additionalProperties: false
};
//# sourceMappingURL=rx-schema-helper.js.map