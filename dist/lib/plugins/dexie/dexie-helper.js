"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.closeDexieDb = exports.DEXIE_PIPE_SUBSTITUTE = exports.DEXIE_DOCS_TABLE_NAME = exports.DEXIE_DELETED_DOCS_TABLE_NAME = exports.DEXIE_CHANGES_TABLE_NAME = void 0;
exports.dexieReplaceIfStartsWithPipe = dexieReplaceIfStartsWithPipe;
exports.dexieReplaceIfStartsWithPipeRevert = dexieReplaceIfStartsWithPipeRevert;
exports.fromDexieToStorage = fromDexieToStorage;
exports.fromStorageToDexie = fromStorageToDexie;
exports.getDexieDbWithTables = getDexieDbWithTables;
exports.getDexieSortComparator = getDexieSortComparator;
exports.getDexieStoreSchema = getDexieStoreSchema;
exports.getDocsInDb = void 0;

var _mingo = _interopRequireDefault(require("mingo"));

var _dexie = require("dexie");

var _util = require("../../util");

var _rxError = require("../../rx-error");

var _rxSchemaHelper = require("../../rx-schema-helper");

/**
 * Returns all documents in the database.
 * Non-deleted plus deleted ones.
 */
var getDocsInDb = function getDocsInDb(internals, docIds) {
  return Promise.resolve(internals).then(function (state) {
    return Promise.resolve(Promise.all([state.dexieTable.bulkGet(docIds), state.dexieDeletedTable.bulkGet(docIds)])).then(function (_ref3) {
      var nonDeletedDocsInDb = _ref3[0],
          deletedDocsInDb = _ref3[1];
      var docsInDb = deletedDocsInDb.slice(0);
      nonDeletedDocsInDb.forEach(function (doc, idx) {
        if (doc) {
          docsInDb[idx] = doc;
        }
      });
      return docsInDb;
    });
  });
};

exports.getDocsInDb = getDocsInDb;

var closeDexieDb = function closeDexieDb(statePromise) {
  return Promise.resolve(statePromise).then(function (state) {
    var prevCount = REF_COUNT_PER_DEXIE_DB.get(statePromise);
    var newCount = prevCount - 1;

    if (newCount === 0) {
      state.dexieDb.close();
      REF_COUNT_PER_DEXIE_DB["delete"](statePromise);
    } else {
      REF_COUNT_PER_DEXIE_DB.set(statePromise, newCount);
    }
  });
};

exports.closeDexieDb = closeDexieDb;
var DEXIE_DOCS_TABLE_NAME = 'docs';
exports.DEXIE_DOCS_TABLE_NAME = DEXIE_DOCS_TABLE_NAME;
var DEXIE_DELETED_DOCS_TABLE_NAME = 'deleted-docs';
exports.DEXIE_DELETED_DOCS_TABLE_NAME = DEXIE_DELETED_DOCS_TABLE_NAME;
var DEXIE_CHANGES_TABLE_NAME = 'changes';
exports.DEXIE_CHANGES_TABLE_NAME = DEXIE_CHANGES_TABLE_NAME;
var DEXIE_STATE_DB_BY_NAME = new Map();
var REF_COUNT_PER_DEXIE_DB = new Map();

