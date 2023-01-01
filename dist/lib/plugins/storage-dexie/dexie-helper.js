"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_STORAGE_NAME_DEXIE = exports.DEXIE_PIPE_SUBSTITUTE = exports.DEXIE_DOCS_TABLE_NAME = exports.DEXIE_DELETED_DOCS_TABLE_NAME = exports.DEXIE_CHANGES_TABLE_NAME = void 0;
exports.closeDexieDb = closeDexieDb;
exports.dexieReplaceIfStartsWithPipe = dexieReplaceIfStartsWithPipe;
exports.dexieReplaceIfStartsWithPipeRevert = dexieReplaceIfStartsWithPipeRevert;
exports.ensureNoBooleanIndex = ensureNoBooleanIndex;
exports.fromDexieToStorage = fromDexieToStorage;
exports.fromStorageToDexie = fromStorageToDexie;
exports.getDexieDbWithTables = getDexieDbWithTables;
exports.getDexieSortComparator = getDexieSortComparator;
exports.getDexieStoreSchema = getDexieStoreSchema;
exports.getDocsInDb = getDocsInDb;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _dexie = require("dexie");
var _utils = require("../utils");
var _rxError = require("../../rx-error");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxQueryMingo = require("../../rx-query-mingo");
var DEXIE_DOCS_TABLE_NAME = 'docs';
exports.DEXIE_DOCS_TABLE_NAME = DEXIE_DOCS_TABLE_NAME;
var DEXIE_DELETED_DOCS_TABLE_NAME = 'deleted-docs';
exports.DEXIE_DELETED_DOCS_TABLE_NAME = DEXIE_DELETED_DOCS_TABLE_NAME;
var DEXIE_CHANGES_TABLE_NAME = 'changes';
exports.DEXIE_CHANGES_TABLE_NAME = DEXIE_CHANGES_TABLE_NAME;
var RX_STORAGE_NAME_DEXIE = 'dexie';
exports.RX_STORAGE_NAME_DEXIE = RX_STORAGE_NAME_DEXIE;
var DEXIE_STATE_DB_BY_NAME = new Map();
var REF_COUNT_PER_DEXIE_DB = new Map();
function getDexieDbWithTables(databaseName, collectionName, settings, schema) {
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
  var dexieDbName = 'rxdb-dexie-' + databaseName + '--' + schema.version + '--' + collectionName;
  var state = DEXIE_STATE_DB_BY_NAME.get(dexieDbName);
  if (!state) {
    state = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var _dexieStoresSettings;
      var useSettings, dexieDb, dexieStoresSettings;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            /**
             * IndexedDB was not designed for dynamically adding tables on the fly,
             * so we create one dexie database per RxDB storage instance.
             * @link https://github.com/dexie/Dexie.js/issues/684#issuecomment-373224696
             */
            useSettings = (0, _utils.flatClone)(settings);
            useSettings.autoOpen = false;
            dexieDb = new _dexie.Dexie(dexieDbName, useSettings);
            dexieStoresSettings = (_dexieStoresSettings = {}, _dexieStoresSettings[DEXIE_DOCS_TABLE_NAME] = getDexieStoreSchema(schema), _dexieStoresSettings[DEXIE_CHANGES_TABLE_NAME] = '++sequence, id', _dexieStoresSettings[DEXIE_DELETED_DOCS_TABLE_NAME] = primaryPath + ',_meta.lwt,[_meta.lwt+' + primaryPath + ']', _dexieStoresSettings);
            dexieDb.version(1).stores(dexieStoresSettings);
            _context.next = 7;
            return dexieDb.open();
          case 7:
            return _context.abrupt("return", {
              dexieDb: dexieDb,
              dexieTable: dexieDb[DEXIE_DOCS_TABLE_NAME],
              dexieDeletedTable: dexieDb[DEXIE_DELETED_DOCS_TABLE_NAME]
            });
          case 8:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }))();
    DEXIE_STATE_DB_BY_NAME.set(dexieDbName, state);
    REF_COUNT_PER_DEXIE_DB.set(state, 0);
  }
  return state;
}
function closeDexieDb(_x) {
  return _closeDexieDb.apply(this, arguments);
}
function _closeDexieDb() {
  _closeDexieDb = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(statePromise) {
    var state, prevCount, newCount;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return statePromise;
        case 2:
          state = _context2.sent;
          prevCount = REF_COUNT_PER_DEXIE_DB.get(statePromise);
          newCount = prevCount - 1;
          if (newCount === 0) {
            state.dexieDb.close();
            REF_COUNT_PER_DEXIE_DB["delete"](statePromise);
          } else {
            REF_COUNT_PER_DEXIE_DB.set(statePromise, newCount);
          }
        case 6:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _closeDexieDb.apply(this, arguments);
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
    var sorted = (0, _rxQueryMingo.getMingoQuery)({}).find([a, b], {}).sort(mingoSortObject);
    var first = sorted.next();
    if (first === a) {
      return -1;
    } else {
      return 1;
    }
  };
  return fun;
}
function ensureNoBooleanIndex(schema) {
  if (!schema.indexes) {
    return;
  }
  var checkedFields = new Set();
  schema.indexes.forEach(function (index) {
    var fields = (0, _utils.toArray)(index);
    fields.forEach(function (field) {
      if (checkedFields.has(field)) {
        return;
      }
      checkedFields.add(field);
      var schemaObj = (0, _rxSchemaHelper.getSchemaByObjectPath)(schema, field);
      if (schemaObj.type === 'boolean') {
        throw (0, _rxError.newRxError)('DXE1', {
          schema: schema,
          index: index,
          field: field
        });
      }
    });
  });
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
    Object.entries(documentData).forEach(function (_ref2) {
      var key = _ref2[0],
        value = _ref2[1];
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
    Object.entries(documentData).forEach(function (_ref3) {
      var key = _ref3[0],
        value = _ref3[1];
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
  parts.push([primaryKey]);

  // add other indexes
  if (rxJsonSchema.indexes) {
    rxJsonSchema.indexes.forEach(function (index) {
      var arIndex = (0, _utils.toArray)(index);
      parts.push(arIndex);
    });
  }

  // we also need the _meta.lwt+primaryKey index for the getChangedDocumentsSince() method.
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

/**
 * Returns all documents in the database.
 * Non-deleted plus deleted ones.
 */
function getDocsInDb(_x2, _x3) {
  return _getDocsInDb.apply(this, arguments);
}
function _getDocsInDb() {
  _getDocsInDb = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(internals, docIds) {
    var state, _yield$Promise$all, nonDeletedDocsInDb, deletedDocsInDb, docsInDb;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return internals;
        case 2:
          state = _context3.sent;
          _context3.next = 5;
          return Promise.all([state.dexieTable.bulkGet(docIds), state.dexieDeletedTable.bulkGet(docIds)]);
        case 5:
          _yield$Promise$all = _context3.sent;
          nonDeletedDocsInDb = _yield$Promise$all[0];
          deletedDocsInDb = _yield$Promise$all[1];
          docsInDb = deletedDocsInDb.slice(0);
          nonDeletedDocsInDb.forEach(function (doc, idx) {
            if (doc) {
              docsInDb[idx] = doc;
            }
          });
          return _context3.abrupt("return", docsInDb);
        case 11:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _getDocsInDb.apply(this, arguments);
}
//# sourceMappingURL=dexie-helper.js.map