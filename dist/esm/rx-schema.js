import _createClass from "@babel/runtime/helpers/createClass";
import { overwriteGetterForCaching, isMaybeReadonlyArray, deepEqual } from "./plugins/utils/index.js";
import { newRxError } from "./rx-error.js";
import { runPluginHooks } from "./hooks.js";
import { fillWithDefaultSettings, getComposedPrimaryKeyOfDocumentData, getFinalFields, getPrimaryFieldOfPrimaryKey, getSchemaByObjectPath, normalizeRxJsonSchema } from "./rx-schema-helper.js";
import { overwritable } from "./overwritable.js";
export var RxSchema = /*#__PURE__*/function () {
  function RxSchema(jsonSchema, hashFunction) {
    this.jsonSchema = jsonSchema;
    this.hashFunction = hashFunction;
    this.indexes = getIndexes(this.jsonSchema);

    // primary is always required
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.jsonSchema.primaryKey);

    /**
     * Many people accidentally put in wrong schema state
     * without the dev-mode plugin, so we need this check here
     * even in non-dev-mode.
     */
    if (!jsonSchema.properties[this.primaryPath].maxLength) {
      throw newRxError('SC39', {
        schema: jsonSchema
      });
    }
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
   * creates the schema-based document-prototype,
   * see RxCollection.getDocumentPrototype()
   */;
  _proto.getDocumentPrototype = function getDocumentPrototype() {
    var proto = {};

    /**
     * On the top level, we know all keys
     * and therefore do not have to create a new Proxy object
     * for each document. Instead we define the getter in the prototype once.
     */
    var pathProperties = getSchemaByObjectPath(this.jsonSchema, '');
    Object.keys(pathProperties).forEach(key => {
      var fullPath = key;

      // getter - value
      proto.__defineGetter__(key, function () {
        if (!this.get || typeof this.get !== 'function') {
          /**
           * When an object gets added to the state of a vuejs-component,
           * it happens that this getter is called with another scope.
           * To prevent errors, we have to return undefined in this case
           */
          return undefined;
        }
        var ret = this.get(fullPath);
        return ret;
      });
      // getter - observable$
      Object.defineProperty(proto, key + '$', {
        get: function () {
          return this.get$(fullPath);
        },
        enumerable: false,
        configurable: false
      });
      // getter - reactivity$$
      Object.defineProperty(proto, key + '$$', {
        get: function () {
          return this.get$$(fullPath);
        },
        enumerable: false,
        configurable: false
      });
      // getter - populate_
      Object.defineProperty(proto, key + '_', {
        get: function () {
          return this.populate(fullPath);
        },
        enumerable: false,
        configurable: false
      });
    });
    overwriteGetterForCaching(this, 'getDocumentPrototype', () => proto);
    return proto;
  };
  _proto.getPrimaryOfDocumentData = function getPrimaryOfDocumentData(documentData) {
    return getComposedPrimaryKeyOfDocumentData(this.jsonSchema, documentData);
  };
  return _createClass(RxSchema, [{
    key: "version",
    get: function () {
      return this.jsonSchema.version;
    }
  }, {
    key: "defaultValues",
    get: function () {
      var values = {};
      Object.entries(this.jsonSchema.properties).filter(([, v]) => Object.prototype.hasOwnProperty.call(v, 'default')).forEach(([k, v]) => values[k] = v.default);
      return overwriteGetterForCaching(this, 'defaultValues', values);
    }

    /**
     * @overrides itself on the first call
     */
  }, {
    key: "hash",
    get: function () {
      return overwriteGetterForCaching(this, 'hash', this.hashFunction(JSON.stringify(this.jsonSchema)));
    }
  }]);
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
export function createRxSchema(jsonSchema, hashFunction, runPreCreateHooks = true) {
  if (runPreCreateHooks) {
    runPluginHooks('preCreateRxSchema', jsonSchema);
  }
  var useJsonSchema = fillWithDefaultSettings(jsonSchema);
  useJsonSchema = normalizeRxJsonSchema(useJsonSchema);
  overwritable.deepFreezeWhenDevMode(useJsonSchema);
  var schema = new RxSchema(useJsonSchema, hashFunction);
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