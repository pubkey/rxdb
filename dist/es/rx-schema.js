import _createClass from "@babel/runtime/helpers/createClass";
import deepEqual from 'fast-deep-equal';
import { clone, hash, sortObject, overwriteGetterForCaching, flatClone, isMaybeReadonlyArray } from './util';
import { newRxError } from './rx-error';
import { runPluginHooks } from './hooks';
import { defineGetterSetter } from './rx-document';
import { getComposedPrimaryKeyOfDocumentData, getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
export var RxSchema = /*#__PURE__*/function () {
  function RxSchema(jsonSchema) {
    this.jsonSchema = jsonSchema;
    this.indexes = getIndexes(this.jsonSchema); // primary is always required

    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.jsonSchema.primaryKey); // final fields are always required

    this.finalFields = getFinalFields(this.jsonSchema);
    this.jsonSchema.required = this.jsonSchema.required.concat(this.finalFields).filter(function (field) {
      return !field.includes('.');
    }).filter(function (elem, pos, arr) {
      return arr.indexOf(elem) === pos;
    }); // unique;
  }

  var _proto = RxSchema.prototype;

  /**
   * checks if a given change on a document is allowed
   * Ensures that:
   * - primary is not modified
   * - final fields are not modified
   * @throws {Error} if not valid
   */
  _proto.validateChange = function validateChange(dataBefore, dataAfter) {
    var _this = this;

    this.finalFields.forEach(function (fieldName) {
      if (!deepEqual(dataBefore[fieldName], dataAfter[fieldName])) {
        throw newRxError('DOC9', {
          dataBefore: dataBefore,
          dataAfter: dataAfter,
          fieldName: fieldName,
          schema: _this.jsonSchema
        });
      }
    });
  }
  /**
   * validate if the obj matches the schema
   * @overwritten by plugin (required)
   * @param schemaPath if given, validates agains deep-path of schema
   * @throws {Error} if not valid
   * @param obj equal to input-obj
   */
  ;

  _proto.validate = function validate(_obj, _schemaPath) {
    /**
     * This method might be overwritten by a validation plugin,
     * otherwise do nothing.
     */
  }
  /**
   * fills all unset fields with default-values if set
   */
  ;

  _proto.fillObjectWithDefaults = function fillObjectWithDefaults(obj) {
    obj = flatClone(obj);
    Object.entries(this.defaultValues).filter(function (_ref) {
      var k = _ref[0];
      return !obj.hasOwnProperty(k) || typeof obj[k] === 'undefined';
    }).forEach(function (_ref2) {
      var k = _ref2[0],
          v = _ref2[1];
      return obj[k] = v;
    });
    return obj;
  }
  /**
   * creates the schema-based document-prototype,
   * see RxCollection.getDocumentPrototype()
   */
  ;

  _proto.getDocumentPrototype = function getDocumentPrototype() {
    var proto = {};
    defineGetterSetter(this, proto, '');
    overwriteGetterForCaching(this, 'getDocumentPrototype', function () {
      return proto;
    });
    return proto;
  };

  _proto.getPrimaryOfDocumentData = function getPrimaryOfDocumentData(documentData) {
    return getComposedPrimaryKeyOfDocumentData(this.jsonSchema, documentData);
  };

  _createClass(RxSchema, [{
    key: "version",
    get: function get() {
      return this.jsonSchema.version;
    }
  }, {
    key: "normalized",
    get: function get() {
      return overwriteGetterForCaching(this, 'normalized', normalizeRxJsonSchema(this.jsonSchema));
    }
  }, {
    key: "defaultValues",
    get: function get() {
      var values = {};
      Object.entries(this.normalized.properties).filter(function (_ref3) {
        var v = _ref3[1];
        return v.hasOwnProperty('default');
      }).forEach(function (_ref4) {
        var k = _ref4[0],
            v = _ref4[1];
        return values[k] = v["default"];
      });
      return overwriteGetterForCaching(this, 'defaultValues', values);
    }
    /**
        * true if schema contains at least one encrypted path
        */

  }, {
    key: "crypt",
    get: function get() {
      if (!!this.jsonSchema.encrypted && this.jsonSchema.encrypted.length > 0 || this.jsonSchema.attachments && this.jsonSchema.attachments.encrypted) {
        return true;
      } else {
        return false;
      }
    }
    /**
     * @overrides itself on the first call
     */

  }, {
    key: "hash",
    get: function get() {
      return overwriteGetterForCaching(this, 'hash', hash(this.normalized));
    }
  }]);

  return RxSchema;
}();
export function getIndexes(jsonSchema) {
  return (jsonSchema.indexes || []).map(function (index) {
    return isMaybeReadonlyArray(index) ? index : [index];
  });
}
/**
 * array with previous version-numbers
 */

