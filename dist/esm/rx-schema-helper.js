import { newRxError } from "./rx-error.js";
import { appendToArray, ensureNotFalsy, flatClone, getProperty, isMaybeReadonlyArray, REGEX_ALL_DOTS, RX_META_LWT_MINIMUM, sortObject, trimDots } from "./plugins/utils/index.js";
/**
 * Helper function to create a valid RxJsonSchema
 * with a given version.
 */
export function getPseudoSchemaForVersion(version, primaryKey) {
  var pseudoSchema = fillWithDefaultSettings({
    version,
    type: 'object',
    primaryKey: primaryKey,
    properties: {
      [primaryKey]: {
        type: 'string',
        maxLength: 100
      },
      value: {
        type: 'string'
      }
    },
    indexes: [[primaryKey]],
    required: [primaryKey]
  });
  return pseudoSchema;
}

/**
 * Returns the sub-schema for a given path
 */
export function getSchemaByObjectPath(rxJsonSchema, path) {
  var usePath = path;
  usePath = usePath.replace(REGEX_ALL_DOTS, '.properties.');
  usePath = 'properties.' + usePath;
  usePath = trimDots(usePath);
  var ret = getProperty(rxJsonSchema, usePath);
  return ret;
}
export function fillPrimaryKey(primaryPath, jsonSchema, documentData) {
  // optimization shortcut.
  if (typeof jsonSchema.primaryKey === 'string') {
    return documentData;
  }
  var newPrimary = getComposedPrimaryKeyOfDocumentData(jsonSchema, documentData);
  var existingPrimary = documentData[primaryPath];
  if (existingPrimary && existingPrimary !== newPrimary) {
    throw newRxError('DOC19', {
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
export function getPrimaryFieldOfPrimaryKey(primaryKey) {
  if (typeof primaryKey === 'string') {
    return primaryKey;
  } else {
    return primaryKey.key;
  }
}
export function getLengthOfPrimaryKey(schema) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  var schemaPart = getSchemaByObjectPath(schema, primaryPath);
  return ensureNotFalsy(schemaPart.maxLength);
}

/**
 * Returns the composed primaryKey of a document by its data.
 */
export function getComposedPrimaryKeyOfDocumentData(jsonSchema, documentData) {
  if (typeof jsonSchema.primaryKey === 'string') {
    return documentData[jsonSchema.primaryKey];
  }
  var compositePrimary = jsonSchema.primaryKey;
  return compositePrimary.fields.map(field => {
    var value = getProperty(documentData, field);
    if (typeof value === 'undefined') {
      throw newRxError('DOC18', {
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
export function normalizeRxJsonSchema(jsonSchema) {
  var normalizedSchema = sortObject(jsonSchema, true);
  return normalizedSchema;
}

/**
 * If the schema does not specify any index,
 * we add this index so we at least can run RxQuery()
 * and only select non-deleted fields.
 */
export function getDefaultIndex(primaryPath) {
  return ['_deleted', primaryPath];
}

/**
 * fills the schema-json with default-settings
 * @return cloned schemaObj
 */
export function fillWithDefaultSettings(schemaObj) {
  schemaObj = flatClone(schemaObj);
  var primaryPath = getPrimaryFieldOfPrimaryKey(schemaObj.primaryKey);
  schemaObj.properties = flatClone(schemaObj.properties);

  // additionalProperties is always false
  schemaObj.additionalProperties = false;

  // fill with key-compression-state ()
  if (!Object.prototype.hasOwnProperty.call(schemaObj, 'keyCompression')) {
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
  appendToArray(schemaObj.required, finalFields);
  schemaObj.required = schemaObj.required.filter(field => !field.includes('.')).filter((elem, pos, arr) => arr.indexOf(elem) === pos); // unique;

  // version is 0 by default
  schemaObj.version = schemaObj.version || 0;
  var useIndexes = schemaObj.indexes.map(index => {
    var arIndex = isMaybeReadonlyArray(index) ? index.slice(0) : [index];
    /**
     * Append primary key to indexes that do not contain the primaryKey.
     * All indexes must have the primaryKey to ensure a deterministic sort order.
     */
    if (!arIndex.includes(primaryPath)) {
      arIndex.push(primaryPath);
    }

    // add _deleted flag to all indexes so we can query only non-deleted fields
    // in RxDB itself
    if (arIndex[0] !== '_deleted') {
      arIndex.unshift('_deleted');
    }
    return arIndex;
  });
  if (useIndexes.length === 0) {
    useIndexes.push(getDefaultIndex(primaryPath));
  }

  // we need this index for the getChangedDocumentsSince() method
  useIndexes.push(['_meta.lwt', primaryPath]);

  // also add the internalIndexes
  if (schemaObj.internalIndexes) {
    schemaObj.internalIndexes.map(idx => {
      useIndexes.push(idx);
    });
  }

  // make indexes unique
  var hasIndex = new Set();
  useIndexes.filter(index => {
    var indexStr = index.join(',');
    if (hasIndex.has(indexStr)) {
      return false;
    } else {
      hasIndex.add(indexStr);
      return true;
    }
  });
  schemaObj.indexes = useIndexes;
  return schemaObj;
}
export var META_LWT_UNIX_TIME_MAX = 1000000000000000;
export var RX_META_SCHEMA = {
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
      minimum: RX_META_LWT_MINIMUM,
      maximum: META_LWT_UNIX_TIME_MAX,
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
export function getFinalFields(jsonSchema) {
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
export function fillObjectWithDefaults(rxSchema, obj) {
  var defaultKeys = Object.keys(rxSchema.defaultValues);
  for (var i = 0; i < defaultKeys.length; ++i) {
    var key = defaultKeys[i];
    if (!Object.prototype.hasOwnProperty.call(obj, key) || typeof obj[key] === 'undefined') {
      obj[key] = rxSchema.defaultValues[key];
    }
  }
  return obj;
}
export var DEFAULT_CHECKPOINT_SCHEMA = {
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