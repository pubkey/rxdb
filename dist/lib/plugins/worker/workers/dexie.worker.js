"use strict";

var _dexie = require("../../dexie");

var _worker = require("../../worker");

var storage = (0, _dexie.getRxStorageDexie)();
(0, _worker.wrappedRxStorage)({
  storage: storage
});
//# sourceMappingURL=dexie.worker.js.map