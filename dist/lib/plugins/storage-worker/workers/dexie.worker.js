"use strict";

var _storageDexie = require("../../storage-dexie");
var _storageWorker = require("../../storage-worker");
var storage = (0, _storageDexie.getRxStorageDexie)();
(0, _storageWorker.wrappedWorkerRxStorage)({
  storage
});
//# sourceMappingURL=dexie.worker.js.map