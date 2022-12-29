"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cleanupRxCollection = cleanupRxCollection;
exports.runCleanupAfterDelete = runCleanupAfterDelete;
exports.startCleanupForRxCollection = startCleanupForRxCollection;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _util = require("../../util");
var _replication = require("../replication");
var _cleanupHelper = require("./cleanup-helper");
/**
 * Even on multiple databases,
 * the calls to RxStorage().cleanup()
 * must never run in parallel.
 * The cleanup is a background task which should
 * not affect the performance of other, more important tasks.
 */
var RXSOTRAGE_CLEANUP_QUEUE = _util.PROMISE_RESOLVE_TRUE;
function startCleanupForRxCollection(_x) {
  return _startCleanupForRxCollection.apply(this, arguments);
}
/**
 * Runs the cleanup for a single RxCollection
 */
function _startCleanupForRxCollection() {
  _startCleanupForRxCollection = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(rxCollection) {
    var rxDatabase, cleanupPolicy;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          rxDatabase = rxCollection.database;
          cleanupPolicy = Object.assign({}, _cleanupHelper.DEFAULT_CLEANUP_POLICY, rxDatabase.cleanupPolicy ? rxDatabase.cleanupPolicy : {});
          /**
           * Wait until minimumDatabaseInstanceAge is reached
           * or collection is destroyed.
           */
          _context.next = 4;
          return rxCollection.promiseWait(cleanupPolicy.minimumCollectionAge);
        case 4:
          if (!rxCollection.destroyed) {
            _context.next = 6;
            break;
          }
          return _context.abrupt("return");
        case 6:
          if (!cleanupPolicy.waitForLeadership) {
            _context.next = 9;
            break;
          }
          _context.next = 9;
          return rxDatabase.waitForLeadership();
        case 9:
          if (!rxCollection.destroyed) {
            _context.next = 11;
            break;
          }
          return _context.abrupt("return");
        case 11:
          _context.next = 13;
          return cleanupRxCollection(rxCollection, cleanupPolicy);
        case 13:
          _context.next = 15;
          return runCleanupAfterDelete(rxCollection, cleanupPolicy);
        case 15:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _startCleanupForRxCollection.apply(this, arguments);
}
function cleanupRxCollection(_x2, _x3) {
  return _cleanupRxCollection.apply(this, arguments);
}
function _cleanupRxCollection() {
  _cleanupRxCollection = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(rxCollection, cleanupPolicy) {
    var rxDatabase, storageInstance, isDone, replicationStates;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          rxDatabase = rxCollection.database;
          storageInstance = rxCollection.storageInstance; // run cleanup() until it returns true
          isDone = false;
        case 3:
          if (!(!isDone && !rxCollection.destroyed)) {
            _context2.next = 19;
            break;
          }
          if (!cleanupPolicy.awaitReplicationsInSync) {
            _context2.next = 9;
            break;
          }
          replicationStates = _replication.REPLICATION_STATE_BY_COLLECTION.get(rxCollection);
          if (!replicationStates) {
            _context2.next = 9;
            break;
          }
          _context2.next = 9;
          return Promise.all(replicationStates.map(function (replicationState) {
            if (!replicationState.isStopped()) {
              return replicationState.awaitInSync();
            }
          }));
        case 9:
          _context2.next = 11;
          return rxDatabase.requestIdlePromise();
        case 11:
          if (!rxCollection.destroyed) {
            _context2.next = 13;
            break;
          }
          return _context2.abrupt("return");
        case 13:
          RXSOTRAGE_CLEANUP_QUEUE = RXSOTRAGE_CLEANUP_QUEUE.then(function () {
            if (rxCollection.destroyed) {
              return true;
            }
            return storageInstance.cleanup(cleanupPolicy.minimumDeletedTime);
          });
          _context2.next = 16;
          return RXSOTRAGE_CLEANUP_QUEUE;
        case 16:
          isDone = _context2.sent;
          _context2.next = 3;
          break;
        case 19:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _cleanupRxCollection.apply(this, arguments);
}
function runCleanupAfterDelete(_x4, _x5) {
  return _runCleanupAfterDelete.apply(this, arguments);
}
function _runCleanupAfterDelete() {
  _runCleanupAfterDelete = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(rxCollection, cleanupPolicy) {
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          if (rxCollection.destroyed) {
            _context3.next = 9;
            break;
          }
          _context3.next = 3;
          return rxCollection.promiseWait(cleanupPolicy.runEach);
        case 3:
          if (!rxCollection.destroyed) {
            _context3.next = 5;
            break;
          }
          return _context3.abrupt("return");
        case 5:
          _context3.next = 7;
          return cleanupRxCollection(rxCollection, cleanupPolicy);
        case 7:
          _context3.next = 0;
          break;
        case 9:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _runCleanupAfterDelete.apply(this, arguments);
}
//# sourceMappingURL=cleanup.js.map