"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.INTERNAL_STORAGE_NAME = void 0;
exports.countAllUndeleted = countAllUndeleted;
exports.findLocalDocument = findLocalDocument;
exports.getAllDocuments = getAllDocuments;
exports.getBatch = getBatch;
exports.getSingleDocument = getSingleDocument;
exports.storageChangeEventToRxChangeEvent = storageChangeEventToRxChangeEvent;
exports.writeSingle = writeSingle;
exports.writeSingleLocal = writeSingleLocal;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _hooks = require("./hooks");

var _overwritable = require("./overwritable");

var _rxError = require("./rx-error");

var _util = require("./util");

/**
 * Helper functions for accessing the RxStorage instances.
 */
var INTERNAL_STORAGE_NAME = '_rxdb_internal';
/**
 * returns all NON-LOCAL documents
 * TODO this is pouchdb specific should not be needed
 */

exports.INTERNAL_STORAGE_NAME = INTERNAL_STORAGE_NAME;

function getAllDocuments(_x, _x2) {
  return _getAllDocuments.apply(this, arguments);
}

function _getAllDocuments() {
  _getAllDocuments = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(storage, storageInstance) {
    var getAllQueryPrepared, queryResult, allDocs;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            getAllQueryPrepared = storage.statics.prepareQuery(storageInstance.schema, {
              selector: {}
            });
            _context.next = 3;
            return storageInstance.query(getAllQueryPrepared);

          case 3:
            queryResult = _context.sent;
            allDocs = queryResult.documents;
            return _context.abrupt("return", allDocs);

          case 6:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _getAllDocuments.apply(this, arguments);
}

function getSingleDocument(_x3, _x4) {
  return _getSingleDocument.apply(this, arguments);
}
/**
 * get the number of all undeleted documents
 */


function _getSingleDocument() {
  _getSingleDocument = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(storageInstance, documentId) {
    var results, doc;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return storageInstance.findDocumentsById([documentId], false);

          case 2:
            results = _context2.sent;
            doc = results[documentId];

            if (!doc) {
              _context2.next = 8;
              break;
            }

            return _context2.abrupt("return", doc);

          case 8:
            return _context2.abrupt("return", null);

          case 9:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _getSingleDocument.apply(this, arguments);
}

function countAllUndeleted(_x5, _x6) {
  return _countAllUndeleted.apply(this, arguments);
}
/**
 * get a batch of documents from the storage-instance
 */


function _countAllUndeleted() {
  _countAllUndeleted = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(storage, storageInstance) {
    var docs;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return getAllDocuments(storage, storageInstance);

          case 2:
            docs = _context3.sent;
            return _context3.abrupt("return", docs.length);

          case 4:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _countAllUndeleted.apply(this, arguments);
}

function getBatch(_x7, _x8, _x9) {
  return _getBatch.apply(this, arguments);
}
/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */


function _getBatch() {
  _getBatch = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(storage, storageInstance, limit) {
    var preparedQuery, result;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            if (!(limit <= 1)) {
              _context4.next = 2;
              break;
            }

            throw (0, _rxError.newRxError)('P1', {
              limit: limit
            });

          case 2:
            preparedQuery = storage.statics.prepareQuery(storageInstance.schema, {
              selector: {},
              limit: limit
            });
            _context4.next = 5;
            return storageInstance.query(preparedQuery);

          case 5:
            result = _context4.sent;
            return _context4.abrupt("return", result.documents);

          case 7:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));
  return _getBatch.apply(this, arguments);
}

function writeSingle(_x10, _x11) {
  return _writeSingle.apply(this, arguments);
}
/**
 * Writes a single local document,
 * throws RxStorageBulkWriteError on failure
 */


function _writeSingle() {
  _writeSingle = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(instance, writeRow) {
    var writeResult, error, ret;
    return _regenerator["default"].wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return instance.bulkWrite([writeRow]);

          case 2:
            writeResult = _context5.sent;

            if (!(Object.keys(writeResult.error).length > 0)) {
              _context5.next = 8;
              break;
            }

            error = (0, _util.firstPropertyValueOfObject)(writeResult.error);
            throw error;

          case 8:
            ret = (0, _util.firstPropertyValueOfObject)(writeResult.success);
            return _context5.abrupt("return", ret);

          case 10:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5);
  }));
  return _writeSingle.apply(this, arguments);
}

function writeSingleLocal(_x12, _x13) {
  return _writeSingleLocal.apply(this, arguments);
}

function _writeSingleLocal() {
  _writeSingleLocal = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(instance, writeRow) {
    var writeResult, error, ret;
    return _regenerator["default"].wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return instance.bulkWrite([writeRow]);

          case 2:
            writeResult = _context6.sent;

            if (!(Object.keys(writeResult.error).length > 0)) {
              _context6.next = 8;
              break;
            }

            error = (0, _util.firstPropertyValueOfObject)(writeResult.error);
            throw error;

          case 8:
            ret = (0, _util.firstPropertyValueOfObject)(writeResult.success);
            return _context6.abrupt("return", ret);

          case 10:
          case "end":
            return _context6.stop();
        }
      }
    }, _callee6);
  }));
  return _writeSingleLocal.apply(this, arguments);
}

function findLocalDocument(_x14, _x15) {
  return _findLocalDocument.apply(this, arguments);
}

function _findLocalDocument() {
  _findLocalDocument = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(instance, id) {
    var docList, doc;
    return _regenerator["default"].wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            _context7.next = 2;
            return instance.findLocalDocumentsById([id]);

          case 2:
            docList = _context7.sent;
            doc = docList[id];

            if (doc) {
              _context7.next = 8;
              break;
            }

            return _context7.abrupt("return", null);

          case 8:
            return _context7.abrupt("return", doc);

          case 9:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7);
  }));
  return _findLocalDocument.apply(this, arguments);
}

function storageChangeEventToRxChangeEvent(isLocal, rxStorageChangeEvent, rxCollection) {
  var documentData;

  if (rxStorageChangeEvent.change.operation !== 'DELETE') {
    if (!rxCollection) {
      documentData = rxStorageChangeEvent.change.doc;
    } else {
      var hookParams = {
        collection: rxCollection,
        doc: rxStorageChangeEvent.change.doc
      };
      (0, _hooks.runPluginHooks)('postReadFromInstance', hookParams);
      documentData = hookParams.doc;
      documentData = rxCollection._crypter.decrypt(documentData);
    }
  }

  var previousDocumentData;

  if (rxStorageChangeEvent.change.operation !== 'INSERT') {
    if (!rxCollection) {
      previousDocumentData = rxStorageChangeEvent.change.previous;
    } else {
      var _hookParams = {
        collection: rxCollection,
        doc: rxStorageChangeEvent.change.previous
      };
      (0, _hooks.runPluginHooks)('postReadFromInstance', _hookParams);
      previousDocumentData = _hookParams.doc;
      previousDocumentData = rxCollection._crypter.decrypt(previousDocumentData);
    }
  }

  var ret = {
    eventId: rxStorageChangeEvent.eventId,
    documentId: rxStorageChangeEvent.documentId,
    collectionName: rxCollection ? rxCollection.name : undefined,
    startTime: rxStorageChangeEvent.startTime,
    endTime: rxStorageChangeEvent.endTime,
    isLocal: isLocal,
    operation: rxStorageChangeEvent.change.operation,
    documentData: _overwritable.overwritable.deepFreezeWhenDevMode(documentData),
    previousDocumentData: _overwritable.overwritable.deepFreezeWhenDevMode(previousDocumentData)
  };
  return ret;
}
//# sourceMappingURL=rx-storage-helper.js.map