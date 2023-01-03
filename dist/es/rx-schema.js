import _createClass from "@babel/runtime/helpers/createClass";
import { overwriteGetterForCaching, flatClone, isMaybeReadonlyArray, fastUnsecureHash, deepEqual } from './plugins/utils';
import { newRxError } from './rx-error';
import { runPluginHooks } from './hooks';
import { defineGetterSetter } from './rx-document';
import { fillWithDefaultSettings, getComposedPrimaryKeyOfDocumentData, getFinalFields, getPrimaryFieldOfPrimaryKey, normalizeRxJsonSchema } from './rx-schema-helper';
import { overwritable } from './overwritable';
export var RxSchema = /*#__PURE__*/function () {
  function RxSchema(jsonSchema) {
    this.jsonSchema = jsonSchema;
    this.indexes = getIndexes(this.jsonSchema);

    // primary is always required
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.jsonSchema.primaryKey);
    this.finalFields = getFinalFields(this.jsonSchema);
  }
  var _proto = RxSchema.prototype;
  /**
   * checks if a given change on a document is allowed
   * Ensures that:
   * - final fields are not modified
   * @throws {Error} if not valid
   */
  _proto.validateChange = function validateChange(dataBefore, dataAfter) {
    this.finalFields.forEach(fieldName => {
      if (!deepEqual(dataBefore[fieldName], dataAfter[fieldName])) {
        throw newRxError('DOC9', {
          dataBefore,
          dataAfter,
          fieldName,
          schema: this.jsonSchema
        });
      }
    });
  }

  /**
   * fills all unset fields with default-values if set
   */;
  _proto.fillObjectWithDefaults = function fillObjectWithDefaults(obj) {
    obj = flatClone(obj);
    Object.entries(this.defaultValues).filter(([k]) => !obj.hasOwnProperty(k) || typeof obj[k] === 'undefined').forEach(([k, v]) => obj[k] = v);
    return obj;
  }

  /**
   * creates the schema-based document-prototype,
   * see RxCollection.getDocumentPrototype()
   */;
  _proto.getDocumentPrototype = function getDocumentPrototype() {
    var proto = {};
    defineGetterSetter(this, proto, '');
    overwriteGetterForCaching(this, 'getDocumentPrototype', () => proto);
    return proto;
  };
  _proto.getPrimaryOfDocumentData = function getPrimaryOfDocumentData(documentData) {
    return getComposedPrimaryKeyOfDocumentData(this.jsonSchema, documentData);
  };
  _createClass(RxSchema, [{
    key: "version",
    get: function () {
      return this.jsonSchema.version;
    }
  }, {
    key: "defaultValues",
    get: function () {
      var values = {};
      Object.entries(this.jsonSchema.properties).filter(([, v]) => v.hasOwnProperty('default')).forEach(([k, v]) => values[k] = v.default);
      return overwriteGetterForCaching(this, 'defaultValues', values);
    }

    /**
     * @overrides itself on the first call
     */
  }, {
    key: "hash",
    get: function () {
      return overwriteGetterForCaching(this, 'hash', fastUnsecureHash(JSON.stringify(this.jsonSchema)));
    }
  }]);
  return RxSchema;
}();
export function getIndexes(jsonSchema) {
  return (jsonSchema.indexes || []).map(index => isMaybeReadonlyArray(index) ? index : [index]);
}

/**
 * array with previous version-numbers
 */
export function getPreviousVersions(schema) {
  var version = schema.version ? schema.version : 0;
  var c = 0;
  return new Array(version).fill(0).map(() => c++);
}
export function createRxSchema(jsonSchema, runPreCreateHooks = true) {
  if (runPreCreateHooks) {
    runPluginHooks('preCreateRxSchema', jsonSchema);
  }
  var useJsonSchema = fillWithDefaultSettings(jsonSchema);
  useJsonSchema = normalizeRxJsonSchema(useJsonSchema);
  overwritable.deepFreezeWhenDevMode(useJsonSchema);
  var schema = new RxSchema(useJsonSchema);
  runPluginHooks('createRxSchema', schema);
  return schema;
}
export function isRxSchema(obj) {
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