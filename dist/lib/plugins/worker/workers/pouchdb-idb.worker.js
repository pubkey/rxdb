"use strict";

var _pouchdb = require("../../pouchdb");
var _worker = require("../../worker");
(0, _pouchdb.addPouchPlugin)(require('pouchdb-adapter-idb'));
var storage = (0, _pouchdb.getRxStoragePouch)({
  adapter: 'idb'
});
(0, _worker.wrappedWorkerRxStorage)({
  storage: storage
});
//# sourceMappingURL=pouchdb-idb.worker.js.map