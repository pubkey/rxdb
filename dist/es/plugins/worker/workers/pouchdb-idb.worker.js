import { getRxStoragePouch, addPouchPlugin } from '../../pouchdb';
import { wrappedWorkerRxStorage } from '../../worker';
addPouchPlugin(require('pouchdb-adapter-idb'));
var storage = getRxStoragePouch({
  adapter: 'idb'
});
wrappedWorkerRxStorage({
  storage: storage
});
//# sourceMappingURL=pouchdb-idb.worker.js.map