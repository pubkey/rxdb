import { getRxStoragePouch, addPouchPlugin } from '../../pouchdb';
import { wrappedWorkerRxStorage } from '../../worker';
addPouchPlugin(require('pouchdb-adapter-memory'));
var storage = getRxStoragePouch({
  adapter: 'memory'
});
wrappedWorkerRxStorage({
  storage: storage
});
//# sourceMappingURL=pouchdb-memory.worker.js.map