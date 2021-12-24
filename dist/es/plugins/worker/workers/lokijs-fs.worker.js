import { getRxStorageLoki } from '../../lokijs';
import { wrappedRxStorage } from '../../worker';

var lfsa = require('lokijs/src/loki-fs-structured-adapter.js');

var adapter = new lfsa();
var storage = getRxStorageLoki({
  adapter: adapter
});
wrappedRxStorage({
  storage: storage
});
//# sourceMappingURL=lokijs-fs.worker.js.map