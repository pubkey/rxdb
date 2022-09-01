"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_META_SCHEMA = exports.DEFAULT_CHECKPOINT_SCHEMA = void 0;
exports.fillPrimaryKey = fillPrimaryKey;
exports.fillWithDefaultSettings = fillWithDefaultSettings;
exports.getComposedPrimaryKeyOfDocumentData = getComposedPrimaryKeyOfDocumentData;
exports.getFinalFields = getFinalFields;
exports.getPrimaryFieldOfPrimaryKey = getPrimaryFieldOfPrimaryKey;
exports.getPseudoSchemaForVersion = getPseudoSchemaForVersion;
exports.getSchemaByObjectPath = getSchemaByObjectPath;
exports.normalizeRxJsonSchema = normalizeRxJsonSchema;

var _objectPath = _interopRequireDefault(require("object-path"));

var _rxError = require("./rx-error");

var _util = require("./util");

/**
 * Helper function to create a valid RxJsonSchema
 * with a given version.
 */
function getPseudoSchemaForVersion(version, primaryKey) {
  var _properties;

  var pseudoSchema = fillWithDefaultSettings({
    version: version,
    type: 'object',
    primaryKey: primaryKey,
    properties: (_properties = {}, _properties[primaryKey] = {
      type: 'string',
      maxLength: 100
    }, _properties),
    required: [primaryKey]
  });
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
/**
 * Normalize the RxJsonSchema.
 * We need this to ensure everything is set up properly
 * and we have the same hash on schemas that represent the same value but
 * have different json.
 * 
 * - Orders the schemas attributes by alphabetical order
 * - Adds the primaryKey to all indexes that do not contain the primaryKey
 * - We need this for determinstic sort order on all queries, which is required for event-reduce to work.
 *
 * @return RxJsonSchema - ordered and filled
 */


function normalizeRxJsonSchema(jsonSchema) {
  // TODO do we need the deep clone() here?
  var normalizedSchema = (0, _util.sortObject)((0, _util.clone)(jsonSchema)); // indexes must NOT be sorted because sort order is important here.

  if (jsonSchema.indexes) {
    normalizedSchema.indexes = Array.from(jsonSchema.indexes);
  } // primaryKey.fields must NOT be sorted because sort order is important here.


  if (typeof normalizedSchema.primaryKey === 'object' && typeof jsonSchema.primaryKey === 'object') {
    normalizedSchema.primaryKey.fields = jsonSchema.primaryKey.fields;
  }

  return normalizedSchema;
}
/**
 * fills the schema-json with default-settings
 * @return cloned schemaObj
 */


function fillWithDefaultSettings(schemaObj) {
  schemaObj = (0, _util.flatClone)(schemaObj);
  var primaryPath = getPrimaryFieldOfPrimaryKey(schemaObj.primaryKey);
  schemaObj.properties = (0, _util.flatClone)(schemaObj.properties); // additionalProperties is always false

  schemaObj.additionalProperties = false; // fill with key-compression-state ()

  if (!schemaObj.hasOwnProperty('keyCompression')) {
    schemaObj.keyCompression = false;
  } // indexes must be array


  schemaObj.indexes = schemaObj.indexes ? schemaObj.indexes.slice(0) : []; // required must be array

  schemaObj.required = schemaObj.required ? schemaObj.required.slice(0) : []; // encrypted must be array

  schemaObj.encrypted = schemaObj.encrypted ? schemaObj.encrypted.slice(0) : [];
  /**
   * TODO we should not need to add the internal fields to the schema.
   * Better remove the fields before validation.
   */
  // add _rev

  schemaObj.properties._rev = {
    type: 'string',
    minLength: 1
  }; // add attachments

  schemaObj.properties._attachments = {
    type: 'object'
  }; // add deleted flag

  schemaObj.properties._deleted = {
    type: 'boolean'
  }; // add meta property

  schemaObj.properties._meta = RX_META_SCHEMA;
  /**
   * meta fields are all required
   */

  schemaObj.required = schemaObj.required ? schemaObj.required.slice(0) : [];
  schemaObj.required.push('_deleted');
  schemaObj.required.push('_rev');
  schemaObj.required.push('_meta');
  schemaObj.required.push('_attachments'); // final fields are always required

  var finalFields = getFinalFields(schemaObj);
  schemaObj.required = schemaObj.required.concat(finalFields).filter(function (field) {
    return !field.includes('.');
  }).filter(function (elem, pos, arr) {
    return arr.indexOf(elem) === pos;
  }); // unique;
  // version is 0 by default

  schemaObj.version = schemaObj.version || 0;
  /**
   * Append primary key to indexes that do not contain the primaryKey.
   * All indexes must have the primaryKey to ensure a deterministic sort order.
   */

  if (schemaObj.indexes) {
    schemaObj.indexes = schemaObj.indexes.map(function (index) {
      var arIndex = (0, _util.isMaybeReadonlyArray)(index) ? index.slice(0) : [index];

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

var RX_META_SCHEMA = {
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
      minimum: _util.RX_META_LWT_MINIMUM,
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

exports.RX_META_SCHEMA = RX_META_SCHEMA;

function getFinalFields(jsonSchema) {
  var ret = Object.keys(jsonSchema.properties).filter(function (key) {
    return jsonSchema.properties[key]["final"];
  }); // primary is also final

  var primaryPath = getPrimaryFieldOfPrimaryKey(jsonSchema.primaryKey);
  ret.push(primaryPath); // fields of composite primary are final

  if (typeof jsonSchema.primaryKey !== 'string') {
    jsonSchema.primaryKey.fields.forEach(function (field) {
      return ret.push(field);
    });
  }

  return ret;
}

var DEFAULT_CHECKPOINT_SCHEMA = {
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
exports.DEFAULT_CHECKPOINT_SCHEMA = DEFAULT_CHECKPOINT_SCHEMA;
//# sourceMappingURL=rx-schema-helper.js.map