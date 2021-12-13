import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { promiseWait, PROMISE_RESOLVE_VOID, requestIdlePromise } from '../../util';
/**
 * The autosave feature of lokijs has strange behaviors
 * and often runs a save in critical moments when other
 * more important tasks are running.
 * So instead we use a custom save queue that ensures we
 * only run loki.saveDatabase() when nothing else is running.
 */

export var LokiSaveQueue = /*#__PURE__*/function () {
  /**
   * Ensures that we do not run multiple saves
   * in parallel
   */
  // track amount of non-finished save calls in the queue.
  function LokiSaveQueue(lokiDatabase, databaseSettings) {
    this.writesSinceLastRun = 0;
    this.saveQueue = PROMISE_RESOLVE_VOID;
    this.saveQueueC = 0;
    this.lokiDatabase = lokiDatabase;
    this.databaseSettings = databaseSettings;
  }

  var _proto = LokiSaveQueue.prototype;

  _proto.addWrite = function addWrite() {
    this.writesSinceLastRun = this.writesSinceLastRun + 1;
    this.run();
  };

  _proto.run = /*#__PURE__*/function () {
    var _run = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
      var _this = this;

      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (!( // no persistence adapter given, so we do not need to save
              !this.databaseSettings.adapter || // do not add more then two pending calls to the queue.
              this.saveQueueC > 2)) {
                _context2.next = 2;
                break;
              }

              return _context2.abrupt("return", this.saveQueue);

            case 2:
              this.saveQueueC = this.saveQueueC + 1;
              this.saveQueue = this.saveQueue.then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
                var writeAmount;
                return _regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _context.next = 2;
                        return Promise.all([requestIdlePromise(), promiseWait(100)]);

                      case 2:
                        if (!(_this.writesSinceLastRun === 0)) {
                          _context.next = 4;
                          break;
                        }

                        return _context.abrupt("return");

                      case 4:
                        _context.next = 6;
                        return Promise.all([requestIdlePromise(), promiseWait(100)]);

                      case 6:
                        _context.next = 8;
                        return requestIdlePromise();

                      case 8:
                        if (!(_this.writesSinceLastRun === 0)) {
                          _context.next = 10;
                          break;
                        }

                        return _context.abrupt("return");

                      case 10:
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

                      case 13:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              })))["catch"](function () {}).then(function () {
                _this.saveQueueC = _this.saveQueueC - 1;
              });
              return _context2.abrupt("return", this.saveQueue);

            case 5:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function run() {
      return _run.apply(this, arguments);
    }

    return run;
  }();

  return LokiSaveQueue;
}();
//# sourceMappingURL=loki-save-queue.js.map