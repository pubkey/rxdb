"use strict";

var _storageMemory = require("../../storage-memory");
var _storageWorker = require("../../storage-worker");
var storage = (0, _storageMemory.getRxStorageMemory)({});
(0, _storageWorker.wrappedWorkerRxStorage)({
  storage
});
//# sourceMappingURL=memory.worker.js.map