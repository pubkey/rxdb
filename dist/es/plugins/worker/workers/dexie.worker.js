import { getRxStorageDexie } from '../../dexie';
import { wrappedWorkerRxStorage } from '../../worker';
var storage = getRxStorageDexie();
wrappedWorkerRxStorage({
  storage: storage
});
//# sourceMappingURL=dexie.worker.js.map