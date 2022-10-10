"use strict";

var _lokijs = require("../../lokijs");
var _worker = require("../../worker");
var LokiIndexedDBAdapter = require('lokijs/src/loki-indexed-adapter');
var storage = (0, _lokijs.getRxStorageLoki)({
  adapter: new LokiIndexedDBAdapter()
});
(0, _worker.wrappedWorkerRxStorage)({
  storage: storage
});
//# sourceMappingURL=lokijs-indexeddb.worker.js.map