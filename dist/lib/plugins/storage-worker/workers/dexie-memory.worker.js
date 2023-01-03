"use strict";

var _storageDexie = require("../../storage-dexie");
var _storageWorker = require("../../storage-worker");
var _fakeIndexeddb = require("fake-indexeddb");
var storage = (0, _storageDexie.getRxStorageDexie)({
  indexedDB: _fakeIndexeddb.indexedDB,
  IDBKeyRange: _fakeIndexeddb.IDBKeyRange
});
(0, _storageWorker.wrappedWorkerRxStorage)({
  storage
});
//# sourceMappingURL=dexie-memory.worker.js.map