import { getRxStoragePouch, addPouchPlugin } from '../../pouchdb';
import { wrappedRxStorage } from '../../worker';

addPouchPlugin(require('pouchdb-adapter-memory'));
const storage = getRxStoragePouch({
    adapter: 'memory'
});
wrappedRxStorage({
    storage
});
