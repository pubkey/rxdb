import { getRxStorageDexie } from '../../storage-dexie';
import { wrappedWorkerRxStorage } from '../../storage-worker';
var storage = getRxStorageDexie();
wrappedWorkerRxStorage({
  storage
});
//# sourceMappingURL=dexie.worker.js.map