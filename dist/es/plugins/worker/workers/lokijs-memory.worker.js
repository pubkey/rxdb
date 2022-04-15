import { getRxStorageLoki } from '../../lokijs';
import { wrappedWorkerRxStorage } from '../../worker';
var storage = getRxStorageLoki();
wrappedWorkerRxStorage({
  storage: storage
});
//# sourceMappingURL=lokijs-memory.worker.js.map