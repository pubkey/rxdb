import { getRxStorageLoki } from '../../lokijs';
import { wrappedWorkerRxStorage } from '../../worker';
var LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');
var storage = getRxStorageLoki({
  adapter: new LokiIncrementalIndexedDBAdapter()
});
wrappedWorkerRxStorage({
  storage: storage
});
//# sourceMappingURL=lokijs-incremental-indexeddb.worker.js.map