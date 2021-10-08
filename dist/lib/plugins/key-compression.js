"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBKeyCompressionPlugin = void 0;
exports.createCompressionState = createCompressionState;
exports.getCompressionStateByStorageInstance = getCompressionStateByStorageInstance;
exports.rxdb = exports.prototypes = exports.overwritable = void 0;

var _jsonschemaKeyCompression = require("jsonschema-key-compression");

var _rxSchema = require("../rx-schema");

var _util = require("../util");

/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */

/**
 * Cache the compression table and the compressed schema
 * by the storage instance for better performance.
 */
var COMPRESSION_STATE_BY_COLLECTION = new WeakMap();

function createCompressionState(schema) {
  var compressionSchema = (0, _util.flatClone)(schema);
  delete compressionSchema.primaryKey;
  var table = (0, _jsonschemaKeyCompression.createCompressionTable)(compressionSchema, _jsonschemaKeyCompression.DEFAULT_COMPRESSION_FLAG, [
  /**
   * Do not compress the primary field
   * for easier debugging.
   */
  (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(schema.primaryKey), '_rev', '_attachments', '_deleted']);
  delete compressionSchema.primaryKey;
  var compressedSchema = (0, _jsonschemaKeyCompression.createCompressedJsonSchema)(table, compressionSchema); // also compress primary key

  if (typeof schema.primaryKey !== 'string') {
    var composedPrimary = schema.primaryKey;
    var newComposedPrimary = {
      key: (0, _jsonschemaKeyCompression.compressedPath)(table, composedPrimary.key),
      fields: composedPrimary.fields.map(function (field) {
        return (0, _jsonschemaKeyCompression.compressedPath)(table, field);
      }),
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
    var newIndexes = schema.indexes.map(function (idx) {
      if (Array.isArray(idx)) {
        return idx.map(function (subIdx) {
          return (0, _jsonschemaKeyCompression.compressedPath)(table, subIdx);
        });
      } else {
        return (0, _jsonschemaKeyCompression.compressedPath)(table, idx);
      }
    });
    compressedSchema.indexes = newIndexes;
  }

  return {
    table: table,
    schema: compressedSchema
  };
}

function getCompressionStateByStorageInstance(collection) {
  var state = COMPRESSION_STATE_BY_COLLECTION.get(collection);

  if (!state) {
    state = createCompressionState(collection.schema.jsonSchema);
    COMPRESSION_STATE_BY_COLLECTION.set(collection, state);
  }

  return state;
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {};
exports.prototypes = prototypes;
var overwritable = {};
exports.overwritable = overwritable;
var RxDBKeyCompressionPlugin = {
  name: 'key-compression',
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  hooks: {
    /**
     * replace the keys of a query-obj with the compressed keys
     * because the storage instance only know the compressed schema
     * @return compressed queryJSON
     */
    prePrepareQuery: function prePrepareQuery(input) {
      var rxQuery = input.rxQuery;
      var mangoQuery = input.mangoQuery;

      if (!rxQuery.collection.schema.jsonSchema.keyCompression) {
        return;
      }

      var compressionState = getCompressionStateByStorageInstance(rxQuery.collection);
      var compressedQuery = (0, _jsonschemaKeyCompression.compressQuery)(compressionState.table, mangoQuery);
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
      params.doc = (0, _jsonschemaKeyCompression.compressObject)(state.table, params.doc);
    },
    preSortComparator: function preSortComparator(params) {
      if (!params.rxQuery.collection.schema.jsonSchema.keyCompression) {
        return;
      }

      var state = getCompressionStateByStorageInstance(params.rxQuery.collection);
      params.docA = (0, _jsonschemaKeyCompression.compressObject)(state.table, params.docA);
      params.docB = (0, _jsonschemaKeyCompression.compressObject)(state.table, params.docB);
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

      var attachments = params.doc._attachments;
      delete params.doc._attachments;
      params.doc = (0, _jsonschemaKeyCompression.compressObject)(state.table, params.doc);
      params.doc._attachments = attachments;
    },
    postReadFromInstance: function postReadFromInstance(params) {
      if (!params.collection.schema.jsonSchema.keyCompression) {
        return;
      }

      var state = getCompressionStateByStorageInstance(params.collection);
      params.doc = (0, _jsonschemaKeyCompression.decompressObject)(state.table, params.doc);
    }
  }
};
exports.RxDBKeyCompressionPlugin = RxDBKeyCompressionPlugin;

//# sourceMappingURL=key-compression.js.map