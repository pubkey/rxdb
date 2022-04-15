"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBKeyCompressionPlugin = void 0;
exports.createCompressionState = createCompressionState;
exports.getCompressionStateByRxJsonSchema = getCompressionStateByRxJsonSchema;

var _jsonschemaKeyCompression = require("jsonschema-key-compression");

var _overwritable = require("../overwritable");

var _rxSchemaHelper = require("../rx-schema-helper");

var _util = require("../util");

/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */

/**
 * Cache the compression table and the compressed schema
 * by the storage instance for better performance.
 */
var COMPRESSION_STATE_BY_SCHEMA = new WeakMap();

function createCompressionState(schema) {
  var compressionSchema = (0, _util.flatClone)(schema);
  delete compressionSchema.primaryKey;
  var table = (0, _jsonschemaKeyCompression.createCompressionTable)(compressionSchema, _jsonschemaKeyCompression.DEFAULT_COMPRESSION_FLAG, [
  /**
   * Do not compress the primary field
   * for easier debugging.
   */
  (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey), '_rev', '_attachments', '_deleted', '_meta']);
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
      if ((0, _util.isMaybeReadonlyArray)(idx)) {
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

function getCompressionStateByRxJsonSchema(schema) {
  var state = COMPRESSION_STATE_BY_SCHEMA.get(schema);

  if (!state) {
    /**
     * Because we cache the state by the JsonSchema,
     * it must be ausured that the given schema object never changes.
     */
    _overwritable.overwritable.deepFreezeWhenDevMode(schema);

    state = createCompressionState(schema);
    COMPRESSION_STATE_BY_SCHEMA.set(schema, state);
  }

  return state;
}

var RxDBKeyCompressionPlugin = {
  name: 'key-compression',
  rxdb: true,
  prototypes: {},
  overwritable: {},
  hooks: {
    /**
     * replace the keys of a query-obj with the compressed keys
     * because the storage instance only knows the compressed schema
     * @return compressed queryJSON
     */
    prePrepareQuery: {
      after: function after(input) {
        var rxQuery = input.rxQuery;
        var mangoQuery = input.mangoQuery;

        if (!rxQuery.collection.schema.jsonSchema.keyCompression) {
          return;
        }

        var compressionState = getCompressionStateByRxJsonSchema(rxQuery.collection.schema.jsonSchema);
        var compressedQuery = (0, _jsonschemaKeyCompression.compressQuery)(compressionState.table, mangoQuery);
        input.mangoQuery = compressedQuery;
      }
    },
    preCreateRxStorageInstance: {
      after: function after(params) {
        /**
         * When key compression is used,
         * the storage instance only knows about the compressed schema
         */
        if (params.schema.keyCompression) {
          var compressionState = createCompressionState(params.schema);
          params.schema = compressionState.schema;
        }
      }
    },
    preQueryMatcher: {
      after: function after(params) {
        if (!params.rxQuery.collection.schema.jsonSchema.keyCompression) {
          return;
        }

        var state = getCompressionStateByRxJsonSchema(params.rxQuery.collection.schema.jsonSchema);
        params.doc = (0, _jsonschemaKeyCompression.compressObject)(state.table, params.doc);
      }
    },
    preSortComparator: {
      after: function after(params) {
        if (!params.rxQuery.collection.schema.jsonSchema.keyCompression) {
          return;
        }

        var state = getCompressionStateByRxJsonSchema(params.rxQuery.collection.schema.jsonSchema);
        params.docA = (0, _jsonschemaKeyCompression.compressObject)(state.table, params.docA);
        params.docB = (0, _jsonschemaKeyCompression.compressObject)(state.table, params.docB);
      }
    },
    preWriteToStorageInstance: {
      /**
       * Must run as last because other plugin hooks
       * might no longer work when the key-compression
       * changed the document keys.
       */
      after: function after(params) {
        if (!params.schema.keyCompression) {
          return;
        }

        var state = getCompressionStateByRxJsonSchema(params.schema);
        /**
         * Do not send attachments to compressObject()
         * because it will deep clone which does not work on Blob or Buffer.
         */

        params.doc = (0, _util.flatClone)(params.doc);
        var attachments = params.doc._attachments;
        delete params.doc._attachments;
        params.doc = (0, _jsonschemaKeyCompression.compressObject)(state.table, params.doc);
        params.doc._attachments = attachments;
      }
    },
    postReadFromInstance: {
      /**
       * Use 'before' because it must de-compress
       * the object keys before the other hooks can work.
       */
      before: function before(params) {
        if (!params.schema.keyCompression) {
          return;
        }

        var state = getCompressionStateByRxJsonSchema(params.schema);
        params.doc = (0, _jsonschemaKeyCompression.decompressObject)(state.table, params.doc);
      }
    }
  }
};
exports.RxDBKeyCompressionPlugin = RxDBKeyCompressionPlugin;
//# sourceMappingURL=key-compression.js.map