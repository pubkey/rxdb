"use strict";

var _pouchdb = require("../../pouchdb");
var _worker = require("../../worker");
(0, _pouchdb.addPouchPlugin)(require('pouchdb-adapter-memory'));
var storage = (0, _pouchdb.getRxStoragePouch)({
  adapter: 'memory'
});
(0, _worker.wrappedWorkerRxStorage)({
  storage: storage
});
//# sourceMappingURL=pouchdb-memory.worker.js.map