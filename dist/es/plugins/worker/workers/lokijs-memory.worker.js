import { getRxStorageLoki } from '../../lokijs';
import { wrappedRxStorage } from '../../worker';
var storage = getRxStorageLoki();
wrappedRxStorage({
  storage: storage
});
//# sourceMappingURL=lokijs-memory.worker.js.map