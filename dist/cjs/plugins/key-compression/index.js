"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compressDocumentData = compressDocumentData;
exports.decompressDocumentData = decompressDocumentData;
exports.getCompressionStateByRxJsonSchema = getCompressionStateByRxJsonSchema;
exports.wrappedKeyCompressionStorage = wrappedKeyCompressionStorage;
var _jsonschemaKeyCompression = require("jsonschema-key-compression");
var _overwritable = require("../../overwritable.js");
var _pluginHelpers = require("../../plugin-helpers.js");
var _rxSchemaHelper = require("../../rx-schema-helper.js");
var _rxStorageHelper = require("../../rx-storage-helper.js");
var _index = require("../../plugins/utils/index.js");
var _rxQueryHelper = require("../../rx-query-helper.js");
/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you don't use this, ensure that you set disableKeyCompression to false in your schema
 */

/**
 * Cache the compression table and the compressed schema
 * by the storage instance for better performance.
 */
var COMPRESSION_STATE_BY_SCHEMA = new WeakMap();
function getCompressionStateByRxJsonSchema(schema) {
  /**
   * Because we cache the state by the JsonSchema,
   * it must be assured that the given schema object
   * is never mutated.
   */
  _overwritable.overwritable.deepFreezeWhenDevMode(schema);
  return (0, _index.getFromMapOrCreate)(COMPRESSION_STATE_BY_SCHEMA, schema, () => {
    var compressionSchema = (0, _index.flatClone)(schema);
    delete compressionSchema.primaryKey;
    var table = (0, _jsonschemaKeyCompression.createCompressionTable)(compressionSchema, _jsonschemaKeyCompression.DEFAULT_COMPRESSION_FLAG, [
    /**
     * Do not compress the primary field
     * for easier debugging.
     */
    (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey), '_rev', '_attachments', '_deleted', '_meta']);
    delete compressionSchema.primaryKey;
    var compressedSchema = (0, _jsonschemaKeyCompression.createCompressedJsonSchema)(table, compressionSchema);

    // also compress primary key
    if (typeof schema.primaryKey !== 'string') {
      var composedPrimary = schema.primaryKey;
      var newComposedPrimary = {
        key: (0, _jsonschemaKeyCompression.compressedPath)(table, composedPrimary.key),
        fields: composedPrimary.fields.map(field => (0, _jsonschemaKeyCompression.compressedPath)(table, field)),
        separator: composedPrimary.separator
      };
      compressedSchema.primaryKey = newComposedPrimary;
    } else {
      compressedSchema.primaryKey = (0, _jsonschemaKeyCompression.compressedPath)(table, schema.primaryKey);
    }

    /**
     * the key compression module does not know about indexes
     * in the schema, so we have to also compress them here.
     */
    if (schema.indexes) {
      var newIndexes = schema.indexes.map(idx => {
        if ((0, _index.isMaybeReadonlyArray)(idx)) {
          return idx.map(subIdx => (0, _jsonschemaKeyCompression.compressedPath)(table, subIdx));
        } else {
          return (0, _jsonschemaKeyCompression.compressedPath)(table, idx);
        }
      });
      compressedSchema.indexes = newIndexes;
    }
    var compressionState = {
      table,
      schema,
      compressedSchema
    };
    return compressionState;
  });
}
function wrappedKeyCompressionStorage(args) {
  return Object.assign({}, args.storage, {
    async createStorageInstance(params) {
      if (!params.schema.keyCompression) {
        return args.storage.createStorageInstance(params);
      }
      var compressionState = getCompressionStateByRxJsonSchema(params.schema);
      function modifyToStorage(docData) {
        var ret = compressDocumentData(compressionState, docData);
        return ret;
      }
      function modifyFromStorage(docData) {
        return decompressDocumentData(compressionState, docData);
      }

      /**
       * Because this wrapper resolves the key-compression,
       * we can set the flag to false
       * which allows underlying storages to detect wrong configurations
       * like when keyCompression is set to false but no key-compression module is used.
       */
      var childSchema = (0, _index.flatClone)(compressionState.compressedSchema);
      childSchema.keyCompression = false;
      var instance = await args.storage.createStorageInstance(Object.assign({}, params, {
        schema: childSchema
      }));
      var wrappedInstance = (0, _pluginHelpers.wrapRxStorageInstance)(params.schema, instance, modifyToStorage, modifyFromStorage);
      var overwriteMethods = ['query', 'count'];
      overwriteMethods.forEach(methodName => {
        var methodBefore = wrappedInstance[methodName].bind(wrappedInstance);
        wrappedInstance[methodName] = async preparedQuery => {
          var compressedQuery = (0, _jsonschemaKeyCompression.compressQuery)(compressionState.table, preparedQuery.query);
          var compressedPreparedQuery = (0, _rxQueryHelper.prepareQuery)(compressionState.compressedSchema, compressedQuery);
          return methodBefore(compressedPreparedQuery);
        };
      });
      return wrappedInstance;
    }
  });
}
function compressDocumentData(compressionState, docData) {
  /**
   * Do not send attachments to compressObject()
   * because it will deep clone which does not work on Blob or Buffer.
   */
  docData = (0, _rxStorageHelper.flatCloneDocWithMeta)(docData);
  var attachments = docData._attachments;
  delete docData._attachments;
  docData = (0, _jsonschemaKeyCompression.compressObject)(compressionState.table, docData);
  docData._attachments = attachments;
  return docData;
}
function decompressDocumentData(compressionState, docData) {
  return (0, _jsonschemaKeyCompression.decompressObject)(compressionState.table, docData);
}
//# sourceMappingURL=index.js.map