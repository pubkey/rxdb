import { getRxStorageMemory } from '../../storage-memory';
import { wrappedWorkerRxStorage } from '../../storage-worker';
var storage = getRxStorageMemory({});
wrappedWorkerRxStorage({
  storage
});
//# sourceMappingURL=memory.worker.js.map