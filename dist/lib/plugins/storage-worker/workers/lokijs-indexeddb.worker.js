"use strict";

var _storageLokijs = require("../../storage-lokijs");
var _storageWorker = require("../../storage-worker");
var LokiIndexedDBAdapter = require('lokijs/src/loki-indexed-adapter');
var storage = (0, _storageLokijs.getRxStorageLoki)({
  adapter: new LokiIndexedDBAdapter()
});
(0, _storageWorker.wrappedWorkerRxStorage)({
  storage: storage
});
//# sourceMappingURL=lokijs-indexeddb.worker.js.map