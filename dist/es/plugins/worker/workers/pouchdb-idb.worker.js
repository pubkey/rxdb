import { getRxStoragePouch, addPouchPlugin } from '../../pouchdb';
import { wrappedRxStorage } from '../../worker';
addPouchPlugin(require('pouchdb-adapter-idb'));
var storage = getRxStoragePouch({
  adapter: 'idb'
});
wrappedRxStorage({
  storage: storage
});
//# sourceMappingURL=pouchdb-idb.worker.js.map