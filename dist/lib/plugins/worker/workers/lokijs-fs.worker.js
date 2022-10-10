"use strict";

var _lokijs = require("../../lokijs");
var _worker = require("../../worker");
var lfsa = require('lokijs/src/loki-fs-structured-adapter.js');
var adapter = new lfsa();
var storage = (0, _lokijs.getRxStorageLoki)({
  adapter: adapter
});
(0, _worker.wrappedWorkerRxStorage)({
  storage: storage
});
//# sourceMappingURL=lokijs-fs.worker.js.map