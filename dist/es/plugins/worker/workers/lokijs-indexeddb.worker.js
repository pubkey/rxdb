import { getRxStorageLoki } from '../../lokijs';
import { wrappedRxStorage } from '../../worker';

var LokiIndexedDBAdapter = require('lokijs/src/loki-indexed-adapter');

var storage = getRxStorageLoki({
  adapter: new LokiIndexedDBAdapter()
});
wrappedRxStorage({
  storage: storage
});
//# sourceMappingURL=lokijs-indexeddb.worker.js.map