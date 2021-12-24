import { getRxStorageLoki } from '../../lokijs';
import { wrappedRxStorage } from '../../worker';

var LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');

var storage = getRxStorageLoki({
  adapter: new LokiIncrementalIndexedDBAdapter()
});
wrappedRxStorage({
  storage: storage
});
//# sourceMappingURL=lokijs-incremental-indexeddb.worker.js.map