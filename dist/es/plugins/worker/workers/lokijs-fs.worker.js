import { getRxStorageLoki } from '../../lokijs';
import { wrappedWorkerRxStorage } from '../../worker';
var lfsa = require('lokijs/src/loki-fs-structured-adapter.js');
var adapter = new lfsa();
var storage = getRxStorageLoki({
  adapter: adapter
});
wrappedWorkerRxStorage({
  storage: storage
});
//# sourceMappingURL=lokijs-fs.worker.js.map