"use strict";

var _storageLokijs = require("../../storage-lokijs");
var _storageWorker = require("../../storage-worker");
var LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');
var storage = (0, _storageLokijs.getRxStorageLoki)({
  adapter: new LokiIncrementalIndexedDBAdapter()
});
(0, _storageWorker.wrappedWorkerRxStorage)({
  storage: storage
});
//# sourceMappingURL=lokijs-incremental-indexeddb.worker.js.map