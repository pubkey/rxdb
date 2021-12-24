import { getRxStoragePouch, addPouchPlugin } from '../../pouchdb';
import { wrappedRxStorage } from '../../worker';
addPouchPlugin(require('pouchdb-adapter-memory'));
var storage = getRxStoragePouch({
  adapter: 'memory'
});
wrappedRxStorage({
  storage: storage
});
//# sourceMappingURL=pouchdb-memory.worker.js.map