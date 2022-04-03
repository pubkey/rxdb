import { getRxStoragePouch, addPouchPlugin } from '../../pouchdb';
import { wrappedWorkerRxStorage } from '../../worker';

addPouchPlugin(require('pouchdb-adapter-memory'));
const storage = getRxStoragePouch({
    adapter: 'memory'
});
wrappedWorkerRxStorage({
    storage
});
