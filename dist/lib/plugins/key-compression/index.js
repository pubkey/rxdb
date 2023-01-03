"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compressDocumentData = compressDocumentData;
exports.decompressDocumentData = decompressDocumentData;
exports.getCompressionStateByRxJsonSchema = getCompressionStateByRxJsonSchema;
exports.wrappedKeyCompressionStorage = wrappedKeyCompressionStorage;
var _jsonschemaKeyCompression = require("jsonschema-key-compression");
var _overwritable = require("../../overwritable");
var _pluginHelpers = require("../../plugin-helpers");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
var _utils = require("../../plugins/utils");
/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */

/**
 * Cache the compression table and the compressed schema
 * by the storage instance for better performance.
 */
var COMPRESSION_STATE_BY_SCHEMA = new WeakMap();
function getCompressionStateByRxJsonSchema(schema) {
  /**
   * Because we cache the state by the JsonSchema,
   * it must be ausured that the given schema object
   * is never mutated.
   */
  _overwritable.overwritable.deepFreezeWhenDevMode(schema);
  var compressionState = COMPRESSION_STATE_BY_SCHEMA.get(schema);
  if (!compressionState) {
    var compressionSchema = (0, _utils.flatClone)(schema);
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
        if ((0, _utils.isMaybeReadonlyArray)(idx)) {
          return idx.map(subIdx => (0, _jsonschemaKeyCompression.compressedPath)(table, subIdx));
        } else {
          return (0, _jsonschemaKeyCompression.compressedPath)(table, idx);
        }
      });
      compressedSchema.indexes = newIndexes;
    }
    compressionState = {
      table,
      schema,
      compressedSchema
    };
    COMPRESSION_STATE_BY_SCHEMA.set(schema, compressionState);
  }
  return compressionState;
}
function wrappedKeyCompressionStorage(args) {
  var statics = Object.assign({}, args.storage.statics, {
    prepareQuery(schema, mutateableQuery) {
      if (schema.keyCompression) {
        var compressionState = getCompressionStateByRxJsonSchema(schema);
        mutateableQuery = (0, _jsonschemaKeyCompression.compressQuery)(compressionState.table, mutateableQuery);
        return args.storage.statics.prepareQuery(compressionState.compressedSchema, mutateableQuery);
      }
      return args.storage.statics.prepareQuery(schema, mutateableQuery);
    },
    getSortComparator(schema, preparedQuery) {
      if (!schema.keyCompression) {
        return args.storage.statics.getSortComparator(schema, preparedQuery);
      } else {
        var compressionState = getCompressionStateByRxJsonSchema(schema);
        var comparator = args.storage.statics.getSortComparator(compressionState.schema, preparedQuery);
        return (a, b) => {
          var compressedDocDataA = (0, _jsonschemaKeyCompression.compressObject)(compressionState.table, a);
          var compressedDocDataB = (0, _jsonschemaKeyCompression.compressObject)(compressionState.table, b);
          var res = comparator(compressedDocDataA, compressedDocDataB);
          return res;
        };
      }
    },
    getQueryMatcher(schema, preparedQuery) {
      if (!schema.keyCompression) {
        return args.storage.statics.getQueryMatcher(schema, preparedQuery);
      } else {
        var compressionState = getCompressionStateByRxJsonSchema(schema);
        var matcher = args.storage.statics.getQueryMatcher(compressionState.schema, preparedQuery);
        return docData => {
          var compressedDocData = (0, _jsonschemaKeyCompression.compressObject)(compressionState.table, docData);
          var ret = matcher(compressedDocData);
          return ret;
        };
      }
    }
  });
  return Object.assign({}, args.storage, {
    statics,
    async createStorageInstance(params) {
      if (!params.schema.keyCompression) {
        return args.storage.createStorageInstance(params);
      }
      var compressionState = getCompressionStateByRxJsonSchema(params.schema);
      function modifyToStorage(docData) {
        return compressDocumentData(compressionState, docData);
      }
      function modifyFromStorage(docData) {
        return decompressDocumentData(compressionState, docData);
      }

      /**
       * Because this wrapper resolves the key-compression,
       * we can set the flag to false
       * which allows underlying storages to detect wrong conficturations
       * like when keyCompression is set to false but no key-compression module is used.
       */
      var childSchema = (0, _utils.flatClone)(compressionState.compressedSchema);
      childSchema.keyCompression = false;
      var instance = await args.storage.createStorageInstance(Object.assign({}, params, {
        schema: childSchema
      }));
      return (0, _pluginHelpers.wrapRxStorageInstance)(instance, modifyToStorage, modifyFromStorage);
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