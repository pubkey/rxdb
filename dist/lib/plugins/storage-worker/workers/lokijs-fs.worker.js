"use strict";

var _storageLokijs = require("../../storage-lokijs");
var _storageWorker = require("../../storage-worker");
var lfsa = require('lokijs/src/loki-fs-structured-adapter.js');
var adapter = new lfsa();
var storage = (0, _storageLokijs.getRxStorageLoki)({
  adapter
});
(0, _storageWorker.wrappedWorkerRxStorage)({
  storage
});
//# sourceMappingURL=lokijs-fs.worker.js.map