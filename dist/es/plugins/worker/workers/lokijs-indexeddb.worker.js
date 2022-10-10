import { getRxStorageLoki } from '../../lokijs';
import { wrappedWorkerRxStorage } from '../../worker';
var LokiIndexedDBAdapter = require('lokijs/src/loki-indexed-adapter');
var storage = getRxStorageLoki({
  adapter: new LokiIndexedDBAdapter()
});
wrappedWorkerRxStorage({
  storage: storage
});
//# sourceMappingURL=lokijs-indexeddb.worker.js.map