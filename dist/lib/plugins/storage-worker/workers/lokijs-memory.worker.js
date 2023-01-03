"use strict";

var _storageLokijs = require("../../storage-lokijs");
var _storageWorker = require("../../storage-worker");
var storage = (0, _storageLokijs.getRxStorageLoki)();
(0, _storageWorker.wrappedWorkerRxStorage)({
  storage
});
//# sourceMappingURL=lokijs-memory.worker.js.map