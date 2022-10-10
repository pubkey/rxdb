import { getRxStorageDexie } from '../../dexie';
import { wrappedWorkerRxStorage } from '../../worker';
var indexedDB = require('fake-indexeddb');
var IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
var storage = getRxStorageDexie({
  indexedDB: indexedDB,
  IDBKeyRange: IDBKeyRange
});
wrappedWorkerRxStorage({
  storage: storage
});
//# sourceMappingURL=dexie-memory.worker.js.map