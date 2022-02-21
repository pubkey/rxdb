/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */
import { createCompressionTable, compressObject, decompressObject, compressedPath, compressQuery, DEFAULT_COMPRESSION_FLAG, createCompressedJsonSchema } from 'jsonschema-key-compression';
import { getPrimaryFieldOfPrimaryKey } from '../rx-schema';
import { flatClone, isMaybeReadonlyArray } from '../util';

/**
 * Cache the compression table and the compressed schema
 * by the storage instance for better performance.
 */
var COMPRESSION_STATE_BY_COLLECTION = new WeakMap();
export function createCompressionState(schema) {
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

  return {
    table: table,
    schema: compressedSchema
  };
}
export function getCompressionStateByStorageInstance(collection) {
  var state = COMPRESSION_STATE_BY_COLLECTION.get(collection);

  if (!state) {
    state = createCompressionState(collection.schema.jsonSchema);
    COMPRESSION_STATE_BY_COLLECTION.set(collection, state);
  }

  return state;
}
export var rxdb = true;
export var prototypes = {};
export var overwritable = {};
export var RxDBKeyCompressionPlugin = {
  name: 'key-compression',
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  hooks: {
    /**
     * replace the keys of a query-obj with the compressed keys
     * because the storage instance only knows the compressed schema
     * @return compressed queryJSON
     */
    prePrepareQuery: function prePrepareQuery(input) {
      var rxQuery = input.rxQuery;
      var mangoQuery = input.mangoQuery;

      if (!rxQuery.collection.schema.jsonSchema.keyCompression) {
        return;
      }

      var compressionState = getCompressionStateByStorageInstance(rxQuery.collection);
      var compressedQuery = compressQuery(compressionState.table, mangoQuery);
      input.mangoQuery = compressedQuery;
    },
    preCreateRxStorageInstance: function preCreateRxStorageInstance(params) {
      /**
       * When key compression is used,
       * the storage instance only knows about the compressed schema
       */
      if (params.schema.keyCompression) {
        var compressionState = createCompressionState(params.schema);
        params.schema = compressionState.schema;
      }
    },
    preQueryMatcher: function preQueryMatcher(params) {
      if (!params.rxQuery.collection.schema.jsonSchema.keyCompression) {
        return;
      }

      var state = getCompressionStateByStorageInstance(params.rxQuery.collection);
      params.doc = compressObject(state.table, params.doc);
    },
    preSortComparator: function preSortComparator(params) {
      if (!params.rxQuery.collection.schema.jsonSchema.keyCompression) {
        return;
      }

      var state = getCompressionStateByStorageInstance(params.rxQuery.collection);
      params.docA = compressObject(state.table, params.docA);
      params.docB = compressObject(state.table, params.docB);
    },
    preWriteToStorageInstance: function preWriteToStorageInstance(params) {
      if (!params.collection.schema.jsonSchema.keyCompression) {
        return;
      }

      var state = getCompressionStateByStorageInstance(params.collection);
      /**
       * Do not send attachments to compressObject()
       * because it will deep clone which does not work on Blob or Buffer.
       */

      params.doc = flatClone(params.doc);
      var attachments = params.doc._attachments;
      delete params.doc._attachments;
      params.doc = compressObject(state.table, params.doc);
      params.doc._attachments = attachments;
    },
    postReadFromInstance: function postReadFromInstance(params) {
      if (!params.collection.schema.jsonSchema.keyCompression) {
        return;
      }

      var state = getCompressionStateByStorageInstance(params.collection);
      params.doc = decompressObject(state.table, params.doc);
    }
  }
};
//# sourceMappingURL=key-compression.js.map