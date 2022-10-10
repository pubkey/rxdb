"use strict";

var _lokijs = require("../../lokijs");
var _worker = require("../../worker");
var LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');
var storage = (0, _lokijs.getRxStorageLoki)({
  adapter: new LokiIncrementalIndexedDBAdapter()
});
(0, _worker.wrappedWorkerRxStorage)({
  storage: storage
});
//# sourceMappingURL=lokijs-incremental-indexeddb.worker.js.map