import { getRxStorageDexie } from '../../dexie';
import { wrappedRxStorage } from '../../worker';
var storage = getRxStorageDexie();
wrappedRxStorage({
  storage: storage
});
//# sourceMappingURL=dexie.worker.js.map