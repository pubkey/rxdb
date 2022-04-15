import { getRxStoragePouch, addPouchPlugin } from '../../pouchdb';
import { wrappedWorkerRxStorage } from '../../worker';

addPouchPlugin(require('pouchdb-adapter-idb'));
const storage = getRxStoragePouch({
    adapter: 'idb'
});
wrappedWorkerRxStorage({
    storage
});
