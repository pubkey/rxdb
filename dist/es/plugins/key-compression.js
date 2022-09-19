/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */
import { createCompressionTable, compressObject, decompressObject, compressedPath, DEFAULT_COMPRESSION_FLAG, createCompressedJsonSchema, compressQuery } from 'jsonschema-key-compression';
import { overwritable } from '../overwritable';
import { wrapRxStorageInstance } from '../plugin-helpers';
import { getPrimaryFieldOfPrimaryKey } from '../rx-schema-helper';
import { flatCloneDocWithMeta } from '../rx-storage-helper';
import { flatClone, isMaybeReadonlyArray } from '../util';

/**
 * Cache the compression table and the compressed schema
 * by the storage instance for better performance.
 */
var COMPRESSION_STATE_BY_SCHEMA = new WeakMap();
export function getCompressionStateByRxJsonSchema(schema) {
  /**
   * Because we cache the state by the JsonSchema,
   * it must be ausured that the given schema object
   * is never mutated.
   */
  overwritable.deepFreezeWhenDevMode(schema);
  var compressionState = COMPRESSION_STATE_BY_SCHEMA.get(schema);

  if (!compressionState) {
    var compressionSchema = flatClone(schema);
    delete compressionSchema.primaryKey;
    var table = createCompressionTable(compressionSchema, DEFAULT_COMPRESSION_FLAG, [
    /**
     * Do not compress the primary field
     * for easier debugging.
     */
    getPrimaryFieldOfPrimaryKey(schema.primaryKey), '_rev', '_attachments', '_deleted', '_meta']);
    delete compressionSchema.primaryKey;
    var compressedSchema = createCompressedJsonSchema(table, compressionSchema); // also compress primary key

    if (typeof schema.primaryKey !== 'string') {
      var composedPrimary = schema.primaryKey;
      var newComposedPrimary = {
        key: compressedPath(table, composedPrimary.key),
        fields: composedPrimary.fields.map(function (field) {
          return compressedPath(table, field);
        }),
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
      var newIndexes = schema.indexes.map(function (idx) {
        if (isMaybeReadonlyArray(idx)) {
          return idx.map(function (subIdx) {
            return compressedPath(table, subIdx);
          });
        } else {
          return compressedPath(table, idx);
        }
      });
      compressedSchema.indexes = newIndexes;
    }

    compressionState = {
      table: table,
      schema: schema,
      compressedSchema: compressedSchema
    };
    COMPRESSION_STATE_BY_SCHEMA.set(schema, compressionState);
  }

  return compressionState;
}
export function wrappedKeyCompressionStorage(args) {
  var statics = Object.assign({}, args.storage.statics, {
    prepareQuery: function prepareQuery(schema, mutateableQuery) {
      if (schema.keyCompression) {
        var compressionState = getCompressionStateByRxJsonSchema(schema);
        mutateableQuery = compressQuery(compressionState.table, mutateableQuery);
        return args.storage.statics.prepareQuery(compressionState.compressedSchema, mutateableQuery);
      }

      return args.storage.statics.prepareQuery(schema, mutateableQuery);
    },
    getSortComparator: function getSortComparator(schema, preparedQuery) {
      if (!schema.keyCompression) {
        return args.storage.statics.getSortComparator(schema, preparedQuery);
      } else {
        var compressionState = getCompressionStateByRxJsonSchema(schema);
        var comparator = args.storage.statics.getSortComparator(compressionState.schema, preparedQuery);
        return function (a, b) {
          var compressedDocDataA = compressObject(compressionState.table, a);
          var compressedDocDataB = compressObject(compressionState.table, b);
          var res = comparator(compressedDocDataA, compressedDocDataB);
          return res;
        };
      }
    },
    getQueryMatcher: function getQueryMatcher(schema, preparedQuery) {
      if (!schema.keyCompression) {
        return args.storage.statics.getQueryMatcher(schema, preparedQuery);
      } else {
        var compressionState = getCompressionStateByRxJsonSchema(schema);
        var matcher = args.storage.statics.getQueryMatcher(compressionState.schema, preparedQuery);
        return function (docData) {
          var compressedDocData = compressObject(compressionState.table, docData);
          var ret = matcher(compressedDocData);
          return ret;
        };
      }
    }
  });
  return Object.assign({}, args.storage, {
    statics: statics,
    createStorageInstance: function createStorageInstance(params) {
      try {
        var modifyToStorage = function modifyToStorage(docData) {
          return compressDocumentData(compressionState, docData);
        };

        var modifyFromStorage = function modifyFromStorage(docData) {
          return decompressDocumentData(compressionState, docData);
        };
        /**
         * Because this wrapper resolves the key-compression,
         * we can set the flag to false
         * which allows underlying storages to detect wrong conficturations
         * like when keyCompression is set to false but no key-compression module is used.
         */


        if (!params.schema.keyCompression) {
          return Promise.resolve(args.storage.createStorageInstance(params));
        }

        var compressionState = getCompressionStateByRxJsonSchema(params.schema);
        var childSchema = flatClone(compressionState.compressedSchema);
        childSchema.keyCompression = false;
        return Promise.resolve(args.storage.createStorageInstance(Object.assign({}, params, {
          schema: childSchema
        }))).then(function (instance) {
          return wrapRxStorageInstance(instance, modifyToStorage, modifyFromStorage);
        });
      } catch (e) {
        return Promise.reject(e);
      }
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
//# sourceMappingURL=key-compression.js.map