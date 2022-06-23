import _createClass from "@babel/runtime/helpers/createClass";
import deepEqual from 'fast-deep-equal';
import { hash, overwriteGetterForCaching, flatClone, isMaybeReadonlyArray } from './util';
import { newRxError } from './rx-error';
import { runPluginHooks } from './hooks';
import { defineGetterSetter } from './rx-document';
import { fillWithDefaultSettings, getComposedPrimaryKeyOfDocumentData, getFinalFields, getPrimaryFieldOfPrimaryKey, normalizeRxJsonSchema } from './rx-schema-helper';
import { overwritable } from './overwritable';
import { fillObjectDataBeforeInsert } from './rx-collection-helper';
export var RxSchema = /*#__PURE__*/function () {
  function RxSchema(jsonSchema) {
    this.jsonSchema = jsonSchema;
    this.indexes = getIndexes(this.jsonSchema); // primary is always required

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
   * validate if the given document data matches the schema
   * @param schemaPath if given, validates against deep-path of schema
   * @throws {Error} if not valid
   * @param obj equal to input-obj
   *
   */
  ;

  _proto.validate = function validate(obj, schemaPath) {
    if (!this.validateFullDocumentData) {
      return;
    } else {
      var fullDocData = fillObjectDataBeforeInsert(this, obj);
      return this.validateFullDocumentData(fullDocData, schemaPath);
    }
  }
  /**
   * @overwritten by the given validation plugin
   */
  ;

  _proto.validateFullDocumentData = function validateFullDocumentData(_docData, _schemaPath) {
    /**
     * This method might be overwritten by a validation plugin,
     * otherwise do nothing, because if not validation plugin
     * was added to RxDB, we assume all given data is valid.
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
    key: "defaultValues",
    get: function get() {
      var values = {};
      Object.entries(this.jsonSchema.properties).filter(function (_ref3) {
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
      return overwriteGetterForCaching(this, 'hash', hash(this.jsonSchema));
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
export function createRxSchema(jsonSchema) {
  var runPreCreateHooks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

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