import { getRxStorageDexie } from '../../storage-dexie';
import { wrappedWorkerRxStorage } from '../../storage-worker';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
var storage = getRxStorageDexie({
  indexedDB,
  IDBKeyRange
});
wrappedWorkerRxStorage({
  storage
});
//# sourceMappingURL=dexie-memory.worker.js.map