import { getRxStoragePouch, addPouchPlugin } from '../../pouchdb';
import { wrappedRxStorage } from '../../worker';

addPouchPlugin(require('pouchdb-adapter-idb'));
const storage = getRxStoragePouch({
    adapter: 'idb'
});
wrappedRxStorage({
    storage
});
