import { getRxStorageLoki } from '../../storage-lokijs';
import { wrappedWorkerRxStorage } from '../../storage-worker';
var LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');
var storage = getRxStorageLoki({
  adapter: new LokiIncrementalIndexedDBAdapter()
});
wrappedWorkerRxStorage({
  storage
});
//# sourceMappingURL=lokijs-incremental-indexeddb.worker.js.map