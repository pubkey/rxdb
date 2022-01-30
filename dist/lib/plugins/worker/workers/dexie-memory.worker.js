"use strict";

var _dexie = require("../../dexie");

var _worker = require("../../worker");

var indexedDB = require('fake-indexeddb');

var IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

var storage = (0, _dexie.getRxStorageDexie)({
  indexedDB: indexedDB,
  IDBKeyRange: IDBKeyRange
});
(0, _worker.wrappedRxStorage)({
  storage: storage
});
//# sourceMappingURL=dexie-memory.worker.js.map