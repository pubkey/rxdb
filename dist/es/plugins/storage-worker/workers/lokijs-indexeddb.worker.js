import { getRxStorageLoki } from '../../storage-lokijs';
import { wrappedWorkerRxStorage } from '../../storage-worker';
var LokiIndexedDBAdapter = require('lokijs/src/loki-indexed-adapter');
var storage = getRxStorageLoki({
  adapter: new LokiIndexedDBAdapter()
});
wrappedWorkerRxStorage({
  storage: storage
});
//# sourceMappingURL=lokijs-indexeddb.worker.js.map