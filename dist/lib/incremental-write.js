"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IncrementalWriteQueue = void 0;
exports.findNewestOfDocumentStates = findNewestOfDocumentStates;
exports.modifierFromPublicToInternal = modifierFromPublicToInternal;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _rxError = require("./rx-error");
var _utils = require("./plugins/utils");
function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
/**
 * The incremental write queue
 * batches up all incremental writes to a collection
 * so that performance can be improved by:
 * - Running only one write even when there are multiple modifications to the same document.
 * - Run all writes ins a single bulkWrite() call even when there are writes to many documents.
 */
var IncrementalWriteQueue = /*#__PURE__*/function () {
  function IncrementalWriteQueue(storageInstance, primaryPath,
  // can be used to run hooks etc.
  preWrite, postWrite) {
    this.queueByDocId = new Map();
    this.isRunning = false;
    this.storageInstance = storageInstance;
    this.primaryPath = primaryPath;
    this.preWrite = preWrite;
    this.postWrite = postWrite;
  }
  var _proto = IncrementalWriteQueue.prototype;
  _proto.addWrite = function addWrite(lastKnownDocumentState, modifier) {
    var _this = this;
    var docId = lastKnownDocumentState[this.primaryPath];
    var ar = (0, _utils.getFromMapOrFill)(this.queueByDocId, docId, function () {
      return [];
    });
    var ret = new Promise(function (resolve, reject) {
      var item = {
        lastKnownDocumentState: lastKnownDocumentState,
        modifier: modifier,
        resolve: resolve,
        reject: reject
      };
      (0, _utils.ensureNotFalsy)(ar).push(item);
      _this.triggerRun();
    });
    return ret;
  };
  _proto.triggerRun = /*#__PURE__*/function () {
    var _triggerRun = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      var _this2 = this;
      var writeRows, itemsById, writeResult;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            if (!(this.isRunning === true || this.queueByDocId.size === 0)) {
              _context2.next = 2;
              break;
            }
            return _context2.abrupt("return");
          case 2:
            this.isRunning = true;
            writeRows = [];
            /**
             * 'take over' so that while the async functions runs,
             * new incremental updates could be added from the outside.
             */
            itemsById = this.queueByDocId;
            this.queueByDocId = new Map();
            _context2.next = 8;
            return Promise.all(Array.from(itemsById.entries()).map( /*#__PURE__*/function () {
              var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(_ref) {
                var _docId, items, oldData, newData, _iterator, _step, item;
                return _regenerator["default"].wrap(function _callee$(_context) {
                  while (1) switch (_context.prev = _context.next) {
                    case 0:
                      _docId = _ref[0], items = _ref[1];
                      oldData = findNewestOfDocumentStates(items.map(function (i) {
                        return i.lastKnownDocumentState;
                      }));
                      newData = oldData;
                      _iterator = _createForOfIteratorHelperLoose(items);
                    case 4:
                      if ((_step = _iterator()).done) {
                        _context.next = 19;
                        break;
                      }
                      item = _step.value;
                      _context.prev = 6;
                      _context.next = 9;
                      return item.modifier(
                      /**
                       * We have to clone() each time because the modifier
                       * might throw while it already changed some properties
                       * of the document.
                       */
                      (0, _utils.clone)(newData));
                    case 9:
                      newData = _context.sent;
                      _context.next = 17;
                      break;
                    case 12:
                      _context.prev = 12;
                      _context.t0 = _context["catch"](6);
                      item.reject(_context.t0);
                      item.reject = function () {};
                      item.resolve = function () {};
                    case 17:
                      _context.next = 4;
                      break;
                    case 19:
                      _context.prev = 19;
                      _context.next = 22;
                      return _this2.preWrite(newData, oldData);
                    case 22:
                      _context.next = 28;
                      break;
                    case 24:
                      _context.prev = 24;
                      _context.t1 = _context["catch"](19);
                      /**
                       * If the before-hooks fail,
                       * we reject all of the writes because it is
                       * not possible to determine which one is to blame.
                       */
                      items.forEach(function (item) {
                        return item.reject(_context.t1);
                      });
                      return _context.abrupt("return");
                    case 28:
                      writeRows.push({
                        previous: oldData,
                        document: newData
                      });
                    case 29:
                    case "end":
                      return _context.stop();
                  }
                }, _callee, null, [[6, 12], [19, 24]]);
              }));
              return function (_x) {
                return _ref2.apply(this, arguments);
              };
            }()));
          case 8:
            if (!(writeRows.length > 0)) {
              _context2.next = 14;
              break;
            }
            _context2.next = 11;
            return this.storageInstance.bulkWrite(writeRows, 'incremental-write');
          case 11:
            _context2.t0 = _context2.sent;
            _context2.next = 15;
            break;
          case 14:
            _context2.t0 = {
              error: {},
              success: {}
            };
          case 15:
            writeResult = _context2.t0;
            _context2.next = 18;
            return Promise.all(Array.from(Object.entries(writeResult.success)).map(function (_ref3) {
              var docId = _ref3[0],
                result = _ref3[1];
              _this2.postWrite(result);
              var items = (0, _utils.getFromMapOrThrow)(itemsById, docId);
              items.forEach(function (item) {
                return item.resolve(result);
              });
            }));
          case 18:
            // process errors
            Array.from(Object.entries(writeResult.error)).forEach(function (_ref4) {
              var docId = _ref4[0],
                error = _ref4[1];
              var items = (0, _utils.getFromMapOrThrow)(itemsById, docId);
              var isConflict = (0, _rxError.isBulkWriteConflictError)(error);
              if (isConflict) {
                // had conflict -> retry afterwards
                var ar = (0, _utils.getFromMapOrFill)(_this2.queueByDocId, docId, function () {
                  return [];
                });
                /**
                 * Add the items back to this.queueByDocId
                 * by maintaining the original order.
                 */
                items.reverse().forEach(function (item) {
                  item.lastKnownDocumentState = (0, _utils.ensureNotFalsy)(isConflict.documentInDb);
                  (0, _utils.ensureNotFalsy)(ar).unshift(item);
                });
              } else {
                // other error -> must be thrown
                var rxError = (0, _rxError.rxStorageWriteErrorToRxError)(error);
                items.forEach(function (item) {
                  return item.reject(rxError);
                });
              }
            });
            this.isRunning = false;

            /**
             * Always trigger another run
             * because in between there might be new items
             * been added to the queue.
             */
            return _context2.abrupt("return", this.triggerRun());
          case 21:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
    }));
    function triggerRun() {
      return _triggerRun.apply(this, arguments);
    }
    return triggerRun;
  }();
  return IncrementalWriteQueue;
}();
exports.IncrementalWriteQueue = IncrementalWriteQueue;
function modifierFromPublicToInternal(publicModifier) {
  var ret = /*#__PURE__*/function () {
    var _ref5 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(docData) {
      var withoutMeta, modified, reattachedMeta;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            withoutMeta = (0, _utils.stripMetaDataFromDocument)(docData);
            withoutMeta._deleted = docData._deleted;
            _context3.next = 4;
            return publicModifier(withoutMeta);
          case 4:
            modified = _context3.sent;
            reattachedMeta = Object.assign({}, modified, {
              _meta: docData._meta,
              _attachments: docData._attachments,
              _rev: docData._rev,
              _deleted: typeof modified._deleted !== 'undefined' ? modified._deleted : docData._deleted
            });
            if (typeof reattachedMeta._deleted === 'undefined') {
              reattachedMeta._deleted = false;
            }
            return _context3.abrupt("return", reattachedMeta);
          case 8:
          case "end":
            return _context3.stop();
        }
      }, _callee3);
    }));
    return function ret(_x2) {
      return _ref5.apply(this, arguments);
    };
  }();
  return ret;
}
function findNewestOfDocumentStates(docs) {
  var newest = docs[0];
  var newestRevisionHeight = (0, _utils.parseRevision)(newest._rev).height;
  docs.forEach(function (doc) {
    var height = (0, _utils.parseRevision)(doc._rev).height;
    if (height > newestRevisionHeight) {
      newest = doc;
      newestRevisionHeight = height;
    }
  });
  return newest;
}
//# sourceMappingURL=incremental-write.js.map