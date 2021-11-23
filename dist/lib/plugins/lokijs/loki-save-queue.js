"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LokiSaveQueue = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _customIdleQueue = require("custom-idle-queue");

var _util = require("../../util");

/**
 * The autosave feature of lokijs has strange behaviors
 * and often runs a save in critical moments when other
 * more important tasks are running.
 * So instead we use a custom save queue that ensures we
 * only run loki.saveDatabase() when nothing else is running.
 */
var LokiSaveQueue = /*#__PURE__*/function () {
  function LokiSaveQueue(lokiDatabase, databaseSettings, rxDatabaseIdleQueue) {
    this.writesSinceLastRun = 0;
    this.runningSavesIdleQueue = new _customIdleQueue.IdleQueue(1);
    this.lokiDatabase = lokiDatabase;
    this.databaseSettings = databaseSettings;
    this.rxDatabaseIdleQueue = rxDatabaseIdleQueue;
  }

  var _proto = LokiSaveQueue.prototype;

  _proto.addWrite = function addWrite() {
    this.writesSinceLastRun = this.writesSinceLastRun + 1;
    this.run();
  };

  _proto.run = /*#__PURE__*/function () {
    var _run = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var _this = this;

      var t, writeAmount;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (this.databaseSettings.adapter) {
                _context.next = 2;
                break;
              }

              return _context.abrupt("return");

            case 2:
              t = (0, _util.now)();

              if (!(this.writesSinceLastRun === 0)) {
                _context.next = 5;
                break;
              }

              return _context.abrupt("return", this.runningSavesIdleQueue.requestIdlePromise());

            case 5:
              _context.next = 7;
              return Promise.all([(0, _util.requestIdlePromise)(), (0, _util.promiseWait)(100)]);

            case 7:
              if (!((!this.rxDatabaseIdleQueue.isIdle() || !this.runningSavesIdleQueue.isIdle()) && this.writesSinceLastRun !== 0)) {
                _context.next = 14;
                break;
              }

              _context.next = 10;
              return (0, _util.requestIdlePromise)();

            case 10:
              _context.next = 12;
              return Promise.all([this.rxDatabaseIdleQueue.requestIdlePromise(), this.runningSavesIdleQueue.requestIdlePromise(), (0, _util.promiseWait)(100)]);

            case 12:
              _context.next = 7;
              break;

            case 14:
              if (!(this.writesSinceLastRun === 0)) {
                _context.next = 16;
                break;
              }

              return _context.abrupt("return");

            case 16:
              writeAmount = this.writesSinceLastRun;
              this.writesSinceLastRun = 0;
              return _context.abrupt("return", this.runningSavesIdleQueue.requestIdlePromise().then(function () {
                return _this.runningSavesIdleQueue.wrapCall(function () {
                  return new Promise(function (res, rej) {
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
                  });
                });
              }));

            case 19:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function run() {
      return _run.apply(this, arguments);
    }

    return run;
  }();

  return LokiSaveQueue;
}();

exports.LokiSaveQueue = LokiSaveQueue;
//# sourceMappingURL=loki-save-queue.js.map