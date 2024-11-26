/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you don't use this, ensure that you set disableKeyCompression to false in your schema
 */

import { createCompressionTable, compressObject, decompressObject, compressedPath, DEFAULT_COMPRESSION_FLAG, createCompressedJsonSchema, compressQuery } from 'jsonschema-key-compression';
import { overwritable } from "../../overwritable.js";
import { wrapRxStorageInstance } from "../../plugin-helpers.js";
import { getPrimaryFieldOfPrimaryKey } from "../../rx-schema-helper.js";
import { flatCloneDocWithMeta } from "../../rx-storage-helper.js";
import { flatClone, getFromMapOrCreate, isMaybeReadonlyArray } from "../../plugins/utils/index.js";
import { prepareQuery } from "../../rx-query-helper.js";
/**
 * Cache the compression table and the compressed schema
 * by the storage instance for better performance.
 */
var COMPRESSION_STATE_BY_SCHEMA = new WeakMap();
export function getCompressionStateByRxJsonSchema(schema) {
  /**
   * Because we cache the state by the JsonSchema,
   * it must be assured that the given schema object
   * is never mutated.
   */
  overwritable.deepFreezeWhenDevMode(schema);
  return getFromMapOrCreate(COMPRESSION_STATE_BY_SCHEMA, schema, () => {
    var compressionSchema = flatClone(schema);
    delete compressionSchema.primaryKey;
    var table = createCompressionTable(compressionSchema, DEFAULT_COMPRESSION_FLAG, [
    /**
     * Do not compress the primary field
     * for easier debugging.
     */
    getPrimaryFieldOfPrimaryKey(schema.primaryKey), '_rev', '_attachments', '_deleted', '_meta']);
    delete compressionSchema.primaryKey;
    var compressedSchema = createCompressedJsonSchema(table, compressionSchema);

    // also compress primary key
    if (typeof schema.primaryKey !== 'string') {
      var composedPrimary = schema.primaryKey;
      var newComposedPrimary = {
        key: compressedPath(table, composedPrimary.key),
        fields: composedPrimary.fields.map(field => compressedPath(table, field)),
        separator: composedPrimary.separator
      };
      compressedSchema.primaryKey = newComposedPrimary;
    } else {
      compressedSchema.primaryKey = compressedPath(table, schema.primaryKey);
    }

    /**
     * the key compression module does not know about indexes
     * in the schema, so we have to also compress them here.
     */
    if (schema.indexes) {
      var newIndexes = schema.indexes.map(idx => {
        if (isMaybeReadonlyArray(idx)) {
          return idx.map(subIdx => compressedPath(table, subIdx));
        } else {
          return compressedPath(table, idx);
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
export function wrappedKeyCompressionStorage(args) {
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
      var childSchema = flatClone(compressionState.compressedSchema);
      childSchema.keyCompression = false;
      var instance = await args.storage.createStorageInstance(Object.assign({}, params, {
        schema: childSchema
      }));
      var wrappedInstance = wrapRxStorageInstance(params.schema, instance, modifyToStorage, modifyFromStorage);
      var overwriteMethods = ['query', 'count'];
      overwriteMethods.forEach(methodName => {
        var methodBefore = wrappedInstance[methodName].bind(wrappedInstance);
        wrappedInstance[methodName] = async preparedQuery => {
          var compressedQuery = compressQuery(compressionState.table, preparedQuery.query);
          var compressedPreparedQuery = prepareQuery(compressionState.compressedSchema, compressedQuery);
          return methodBefore(compressedPreparedQuery);
        };
      });
      return wrappedInstance;
    }
  });
}
export function compressDocumentData(compressionState, docData) {
  /**
   * Do not send attachments to compressObject()
   * because it will deep clone which does not work on Blob or Buffer.
   */
  docData = flatCloneDocWithMeta(docData);
  var attachments = docData._attachments;
  delete docData._attachments;
  docData = compressObject(compressionState.table, docData);
  docData._attachments = attachments;
  return docData;
}
export function decompressDocumentData(compressionState, docData) {
  return decompressObject(compressionState.table, docData);
}
//# sourceMappingURL=index.js.map