export function getPreviousVersions(schema) {
  var version = schema.version ? schema.version : 0;
  var c = 0;
  return new Array(version).fill(0).map(function () {
    return c++;
  });
}
/**
 * returns the final-fields of the schema
 * @return field-names of the final-fields
 */

export function getFinalFields(jsonSchema) {
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
/**
 * Normalize the RxJsonSchema.
 * We need this to ensure everything is set up properly
 * and we have the same hash on schemas that represent the same value but
 * have different json.
 * 
 * - Orders the schemas attributes by alphabetical order
 * - Adds the primaryKey to all indexes that do not contain the primaryKey
 *   - We need this for determinstic sort order on all queries, which is required for event-reduce to work.
 *
 * @return RxJsonSchema - ordered and filled
 */

export function normalizeRxJsonSchema(jsonSchema) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(jsonSchema.primaryKey);
  var normalizedSchema = sortObject(clone(jsonSchema)); // indexes must NOT be sorted because sort order is important here.

  if (jsonSchema.indexes) {
    normalizedSchema.indexes = Array.from(jsonSchema.indexes);
  } // primaryKey.fields must NOT be sorted because sort order is important here.


  if (typeof normalizedSchema.primaryKey === 'object' && typeof jsonSchema.primaryKey === 'object') {
    normalizedSchema.primaryKey.fields = jsonSchema.primaryKey.fields;
  }
  /**
   * Add primary key to indexes that do not contain primaryKey.
   */


  if (normalizedSchema.indexes) {
    normalizedSchema.indexes = normalizedSchema.indexes.map(function (index) {
      var arIndex = isMaybeReadonlyArray(index) ? index : [index];

      if (!arIndex.includes(primaryPath)) {
        var modifiedIndex = arIndex.slice(0);
        modifiedIndex.push(primaryPath);
        return modifiedIndex;
      }

      return arIndex;
    });
  }

  return normalizedSchema;
}
export var RX_META_SCHEMA = {
  type: 'object',
  properties: {
    lwt: {
      type: 'number',
      minimum: 1
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
 * fills the schema-json with default-settings
 * @return cloned schemaObj
 */

export function fillWithDefaultSettings(schemaObj) {
  schemaObj = flatClone(schemaObj);
  schemaObj.properties = flatClone(schemaObj.properties); // additionalProperties is always false

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

  schemaObj.properties._meta = RX_META_SCHEMA; // version is 0 by default

  schemaObj.version = schemaObj.version || 0;
  return schemaObj;
}
export function createRxSchema(jsonSchema) {
  var runPreCreateHooks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

  if (runPreCreateHooks) {
    runPluginHooks('preCreateRxSchema', jsonSchema);
  }

  var schema = new RxSchema(fillWithDefaultSettings(jsonSchema));
  runPluginHooks('createRxSchema', schema);
  return schema;
}
export function isInstanceOf(obj) {
  return obj instanceof RxSchema;
}
/**
 * Used as helper function the generate the document type out of the schema via typescript.
 * @link https://github.com/pubkey/rxdb/discussions/3467
 */

export function toTypedRxJsonSchema(schema) {
  return schema;
}
//# sourceMappingURL=rx-schema.js.map