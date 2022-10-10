import { PROMISE_RESOLVE_VOID, requestIdlePromise } from '../../util';

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
    this.saveQueue = this.saveQueue.then(function () {
      try {
        /**
         * Always wait until the JavaScript process is idle.
         * This ensures that CPU blocking writes are finished
         * before we proceed.
         */return Promise.resolve(requestIdlePromise()).then(function () {
          // no write happened since the last save call
          if (_this.writesSinceLastRun === 0) {
            return;
          }

          /**
           * Because LokiJS is a in-memory database,
           * we can just wait until the JavaScript process is idle
           * via requestIdlePromise(). Then we know that nothing important
           * is running at the moment.
           */
          return Promise.resolve(requestIdlePromise().then(function () {
            return requestIdlePromise();
          })).then(function () {
            if (_this.writesSinceLastRun === 0) {
              return;
            }
            var writeAmount = _this.writesSinceLastRun;
            _this.writesSinceLastRun = 0;
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
        });
      } catch (e) {
        return Promise.reject(e);
      }
    })["catch"](function () {}).then(function () {
      _this.saveQueueC = _this.saveQueueC - 1;
    });
    return this.saveQueue;
  };
  return LokiSaveQueue;
}();
//# sourceMappingURL=loki-save-queue.js.map