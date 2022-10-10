"use strict";

var _lokijs = require("../../lokijs");
var _worker = require("../../worker");
var storage = (0, _lokijs.getRxStorageLoki)();
(0, _worker.wrappedWorkerRxStorage)({
  storage: storage
});
//# sourceMappingURL=lokijs-memory.worker.js.map