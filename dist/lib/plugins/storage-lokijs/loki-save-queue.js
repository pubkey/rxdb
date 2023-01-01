"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LokiSaveQueue = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _utils = require("../utils");
/**
 * The autosave feature of lokijs has strange behaviors
 * and often runs a save in critical moments when other
 * more important tasks are running.
 * So instead we use a custom save queue that ensures we
 * only run loki.saveDatabase() when nothing else is running.
 */
var LokiSaveQueue = /*#__PURE__*/function () {
  /**
   * Ensures that we do not run multiple saves
   * in parallel
   */

  // track amount of non-finished save calls in the queue.

  function LokiSaveQueue(lokiDatabase, databaseSettings) {
    this.writesSinceLastRun = 0;
    this.saveQueue = _utils.PROMISE_RESOLVE_VOID;
    this.saveQueueC = 0;
    this.lokiDatabase = lokiDatabase;
    this.databaseSettings = databaseSettings;
  }
  var _proto = LokiSaveQueue.prototype;
  _proto.addWrite = function addWrite() {
    this.writesSinceLastRun = this.writesSinceLastRun + 1;
    this.run();
  };
  _proto.run = function run() {
    var _this = this;
    if (
    // no persistence adapter given, so we do not need to save
    !this.databaseSettings.adapter ||
    // do not add more then two pending calls to the queue.
    this.saveQueueC > 2) {
      return this.saveQueue;
    }
    this.saveQueueC = this.saveQueueC + 1;
    this.saveQueue = this.saveQueue.then( /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var writeAmount;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (0, _utils.requestIdlePromise)();
          case 2:
            if (!(_this.writesSinceLastRun === 0)) {
              _context.next = 4;
              break;
            }
            return _context.abrupt("return");
          case 4:
            _context.next = 6;
            return (0, _utils.requestIdlePromise)().then(function () {
              return (0, _utils.requestIdlePromise)();
            });
          case 6:
            if (!(_this.writesSinceLastRun === 0)) {
              _context.next = 8;
              break;
            }
            return _context.abrupt("return");
          case 8:
            writeAmount = _this.writesSinceLastRun;
            _this.writesSinceLastRun = 0;
            return _context.abrupt("return", new Promise(function (res, rej) {
              _this.lokiDatabase.saveDatabase(function (err) {
                if (err) {
                  _this.writesSinceLastRun = _this.writesSinceLastRun + writeAmount;
                  rej(err);
                } else {
                  if (_this.databaseSettings.autosaveCallback) {
                    _this.databaseSettings.autosaveCallback();
                  }
                  res();
                }
              });
            }));
          case 11:
          case "end":
            return _context.stop();
        }
      }, _callee);
    })))["catch"](function () {}).then(function () {
      _this.saveQueueC = _this.saveQueueC - 1;
    });
    return this.saveQueue;
  };
  return LokiSaveQueue;
}();
exports.LokiSaveQueue = LokiSaveQueue;
//# sourceMappingURL=loki-save-queue.js.map