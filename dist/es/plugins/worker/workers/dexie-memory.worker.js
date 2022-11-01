import { getRxStorageDexie } from '../../dexie';
import { wrappedWorkerRxStorage } from '../../worker';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
var storage = getRxStorageDexie({
  indexedDB: indexedDB,
  IDBKeyRange: IDBKeyRange
});
wrappedWorkerRxStorage({
  storage: storage
});
//# sourceMappingURL=dexie-memory.worker.js.map