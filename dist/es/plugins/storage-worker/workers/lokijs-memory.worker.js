import { getRxStorageLoki } from '../../storage-lokijs';
import { wrappedWorkerRxStorage } from '../../storage-worker';
var storage = getRxStorageLoki();
wrappedWorkerRxStorage({
  storage
});
//# sourceMappingURL=lokijs-memory.worker.js.map