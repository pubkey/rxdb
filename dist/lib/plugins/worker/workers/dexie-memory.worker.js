"use strict";

var _dexie = require("../../dexie");
var _worker = require("../../worker");
var _fakeIndexeddb = require("fake-indexeddb");
var storage = (0, _dexie.getRxStorageDexie)({
  indexedDB: _fakeIndexeddb.indexedDB,
  IDBKeyRange: _fakeIndexeddb.IDBKeyRange
});
(0, _worker.wrappedWorkerRxStorage)({
  storage: storage
});
//# sourceMappingURL=dexie-memory.worker.js.map