"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LokiSaveQueue = void 0;
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
    if (
    // no persistence adapter given, so we do not need to save
    !this.databaseSettings.adapter ||
    // do not add more then two pending calls to the queue.
    this.saveQueueC > 2) {
      return this.saveQueue;
    }
    this.saveQueueC = this.saveQueueC + 1;
    this.saveQueue = this.saveQueue.then(async () => {
      /**
       * Always wait until the JavaScript process is idle.
       * This ensures that CPU blocking writes are finished
       * before we proceed.
       */
      await (0, _utils.requestIdlePromise)();

      // no write happened since the last save call
      if (this.writesSinceLastRun === 0) {
        return;
      }

      /**
       * Because LokiJS is a in-memory database,
       * we can just wait until the JavaScript process is idle
       * via requestIdlePromise(). Then we know that nothing important
       * is running at the moment.
       */
      await (0, _utils.requestIdlePromise)().then(() => (0, _utils.requestIdlePromise)());
      if (this.writesSinceLastRun === 0) {
        return;
      }
      var writeAmount = this.writesSinceLastRun;
      this.writesSinceLastRun = 0;
      return new Promise((res, rej) => {
        this.lokiDatabase.saveDatabase(err => {
          if (err) {
            this.writesSinceLastRun = this.writesSinceLastRun + writeAmount;
            rej(err);
          } else {
            if (this.databaseSettings.autosaveCallback) {
              this.databaseSettings.autosaveCallback();
            }
            res();
          }
        });
      });
    }).catch(() => {}).then(() => {
      this.saveQueueC = this.saveQueueC - 1;
    });
    return this.saveQueue;
  };
  return LokiSaveQueue;
}();
exports.LokiSaveQueue = LokiSaveQueue;
//# sourceMappingURL=loki-save-queue.js.map