function getDexieDbWithTables(databaseName, collectionName, settings, schema) {
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
  var dexieDbName = 'rxdb-dexie-' + databaseName + '--' + schema.version + '--' + collectionName;
  var state = DEXIE_STATE_DB_BY_NAME.get(dexieDbName);

  if (!state) {
    state = function () {
      try {
        var _dexieStoresSettings;

        /**
         * IndexedDB was not designed for dynamically adding tables on the fly,
         * so we create one dexie database per RxDB storage instance.
         * @link https://github.com/dexie/Dexie.js/issues/684#issuecomment-373224696
         */
        var useSettings = (0, _util.flatClone)(settings);
        useSettings.autoOpen = false;
        var dexieDb = new _dexie.Dexie(dexieDbName, useSettings);
        var dexieStoresSettings = (_dexieStoresSettings = {}, _dexieStoresSettings[DEXIE_DOCS_TABLE_NAME] = getDexieStoreSchema(schema), _dexieStoresSettings[DEXIE_CHANGES_TABLE_NAME] = '++sequence, id', _dexieStoresSettings[DEXIE_DELETED_DOCS_TABLE_NAME] = primaryPath + ',_meta.lwt,[_meta.lwt+' + primaryPath + ']', _dexieStoresSettings);
        dexieDb.version(1).stores(dexieStoresSettings);
        return Promise.resolve(dexieDb.open()).then(function () {
          return {
            dexieDb: dexieDb,
            dexieTable: dexieDb[DEXIE_DOCS_TABLE_NAME],
            dexieDeletedTable: dexieDb[DEXIE_DELETED_DOCS_TABLE_NAME],
            dexieChangesTable: dexieDb[DEXIE_CHANGES_TABLE_NAME]
          };
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }();

    DEXIE_STATE_DB_BY_NAME.set(dexieDbName, state);
    REF_COUNT_PER_DEXIE_DB.set(state, 0);
  }

  return state;
}

function sortDirectionToMingo(direction) {
  if (direction === 'asc') {
    return 1;
  } else {
    return -1;
  }
}
/**
 * This function is at dexie-helper
 * because we need it in multiple places.
 */


function getDexieSortComparator(_schema, query) {
  var mingoSortObject = {};

  if (!query.sort) {
    throw (0, _rxError.newRxError)('SNH', {
      query: query
    });
  }

  query.sort.forEach(function (sortBlock) {
    var key = Object.keys(sortBlock)[0];
    var direction = Object.values(sortBlock)[0];
    mingoSortObject[key] = sortDirectionToMingo(direction);
  });

  var fun = function fun(a, b) {
    var sorted = _mingo["default"].find([a, b], {}).sort(mingoSortObject);

    var first = sorted.next();

    if (first === a) {
      return -1;
    } else {
      return 1;
    }
  };

  return fun;
}
/**
 * It is not possible to set non-javascript-variable-syntax
 * keys as IndexedDB indexes. So we have to substitute the pipe-char
 * which comes from the key-compression plugin.
 */


var DEXIE_PIPE_SUBSTITUTE = '__';
exports.DEXIE_PIPE_SUBSTITUTE = DEXIE_PIPE_SUBSTITUTE;

function dexieReplaceIfStartsWithPipe(str) {
  var split = str.split('.');

  if (split.length > 1) {
    return split.map(function (part) {
      return dexieReplaceIfStartsWithPipe(part);
    }).join('.');
  }

  if (str.startsWith('|')) {
    var withoutFirst = str.substring(1);
    return DEXIE_PIPE_SUBSTITUTE + withoutFirst;
  } else {
    return str;
  }
}

function dexieReplaceIfStartsWithPipeRevert(str) {
  var split = str.split('.');

  if (split.length > 1) {
    return split.map(function (part) {
      return dexieReplaceIfStartsWithPipeRevert(part);
    }).join('.');
  }

  if (str.startsWith(DEXIE_PIPE_SUBSTITUTE)) {
    var withoutFirst = str.substring(DEXIE_PIPE_SUBSTITUTE.length);
    return '|' + withoutFirst;
  } else {
    return str;
  }
}
/**
 * @recursive
 */


function fromStorageToDexie(documentData) {
  if (!documentData || typeof documentData === 'string' || typeof documentData === 'number' || typeof documentData === 'boolean') {
    return documentData;
  } else if (Array.isArray(documentData)) {
    return documentData.map(function (row) {
      return fromStorageToDexie(row);
    });
  } else if (typeof documentData === 'object') {
    var ret = {};
    Object.entries(documentData).forEach(function (_ref) {
      var key = _ref[0],
          value = _ref[1];

      if (typeof value === 'object') {
        value = fromStorageToDexie(value);
      }

      ret[dexieReplaceIfStartsWithPipe(key)] = value;
    });
    return ret;
  }
}

function fromDexieToStorage(documentData) {
  if (!documentData || typeof documentData === 'string' || typeof documentData === 'number' || typeof documentData === 'boolean') {
    return documentData;
  } else if (Array.isArray(documentData)) {
    return documentData.map(function (row) {
      return fromDexieToStorage(row);
    });
  } else if (typeof documentData === 'object') {
    var ret = {};
    Object.entries(documentData).forEach(function (_ref2) {
      var key = _ref2[0],
          value = _ref2[1];

      if (typeof value === 'object' || Array.isArray(documentData)) {
        value = fromDexieToStorage(value);
      }

      ret[dexieReplaceIfStartsWithPipeRevert(key)] = value;
    });
    return ret;
  }
}
/**
 * Creates a string that can be used to create the dexie store.
 * @link https://dexie.org/docs/API-Reference#quick-reference
 */


function getDexieStoreSchema(rxJsonSchema) {
  var parts = [];
  /**
   * First part must be the primary key
   * @link https://github.com/dexie/Dexie.js/issues/1307#issuecomment-846590912
   */

  var primaryKey = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(rxJsonSchema.primaryKey);
  parts.push([primaryKey]); // add other indexes

  if (rxJsonSchema.indexes) {
    rxJsonSchema.indexes.forEach(function (index) {
      var arIndex = Array.isArray(index) ? index : [index];
      parts.push(arIndex);
    });
  } // we also need the _meta.lwt+primaryKey index for the getChangedDocumentsSince() method.


  parts.push(['_meta.lwt', primaryKey]);
  /**
   * It is not possible to set non-javascript-variable-syntax
   * keys as IndexedDB indexes. So we have to substitute the pipe-char
   * which comes from the key-compression plugin.
   */

  parts = parts.map(function (part) {
    return part.map(function (str) {
      return dexieReplaceIfStartsWithPipe(str);
    });
  });
  return parts.map(function (part) {
    if (part.length === 1) {
      return part[0];
    } else {
      return '[' + part.join('+') + ']';
    }
  }).join(', ');
}
//# sourceMappingURL=dexie-helper.js.map